import assert from "node:assert/strict";
import test from "node:test";
import { normalizeExternalUrl, openExternalUrl } from "./desktop.js";

test("normaliza apenas endereços http e https", () => {
  assert.equal(
    normalizeExternalUrl(" https://exemplo.com/noticia?a=1 "),
    "https://exemplo.com/noticia?a=1",
  );
  assert.equal(normalizeExternalUrl("http://exemplo.com/"), "http://exemplo.com/");
});

test("descarta esquemas perigosos ou desconhecidos", () => {
  for (const value of [
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "file:///C:/Windows/System32/calc.exe",
    "vbscript:msgbox(1)",
    "ms-settings:privacy",
    "",
    "não é uma url",
    null,
  ]) {
    assert.equal(normalizeExternalUrl(value), "", String(value));
  }
});

test("openExternalUrl entrega ao Neutralino somente o endereço validado", async () => {
  const opened = [];
  const previous = globalThis.Neutralino;
  globalThis.Neutralino = { os: { open: async (url) => opened.push(url) } };

  try {
    await openExternalUrl("https://exemplo.com/noticia");
    assert.deepEqual(opened, ["https://exemplo.com/noticia"]);
    await assert.rejects(() => openExternalUrl("javascript:alert(1)"));
    assert.deepEqual(opened, ["https://exemplo.com/noticia"]);
  } finally {
    globalThis.Neutralino = previous;
  }
});
