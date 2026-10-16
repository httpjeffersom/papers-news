export async function openExternalUrl(url) {
  if (globalThis.Neutralino?.os?.open) {
    await globalThis.Neutralino.os.open(url);
    return;
  }

  globalThis.open(url, "_blank", "noopener,noreferrer");
}
