// Só links http(s) podem sair do aplicativo. Endereços como javascript:,
// data:, file: ou vbscript: são descartados antes de chegar ao sistema
// operacional. O conteúdo dos feeds é externo e não deve escolher o que o
// Windows vai executar.
const allowedProtocols = new Set(["http:", "https:"]);

export function normalizeExternalUrl(url) {
  if (typeof url !== "string" || !url.trim()) return "";

  let parsed;
  try {
    parsed = new URL(url.trim());
  } catch {
    return "";
  }

  return allowedProtocols.has(parsed.protocol) ? parsed.href : "";
}

export async function openExternalUrl(url) {
  const safeUrl = normalizeExternalUrl(url);
  if (!safeUrl) {
    throw new Error("Endereço externo inválido.");
  }

  if (globalThis.Neutralino?.os?.open) {
    await globalThis.Neutralino.os.open(safeUrl);
    return;
  }

  if (typeof globalThis.open !== "function") {
    throw new Error("Não foi possível abrir o navegador.");
  }

  globalThis.open(safeUrl, "_blank", "noopener,noreferrer");
}
