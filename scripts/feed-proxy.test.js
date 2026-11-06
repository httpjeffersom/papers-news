import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const proxyScript = path.join(root, "scripts", "feed-proxy.cjs");
const require = createRequire(import.meta.url);
const { fetchTarget } = require(proxyScript);

function reserveFreePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

function startProxy(port, extraEnv) {
  return spawn(process.execPath, [proxyScript], {
    cwd: root,
    env: { ...process.env, FEED_PROXY_PORT: String(port), ...extraEnv },
    stdio: "ignore",
  });
}

function waitForExit(child, timeoutMs) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve("ainda ativo"), timeoutMs);
    child.once("exit", (code) => {
      clearTimeout(timer);
      resolve(code);
    });
  });
}

test("o proxy encerra sozinho quando o aplicativo dono desaparece", async () => {
  const port = await reserveFreePort();
  const previous = spawn(process.execPath, ["-e", "process.exit(0)"], { stdio: "ignore" });
  await new Promise((resolve) => previous.once("exit", resolve));

  const proxy = startProxy(port, { PAPERS_NEWS_PARENT_PID: String(previous.pid) });
  const result = await waitForExit(proxy, 15000);

  if (result === "ainda ativo") proxy.kill();
  assert.equal(result, 0);
});

test("o proxy continua ativo enquanto o aplicativo dono existe", async () => {
  const port = await reserveFreePort();
  const proxy = startProxy(port, { PAPERS_NEWS_PARENT_PID: String(process.pid) });

  try {
    await new Promise((resolve) => setTimeout(resolve, 4500));
    assert.equal(proxy.exitCode, null);
  } finally {
    proxy.kill();
    await waitForExit(proxy, 5000);
  }
});

test("o proxy bloqueia redirecionamentos para endereços privados", async () => {
  const originalFetch = globalThis.fetch;
  const requestedUrls = [];

  globalThis.fetch = async (url) => {
    requestedUrls.push(String(url));
    return {
      status: 302,
      headers: new Headers({ location: "http://127.0.0.1/admin" }),
      body: { cancel: async () => {} },
    };
  };

  try {
    await assert.rejects(
      fetchTarget(new URL("https://feeds.example/start")),
      /Endereços locais e privados não são permitidos/,
    );
    assert.deepEqual(requestedUrls, ["https://feeds.example/start"]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("o proxy valida e segue redirecionamentos públicos", async () => {
  const originalFetch = globalThis.fetch;
  const requestedUrls = [];

  globalThis.fetch = async (url) => {
    requestedUrls.push(String(url));
    if (requestedUrls.length === 1) {
      return {
        status: 302,
        headers: new Headers({ location: "/feed.xml" }),
        body: { cancel: async () => {} },
      };
    }

    return new Response("<rss />", {
      status: 200,
      headers: { "content-type": "application/rss+xml" },
    });
  };

  try {
    const result = await fetchTarget(new URL("https://feeds.example/start"));
    assert.deepEqual(requestedUrls, [
      "https://feeds.example/start",
      "https://feeds.example/feed.xml",
    ]);
    assert.equal(result.finalUrl, "https://feeds.example/feed.xml");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
