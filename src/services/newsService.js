import { demoArticles } from "../data/demoArticles.js";

const proxyUrl = "https://api.allorigins.win/raw?url=";
const rssProxyUrl = "https://api.rss2json.com/v1/api.json?rss_url=";
const maxArticlesPerFeed = 30;

function proxiedUrl(url) {
  return `${proxyUrl}${encodeURIComponent(url)}`;
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

  const sourceName = source.name || data.feed?.title || new URL(source.url).hostname;
  const articles = (data.items || []).slice(0, maxArticlesPerFeed).flatMap((item) => {
    if (!item.title || !item.link) return [];

    const publishedAt = Date.parse(item.pubDate);
    const image = item.thumbnail || item.enclosure?.link || "";
    return [{
      id: `${source.id}:${item.link}`,
      sourceId: source.id,
      sourceName,
      sourceInitials: sourceName.slice(0, 2).toLocaleUpperCase("pt-BR"),
      title: plainText(item.title),
      summary: plainText(item.description || item.content || ""),
      publishedAt: Number.isNaN(publishedAt)
        ? new Date().toISOString()
        : new Date(publishedAt).toISOString(),
      image,
      url: item.link,
      isDemo: false,
    }];
  });

  if (articles.length === 0) {
    throw new Error("O feed foi encontrado, mas não contém publicações válidas.");
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

export async function refreshNews(sources = []) {
  const activeSources = sources.filter((source) => !source.isDemo);
  if (activeSources.length === 0) {
    await new Promise((resolve) => window.setTimeout(resolve, 450));
    return [...demoArticles].sort(
      (a, b) => new Date(b.publishedAt) - new Date(a.publishedAt),
    );
  }

  const results = await Promise.all(
    activeSources.map(async (source) => {
      const feedUrl = source.feedUrl || source.url;
      return (await fetchFeed(feedUrl, source)).articles;
    }),
  );
  return results.flat().sort(
    (a, b) => new Date(b.publishedAt) - new Date(a.publishedAt),
  );
}
