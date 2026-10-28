const http = require("node:http");
const { execFileSync } = require("node:child_process");

const HOST = process.env.FEED_PROXY_HOST || "127.0.0.1";
const PORT = Number(process.env.FEED_PROXY_PORT || 8787);
const ALLOW_PRIVATE_HOSTS = process.env.FEED_PROXY_ALLOW_PRIVATE === "1";
const REQUEST_TIMEOUT_MS = 25000;
const MAX_RESPONSE_BYTES = 15 * 1024 * 1024;
const WATCHDOG_INTERVAL_MS = 2000;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 PapersNews/0.5.2";

const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers": "content-type",
  "access-control-expose-headers": "x-final-url, x-feed-content-type",
};

function sendJson(response, status, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(status, {
    ...CORS_HEADERS,
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
    "cache-control": "no-store",
  });
  response.end(body);
}

function sendText(response, status, body, extraHeaders = {}) {
  response.writeHead(status, {
    ...CORS_HEADERS,
    "content-type": "text/plain; charset=utf-8",
    "content-length": Buffer.byteLength(body),
    "cache-control": "no-store",
    ...extraHeaders,
  });
  response.end(body);
}

function isPrivateIpv4(hostname) {
  const parts = hostname.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }

  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127)
  );
}

function isPrivateHost(hostname) {
  const host = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (host === "::1" || host === "::") return true;
  if (host.startsWith("fc") || host.startsWith("fd")) return true;
  if (host.startsWith("fe80")) return true;
  return isPrivateIpv4(host);
}

function parseTarget(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("Informe uma URL válida em ?url=.");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Apenas URLs http:// e https:// são permitidas.");
  }

  if (!ALLOW_PRIVATE_HOSTS && isPrivateHost(url.hostname)) {
    throw new Error("Endereços locais e privados não são permitidos.");
  }

  return url;
}

function detectCharset(buffer, contentType) {
  const fromHeader = /charset\s*=\s*["']?([\w-]+)/i.exec(contentType || "")?.[1];
  if (fromHeader) return fromHeader;

  const head = new TextDecoder("latin1").decode(buffer.subarray(0, 400));
  const fromXml = /encoding\s*=\s*["']([\w-]+)["']/i.exec(head)?.[1];
  if (fromXml) return fromXml;

  const fromMeta = /<meta[^>]+charset\s*=\s*["']?([\w-]+)/i.exec(head)?.[1];
  return fromMeta || "utf-8";
}

function decodeBody(buffer, contentType) {
  const charset = detectCharset(buffer, contentType);
  let text;
  try {
    text = new TextDecoder(charset).decode(buffer);
  } catch {
    text = new TextDecoder("utf-8").decode(buffer);
  }

  // O texto já foi convertido para Unicode aqui. Um DOMParser recebendo string
  // ignora o encoding declarado, mas manter "ISO-8859-1" pode confundir alguns
  // leitores. Normalizamos a declaração XML para UTF-8.
  return text
    .replace(/^\uFEFF/, "")
    .replace(
      /^(<\?xml[^>]*?encoding\s*=\s*["'])[^"']+(["'])/i,
      "$1UTF-8$2",
    );
}

async function fetchTarget(target) {
  const response = await fetch(target, {
    redirect: "follow",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers: {
      "user-agent": USER_AGENT,
      accept:
        "application/rss+xml, application/atom+xml, application/xml, text/xml, application/json, text/html;q=0.9, */*;q=0.8",
      "accept-language": "pt-BR,pt;q=0.9,en;q=0.8",
      "cache-control": "no-cache",
    },
  });

  const declaredLength = Number(response.headers.get("content-length") || 0);
  if (declaredLength > MAX_RESPONSE_BYTES) {
    throw new Error("A resposta do site é grande demais para ser carregada.");
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.byteLength > MAX_RESPONSE_BYTES) {
    throw new Error("A resposta do site é grande demais para ser carregada.");
  }

  const contentType = response.headers.get("content-type") || "";
  return {
    status: response.status,
    ok: response.ok,
    finalUrl: response.url || target.href,
    contentType,
    body: decodeBody(buffer, contentType),
  };
}

const server = http.createServer(async (request, response) => {
  if (request.method === "OPTIONS") {
    response.writeHead(204, CORS_HEADERS);
    response.end();
    return;
  }

  if (request.method !== "GET") {
    sendJson(response, 405, { error: "Método não permitido. Use GET." });
    return;
  }

  const requestUrl = new URL(request.url || "/", `http://${HOST}:${PORT}`);

  if (requestUrl.pathname === "/health") {
    sendJson(response, 200, { ok: true, service: "papers-news-feed-proxy", version: "0.5.2" });
    return;
  }

  if (requestUrl.pathname !== "/fetch") {
    sendText(
      response,
      200,
      [
        "Proxy local do Papers News.",
        "Uso: /fetch?url=https%3A%2F%2Fexemplo.com%2Ffeed%2F",
        "Saúde: /health",
      ].join("\n"),
    );
    return;
  }

  const rawTarget = requestUrl.searchParams.get("url");
  if (!rawTarget) {
    sendJson(response, 400, { error: "Informe a URL de destino em ?url=." });
    return;
  }

  let target;
  try {
    target = parseTarget(rawTarget);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  try {
    const result = await fetchTarget(target);
    sendText(response, result.status, result.body, {
      "x-final-url": result.finalUrl,
      "x-feed-content-type": result.contentType,
    });
  } catch (error) {
    const message =
      error?.name === "TimeoutError" || error?.name === "AbortError"
        ? "O site demorou demais para responder."
        : error?.message || "Falha ao acessar o site.";
    sendText(response, 502, message, { "x-final-url": target.href });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Proxy de feeds do Papers News em http://${HOST}:${PORT}`);
  watchOwnerProcess();
});

function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === "EPERM";
  }
}

function readWindowsProcess(pid) {
  if (process.platform !== "win32") return null;

  const script = [
    `$p = Get-CimInstance Win32_Process -Filter "ProcessId=${pid}" -ErrorAction SilentlyContinue;`,
    "if ($p) {",
    "  [pscustomobject]@{ name = $p.Name; parent = $p.ParentProcessId } |",
    "    ConvertTo-Json -Compress",
    "}",
  ].join(" ");

  const output = execFileSync(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-Command", script],
    { encoding: "utf8", timeout: 12000, windowsHide: true },
  ).trim();

  return output ? JSON.parse(output) : null;
}

/**
 * O app inicia o proxy com `cmd.exe /c`, então o pai direto é o cmd e o
 * processo que precisa continuar vivo é o avô (o próprio aplicativo).
 * Sem isso, o proxy sobrevive ao fechamento do app e mantém, por herança,
 * o socket da porta do servidor local — o que faz a próxima execução abrir
 * com a tela preta.
 */
function resolveOwnerPid() {
  const explicit = Number(process.env.PAPERS_NEWS_PARENT_PID || 0);
  if (Number.isInteger(explicit) && explicit > 0) return explicit;

  const parent = process.ppid;
  const info = readWindowsProcess(parent);

  if (info && String(info.name).toLowerCase() === "cmd.exe") {
    const grandparent = Number(info.parent);
    if (Number.isInteger(grandparent) && grandparent > 0) return grandparent;
  }

  return parent;
}

function stopProxy() {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 500).unref();
}

function watchOwnerProcess() {
  let pollTimer = null;

  const poll = (ownerPid) => {
    pollTimer = setInterval(() => {
      if (isProcessAlive(ownerPid)) return;

      clearInterval(pollTimer);
      console.log("Aplicativo encerrado. Encerrando o proxy de feeds.");
      stopProxy();
    }, WATCHDOG_INTERVAL_MS);

    pollTimer.unref();
  };

  const resolveAndPoll = () => {
    let ownerPid;

    try {
      ownerPid = resolveOwnerPid();
    } catch {
      // O WMI pode falhar sob carga logo após o boot; tenta de novo.
      return false;
    }

    if (!ownerPid || ownerPid === process.pid) return false;

    poll(ownerPid);
    return true;
  };

  if (resolveAndPoll()) return;

  const retryTimer = setInterval(() => {
    if (!resolveAndPoll()) return;
    clearInterval(retryTimer);
  }, 5000);

  retryTimer.unref();
}

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`A porta ${PORT} já está em uso.`);
  } else {
    console.error("Falha ao iniciar o proxy de feeds:", error.message);
  }
  process.exit(1);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 500).unref();
  });
}
