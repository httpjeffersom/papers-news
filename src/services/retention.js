import {
  defaultArticleRetentionDays,
  normalizeArticleRetentionDays,
} from "../utils/articleRetention.js";

export const retentionStorageKey = "papers-news:retention-days:v1";

export function loadRetentionDays() {
  try {
    const stored = globalThis.localStorage?.getItem(retentionStorageKey);
    return normalizeArticleRetentionDays(stored);
  } catch {
    return defaultArticleRetentionDays;
  }
}

export function saveRetentionDays(days) {
  try {
    globalThis.localStorage?.setItem(
      retentionStorageKey,
      String(normalizeArticleRetentionDays(days)),
    );
  } catch {
    // Sem armazenamento disponível: a escolha ainda vale nesta sessão.
  }
}
