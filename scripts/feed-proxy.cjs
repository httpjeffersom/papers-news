const http = require("node:http");
const dns = require("node:dns/promises");
const net = require("node:net");
const { execFileSync } = require("node:child_process");

const HOST = process.env.FEED_PROXY_HOST || "127.0.0.1";
const PORT = Number(process.env.FEED_PROXY_PORT || 8787);
const ALLOW_PRIVATE_HOSTS = process.env.FEED_PROXY_ALLOW_PRIVATE === "1";
const APP_VERSION = process.env.PAPERS_NEWS_VERSION || "0.10.0";
const REQUEST_TIMEOUT_MS = 25000;
const MAX_RESPONSE_BYTES = 15 * 1024 * 1024;
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const MAX_REDIRECTS = 5;
const MAX_URL_LENGTH = 8192;
const WATCHDOG_INTERVAL_MS = 2000;
const WATCHDOG_FAILURES = 3;
const DNS_CACHE_TTL_MS = 60000;
const DNS_CHECK_ENABLED = process.env.FEED_PROXY_DNS_CHECK !== "0";
const PRIVATE_HOST_ERROR = "Endereços locais e privados não são permitidos.";
const USER_AGENT =
  `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) ` +
  `Chrome/126.0.0.0 Safari/537.36 PapersNews/${APP_VERSION}`;

// Origens que podem ler a resposta pelo navegador. Em produção a interface roda
// em 127.0.0.1:51789; 5173 e 4173 são o Vite em desenvolvimento/preview.
// <img> não precisa de CORS e continua funcionando sem cabeçalho de origem.
const ALLOWED_ORIGINS = new Set([
  "http://127.0.0.1:51789",
  "http://localhost:51789",
  "http://127.0.0.1:5173",
  "http://localhost:5173",
  "http://127.0.0.1:4173",
  "http://localhost:4173",
]);

const BASE_HEADERS = {
  "cache-control": "no-store",
  "content-security-policy": "default-src 'none'; frame-ancestors 'none'; sandbox",
  "cross-origin-resource-policy": "cross-origin",
  "referrer-policy": "no-referrer",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
};

function corsHeaders(request) {
  const origin = request.headers.origin;
  if (!origin || !ALLOWED_ORIGINS.has(origin)) return {};

  return {
    "access-control-allow-origin": origin,
    vary: "origin",
  };
}

function requestAllowed(request) {
  // Navegadores enviam este cabeçalho em requisições entre sites. Bloquear
  // "cross-site" impede que uma página aberta no navegador use o proxy local
  // como intermediário, mesmo com <img> ou fetch sem CORS.
  if (request.headers["sec-fetch-site"] === "cross-site") return false;

  const origin = request.headers.origin;
  if (!origin) return true;
  return ALLOWED_ORIGINS.has(origin);
}

function sendJson(response, status, payload, extraHeaders = {}) {
  const body = JSON.stringify(payload);
  response.writeHead(status, {
    ...BASE_HEADERS,
    ...extraHeaders,
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
  });
  response.end(body);
}

function sendText(response, status, body, extraHeaders = {}) {
  response.writeHead(status, {
    ...BASE_HEADERS,
    ...extraHeaders,
    "content-type": "text/plain; charset=utf-8",
    "content-length": Buffer.byteLength(body),
  });
  response.end(body);
}

function isPrivateIpv4(hostname) {
  const parts = hostname.split(".").map(Number);
  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return false;
  }

  const [a, b, c] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 192 && b === 0 && (c === 0 || c === 2)) ||
    (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
    (a === 203 && b === 0 && c === 113) ||
    a >= 224
  );
}

function isPrivateIpv6(hostname) {
  const host = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (host === "::" || host === "::1") return true;

  // fc00::/7 (ULA) e fe80::/10 (link-local).
  if (/^f[cd][0-9a-f]{2}:/.test(host)) return true;
  if (/^fe[89ab][0-9a-f]:/.test(host)) return true;

  // Endereços IPv4 mapeados em IPv6, em notação decimal ou hexadecimal.
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/.exec(host);
  if (mapped) return isPrivateIpv4(mapped[1]);

  const mappedHex = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(host);
  if (mappedHex) {
    const high = parseInt(mappedHex[1], 16);
    const low = parseInt(mappedHex[2], 16);
    return isPrivateIpv4(
      `${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`,
    );
  }

  return false;
}

function isPrivateHost(hostname) {
  const host = String(hostname || "")
    .replace(/^\[|\]$/g, "")
    .toLowerCase();

  if (!host) return true;
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (host.endsWith(".local") || host.endsWith(".internal")) return true;
  if (net.isIPv4(host)) return isPrivateIpv4(host);
  if (net.isIPv6(host)) return isPrivateIpv6(host);

  return false;
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
    throw new Error(PRIVATE_HOST_ERROR);
  }

  return url;
}

const dnsCache = new Map();

async function resolveHost(host) {
  const cached = dnsCache.get(host);
  if (cached && cached.expiresAt > Date.now()) return cached.addresses;

  let addresses = [];
  try {
    const results = await dns.lookup(host, { all: true, verbatim: true });
    addresses = results.map((result) => result.address);
  } catch {
    // Se a resolução falhar, o fetch também vai falhar. Deixamos o erro real
    // chegar ao chamador em vez de mascará-lo como bloqueio de segurança.
    addresses = [];
  }

  dnsCache.set(host, {
    addresses,
    expiresAt: Date.now() + DNS_CACHE_TTL_MS,
  });
  return addresses;
}

/**
 * Bloqueia também nomes que resolvem para endereços privados (por exemplo,
 * um domínio público apontando para 127.0.0.1 ou para o metadata da nuvem).
 * A checagem é refeita a cada redirecionamento.
 */
async function assertPublicTarget(url) {
  if (ALLOW_PRIVATE_HOSTS || !DNS_CHECK_ENABLED) return;

  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (isPrivateHost(host)) throw new Error(PRIVATE_HOST_ERROR);
  if (net.isIP(host)) return;

  const addresses = await resolveHost(host);
  if (addresses.some((address) => isPrivateHost(address))) {
    throw new Error(PRIVATE_HOST_ERROR);
  }
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

async function readBodyLimited(response, limit, tooLargeMessage) {
  if (!response.body) return Buffer.alloc(0);

  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      total += value.byteLength;
      if (total > limit) {
        await reader.cancel().catch(() => {});
        throw new Error(tooLargeMessage);
      }

      chunks.push(Buffer.from(value));
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // O stream pode já ter sido cancelado.
    }
  }

  return Buffer.concat(chunks);
}

function tooLargeResponse() {
  return "A resposta do site é grande demais para ser carregada.";
}

function tooLargeImage() {
  return "A imagem é grande demais para ser carregada.";
}

async function fetchTarget(target) {
  let currentTarget = target;
  let response;

  for (let redirects = 0; ; redirects += 1) {
    await assertPublicTarget(currentTarget);

    response = await fetch(currentTarget, {
      redirect: "manual",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: {
        "user-agent": USER_AGENT,
        accept:
          "application/rss+xml, application/atom+xml, application/xml, text/xml, application/json, text/html;q=0.9, */*;q=0.8",
        "accept-language": "pt-BR,pt;q=0.9,en;q=0.8",
        "cache-control": "no-cache",
      },
    });

    const location = response.headers.get("location");
    if (![301, 302, 303, 307, 308].includes(response.status) || !location) {
      break;
    }
    if (redirects >= MAX_REDIRECTS) {
      throw new Error("O site redirecionou vezes demais.");
    }

    const redirectTarget = parseTarget(new URL(location, currentTarget).href);
    try {
      await response.body?.cancel();
    } catch {
      // O corpo do redirecionamento pode já ter sido descartado.
    }
    currentTarget = redirectTarget;
  }

  const declaredLength = Number(response.headers.get("content-length") || 0);
  if (declaredLength > MAX_RESPONSE_BYTES) {
    throw new Error(tooLargeResponse());
  }

  const buffer = await readBodyLimited(
    response,
    MAX_RESPONSE_BYTES,
    tooLargeResponse(),
  );
  if (buffer.byteLength > MAX_RESPONSE_BYTES) {
    throw new Error(tooLargeResponse());
  }

  const contentType = response.headers.get("content-type") || "";
  return {
    status: response.status,
    ok: response.ok,
    finalUrl: response.url || currentTarget.href,
    contentType,
    body: decodeBody(buffer, contentType),
  };
}

/**
 * Baixa a imagem como binário (sem passar pelo decodificador de texto). Serve
 * para os sites que bloqueiam a foto quando ela é pedida direto pelo WebView.
 */
async function fetchImage(target) {
  let currentTarget = target;
  let response;

  for (let redirects = 0; ; redirects += 1) {
    await assertPublicTarget(currentTarget);

    response = await fetch(currentTarget, {
      redirect: "manual",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: {
        "user-agent": USER_AGENT,
        accept: "image/avif,image/webp,image/png,image/jpeg,image/*;q=0.9,*/*;q=0.8",
        "accept-language": "pt-BR,pt;q=0.9,en;q=0.8",
        // Vários CDNs recusam a imagem sem o referer do próprio site; usar a
        // origem como referer é o mais próximo de um navegador abrindo o link.
        referer: `${currentTarget.origin}/`,
        "cache-control": "no-cache",
      },
    });

    const location = response.headers.get("location");
    if (![301, 302, 303, 307, 308].includes(response.status) || !location) {
      break;
    }
    if (redirects >= MAX_REDIRECTS) {
      throw new Error("O site redirecionou vezes demais.");
    }

    const redirectTarget = parseTarget(new URL(location, currentTarget).href);
    try {
      await response.body?.cancel();
    } catch {
      // O corpo do redirecionamento pode já ter sido descartado.
    }
    currentTarget = redirectTarget;
  }

  const declaredLength = Number(response.headers.get("content-length") || 0);
  if (declaredLength > MAX_IMAGE_BYTES) {
    throw new Error(tooLargeImage());
  }

  const buffer = await readBodyLimited(
    response,
    MAX_IMAGE_BYTES,
    tooLargeImage(),
  );
  if (buffer.byteLength > MAX_IMAGE_BYTES) {
    throw new Error(tooLargeImage());
  }

  return {
    status: response.status,
    finalUrl: response.url || currentTarget.href,
    contentType: response.headers.get("content-type") || "application/octet-stream",
    buffer,
  };
}

/**
 * O tipo declarado pelo servidor não é confiável. Conferimos os primeiros bytes
 * e só entregamos formatos de imagem raster. SVG fica de fora de propósito:
 * ele pode carregar script e seria servido na origem do proxy.
 */
function sniffImageType(buffer) {
  if (!buffer || buffer.length < 12) return "";

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buffer.subarray(0, 8).equals(pngSignature)) return "image/png";

  const header = buffer.subarray(0, 12).toString("ascii");
  if (header.startsWith("GIF87a") || header.startsWith("GIF89a")) {
    return "image/gif";
  }
  if (header.startsWith("RIFF") && header.slice(8, 12) === "WEBP") {
    return "image/webp";
  }
  if (header.slice(4, 8) === "ftyp" && /^avi[fs]/.test(header.slice(8, 12))) {
    return "image/avif";
  }
  if (buffer[0] === 0x42 && buffer[1] === 0x4d) return "image/bmp";
  if (
    buffer[0] === 0x00 &&
    buffer[1] === 0x00 &&
    buffer[2] === 0x01 &&
    buffer[3] === 0x00
  ) {
    return "image/x-icon";
  }

  return "";
}

function appServerAlive(port) {
  return new Promise((resolve) => {
    const request = http.get(
      { host: "127.0.0.1", port, path: "/", timeout: 2500 },
      (response) => {
        response.resume();
        resolve(true);
      },
    );

    request.on("timeout", () => {
      request.destroy();
      resolve(false);
    });
    request.on("error", () => resolve(false));
  });
}

/**
 * O proxy pertence à janela do aplicativo. Quando o servidor local do app para
 * de responder (janela fechada ou processo encerrado), o proxy encerra sozinho.
 * Isso evita que ele mantenha a porta 8787 presa entre execuções.
 */
function watchAppServer(port) {
  let failures = 0;

  const timer = setInterval(async () => {
    if (await appServerAlive(port)) {
      failures = 0;
      return;
    }

    failures += 1;
    if (failures < WATCHDOG_FAILURES) return;

    clearInterval(timer);
    console.log("Aplicativo encerrado. Encerrando o proxy de feeds.");
    stopProxy();
  }, WATCHDOG_INTERVAL_MS);

  timer.unref();
}

let server;

if (require.main === module) {
  server = http.createServer(async (request, response) => {
    if (request.method === "OPTIONS") {
      if (!requestAllowed(request)) {
        sendJson(response, 403, { error: "Origem não autorizada." });
        return;
      }

      response.writeHead(204, {
        ...BASE_HEADERS,
        ...corsHeaders(request),
        "access-control-allow-methods": "GET, OPTIONS",
        "access-control-allow-headers": "content-type",
        "access-control-max-age": "600",
      });
      response.end();
      return;
    }

    if (request.method !== "GET") {
      sendJson(
        response,
        405,
        { error: "Método não permitido. Use GET." },
        corsHeaders(request),
      );
      return;
    }

    if (!requestAllowed(request)) {
      sendJson(response, 403, { error: "Origem não autorizada." });
      return;
    }

    if ((request.url || "").length > MAX_URL_LENGTH) {
      sendJson(
        response,
        414,
        { error: "O endereço da requisição é grande demais." },
        corsHeaders(request),
      );
      return;
    }

    const requestUrl = new URL(request.url || "/", `http://${HOST}:${PORT}`);
    const cors = corsHeaders(request);

    if (requestUrl.pathname === "/health") {
      sendJson(
        response,
        200,
        {
          ok: true,
          service: "papers-news-feed-proxy",
          version: APP_VERSION,
        },
        cors,
      );
      return;
    }

    if (requestUrl.pathname === "/image") {
      const rawImage = requestUrl.searchParams.get("url");
      if (!rawImage) {
        sendJson(response, 400, { error: "Informe a URL da imagem em ?url=." }, cors);
        return;
      }

      let imageTarget;
      try {
        imageTarget = parseTarget(rawImage);
      } catch (error) {
        sendJson(response, 400, { error: error.message }, cors);
        return;
      }

      try {
        const image = await fetchImage(imageTarget);
        const imageType = sniffImageType(image.buffer);

        if (!imageType) {
          sendText(
            response,
            415,
            "O endereço não retornou uma imagem suportada.",
            { ...cors, "x-final-url": image.finalUrl },
          );
          return;
        }

        response.writeHead(image.status, {
          ...BASE_HEADERS,
          ...cors,
          "cache-control": "public, max-age=86400",
          "content-type": imageType,
          "content-length": image.buffer.length,
          "x-final-url": image.finalUrl,
        });
        response.end(image.buffer);
      } catch (error) {
        const message =
          error?.name === "TimeoutError" || error?.name === "AbortError"
            ? "O site demorou demais para responder."
            : error?.message || "Falha ao carregar a imagem.";
        sendText(response, 502, message, {
          ...cors,
          "x-final-url": imageTarget.href,
        });
      }
      return;
    }

    if (requestUrl.pathname !== "/fetch") {
      sendText(
        response,
        200,
        [
          "Proxy local do Papers News.",
          "Uso: /fetch?url=https%3A%2F%2Fexemplo.com%2Ffeed%2F",
          "Imagens: /image?url=https%3A%2F%2Fexemplo.com%2Ffoto.jpg",
          "Saúde: /health",
        ].join("\n"),
        cors,
      );
      return;
    }

    const rawTarget = requestUrl.searchParams.get("url");
    if (!rawTarget) {
      sendJson(response, 400, { error: "Informe a URL de destino em ?url=." }, cors);
      return;
    }

    let target;
    try {
      target = parseTarget(rawTarget);
    } catch (error) {
      sendJson(response, 400, { error: error.message }, cors);
      return;
    }

    try {
      const result = await fetchTarget(target);
      sendText(response, result.status, result.body, {
        ...cors,
        "x-final-url": result.finalUrl,
        "x-feed-content-type": result.contentType,
      });
    } catch (error) {
      const message =
        error?.name === "TimeoutError" || error?.name === "AbortError"
          ? "O site demorou demais para responder."
          : error?.message || "Falha ao acessar o site.";
      sendText(response, 502, message, {
        ...cors,
        "x-final-url": target.href,
      });
    }
  });

  server.listen(PORT, HOST, () => {
    console.log(`Proxy de feeds do Papers News em http://${HOST}:${PORT}`);
    const appPort = Number(process.env.PAPERS_NEWS_APP_PORT || 0);
    if (Number.isInteger(appPort) && appPort > 0) {
      watchAppServer(appPort);
    } else {
      watchOwnerProcess();
    }
  });
}

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
 * Modo de desenvolvimento: o app inicia o proxy com `cmd.exe /c`, então o pai
 * direto é o cmd e o processo que precisa continuar vivo é o avô (o próprio
 * aplicativo). Sem isso, o proxy sobrevive ao fechamento do app e mantém,
 * por herança, o socket da porta do servidor local.
 *
 * No app empacotado usamos watchAppServer(), que não depende de WMI/PowerShell.
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

if (server) {
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
}

module.exports = {
  assertPublicTarget,
  fetchImage,
  fetchTarget,
  isPrivateHost,
  parseTarget,
  sniffImageType,
};
