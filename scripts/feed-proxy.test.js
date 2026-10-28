import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const proxyScript = path.join(root, "scripts", "feed-proxy.cjs");

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
