import assert from "node:assert/strict";
import { test } from "node:test";
import {
  articleRetentionDays,
  isExpiredArticle,
  pruneExpiredArticles,
} from "./articleRetention.js";

const now = Date.parse("2026-10-28T12:00:00.000Z");
const dayMs = 24 * 60 * 60 * 1000;

function article(id, ageDays, extra = {}) {
  return {
    id,
    publishedAt: new Date(now - ageDays * dayMs).toISOString(),
    ...extra,
  };
}

test("keeps recent articles and removes those older than 30 days", () => {
  const articles = [
    article("recent", 5),
    article("limit", articleRetentionDays),
    article("expired", articleRetentionDays + 1),
  ];

  assert.deepEqual(
    pruneExpiredArticles(articles, [], now).map((item) => item.id),
    ["recent"],
  );
});

test("keeps saved articles regardless of age", () => {
  const articles = [article("saved", 120), article("old", 120)];

  assert.deepEqual(
    pruneExpiredArticles(articles, ["saved"], now).map((item) => item.id),
    ["saved"],
  );
});

test("keeps articles without a valid date and articles dated in the future", () => {
  const articles = [
    { id: "missing" },
    { id: "empty", publishedAt: "" },
    { id: "invalid", publishedAt: "data inválida" },
    { id: "future", publishedAt: new Date(now + dayMs).toISOString() },
  ];

  assert.equal(articles.filter((item) => !isExpiredArticle(item, now)).length, 4);
  assert.deepEqual(
    pruneExpiredArticles(articles, [], now).map((item) => item.id),
    ["missing", "empty", "invalid", "future"],
  );
});

test("keeps demo content so the sample feed is not emptied", () => {
  const articles = [article("demo", 90, { isDemo: true }), article("news", 90)];

  assert.deepEqual(
    pruneExpiredArticles(articles, [], now).map((item) => item.id),
    ["demo"],
  );
});

test("does not mutate the original article list", () => {
  const articles = [article("recent", 1), article("expired", 60)];
  const snapshot = [...articles];

  const pruned = pruneExpiredArticles(articles, [], now);

  assert.equal(pruned.length, 1);
  assert.deepEqual(articles, snapshot);
});
