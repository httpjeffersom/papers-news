import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const mode = process.argv[2] || "dev";
const proxyBaseUrl = `http://${process.env.FEED_PROXY_HOST || "127.0.0.1"}:${process.env.FEED_PROXY_PORT || 8787}`;
const node = process.execPath;
const viteBin = path.join(root, "node_modules", "vite", "bin", "vite.js");
const neuBin = path.join(root, "node_modules", "@neutralinojs", "neu", "bin", "neu.js");

function assertFile(file, hint) {
  if (!existsSync(file)) {
    console.error(`Arquivo não encontrado: ${file}`);
    console.error(hint);
    process.exit(1);
  }
}

async function isProxyRunning() {
  try {
    const response = await fetch(`${proxyBaseUrl}/health`, {
      signal: AbortSignal.timeout(1200),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForProxy(timeoutMs = 8000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await isProxyRunning()) return true;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return false;
}

function stopChild(child) {
  if (!child || child.exitCode !== null || child.killed) return;

  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
    });
    return;
  }

  child.kill("SIGTERM");
}

function run(command, args, label) {
  return new Promise((resolve) => {
    console.log(`\n> ${label}\n`);
    const child = spawn(command, args, {
      cwd: root,
      stdio: "inherit",
      env: process.env,
    });

    child.on("exit", (code) => resolve(code ?? 0));
    child.on("error", (error) => {
      console.error(`Falha ao executar ${label}:`, error.message);
      resolve(1);
    });
  });
}

function runOnce(command, args, label) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      stdio: "inherit",
      env: process.env,
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${label} terminou com código ${code}.`));
      }
    });
    child.on("error", reject);
  });
}

async function main() {
  assertFile(viteBin, "Execute npm install antes de iniciar o projeto.");

  let proxyProcess = null;
  if (await isProxyRunning()) {
    console.log(`Proxy de feeds já está ativo em ${proxyBaseUrl}`);
  } else {
    proxyProcess = spawn(node, [path.join(root, "scripts", "feed-proxy.mjs")], {
      cwd: root,
      stdio: "inherit",
      env: process.env,
    });

    if (await waitForProxy()) {
      console.log(`Proxy de feeds iniciado em ${proxyBaseUrl}`);
    } else {
      console.warn(
        "Não foi possível iniciar o proxy local. O app tentará usar serviços públicos, que podem falhar.",
      );
    }
  }

  const shutdown = () => {
    stopChild(proxyProcess);
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  let exitCode = 0;
  try {
    if (mode === "dev") {
      exitCode = await run(node, [viteBin, "--host", "127.0.0.1"], "Vite (dev)");
    } else if (mode === "preview") {
      await runOnce(node, [viteBin, "build"], "Build de produção");
      exitCode = await run(node, [viteBin, "preview", "--host", "127.0.0.1"], "Vite (preview)");
    } else if (mode === "desktop") {
      assertFile(neuBin, "Execute npm run desktop:update antes de abrir o desktop.");
      await runOnce(node, [viteBin, "build"], "Build de produção");
      exitCode = await run(node, [neuBin, "run"], "Neutralino");
    } else {
      console.error(`Modo desconhecido: ${mode}. Use dev, preview ou desktop.`);
      exitCode = 1;
    }
  } catch (error) {
    console.error(error.message);
    exitCode = 1;
  } finally {
    stopChild(proxyProcess);
  }

  process.exit(exitCode);
}

main();
