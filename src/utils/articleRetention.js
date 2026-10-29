export const defaultArticleRetentionDays = 30;
export const maxArticleRetentionDays = 30;
export const articleRetentionPresets = [1, 5, 10, 15, 20, 30];

const dayMs = 24 * 60 * 60 * 1000;

function publishedAtTime(value) {
  if (typeof value !== "string" || value.trim() === "") return null;
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : time;
}

export function normalizeArticleRetentionDays(value) {
  if (value === null || value === undefined || value === "") {
    return defaultArticleRetentionDays;
  }

  const days = Number(value);
  if (
    !Number.isInteger(days) ||
    days < 1 ||
    days > maxArticleRetentionDays
  ) {
    return defaultArticleRetentionDays;
  }

  return days;
}

export function clampArticleRetentionDays(value) {
  const days = Number(value);
  if (!Number.isFinite(days)) return defaultArticleRetentionDays;

  return Math.min(
    maxArticleRetentionDays,
    Math.max(1, Math.trunc(days)),
  );
}

export function isExpiredArticle(
  article,
  now = Date.now(),
  retentionDays = defaultArticleRetentionDays,
) {
  if (article?.isDemo) return false;

  const time = publishedAtTime(article?.publishedAt);
  if (time === null) return false;

  const days = normalizeArticleRetentionDays(retentionDays);
  return now - time >= days * dayMs;
}

export function pruneExpiredArticles(
  articles,
  savedIds = [],
  now = Date.now(),
  retentionDays = defaultArticleRetentionDays,
) {
  if (!Array.isArray(articles)) return [];

  const saved = new Set(savedIds);
  return articles.filter(
    (article) =>
      saved.has(article.id) ||
      !isExpiredArticle(article, now, retentionDays),
  );
}
