import assert from "node:assert/strict";
import { test } from "node:test";
import { DOMParser as XmlDOMParser } from "@xmldom/xmldom";
import {
  discoverAndFetchSource,
  refreshNews,
  resetFeedTransportCache,
} from "./newsService.js";

async function withMockedFeedRequests(testFn) {
  const originalFetch = globalThis.fetch;
  const originalParser = globalThis.DOMParser;

  resetFeedTransportCache();
  globalThis.DOMParser = class {
    parseFromString(value) {
      return { body: { textContent: value } };
    }
  };

  try {
    await testFn();
  } finally {
    globalThis.fetch = originalFetch;
    resetFeedTransportCache();
    if (originalParser === undefined) {
      delete globalThis.DOMParser;
    } else {
      globalThis.DOMParser = originalParser;
    }
  }
}

function makeResponse(body, status = 200, headers = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => body,
    json: async () => JSON.parse(body),
    headers: {
      get(name) {
        return headers[name.toLowerCase()] ?? null;
      },
    },
  };
}

function makeArticle(id, sourceId, title = id) {
  return {
    id,
    sourceId,
    sourceName: sourceId,
    title,
    summary: "",
    publishedAt: "2026-01-01T00:00:00.000Z",
    url: `https://example.com/${id}`,
    isDemo: false,
  };
}

test("updates available sources while retaining failed and saved articles", async () => {
  await withMockedFeedRequests(async () => {
    globalThis.fetch = async (url) => {
      if (url.includes(encodeURIComponent("https://good.example/feed"))) {
        return {
          ok: true,
          json: async () => ({
            status: "ok",
            feed: { title: "Good News" },
            items: [{
              title: "Fresh article",
              link: "https://good.example/fresh",
              pubDate: "2026-02-01T00:00:00.000Z",
              description: "Latest",
            }],
          }),
        };
      }

      return { ok: false, status: 503 };
    };

    const goodSource = {
      id: "good",
      name: "Good News",
      url: "https://good.example",
      feedUrl: "https://good.example/feed",
      isDemo: false,
    };
    const failedSource = {
      id: "failed",
      name: "Unavailable News",
      url: "https://failed.example",
      feedUrl: "https://failed.example/feed",
      isDemo: false,
    };
    const cached = [
      makeArticle("saved-old", "good"),
      makeArticle("failed-cached", "failed"),
    ];

    const result = await refreshNews(
      [goodSource, failedSource],
      cached,
      ["saved-old"],
    );

    assert.deepEqual(
      result.articles.map((article) => article.id).sort(),
      ["failed-cached", "good:https://good.example/fresh", "saved-old"].sort(),
    );
    assert.deepEqual(result.errors.map((error) => error.sourceName), ["Unavailable News"]);
    assert.match(result.errors[0].message, /HTTP 503/);
  });
});

test("returns cached articles instead of demo content when there are no real sources", async () => {
  const cached = [
    makeArticle("older", "source-1", "Older"),
    {
      ...makeArticle("newer", "source-1", "Newer"),
      publishedAt: "2026-03-01T00:00:00.000Z",
    },
  ];

  const result = await refreshNews(
    [{ id: "source-demo", name: "Demo", url: "https://example.com", isDemo: true }],
    cached,
    [],
  );

  assert.deepEqual(result.articles.map((article) => article.id), ["newer", "older"]);
  assert.deepEqual(result.errors, []);
});

test("treats an empty feed as a successful refresh", async () => {
  await withMockedFeedRequests(async () => {
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({
        status: "ok",
        feed: { title: "Empty News" },
        items: [],
      }),
    });

    const result = await refreshNews(
      [{
        id: "empty",
        name: "Empty News",
        url: "https://empty.example",
        feedUrl: "https://empty.example/feed",
        isDemo: false,
      }],
      [makeArticle("cached", "empty")],
      [],
    );

    assert.deepEqual(result.articles, []);
    assert.deepEqual(result.errors, []);
  });
});

test("normalizes missing dates, relative images, initials, and duplicate links", async () => {
  await withMockedFeedRequests(async () => {
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({
        status: "ok",
        feed: { title: "Caderno de Tecnologia" },
        items: [
          {
            title: "Publicação sem data",
            link: "https://news.example/post-1",
            pubDate: "data-invalida",
            description: "<p>Resumo</p>",
            thumbnail: "/img/1.jpg",
          },
          {
            title: "Link repetido",
            link: "https://news.example/post-1",
            pubDate: "2026-01-01T00:00:00.000Z",
          },
        ],
      }),
    });

    const result = await refreshNews(
      [{
        id: "news",
        name: "Caderno de Tecnologia",
        url: "https://news.example",
        feedUrl: "https://news.example/feed",
        isDemo: false,
      }],
      [],
      [],
    );

    assert.equal(result.articles.length, 1);
    const [article] = result.articles;
    assert.equal(article.publishedAt, "");
    assert.equal(article.image, "https://news.example/img/1.jpg");
    assert.equal(article.sourceInitials, "CT");
  });
});

test("discovers a feed from a site URL through the local proxy", async () => {
  const originalFetch = globalThis.fetch;
  const originalParser = globalThis.DOMParser;
  resetFeedTransportCache();
  globalThis.DOMParser = XmlDOMParser;

  const html = [
    "<!doctype html><html><head>",
    '<link rel="alternate" type="application/rss+xml" href="/rss.xml">',
    "</head><body><a href=\"/sobre\">Sobre</a></body></html>",
  ].join("");
  const feed = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0"><channel><title>Blog Exemplo</title>',
    "<item><title>Notícia real</title>",
    "<link>https://blog.example/noticia</link>",
    "<pubDate>Sun, 01 Feb 2026 10:00:00 GMT</pubDate>",
    "<description>Resumo</description></item>",
    "</channel></rss>",
  ].join("");

  const routes = {
    "https://blog.example/": makeResponse(html, 200, { "content-type": "text/html" }),
    "https://blog.example/rss.xml": makeResponse(feed, 200, {
      "content-type": "application/rss+xml",
      "x-final-url": "https://blog.example/rss.xml",
    }),
  };

  globalThis.fetch = async (url) => {
    const raw = String(url);
    if (raw.endsWith("/health")) return makeResponse("ok");
    if (raw.includes("/fetch?url=")) {
      const target = new URL(raw).searchParams.get("url");
      const response = routes[target];
      if (response) return response;
      throw new TypeError("Failed to fetch");
    }
    throw new Error(`URL inesperada: ${raw}`);
  };

  try {
    const result = await discoverAndFetchSource({
      name: "",
      url: "https://blog.example/",
    });

    assert.equal(result.source.feedUrl, "https://blog.example/rss.xml");
    assert.equal(result.source.name, "Blog Exemplo");
    assert.equal(result.articles.length, 1);
    assert.equal(result.articles[0].title, "Notícia real");
  } finally {
    globalThis.fetch = originalFetch;
    resetFeedTransportCache();
    if (originalParser === undefined) {
      delete globalThis.DOMParser;
    } else {
      globalThis.DOMParser = originalParser;
    }
  }
});
