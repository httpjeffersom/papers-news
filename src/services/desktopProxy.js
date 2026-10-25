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
  const separator = base.includes("\\") ? "\\" : "/";
  return `${base.replace(/[\\/]+$/, "")}${separator}${name}`;
}

async function candidatePaths() {
  const os = neutralino()?.os;
  const candidates = [];

  for (const variable of ["NL_PATH", "NL_CWD"]) {
    try {
      const value = await os.getEnv(variable);
      if (value) candidates.push(joinPath(value, proxyExecutable));
    } catch {
      // A variável pode não existir em todos os modos do Neutralino.
    }
  }

  // O processo é iniciado no diretório do executável principal, então o
  // nome relativo funciona mesmo quando NL_PATH não é exposto.
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
  for (const candidate of await candidatePaths()) {
    try {
      await neutralino().os.spawnProcess(`"${candidate}"`);
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
