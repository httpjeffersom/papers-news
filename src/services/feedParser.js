export const maxArticlesPerFeed = 30;

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

export function resolveHttpUrl(value, baseUrl) {
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

export function getInitials(name) {
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

export function plainText(value) {
  if (typeof value !== "string" || !value.trim()) return "";

  try {
    const document = new DOMParser().parseFromString(
      `<div>${value}</div>`,
      "text/html",
    );
    const text = document.documentElement?.textContent ?? value;
    return text.replace(/\s+/g, " ").trim();
  } catch {
    return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }
}

function elementName(element) {
  return (element?.localName || element?.tagName || "").toLowerCase();
}

function firstByNames(parent, names) {
  if (!parent) return null;

  for (const name of names) {
    const match = parent.getElementsByTagName(name)[0];
    if (match) return match;
  }

  return null;
}

function childText(parent, names) {
  return firstByNames(parent, names)?.textContent?.trim() ?? "";
}

function hostnameOf(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

const imageUrlPattern = /\.(?:jpe?g|png|gif|webp|avif|svg|bmp)(?:[?#]|$)/i;

function repairDuplicateHost(url) {
  try {
    const parsed = new URL(url);
    const match = /^\/([a-z0-9.-]+\.[a-z]{2,})(\/.*)$/i.exec(
      parsed.pathname,
    );
    if (!match) return url;

    const embeddedHost = match[1].toLowerCase();
    const currentHost = parsed.hostname.toLowerCase();

    if (embeddedHost === currentHost) {
      parsed.pathname = match[2];
      return parsed.href;
    }

    if (
      embeddedHost.endsWith(`.${currentHost}`) ||
      currentHost.endsWith(`.${embeddedHost}`)
    ) {
      parsed.hostname = embeddedHost;
      parsed.pathname = match[2];
      return parsed.href;
    }

    return url;
  } catch {
    return url;
  }
}

function isImageCandidate(url, type = "") {
  if (!url) return false;
  if (/^video\//i.test(type)) return false;
  if (/^image\//i.test(type)) return true;
  return imageUrlPattern.test(url);
}

function firstImageSource(value) {
  if (typeof value !== "string" || !value) return "";

  try {
    const document = new DOMParser().parseFromString(
      `<div>${value}</div>`,
      "text/html",
    );
    const image = document.getElementsByTagName("img")[0];
    return image?.getAttribute("src") || "";
  } catch {
    return "";
  }
}

function mediaUrls(item, tags, alwaysImage = false) {
  const urls = [];

  for (const tag of tags) {
    for (const node of item.getElementsByTagName(tag)) {
      const url = node.getAttribute("url") || node.getAttribute("href");
      if (url) {
        urls.push({
          url,
          type: node.getAttribute("type") || "",
          alwaysImage,
        });
      }
    }
  }

  return urls;
}

function pickImageUrl(item, baseUrl, htmlSnippets) {
  const candidates = [];

  for (const snippet of htmlSnippets) {
    const src = firstImageSource(snippet);
    if (src) candidates.push({ url: src, type: "" });
  }

  candidates.push(...mediaUrls(item, ["media:thumbnail", "itunes:image"], true));
  candidates.push(...mediaUrls(item, ["media:content", "media:group"]));
  candidates.push(...mediaUrls(item, ["enclosure"]));

  for (const link of item.getElementsByTagName("link")) {
    if (link.getAttribute("rel") === "enclosure") {
      const href = link.getAttribute("href");
      if (href) candidates.push({ url: href, type: link.getAttribute("type") || "" });
    }
  }

  for (const candidate of candidates) {
    const repaired = repairDuplicateHost(candidate.url);
    if (!candidate.alwaysImage && !isImageCandidate(repaired, candidate.type)) {
      continue;
    }

    const resolved = resolveHttpUrl(repaired, baseUrl);
    if (resolved) return resolved;
  }

  return "";
}

function getItemLink(item, rootName) {
  if (rootName === "feed") {
    const links = [...item.getElementsByTagName("link")];
    const alternate = links.find((link) => {
      const rel = link.getAttribute("rel");
      return (!rel || rel === "alternate") && link.getAttribute("href");
    });
    if (alternate) return alternate.getAttribute("href");
  }

  const link = childText(item, ["link"]);
  if (link) return link;

  const guid = childText(item, ["guid"]);
  if (/^https?:\/\//i.test(guid)) return guid;

  return "";
}

function getItemDate(item) {
  const value = childText(item, [
    "pubDate",
    "published",
    "updated",
    "dc:date",
    "date",
  ]);
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? "" : new Date(timestamp).toISOString();
}

const namedEntities = {
  nbsp: "&#160;",
  hellip: "&#8230;",
  mdash: "&#8212;",
  ndash: "&#8211;",
  rsquo: "&#8217;",
  lsquo: "&#8216;",
  ldquo: "&#8220;",
  rdquo: "&#8221;",
  bull: "&#8226;",
  middot: "&#183;",
  copy: "&#169;",
  reg: "&#174;",
  trade: "&#8482;",
  deg: "&#176;",
  laquo: "&#171;",
  raquo: "&#187;",
};

const xmlEntities = new Set(["amp", "lt", "gt", "quot", "apos"]);

function sanitizeXmlEntities(text) {
  return text.replace(/&([a-z][a-z0-9]{1,10});/gi, (match, name) => {
    const lower = name.toLowerCase();
    if (namedEntities[lower]) return namedEntities[lower];
    return xmlEntities.has(lower) ? match : `&amp;${name};`;
  });
}

function parseXml(text, mimeType) {
  return new DOMParser().parseFromString(text, mimeType);
}

function hasParserError(document) {
  try {
    return document.getElementsByTagName("parsererror").length > 0;
  } catch {
    return false;
  }
}

function feedRootName(element) {
  const name = elementName(element);
  if (["rss", "feed", "rdf"].includes(name)) return name;
  if (name === "rdf:rdf" || name === "rdf") return "rdf";
  return "";
}

function findFeedRoot(document) {
  const root = document?.documentElement;
  if (root && feedRootName(root)) return root;

  for (const tag of ["rss", "feed", "rdf:RDF", "rdf:rdf", "rdf"]) {
    const match = document?.getElementsByTagName(tag)?.[0];
    if (match) return match;
  }

  return null;
}

function prepareDocument(xmlText) {
  const sanitized = sanitizeXmlEntities(xmlText);
  let document = parseXml(sanitized, "application/xml");
  let root = findFeedRoot(document);

  if (root && !hasParserError(document)) {
    return { document, root };
  }

  // Alguns feeds publicam HTML/entidades inválidas. Tentamos o parser HTML,
  // que é tolerante, antes de desistir.
  const htmlDocument = parseXml(sanitized, "text/html");
  const htmlRoot = findFeedRoot(htmlDocument);
  if (htmlRoot) {
    return { document: htmlDocument, root: htmlRoot };
  }

  if (root) return { document, root };

  throw new Error("O endereço não retornou um feed RSS/Atom.");
}

export function parseFeedXml(xmlText, source, feedUrl) {
  const { root } = prepareDocument(xmlText);
  const rootName = feedRootName(root);
  let channel = null;
  let items = [];

  if (rootName === "rss") {
    channel = firstByNames(root, ["channel"]);
    items = channel ? [...channel.getElementsByTagName("item")] : [];
  } else if (rootName === "feed") {
    channel = root;
    items = [...root.getElementsByTagName("entry")];
  } else if (rootName === "rdf") {
    channel = firstByNames(root, ["channel"]) || root;
    items = [...root.getElementsByTagName("item")];
  } else {
    throw new Error("O endereço não retornou um feed RSS/Atom.");
  }

  if (!channel) {
    throw new Error("O endereço não retornou um feed RSS/Atom.");
  }

  const sourceName =
    source.name ||
    plainText(childText(channel, ["title"])) ||
    hostnameOf(source.url) ||
    "Fonte desconhecida";
  const seenLinks = new Set();
  const articles = [];

  for (const item of items) {
    if (articles.length >= maxArticlesPerFeed) break;

    const title = childText(item, ["title"]);
    const link = resolveHttpUrl(getItemLink(item, rootName), feedUrl);

    if (!title || !link || seenLinks.has(link)) continue;

    seenLinks.add(link);
    const description = childText(item, ["description", "summary"]);
    const content = childText(item, ["content:encoded", "content"]);
    const image = pickImageUrl(item, link || feedUrl, [description, content]);

    articles.push({
      id: `${source.id}:${link}`,
      sourceId: source.id,
      sourceName,
      sourceInitials: getInitials(sourceName),
      title: plainText(title),
      summary: plainText(description || content),
      publishedAt: getItemDate(item),
      image,
      url: link,
      isDemo: false,
    });
  }

  return { sourceName, articles };
}
