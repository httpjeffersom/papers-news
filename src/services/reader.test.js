import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { DOMParser } from "@xmldom/xmldom";
import {
  extractArticleContent,
  hasFeedContent,
  loadArticleContent,
  removeDuplicateImage,
  sanitizeArticleHtml,
} from "./reader.js";

const originalParser = globalThis.DOMParser;

before(() => {
  globalThis.DOMParser = DOMParser;
});

after(() => {
  if (originalParser === undefined) {
    delete globalThis.DOMParser;
  } else {
    globalThis.DOMParser = originalParser;
  }
});

test("sanitizes feed HTML and resolves relative links and images", () => {
  const html = sanitizeArticleHtml(
    [
      '<p onclick="alert(1)">Texto <strong>forte</strong></p>',
      '<script>alert("x")</script>',
      '<iframe src="https://ads.example/"></iframe>',
      '<img src="/imagem.jpg" width="800" alt="Foto" onerror="alert(1)" />',
      '<a href="/noticia" onmouseover="alert(1)">Ler mais</a>',
      '<a href="javascript:alert(1)">Perigoso</a>',
    ].join(""),
    "https://blog.example/post/1",
  );

  assert.match(html, /<p>Texto <strong>forte<\/strong><\/p>/);
  assert.match(html, /<img src="https:\/\/blog\.example\/imagem\.jpg" alt="Foto"/);
  assert.match(
    html,
    /<a href="https:\/\/blog\.example\/noticia" rel="noopener noreferrer">Ler mais<\/a>/,
  );
  // O texto de um link perigoso permanece, mas sem o endereço.
  assert.match(html, /Perigoso/);
  assert.doesNotMatch(html, /javascript:|onmouseover|onerror|onclick|script|iframe/i);
});

test("keeps article links and drops empty or unsafe anchors", () => {
  const html = sanitizeArticleHtml(
    [
      '<p>Veja <a href="https://exemplo.com/materia">a matéria completa</a>.</p>',
      '<a href="https://exemplo.com/"><img src="/capa.jpg" alt="Capa" /></a>',
      '<a href="/vazio"></a>',
    ].join(""),
    "https://blog.example/post/2",
  );

  assert.match(
    html,
    /<a href="https:\/\/exemplo\.com\/materia" rel="noopener noreferrer">a matéria completa<\/a>/,
  );
  assert.match(
    html,
    /<a href="https:\/\/exemplo\.com\/" rel="noopener noreferrer"><img src="https:\/\/blog\.example\/capa\.jpg"/,
  );
  assert.doesNotMatch(html, /vazio/);
});

test("removes tracking pixels and hidden content", () => {
  const html = sanitizeArticleHtml(
    [
      '<img src="https://tracker.example/pixel.gif" width="1" height="1" />',
      '<p style="display: none">Escondido</p>',
      "<p>Visível</p>",
    ].join(""),
    "https://blog.example/",
  );

  assert.doesNotMatch(html, /tracker|Escondido/);
  assert.match(html, /Visível/);
});

test("extracts the main article and discards navigation blocks", () => {
  const page = [
    "<html><head><title>Notícia de exemplo</title></head><body>",
    '<nav><a href="/">Início</a><a href="/sobre">Sobre</a></nav>',
    '<div class="share-tools"><p>Compartilhe</p></div>',
    '<main><article class="post-content">',
    "<h1>Um título</h1>",
    "<p>Primeiro parágrafo com bastante conteúdo para a leitura no aplicativo.</p>",
    "<p>Segundo parágrafo, também com texto suficiente para ser considerado parte do artigo principal.</p>",
    '<p>Terceiro parágrafo com uma <a href="/outra">ligação</a> e uma <img src="/foto.jpg" alt="Foto" />.</p>',
    "</article></main>",
    '<footer>Rodapé do site</footer>',
    "</body></html>",
  ].join("");

  const result = extractArticleContent(page, "https://site.example/noticia/1");

  assert.equal(result.title, "Notícia de exemplo");
  assert.ok(result.length > 180);
  assert.match(result.html, /Primeiro parágrafo/);
  assert.match(result.html, /https:\/\/site\.example\/foto\.jpg/);
  assert.doesNotMatch(result.html, /Compartilhe|Rodapé|Início/);
});

test("removes the cover photo repeated in the article content", () => {
  const html = [
    '<figure><img src="https://cdn.example/foto.jpg?w=1200" alt=""><figcaption>Legenda da foto</figcaption></figure>',
    "<p>Texto da notícia.</p>",
    '<p><img src="https://cdn.example/foto.jpg" alt=""></p>',
    '<a href="https://example.com"><img src="https://cdn.example/foto.jpg" alt=""></a>',
    '<img src="https://cdn.example/outra.jpg" alt="Outra foto">',
  ].join("");

  const result = removeDuplicateImage(html, "https://cdn.example/foto.jpg");

  assert.doesNotMatch(result, /foto\.jpg|Legenda da foto/);
  assert.match(result, /Texto da notícia/);
  assert.match(result, /outra\.jpg/);
});

test("keeps the content untouched when the cover photo is not repeated", () => {
  const html = '<p>Texto</p><img src="https://cdn.example/outra.jpg" alt="">';
  const result = removeDuplicateImage(html, "https://cdn.example/capa.jpg");

  assert.equal(result, html);
});

test("recognizes long feed content and rejects short summaries", () => {
  const longText = "Conteúdo completo da publicação. ".repeat(20);
  const withContent = {
    url: "https://blog.example/post",
    content: `<p>${longText}</p>`,
  };

  assert.ok(hasFeedContent(withContent));
  assert.equal(hasFeedContent({ url: "https://blog.example/", content: "<p>Curto</p>" }), null);
  assert.equal(hasFeedContent({ url: "https://blog.example/" }), null);
});

const feedExcerpt = "Resumo da matéria publicado no feed. ".repeat(14);

const pageWithFullArticle = [
  "<html><head><title>Matéria completa</title></head><body>",
  '<article class="post-content"><h1>Matéria completa</h1>',
  '<p>Parágrafo completo da matéria, com bastante texto para a leitura no aplicativo.</p>'.repeat(12),
  "</article></body></html>",
].join("");

test("fetches the page when the feed only brings the excerpt", async () => {
  const article = {
    url: "https://site.example/noticia/1",
    summary: feedExcerpt,
    content: `<p>${feedExcerpt}</p>`,
  };
  let fetchCalls = 0;

  const result = await loadArticleContent(article, {
    fetchPage: async () => {
      fetchCalls += 1;
      return pageWithFullArticle;
    },
  });

  assert.equal(fetchCalls, 1);
  assert.equal(result.origin, "page");
  assert.equal(result.limited, false);
  assert.ok(result.length > feedExcerpt.length);
  assert.match(result.html, /Parágrafo completo/);
});

test("falls back to the feed text when the page cannot be read", async () => {
  const article = {
    url: "https://site.example/noticia/1",
    summary: feedExcerpt,
    content: `<p>${feedExcerpt}</p>`,
  };

  const result = await loadArticleContent(article, {
    fetchPage: async () => {
      throw new Error("bloqueado");
    },
  });

  assert.equal(result.origin, "feed");
  assert.equal(result.limited, true);
  assert.match(result.html, /Resumo da matéria/);
});

test("keeps the feed content when it already contains the whole article", async () => {  const fullText = "Conteúdo completo da publicação. ".repeat(80);
  const article = {
    url: "https://site.example/noticia/1",
    summary: "Resumo",
    content: `<p>${fullText}</p>`,
  };
  let fetchCalls = 0;

  const result = await loadArticleContent(article, {
    fetchPage: async () => {
      fetchCalls += 1;
      return pageWithFullArticle;
    },
  });

  assert.equal(fetchCalls, 0);
  assert.equal(result.origin, "feed");
  assert.equal(result.limited, false);
  assert.match(result.html, /Conteúdo completo da publicação/);
});

test("turns line breaks into paragraphs when there is no block markup", () => {
  const html = sanitizeArticleHtml(
    [
      "Primeira linha da materia.",
      "Segunda linha, com um pouco mais de texto.",
      "Terceira linha que fecha o texto.",
    ].join("\n"),
    "https://blog.example/post",
  );

  assert.match(html, /<p>Primeira linha da materia\.<\/p>/);
  assert.match(html, /<p>Segunda linha, com um pouco mais de texto\.<\/p>/);
  assert.match(html, /<p>Terceira linha que fecha o texto\.<\/p>/);
});

test("preserves existing paragraphs instead of splitting them", () => {
  const html = sanitizeArticleHtml(
    "<p>Paragrafo um.</p><p>Paragrafo dois.</p>",
    "https://blog.example/post",
  );

  assert.equal(html, "<p>Paragrafo um.</p><p>Paragrafo dois.</p>");
});

test("keeps demo content without fetching a page or showing the notice", async () => {
  let fetchCalls = 0;
  const article = {
    url: "https://example.com/",
    isDemo: true,
    summary: "Resumo da demonstração.",
    content:
      "<p>Publicação fictícia usada para demonstrar o modo de leitura do aplicativo, com texto suficiente para o leitor considerar o conteúdo completo e não buscar a página original.</p><h2>Uma leitura sem distrações</h2><p>Texto de exemplo com parágrafos para testar a leitura dentro do Papers News, incluindo títulos e blocos de texto separados.</p>",
  };

  const result = await loadArticleContent(article, {
    fetchPage: async () => {
      fetchCalls += 1;
      return pageWithFullArticle;
    },
  });

  assert.equal(fetchCalls, 0);
  assert.equal(result.origin, "feed");
  assert.equal(result.limited, false);
  assert.match(result.html, /Uma leitura sem distrações/);
});
