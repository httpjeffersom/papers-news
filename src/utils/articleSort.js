function publishedAtTime(value) {
  const time = Date.parse(typeof value === "string" ? value : "");
  return Number.isNaN(time) ? -Infinity : time;
}

export function compareArticlesByDateDesc(a, b) {
  const aTime = publishedAtTime(a.publishedAt);
  const bTime = publishedAtTime(b.publishedAt);

  if (aTime === bTime) return 0;
  if (aTime === -Infinity) return 1;
  if (bTime === -Infinity) return -1;
  return bTime - aTime;
}

export function sortArticlesByDateDesc(articles) {
  return [...articles].sort(compareArticlesByDateDesc);
}
