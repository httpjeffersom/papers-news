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
