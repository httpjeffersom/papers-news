// Modo de leitura do Papers News.
//
// A ideia é simples: transformar o HTML do feed (ou da própria página) em um
// texto limpo, sem menus, scripts, propagandas ou formulários, para ler dentro
// do aplicativo. O HTML resultante é montado a partir de uma lista de tags
// permitidas — nenhum atributo do site original é copiado, e os links do texto
// viram apenas texto (sem navegação dentro do leitor).
import { fetchArticleHtml } from "./newsService.js";
import { resolveHttpUrl } from "./feedParser.js";

export const minReadableLength = 280;

// A partir deste tamanho consideramos que o próprio feed trouxe a matéria
// inteira; abaixo disso tratamos como prévia e buscamos a página original.
export const minCompleteFeedLength = 1200;

const removableTags = new Set([
  "script",
  "style",
  "noscript",
  "iframe",
  "frame",
  "frameset",
  "object",
  "embed",
  "param",
  "form",
  "input",
  "button",
  "select",
  "option",
  "textarea",
  "svg",
  "canvas",
  "video",
  "audio",
  "source",
  "track",
  "template",
  "link",
  "meta",
  "nav",
  "aside",
  "footer",
  "header",
]);

const allowedTags = new Set([
  "p",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
  "blockquote",
  "strong",
  "em",
  "b",
  "i",
  "a",
  "figure",
  "figcaption",
  "img",
  "pre",
  "code",
  "br",
  "hr",
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "th",
  "td",
  "sup",
  "sub",
  "small",
]);

const emptyTagsToPrune = new Set([
  "p",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "li",
  "blockquote",
  "figcaption",
]);

const blockTags = new Set([
  "p",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
  "blockquote",
  "pre",
  "table",
  "figure",
  "hr",
]);

const junkPattern =
  /(share|sharedaddy|social|related|recommend|comment|newsletter|subscribe|cookie|consent|advert|\bads?\b|promo|banner|breadcrumb|menu|sidebar|author-bio|popup|modal|paywall|outbrain|taboola)/i;

const contentPattern =
  /(article|content|post|entry|story|text|materia|matéria|noticia|notícia|body)/i;

function parseHtmlDocument(html) {
  return new DOMParser().parseFromString(
    `<!doctype html><html><body>${html}</body></html>`,
    "text/html",
  );
}

function findById(document, id) {
  for (const element of [...document.getElementsByTagName("*")]) {
    if (element.getAttribute("id") === id) return element;
  }

  return null;
}

function tagNameOf(element) {
  return (element?.nodeName || "").toLowerCase();
}

function textLengthOf(node) {
  return (node?.textContent || "").replace(/\s+/g, " ").trim().length;
}

function isHidden(element) {
  const style = (element.getAttribute("style") || "").toLowerCase();
  const hidden = element.hasAttribute
    ? element.hasAttribute("hidden")
    : (element.getAttribute("hidden") || "") !== "";

  return (
    /display\s*:\s*none/.test(style) ||
    /visibility\s*:\s*hidden/.test(style) ||
    hidden ||
    element.getAttribute("aria-hidden") === "true"
  );
}

function escapeText(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttribute(value) {
  return escapeText(value).replace(/"/g, "&quot;");
}

function buildImage(element, document, baseUrl) {
  const source = resolveHttpUrl(element.getAttribute("src") || "", baseUrl);
  if (!source) return null;

  const width = Number(element.getAttribute("width") || 0);
  const height = Number(element.getAttribute("height") || 0);
  if ((width > 0 && width <= 2) || (height > 0 && height <= 2)) return null;
  if (/pixel|spacer|tracker|1x1/i.test(source)) return null;

  const image = document.createElement("img");
  image.setAttribute("src", source);
  image.setAttribute("alt", element.getAttribute("alt") || "");
  image.setAttribute("loading", "lazy");
  image.setAttribute("decoding", "async");
  return image;
}

function sanitizeChildren(sourceNode, document, baseUrl, target) {
  for (const child of [...(sourceNode.childNodes || [])]) {
    if (child.nodeType === 3) {
      target.appendChild(document.createTextNode(child.nodeValue || ""));
      continue;
    }

    if (child.nodeType !== 1) continue;

    const tag = tagNameOf(child);
    if (removableTags.has(tag) || isHidden(child)) continue;

    if (!allowedTags.has(tag)) {
      sanitizeChildren(child, document, baseUrl, target);
      continue;
    }

    if (tag === "br" || tag === "hr") {
      target.appendChild(document.createElement(tag));
      continue;
    }

    if (tag === "img") {
      const image = buildImage(child, document, baseUrl);
      if (image) target.appendChild(image);
      continue;
    }

    if (tag === "a") {
      // Só links http(s) absolutos viram âncoras. Endereços perigosos
      // (javascript:, data:) ou vazios mantêm apenas o texto.
      const href = resolveHttpUrl(child.getAttribute("href") || "", baseUrl);
      if (!href) {
        sanitizeChildren(child, document, baseUrl, target);
        continue;
      }

      const anchor = document.createElement("a");
      anchor.setAttribute("href", href);
      anchor.setAttribute("rel", "noopener noreferrer");
      sanitizeChildren(child, document, baseUrl, anchor);

      const hasText = textLengthOf(anchor) > 0;
      const hasImage = anchor.getElementsByTagName("img").length > 0;
      if (hasText || hasImage) target.appendChild(anchor);
      continue;
    }

    const element = document.createElement(tag);
    sanitizeChildren(child, document, baseUrl, element);
    target.appendChild(element);
  }
}

function pruneEmptyElements(root) {
  for (const element of [...root.getElementsByTagName("*")].reverse()) {
    if (!emptyTagsToPrune.has(tagNameOf(element))) continue;
    if (textLengthOf(element) > 0) continue;
    if ([...element.getElementsByTagName("img")].length > 0) continue;
    element.parentNode?.removeChild(element);
  }
}

function serializeNode(node) {
  if (!node) return "";
  if (node.nodeType === 3) return escapeText(node.nodeValue ?? "");
  if (node.nodeType !== 1) return "";

  const tag = tagNameOf(node);
  let attributes = "";

  if (node.attributes) {
    for (let index = 0; index < node.attributes.length; index += 1) {
      const attribute = node.attributes.item(index);
      if (!attribute) continue;
      attributes += ` ${attribute.name}="${escapeAttribute(attribute.value)}"`;
    }
  }

  if (tag === "br" || tag === "hr" || tag === "img") {
    return `<${tag}${attributes}>`;
  }

  let inner = "";
  for (const child of [...(node.childNodes || [])]) {
    inner += serializeNode(child);
  }

  return `<${tag}${attributes}>${inner}</${tag}>`;
}

function serializeChildren(root) {
  let html = "";
  for (const child of [...(root.childNodes || [])]) {
    html += serializeNode(child);
  }

  return html;
}

function hasBlockStructure(root) {
  for (const element of [...root.getElementsByTagName("*")]) {
    if (blockTags.has(tagNameOf(element))) return true;
  }

  return false;
}

/**
 * Alguns feeds e páginas separam os parágrafos só com quebras de linha (ou com
 * `<br>`), o que viraria um bloco único no leitor. Quando não há estrutura de
 * blocos, recriamos os parágrafos a partir das linhas do texto.
 */
function splitLooseTextIntoParagraphs(root, document) {
  if (hasBlockStructure(root)) return;

  const lines = (root.textContent || "")
    .replace(/\r\n?/g, "\n")
    .split(/\n+/)
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean);

  if (lines.length < 2) return;

  while (root.firstChild) root.removeChild(root.firstChild);

  for (const line of lines) {
    const paragraph = document.createElement("p");
    paragraph.appendChild(document.createTextNode(line));
    root.appendChild(paragraph);
  }
}

function sanitizeFragment(html, baseUrl) {
  const document = parseHtmlDocument(
    `<div id="papers-news-reader-root">${html}</div>`,
  );
  const source = findById(document, "papers-news-reader-root");
  if (!source) return { html: "", text: "" };

  const root = document.createElement("div");
  sanitizeChildren(source, document, baseUrl, root);
  pruneEmptyElements(root);
  splitLooseTextIntoParagraphs(root, document);

  return {
    html: serializeChildren(root),
    text: (root.textContent || "").replace(/\s+/g, " ").trim(),
  };
}

export function sanitizeArticleHtml(html, baseUrl = "") {
  if (typeof html !== "string" || !html.trim()) return "";
  return sanitizeFragment(html, baseUrl).html;
}

function removeElements(document, predicate) {
  const matches = [];

  for (const element of [...document.getElementsByTagName("*")]) {
    if (predicate(element)) matches.push(element);
  }

  for (const element of matches) {
    element.parentNode?.removeChild(element);
  }
}

function identify(element) {
  return `${element.getAttribute("class") || ""} ${element.getAttribute("id") || ""}`;
}

function scoreCandidate(element) {
  const paragraphs = [...element.getElementsByTagName("p")];
  const paragraphLength = paragraphs.reduce(
    (total, paragraph) => total + textLengthOf(paragraph),
    0,
  );
  const textLength = textLengthOf(element);
  const linkLength = [...element.getElementsByTagName("a")].reduce(
    (total, link) => total + textLengthOf(link),
    0,
  );
  const linkDensity = textLength > 0 ? linkLength / textLength : 1;
  const contentBonus = contentPattern.test(identify(element)) ? 400 : 0;

  return (
    paragraphLength +
    paragraphs.length * 20 +
    textLength * 0.1 +
    contentBonus -
    linkDensity * 400
  );
}

function findContentContainer(document) {
  const candidates = [];

  for (const element of [...document.getElementsByTagName("*")]) {
    const tag = tagNameOf(element);
    const role = (element.getAttribute("role") || "").toLowerCase();
    const isCandidate =
      tag === "article" ||
      tag === "main" ||
      role === "main" ||
      contentPattern.test(identify(element));

    if (!isCandidate) continue;
    if (textLengthOf(element) < minReadableLength) continue;

    candidates.push(element);
  }

  candidates.push(document.body || document.documentElement);

  let best = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const candidate of candidates) {
    if (!candidate) continue;
    const score = scoreCandidate(candidate);
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }

  return best;
}

function readDocumentTitle(document) {
  const title = document.getElementsByTagName("title")[0];
  if (title && textLengthOf(title) > 0) {
    return (title.textContent || "").replace(/\s+/g, " ").trim();
  }

  for (const meta of [...document.getElementsByTagName("meta")]) {
    if ((meta.getAttribute("property") || "") === "og:title") {
      return (meta.getAttribute("content") || "").trim();
    }
  }

  return "";
}

export function extractArticleContent(pageHtml, pageUrl = "") {
  if (typeof pageHtml !== "string" || !pageHtml.trim()) {
    return { html: "", text: "", length: 0, title: "" };
  }

  const document = parseHtmlDocument(pageHtml);
  const title = readDocumentTitle(document);

  removeElements(document, (element) => {
    const tag = tagNameOf(element);
    if (removableTags.has(tag)) return true;
    if (isHidden(element)) return true;

    // Blocos de navegação, compartilhamento e afins costumam ter pouco texto.
    const junk = junkPattern.test(identify(element));
    return junk && textLengthOf(element) < 600;
  });

  const container = findContentContainer(document);
  if (!container) return { html: "", text: "", length: 0, title };

  const root = document.createElement("div");
  sanitizeChildren(container, document, pageUrl, root);
  pruneEmptyElements(root);
  splitLooseTextIntoParagraphs(root, document);

  const text = (root.textContent || "").replace(/\s+/g, " ").trim();
  return {
    html: serializeChildren(root),
    text,
    length: text.length,
    title,
  };
}

export function hasFeedContent(article) {
  if (typeof article?.content !== "string" || !article.content.trim()) {
    return null;
  }

  const fragment = sanitizeFragment(article.content, article.url || "");
  if (fragment.text.length < minReadableLength) return null;

  return { html: fragment.html, text: fragment.text, length: fragment.text.length };
}

function normalizeImageUrl(value) {
  try {
    const url = new URL(value);
    return `${url.hostname.toLocaleLowerCase("en-US")}${url.pathname.replace(/\/$/, "")}`;
  } catch {
    return String(value)
      .replace(/^https?:\/\//i, "")
      .replace(/\/$/, "");
  }
}

/**
 * O feed costuma repetir a mesma foto no conteúdo completo. Como o leitor já
 * exibe a imagem de capa no topo, removemos do texto as cópias iguais (inclusive
 * quando o endereço muda só nos parâmetros de tamanho) para não duplicar.
 */
export function removeDuplicateImage(html, imageUrl) {
  if (typeof html !== "string" || !html.trim() || !imageUrl) return html;

  const target = normalizeImageUrl(imageUrl);
  const document = parseHtmlDocument(
    `<div id="papers-news-reader-root">${html}</div>`,
  );
  const root = findById(document, "papers-news-reader-root");
  if (!root) return html;

  let removed = false;

  for (const image of [...root.getElementsByTagName("img")]) {
    if (normalizeImageUrl(image.getAttribute("src") || "") !== target) continue;

    const parent = image.parentNode;
    parent?.removeChild(image);
    removed = true;

    // Uma figura sem imagens também sai (a legenda pertencia à foto). Em
    // parágrafos e links, remove apenas quando o bloco ficou vazio.
    if (!parent || parent.getElementsByTagName("img").length > 0) continue;

    const parentTag = tagNameOf(parent);
    const isEmpty = textLengthOf(parent) === 0;
    if (parentTag === "figure" || (isEmpty && ["p", "a"].includes(parentTag))) {
      parent.parentNode?.removeChild(parent);
    }
  }

  return removed ? serializeChildren(root) : html;
}

function summaryFallback(article, limited) {
  const summary = (article?.summary || "").trim();
  return {
    html: summary ? `<p>${escapeText(summary)}</p>` : "",
    text: summary,
    length: summary.length,
    origin: "summary",
    limited,
  };
}

function readableFrom(article, source, origin, limited) {
  return {
    html: removeDuplicateImage(source.html, article.image),
    text: source.text,
    length: source.length,
    origin,
    limited,
  };
}

export async function loadArticleContent(
  article,
  { fetchPage = fetchArticleHtml } = {},
) {
  const fromFeed = hasFeedContent(article);

  // As publicações de demonstração já trazem o texto inteiro no próprio dado
  // local: não há página original para buscar.
  if (article?.isDemo && fromFeed) {
    return readableFrom(article, fromFeed, "feed", false);
  }

  // Muitos feeds trazem apenas a chamada da matéria (algumas centenas de
  // caracteres). Nesse caso o texto do feed não basta: buscamos a página
  // original para o leitor exibir a matéria inteira, e não só a prévia.
  if (fromFeed && fromFeed.length >= minCompleteFeedLength) {
    return readableFrom(article, fromFeed, "feed", false);
  }

  let pageUsable = false;

  try {
    const pageHtml = await fetchPage(article.url);
    const extracted = extractArticleContent(pageHtml, article.url);

    if (extracted.length >= minReadableLength) {
      pageUsable = true;

      if (!fromFeed || extracted.length > fromFeed.length) {
        return readableFrom(article, extracted, "page", false);
      }
    }
  } catch {
    // Sem rede ou site bloqueando: o texto do feed ainda é útil.
    pageUsable = false;
  }

  if (fromFeed) {
    return readableFrom(article, fromFeed, "feed", !pageUsable);
  }

  return summaryFallback(article, true);
}
