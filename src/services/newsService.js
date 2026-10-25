import { sortArticlesByDateDesc } from "../utils/articleSort.js";

const proxyUrl = "https://api.allorigins.win/raw?url=";
const rssProxyUrl = "https://api.rss2json.com/v1/api.json?rss_url=";
const maxArticlesPerFeed = 30;
const nameConnectors = new Set([
  "a",
  "as",
  "o",
  "os",
  "de",
  "da",
  "das",
  "do",
  "dos",
  "e",
  "em",
  "the",
  "of",
  "and",
]);

function proxiedUrl(url) {
  return `${proxyUrl}${encodeURIComponent(url)}`;
}

function resolveImageUrl(value, baseUrl) {
  if (typeof value !== "string" || !value.trim()) return "";

  let url;
  try {
    url = new URL(value.trim(), baseUrl);
  } catch {
    try {
      url = new URL(value.trim());
    } catch {
      return "";
    }
  }

  return ["http:", "https:"].includes(url.protocol) ? url.href : "";
}

function getInitials(name) {
  const words = (name || "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";

  const meaningfulWords = words.filter(
    (word) => !nameConnectors.has(word.toLocaleLowerCase("pt-BR")),
  );
  const sourceWords = meaningfulWords.length > 0 ? meaningfulWords : words;

  if (sourceWords.length === 1) {
    return sourceWords[0].slice(0, 2).toLocaleUpperCase("pt-BR");
  }

  return `${sourceWords[0][0]}${sourceWords[1][0]}`.toLocaleUpperCase("pt-BR");
}

function sourceLabel(source) {
  if (source.name) return source.name;

  try {
    return new URL(source.url).hostname;
  } catch {
    return "Fonte desconhecida";
  }
}

async function fetchText(url) {
  const response = await fetch(proxiedUrl(url));
  if (!response.ok) {
    throw new Error(`A busca da página falhou (HTTP ${response.status}).`);
  }
  return response.text();
}

async function fetchFeed(feedUrl, source) {
  const response = await fetch(`${rssProxyUrl}${encodeURIComponent(feedUrl)}`);
  if (!response.ok) {
    throw new Error(`A consulta do feed falhou (HTTP ${response.status}).`);
  }

  const data = await response.json();
  if (data.status !== "ok") {
    throw new Error(data.message || "O serviço não conseguiu ler este feed RSS/Atom.");
  }

  let hostname = "";
  try {
    hostname = new URL(source.url).hostname;
  } catch {
    hostname = "";
  }

  const sourceName =
    source.name || data.feed?.title || hostname || "Fonte desconhecida";
  const seenLinks = new Set();
  const articles = [];

  for (const item of (data.items || []).slice(0, maxArticlesPerFeed)) {
    if (
      typeof item.title !== "string" ||
      typeof item.link !== "string" ||
      !item.title ||
      !item.link ||
      seenLinks.has(item.link)
    ) {
      continue;
    }

    seenLinks.add(item.link);
    const publishedAt = Date.parse(
      typeof item.pubDate === "string" ? item.pubDate : "",
    );
    const image = resolveImageUrl(
      item.thumbnail || item.enclosure?.link,
      item.link || feedUrl,
    );

    articles.push({
      id: `${source.id}:${item.link}`,
      sourceId: source.id,
      sourceName,
      sourceInitials: getInitials(sourceName),
      title: plainText(item.title),
      summary: plainText(item.description || item.content || ""),
      publishedAt: Number.isNaN(publishedAt)
        ? ""
        : new Date(publishedAt).toISOString(),
      image,
      url: item.link,
      isDemo: false,
    });
  }

  return {
    sourceName,
    articles,
  };
}

function localName(element) {
  return element.localName?.toLowerCase() ?? element.tagName.toLowerCase();
}

function plainText(value) {
  if (typeof value !== "string") return "";
  const document = new DOMParser().parseFromString(value, "text/html");
  return document.body.textContent?.replace(/\s+/g, " ").trim() ?? "";
}

function isFeedDocument(document) {
  const root = document.documentElement;
  return ["rss", "feed", "rdf"].includes(localName(root));
}

function getDiscoveredFeedUrls(pageText, pageUrl) {
  const document = new DOMParser().parseFromString(pageText, "text/html");
  const alternates = [...document.querySelectorAll('link[rel~="alternate"]')]
    .filter((link) => /rss|atom|xml/i.test(link.type))
    .map((link) => link.href)
    .filter(Boolean);
  const root = new URL("/", pageUrl).href;
  const commonPaths = ["feed/", "rss.xml", "atom.xml"];
  return [...new Set([
    ...alternates.map((url) => new URL(url, pageUrl).href),
    ...commonPaths.map((path) => new URL(path, root).href),
  ])];
}

export async function discoverAndFetchSource({ name, url }) {
  const pageUrl = new URL(url).href;
  const source = {
    id: `source-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: name.trim(),
    url: pageUrl,
    feedUrl: "",
    isDemo: false,
  };
  const pathSuggestsFeed = /(?:feed|rss|atom|\.xml)\/?$/i.test(new URL(pageUrl).pathname);
  const root = new URL("/", pageUrl).href;
  const commonFeedUrls = ["feed/", "rss.xml", "atom.xml"]
    .map((path) => new URL(path, root).href);
  const candidateUrls = [...new Set([
    ...(pathSuggestsFeed ? [pageUrl] : []),
    ...commonFeedUrls,
  ])];
  let lastError = null;

  for (const feedUrl of candidateUrls) {
    try {
      const result = await fetchFeed(feedUrl, source);
      source.name = source.name || result.sourceName;
      source.feedUrl = feedUrl;
      return { source, articles: result.articles };
    } catch (error) {
      lastError = error;
    }
  }

  let discoveryError = null;
  try {
    const pageText = await fetchText(pageUrl);
    const pageDocument = new DOMParser().parseFromString(pageText, "application/xml");
    const discoveredUrls = isFeedDocument(pageDocument)
      ? [pageUrl]
      : getDiscoveredFeedUrls(pageText, pageUrl);

    for (const feedUrl of discoveredUrls) {
      if (candidateUrls.includes(feedUrl)) continue;
      try {
        const result = await fetchFeed(feedUrl, source);
        source.name = source.name || result.sourceName;
        source.feedUrl = feedUrl;
        return { source, articles: result.articles };
      } catch (error) {
        lastError = error;
      }
    }
  } catch (error) {
    discoveryError = error;
  }

  if (lastError) {
    if (discoveryError instanceof TypeError) {
      throw new Error(
        "A descoberta automática do feed foi bloqueada por CORS ou por uma falha de conexão. Tente cadastrar diretamente o endereço RSS/Atom do site (por exemplo, https://tecnoblog.net/feed/).",
      );
    }
    throw new Error(
      `Não foi possível encontrar ou consultar um feed RSS/Atom. Se souber o endereço do feed, tente cadastrá-lo diretamente (por exemplo, https://tecnoblog.net/feed/). ${lastError.message}`,
    );
  }
  throw new Error("Não encontrei um link de feed RSS/Atom nesse site.");
}

export async function refreshNews(sources = [], cachedArticles = [], savedIds = []) {
  const activeSources = sources.filter((source) => !source.isDemo);
  if (activeSources.length === 0) {
    return {
      articles: sortArticlesByDateDesc(cachedArticles),
      errors: [],
    };
  }

  const results = await Promise.allSettled(
    activeSources.map(async (source) => {
      const feedUrl = source.feedUrl || source.url;
      return {
        source,
        articles: (await fetchFeed(feedUrl, source)).articles,
      };
    }),
  );
  const articles = [];
  const errors = [];

  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      articles.push(...result.value.articles);
      const refreshedIds = new Set(result.value.articles.map((article) => article.id));
      articles.push(
        ...cachedArticles.filter(
          (article) =>
            article.sourceId === result.value.source.id &&
            savedIds.includes(article.id) &&
            !refreshedIds.has(article.id),
        ),
      );
      return;
    }

    const source = activeSources[index];
    errors.push({
      sourceName: sourceLabel(source),
      message: result.reason instanceof Error
        ? result.reason.message
        : String(result.reason),
    });
    articles.push(
      ...cachedArticles.filter((article) => article.sourceId === source.id),
    );
  });

  return {
    articles: sortArticlesByDateDesc(articles),
    errors,
  };
}
