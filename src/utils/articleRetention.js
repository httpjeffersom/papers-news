export const articleRetentionDays = 30;

const retentionMs = articleRetentionDays * 24 * 60 * 60 * 1000;

function publishedAtTime(value) {
  if (typeof value !== "string" || value.trim() === "") return null;
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : time;
}

export function isExpiredArticle(article, now = Date.now()) {
  if (article?.isDemo) return false;

  const time = publishedAtTime(article?.publishedAt);
  if (time === null) return false;

  return now - time >= retentionMs;
}

export function pruneExpiredArticles(articles, savedIds = [], now = Date.now()) {
  if (!Array.isArray(articles)) return [];

  const saved = new Set(savedIds);
  return articles.filter(
    (article) => saved.has(article.id) || !isExpiredArticle(article, now),
  );
}
