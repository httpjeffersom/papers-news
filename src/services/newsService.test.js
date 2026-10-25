import assert from "node:assert/strict";
import { test } from "node:test";
import { refreshNews } from "./newsService.js";

async function withMockedFeedRequests(testFn) {
  const originalFetch = globalThis.fetch;
  const originalParser = globalThis.DOMParser;

  globalThis.DOMParser = class {
    parseFromString(value) {
      return { body: { textContent: value } };
    }
  };

  try {
    await testFn();
  } finally {
    globalThis.fetch = originalFetch;
    if (originalParser === undefined) {
      delete globalThis.DOMParser;
    } else {
      globalThis.DOMParser = originalParser;
    }
  }
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
