import {
  getInitials,
  maxArticlesPerFeed,
  parseFeedXml,
  plainText,
  resolveHttpUrl,
} from "./feedParser.js";
import { sortArticlesByDateDesc } from "../utils/articleSort.js";
import { ensureDesktopProxy } from "./desktopProxy.js";

const localProxyBaseUrl = (
  import.meta.env?.VITE_FEED_PROXY_URL || "http://127.0.0.1:8787"
).replace(/\/$/, "");
const localProxyFetchUrl = `${localProxyBaseUrl}/fetch?url=`;
const allOriginsUrl = "https://api.allorigins.win/raw?url=";
const rss2JsonUrl = "https://api.rss2json.com/v1/api.json?rss_url=";
const requestTimeoutMs = 20000;
const discoveryTimeoutMs = 12000;
const proxyHealthTimeoutMs = 1200;
const proxyRecheckMs = 30000;
const maxDiscoveryCandidates = 8;

const proxyState = {
  available: null,
  checkedAt: 0,
};

const commonFeedSuffixes = [
  "feed/",
  "feed",
  "rss",
  "rss/",
  "rss.xml",
  "atom.xml",
  "feed.xml",
  "index.xml",
  "feeds/",
  "feeds/posts/default?alt=rss",
  "?feed=rss2",
];

function withTimeout(ms) {
  const AbortSignalRef = globalThis.AbortSignal;
  if (typeof AbortSignalRef?.timeout !== "function") return undefined;

  try {
    return AbortSignalRef.timeout(ms);
  } catch {
    return undefined;
  }
}

export function resetFeedTransportCache() {
  proxyState.available = null;
  proxyState.checkedAt = 0;
}

export async function isLocalProxyAvailable() {
  const now = Date.now();
  if (proxyState.available === true) return true;
  if (proxyState.available === false && now - proxyState.checkedAt < proxyRecheckMs) {
    return false;
  }

  try {
    const response = await fetch(`${localProxyBaseUrl}/health`, {
      signal: withTimeout(proxyHealthTimeoutMs),
      cache: "no-store",
    });
    proxyState.available = response.ok;
  } catch {
    proxyState.available = false;
  }
  proxyState.checkedAt = Date.now();

  if (!proxyState.available && (await ensureDesktopProxy())) {
    proxyState.available = true;
  }

  return proxyState.available;
}

function readFinalUrl(response, fallback) {
  try {
    return response.headers?.get?.("x-final-url") || fallback;
  } catch {
    return fallback;
  }
}

function summarizeErrorBody(text) {
  const trimmed = (text || "").replace(/\s+/g, " ").trim();
  if (!trimmed || trimmed.startsWith("<")) return "";
  return ` (${trimmed.slice(0, 120)})`;
}

async function fetchTextViaLocalProxy(url, timeout = requestTimeoutMs) {
  const response = await fetch(`${localProxyFetchUrl}${encodeURIComponent(url)}`, {
    signal: withTimeout(timeout),
    cache: "no-store",
  });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}${summarizeErrorBody(text)}`);
  }

  return { text, finalUrl: readFinalUrl(response, url) };
}

async function fetchTextViaAllOrigins(url, timeout = requestTimeoutMs) {
  const response = await fetch(`${allOriginsUrl}${encodeURIComponent(url)}`, {
    signal: withTimeout(timeout),
    cache: "no-store",
  });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`AllOrigins respondeu HTTP ${response.status}`);
  }

  return { text, finalUrl: url };
}

async function fetchFeedViaRss2Json(feedUrl, source) {
  const response = await fetch(`${rss2JsonUrl}${encodeURIComponent(feedUrl)}`, {
    signal: withTimeout(requestTimeoutMs),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`RSS2JSON respondeu HTTP ${response.status}`);
  }

  const data = await response.json();
  if (data.status !== "ok") {
    throw new Error(data.message || "RSS2JSON não conseguiu ler este feed.");
  }

  const sourceName =
    source.name ||
    plainText(data.feed?.title || "") ||
    hostnameOf(source.url) ||
    "Fonte desconhecida";
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
    const image = resolveHttpUrl(
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

  return { sourceName, articles };
}

function hostnameOf(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

function formatFeedError(feedUrl, error, proxyAvailable) {
  const detail = error instanceof Error ? error.message : String(error);
  const proxyHint = proxyAvailable
    ? ""
    : " O proxy local não está ativo; rode \"npm run dev\" (ou \"npm run proxy\") e tente de novo.";

  return `Não foi possível carregar ${feedUrl}.${proxyHint} Detalhes: ${detail}`;
}

async function fetchFeedOnce(feedUrl, source, timeout) {
  if (await isLocalProxyAvailable()) {
    const { text, finalUrl } = await fetchTextViaLocalProxy(feedUrl, timeout);
    return parseFeedXml(text, source, finalUrl || feedUrl);
  }

  try {
    return await fetchFeedViaRss2Json(feedUrl, source);
  } catch (jsonError) {
    try {
      const { text } = await fetchTextViaAllOrigins(feedUrl, timeout);
      return parseFeedXml(text, source, feedUrl);
    } catch (publicError) {
      throw new Error(`${jsonError.message}; ${publicError.message}`);
    }
  }
}

async function fetchFeed(
  feedUrl,
  source,
  { timeout = requestTimeoutMs, allowPublicFallback = true } = {},
) {
  const proxyAvailable = await isLocalProxyAvailable();

  try {
    return await fetchFeedOnce(feedUrl, source, timeout);
  } catch (firstError) {
    if (!proxyAvailable || !allowPublicFallback) {
      throw new Error(formatFeedError(feedUrl, firstError, proxyAvailable));
    }

    // Mesmo com o proxy ativo, alguns sites podem recusar o IP do usuário.
    // Nesse caso, tentamos os serviços públicos como última alternativa.
    try {
      return await fetchFeedViaRss2Json(feedUrl, source);
    } catch (jsonError) {
      try {
        const { text } = await fetchTextViaAllOrigins(feedUrl, timeout);
        return parseFeedXml(text, source, feedUrl);
      } catch (publicError) {
        throw new Error(
          formatFeedError(feedUrl, firstError, true) +
            ` Alternativas públicas também falharam (${jsonError.message}; ${publicError.message}).`,
        );
      }
    }
  }
}

function buildCandidateFeedUrls(pageUrl) {
  const url = new URL(pageUrl);
  const candidates = [];

  if (looksLikeFeedUrl(url)) candidates.push(url.href);

  const bases = [new URL("/", url).href];
  const pathLooksLikeFile = /\.[a-z0-9]{2,6}$/i.test(url.pathname);

  if (!pathLooksLikeFile && url.pathname !== "/") {
    const asDirectory = url.href.endsWith("/") ? url.href : `${url.href}/`;
    if (!bases.includes(asDirectory)) bases.push(asDirectory);
  }

  if (!url.pathname.endsWith("/") && !pathLooksLikeFile) {
    const directory = new URL(".", url).href;
    if (!bases.includes(directory)) bases.push(directory);
  }

  for (const base of bases) {
    for (const suffix of commonFeedSuffixes) {
      candidates.push(new URL(suffix, base).href);
    }
  }

  return [...new Set(candidates.filter(Boolean))].slice(0, 14);
}

const knownFeeds = [
  { host: "g1.globo.com", feed: "https://g1.globo.com/rss/g1/" },
  { host: "uol.com.br", feed: "https://rss.uol.com.br/feed/noticias.xml" },
  { host: "folha.uol.com.br", feed: "https://feeds.folha.uol.com.br/emcimadahora/rss091.xml" },
  { host: "cnnbrasil.com.br", feed: "https://www.cnnbrasil.com.br/feed/" },
  { host: "exame.com", feed: "https://exame.com/feed/" },
  { host: "infomoney.com.br", feed: "https://www.infomoney.com.br/feed/" },
  { host: "olhardigital.com.br", feed: "https://olhardigital.com.br/feed/" },
  { host: "canaltech.com.br", feed: "https://canaltech.com.br/rss/" },
  { host: "brasildefato.com.br", feed: "https://www.brasildefato.com.br/feed/" },
  {
    host: "bbc.com",
    path: "/portuguese",
    feed: "https://feeds.bbci.co.uk/portuguese/rss.xml",
  },
  {
    host: "bbc.co.uk",
    path: "/portuguese",
    feed: "https://feeds.bbci.co.uk/portuguese/rss.xml",
  },
];

function knownFeedFor(pageUrl) {
  try {
    const url = new URL(pageUrl);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");

    for (const entry of knownFeeds) {
      if (host !== entry.host) continue;
      if (entry.path && !url.pathname.toLowerCase().startsWith(entry.path)) continue;
      return entry.feed;
    }
  } catch {
    return "";
  }

  return "";
}

function looksLikeFeedUrl(url) {
  return (
    /(?:feed|rss|atom|\.xml)(?:\/|\?|$)/i.test(url.pathname + url.search) ||
    /[?&](?:feed|format)=/i.test(url.search)
  );
}

function isFeedText(text) {
  const head = text.slice(0, 2000).toLowerCase();
  if (head.includes("<parsererror")) return false;
  return /<(?:rss|feed|rdf:rdf)[\s>]/.test(head);
}

function discoverFeedUrlsFromPage(pageText, pageUrl) {
  const document = new DOMParser().parseFromString(pageText, "text/html");
  const found = [];

  for (const link of [...document.getElementsByTagName("link")]) {
    const rel = (link.getAttribute("rel") || "").toLowerCase();
    if (!rel.includes("alternate")) continue;

    const href = link.getAttribute("href") || "";
    const type = (link.getAttribute("type") || "").toLowerCase();
    if (!/rss|atom|xml|json/.test(type) && !/feed|rss|atom|\.xml/.test(href)) {
      continue;
    }

    found.push(href);
  }

  for (const anchor of [...document.getElementsByTagName("a")]) {
    const href = anchor.getAttribute("href") || "";
    const text = (anchor.textContent || "").toLowerCase();
    if (/(?:feed|rss|atom)/i.test(href) || /\brss\b|\batom\b|\bfeed\b/.test(text)) {
      found.push(href);
    }
  }

  const resolved = found
    .map((href) => resolveHttpUrl(href, pageUrl))
    .filter((url) => url && !isCommentFeed(url));

  return [...new Set(resolved)];
}

function isCommentFeed(url) {
  return /\/comments?\/feed\/?(?:[?#]|$)|\/feed\/(?:comments?)\/?|[?&]feed=comments/i.test(
    url,
  );
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

  const tried = new Set();
  let lastError = null;

  function accept(feedUrl, result) {
    tried.add(feedUrl);
    source.name = source.name || result.sourceName;
    source.feedUrl = feedUrl;
    return { source, articles: result.articles };
  }

  async function tryFeedUrl(feedUrl) {
    if (tried.has(feedUrl)) return null;
    tried.add(feedUrl);

    try {
      const result = await fetchFeed(feedUrl, source, {
        timeout: discoveryTimeoutMs,
        allowPublicFallback: false,
      });
      return accept(feedUrl, result);
    } catch (error) {
      lastError = error;
      return null;
    }
  }

  async function tryFeedUrls(feedUrls) {
    const pending = [...new Set(feedUrls)]
      .filter((feedUrl) => !tried.has(feedUrl))
      .slice(0, 6);

    if (pending.length === 0) return null;

    for (const feedUrl of pending) tried.add(feedUrl);

    const attempts = pending.map((feedUrl) =>
      fetchFeed(feedUrl, source, {
        timeout: discoveryTimeoutMs,
        allowPublicFallback: false,
      })
        .then((result) => ({ feedUrl, result }))
        .catch((error) => {
          lastError = error;
          return null;
        }),
    );

    const settled = (await Promise.all(attempts)).filter(Boolean);
    if (settled.length === 0) return null;

    // Páginas do WordPress anunciam o feed do site e o feed de comentários.
    // Ficamos com o que tiver mais publicações.
    settled.sort((a, b) => b.result.articles.length - a.result.articles.length);
    return accept(settled[0].feedUrl, settled[0].result);
  }

  // 1. A própria URL pode ser um feed.
  if (looksLikeFeedUrl(new URL(pageUrl))) {
    const direct = await tryFeedUrl(pageUrl);
    if (direct) return direct;
  }

  // 2. Abre a página e procura <link rel="alternate"> ou links de feed.
  let pageText = null;
  try {
    const page = await fetchTextViaBestTransport(pageUrl, discoveryTimeoutMs);
    pageText = page.text;
  } catch (error) {
    lastError = error;
  }

  if (pageText && isFeedText(pageText)) {
    try {
      const parsed = parseFeedXml(pageText, source, pageUrl);
      tried.add(pageUrl);
      return accept(pageUrl, parsed);
    } catch (error) {
      lastError = error;
    }
  }

  if (pageText && !isFeedText(pageText)) {
    const discovered = discoverFeedUrlsFromPage(pageText, pageUrl).slice(0, 6);
    if (discovered.length > 0) {
      const fromPage = await tryFeedUrls(discovered);
      if (fromPage) return fromPage;
    }
  }

  // 3. Feeds conhecidos de sites populares que não anunciam o endereço na página.
  const knownFeed = knownFeedFor(pageUrl);
  if (knownFeed) {
    const known = await tryFeedUrl(knownFeed);
    if (known) return known;
  }

  // 4. Caminhos comuns de feeds (/feed/, /rss.xml, ...).
  //    Se o caminho devolver uma página HTML (um "hub" de feeds), os links
  //    encontrados nela também são testados.
  const remaining = maxDiscoveryCandidates - tried.size;
  if (remaining > 0) {
    const common = buildCandidateFeedUrls(pageUrl).slice(0, remaining);
    const results = await Promise.all(
      common.map(async (feedUrl) => {
        if (tried.has(feedUrl)) return {};
        tried.add(feedUrl);

        try {
          const { text, finalUrl } = await fetchTextViaBestTransport(
            feedUrl,
            discoveryTimeoutMs,
          );

          if (isFeedText(text)) {
            return {
              feedUrl,
              feed: parseFeedXml(text, source, finalUrl || feedUrl),
            };
          }

          return {
            hubFeeds: discoverFeedUrlsFromPage(text, finalUrl || feedUrl),
          };
        } catch (error) {
          lastError = error;
          return {};
        }
      }),
    );

    const winner = results.find((result) => result.feed);
    if (winner) {
      return accept(winner.feedUrl, winner.feed);
    }

    const hubFeeds = results.flatMap((result) => result.hubFeeds || []);
    if (hubFeeds.length > 0) {
      const fromHubs = await tryFeedUrls(hubFeeds.slice(0, 6));
      if (fromHubs) return fromHubs;
    }
  }

  if (lastError) {
    const detail = lastError instanceof Error ? lastError.message : String(lastError);
    throw new Error(
      `Não encontrei um feed RSS/Atom em ${pageUrl}. Se o site publica um feed, informe o endereço direto dele (por exemplo, ${new URL("/feed/", pageUrl).href}). Detalhes: ${detail}`,
    );
  }

  throw new Error(
    `Não encontrei um feed RSS/Atom em ${pageUrl}. Verifique se o site publica um feed ou informe o endereço direto dele (por exemplo, ${new URL("/feed/", pageUrl).href}).`,
  );
}

async function fetchTextViaBestTransport(url, timeout) {
  if (await isLocalProxyAvailable()) {
    return fetchTextViaLocalProxy(url, timeout);
  }

  try {
    return await fetchTextViaAllOrigins(url, timeout);
  } catch (error) {
    throw new Error(
      `Não foi possível abrir ${url}. O proxy local não está ativo; rode "npm run dev" (ou "npm run proxy") e tente novamente. Detalhes: ${error.message}`,
    );
  }
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

function sourceLabel(source) {
  if (source.name) return source.name;
  return hostnameOf(source.url) || "Fonte desconhecida";
}
