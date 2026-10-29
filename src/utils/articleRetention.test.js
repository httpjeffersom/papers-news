import assert from "node:assert/strict";
import { test } from "node:test";
import {
  articleRetentionPresets,
  clampArticleRetentionDays,
  defaultArticleRetentionDays,
  isExpiredArticle,
  maxArticleRetentionDays,
  normalizeArticleRetentionDays,
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

test("keeps recent articles and removes those older than the default 30 days", () => {
  const articles = [
    article("recent", 5),
    article("limit", defaultArticleRetentionDays),
    article("expired", defaultArticleRetentionDays + 1),
  ];

  assert.deepEqual(
    pruneExpiredArticles(articles, [], now).map((item) => item.id),
    ["recent"],
  );
});

test("respects a custom retention period", () => {
  const articles = [
    article("today", 0.5),
    article("two-days", 2),
    article("six-days", 6),
    article("eleven-days", 11),
  ];

  assert.deepEqual(
    pruneExpiredArticles(articles, [], now, 1).map((item) => item.id),
    ["today"],
  );
  assert.deepEqual(
    pruneExpiredArticles(articles, [], now, 7).map((item) => item.id),
    ["today", "two-days", "six-days"],
  );
  assert.deepEqual(
    pruneExpiredArticles(articles, [], now, 10).map((item) => item.id),
    ["today", "two-days", "six-days"],
  );
  assert.deepEqual(
    pruneExpiredArticles(articles, [], now, 15).map((item) => item.id),
    ["today", "two-days", "six-days", "eleven-days"],
  );
});

test("keeps saved articles regardless of age or retention period", () => {
  const articles = [article("saved", 120), article("old", 120)];

  assert.deepEqual(
    pruneExpiredArticles(articles, ["saved"], now, 1).map((item) => item.id),
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

  assert.equal(
    articles.filter((item) => !isExpiredArticle(item, now, 1)).length,
    4,
  );
  assert.deepEqual(
    pruneExpiredArticles(articles, [], now, 1).map((item) => item.id),
    ["missing", "empty", "invalid", "future"],
  );
});

test("keeps demo content so the sample feed is not emptied", () => {
  const articles = [article("demo", 90, { isDemo: true }), article("news", 90)];

  assert.deepEqual(
    pruneExpiredArticles(articles, [], now, 1).map((item) => item.id),
    ["demo"],
  );
});

test("does not mutate the original article list", () => {
  const articles = [article("recent", 1), article("expired", 60)];
  const snapshot = [...articles];

  const pruned = pruneExpiredArticles(articles, [], now, 5);

  assert.equal(pruned.length, 1);
  assert.deepEqual(articles, snapshot);
});

test("normalizes and clamps the retention period", () => {
  assert.deepEqual(articleRetentionPresets, [1, 5, 10, 15, 20, 30]);
  assert.equal(maxArticleRetentionDays, 30);
  assert.equal(normalizeArticleRetentionDays("7"), 7);
  assert.equal(normalizeArticleRetentionDays(30), 30);
  assert.equal(normalizeArticleRetentionDays("0"), defaultArticleRetentionDays);
  assert.equal(normalizeArticleRetentionDays("31"), defaultArticleRetentionDays);
  assert.equal(normalizeArticleRetentionDays("abc"), defaultArticleRetentionDays);
  assert.equal(normalizeArticleRetentionDays(null), defaultArticleRetentionDays);
  assert.equal(clampArticleRetentionDays(0), 1);
  assert.equal(clampArticleRetentionDays("12"), 12);
  assert.equal(clampArticleRetentionDays(45), 30);
});
