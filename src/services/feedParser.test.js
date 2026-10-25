import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { DOMParser } from "@xmldom/xmldom";
import {
  getInitials,
  parseFeedXml,
  resolveHttpUrl,
} from "./feedParser.js";

const originalParser = globalThis.DOMParser;
const source = { id: "source-1", name: "", url: "https://blog.example/" };

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

test("parses RSS 2.0, removing duplicates and normalizing content", () => {
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">',
    "<channel><title>Blog Exemplo</title>",
    "<item>",
    "<title>Primeira &nbsp; notícia</title>",
    "<link>https://blog.example/post-1</link>",
    "<pubDate>Sun, 01 Feb 2026 10:00:00 GMT</pubDate>",
    "<description><![CDATA[<p>Resumo <b>forte</b></p><img src=\"/img/1.jpg\">]]></description>",
    "</item>",
    "<item><title>Duplicada</title><link>https://blog.example/post-1</link></item>",
    "<item>",
    "<title>Sem data</title>",
    "<link>/post-2</link>",
    "<description>Texto simples</description>",
    "</item>",
    "<item>",
    "<title>Com mídia</title>",
    '<link>https://blog.example/post-3</link>',
    '<media:content url="https://cdn.example/3.jpg" />',
    "</item>",
    "</channel></rss>",
  ].join("");

  const { sourceName, articles } = parseFeedXml(
    xml,
    source,
    "https://blog.example/feed/",
  );

  assert.equal(sourceName, "Blog Exemplo");
  assert.equal(articles.length, 3);

  const [first, second, third] = articles;
  assert.equal(first.title, "Primeira notícia");
  assert.equal(first.summary, "Resumo forte");
  assert.equal(first.image, "https://blog.example/img/1.jpg");
  assert.equal(first.publishedAt, "2026-02-01T10:00:00.000Z");
  assert.equal(first.sourceInitials, "BE");
  assert.equal(first.id, "source-1:https://blog.example/post-1");

  assert.equal(second.url, "https://blog.example/post-2");
  assert.equal(second.publishedAt, "");

  assert.equal(third.image, "https://cdn.example/3.jpg");
});

test("parses Atom feeds with alternate and enclosure links", () => {
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<feed xmlns="http://www.w3.org/2005/Atom"><title>Atom Exemplo</title>',
    "<entry>",
    "<title>Post Atom</title>",
    '<link rel="alternate" href="/atom/1" />',
    '<link rel="enclosure" href="https://cdn.example/a.jpg" type="image/jpeg" />',
    "<updated>2026-03-02T12:30:00Z</updated>",
    "<summary>Resumo atom</summary>",
    "</entry></feed>",
  ].join("");

  const { sourceName, articles } = parseFeedXml(
    xml,
    source,
    "https://blog.example/atom.xml",
  );

  assert.equal(sourceName, "Atom Exemplo");
  assert.equal(articles.length, 1);
  assert.equal(articles[0].title, "Post Atom");
  assert.equal(articles[0].url, "https://blog.example/atom/1");
  assert.equal(articles[0].image, "https://cdn.example/a.jpg");
  assert.equal(articles[0].publishedAt, "2026-03-02T12:30:00.000Z");
});

test("parses RDF feeds using dc:date", () => {
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"',
    ' xmlns="http://purl.org/rss/1.0/"',
    ' xmlns:dc="http://purl.org/dc/elements/1.1/">',
    '<channel rdf:about="https://rdf.example/"><title>RDF Exemplo</title></channel>',
    '<item rdf:about="https://rdf.example/1">',
    "<title>Post RDF</title>",
    "<link>https://rdf.example/1</link>",
    "<dc:date>2026-04-05T08:00:00Z</dc:date>",
    "<description>Resumo RDF</description>",
    "</item></rdf:RDF>",
  ].join("");

  const { sourceName, articles } = parseFeedXml(
    xml,
    source,
    "https://rdf.example/feed.rdf",
  );

  assert.equal(sourceName, "RDF Exemplo");
  assert.equal(articles.length, 1);
  assert.equal(articles[0].publishedAt, "2026-04-05T08:00:00.000Z");
});

test("rejects documents that are not feeds", () => {
  assert.throws(
    () => parseFeedXml("<html><body>Página comum</body></html>", source, "https://blog.example/"),
    /não retornou um feed RSS\/Atom/,
  );
});

test("generates initials ignoring connectors", () => {
  assert.equal(getInitials("Caderno de Tecnologia"), "CT");
  assert.equal(getInitials("the verge"), "VE");
  assert.equal(getInitials("Tecnoblog"), "TE");
  assert.equal(getInitials(""), "?");
});

test("resolves relative URLs and rejects unsafe protocols", () => {
  assert.equal(
    resolveHttpUrl("/img/1.jpg", "https://blog.example/post/1"),
    "https://blog.example/img/1.jpg",
  );
  assert.equal(
    resolveHttpUrl("javascript:alert(1)", "https://blog.example/"),
    "",
  );
  assert.equal(resolveHttpUrl("", "https://blog.example/"), "");
});
