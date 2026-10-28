const proxyBaseUrl = (
  import.meta.env?.VITE_FEED_PROXY_URL || "http://127.0.0.1:8787"
).replace(/\/$/, "");
const proxyExecutable = "papers-news-proxy.exe";
const healthTimeoutMs = 1500;
const startTimeoutMs = 20000;
const retryCooldownMs = 30000;

let inFlight = null;
let lastFailureAt = 0;

function neutralino() {
  return globalThis.Neutralino;
}

export function isDesktopRuntime() {
  return typeof neutralino()?.os?.spawnProcess === "function";
}

function withTimeout(ms) {
  try {
    return globalThis.AbortSignal?.timeout?.(ms);
  } catch {
    return undefined;
  }
}

async function isProxyHealthy() {
  try {
    const response = await fetch(`${proxyBaseUrl}/health`, {
      signal: withTimeout(healthTimeoutMs),
      cache: "no-store",
    });
    return response.ok;
  } catch {
    return false;
  }
}

// O index.html define esta promessa enquanto carrega o cliente do
// Neutralino. Ela evita tentar usar a API nativa antes dela existir.
async function isClientReady() {
  if (globalThis.NL_PORT || globalThis.NL_TOKEN) return true;

  const ready = globalThis.NL_CLIENT_READY;
  if (!ready || typeof ready.then !== "function") return false;

  try {
    return Boolean(await ready);
  } catch {
    return false;
  }
}

function joinPath(base, name) {
  const isWindowsPath = /^[a-zA-Z]:[\\/]/.test(base) || base.startsWith("\\\\");
  const separator = isWindowsPath || base.includes("\\") ? "\\" : "/";
  const normalized = isWindowsPath ? base.replace(/\//g, "\\") : base;
  return `${normalized.replace(/[\\/]+$/, "")}${separator}${name}`;
}

// O Neutralino expõe a pasta do aplicativo nestes globais. Usar
// `os.getEnv` não funciona porque eles não são variáveis de ambiente: o
// caminho relativo acabava dependendo do diretório de trabalho do processo,
// que pode ser qualquer um quando o app é aberto por um atalho.
function candidatePaths() {
  const candidates = [];

  for (const base of [globalThis.NL_PATH, globalThis.NL_CWD]) {
    if (typeof base === "string" && base.trim()) {
      candidates.push(joinPath(base, proxyExecutable));
    }
  }

  candidates.push(proxyExecutable);
  return [...new Set(candidates)];
}

async function waitForProxy() {
  const deadline = Date.now() + startTimeoutMs;

  while (Date.now() < deadline) {
    if (await isProxyHealthy()) return true;
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  return false;
}

async function startProxy() {
  for (const candidate of candidatePaths()) {
    try {
      // A saída é descartada de propósito: quando o caminho não existe, o
      // cmd responde em CP850, e o Neutralino encerra o processo ao tentar
      // serializar esses bytes como UTF-8.
      await neutralino().os.spawnProcess(`"${candidate}" > NUL 2>&1`);
    } catch {
      continue;
    }

    if (await waitForProxy()) return true;
  }

  return false;
}

/**
 * No app desktop empacotado, o proxy de feeds é um executável separado.
 * Ele é iniciado sob demanda porque o WebView não pode abrir conexões
 * arbitrárias sem CORS. No navegador a função não faz nada.
 */
export function ensureDesktopProxy() {
  if (inFlight) return inFlight;
  if (Date.now() - lastFailureAt < retryCooldownMs) return Promise.resolve(false);

  inFlight = (async () => {
    if (!(await isClientReady()) || !isDesktopRuntime()) return false;
    if (await isProxyHealthy()) return true;
    if (await startProxy()) return true;

    lastFailureAt = Date.now();
    return false;
  })()
    .catch(() => {
      lastFailureAt = Date.now();
      return false;
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}
