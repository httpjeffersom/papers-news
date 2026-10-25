import assert from "node:assert/strict";
import { test } from "node:test";
import { sortArticlesByDateDesc } from "./articleSort.js";

test("sorts valid dates from newest to oldest and keeps unknown dates last", () => {
  const sorted = sortArticlesByDateDesc([
    { id: "unknown", publishedAt: "" },
    { id: "older", publishedAt: "2026-01-01T00:00:00.000Z" },
    { id: "newer", publishedAt: "2026-02-01T00:00:00.000Z" },
  ]);

  assert.deepEqual(
    sorted.map((article) => article.id),
    ["newer", "older", "unknown"],
  );
});
