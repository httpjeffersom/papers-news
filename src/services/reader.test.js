import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { DOMParser } from "@xmldom/xmldom";
import {
  extractArticleContent,
  hasFeedContent,
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
  assert.match(html, /<a href="https:\/\/blog\.example\/noticia"/);
  assert.match(html, /rel="noopener noreferrer"/);
  assert.doesNotMatch(html, /script|iframe|onclick|onerror|javascript:/i);
  assert.match(html, /Perigoso/);
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
