import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const node = process.execPath;
const viteBin = path.join(root, "node_modules", "vite", "bin", "vite.js");
const neuBin = path.join(root, "node_modules", "@neutralinojs", "neu", "bin", "neu.js");
const postjectBin = path.join(root, "node_modules", "postject", "dist", "cli.js");

const packageJson = JSON.parse(
  readFileSync(path.join(root, "package.json"), "utf8"),
);
const version = packageJson.version;
const platform = "win_x64";
const seaFuse = "NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2";
const proxyName = "papers-news-proxy.exe";
const zipName = `papers-news-${version}-${platform}.zip`;

const distRoot = path.join(root, "dist");
const bundleDir = path.join(distRoot, "papers-news");
const tmpRoot = path.join(root, ".tmp");
const workDir = path.join(root, ".tmp", "sea");
const seaConfigPath = path.join(workDir, "sea-config.json");
const seaBlobPath = path.join(workDir, "proxy-sea.blob");
const proxyPath = path.join(bundleDir, proxyName);
const zipPath = path.join(distRoot, zipName);

function assertFile(file, hint) {
  try {
    readFileSync(file);
  } catch {
    console.error(`Arquivo não encontrado: ${file}`);
    if (hint) console.error(hint);
    process.exit(1);
  }
}

function run(command, args, label) {
  return new Promise((resolve, reject) => {
    console.log(`\n> ${label}\n`);
    const child = spawn(command, args, { cwd: root, stdio: "inherit" });

    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${label} terminou com código ${code}.`));
    });
    child.on("error", reject);
  });
}

const readme = `Papers News ${version}
${"=".repeat(`Papers News ${version}`.length)}

1. Extraia esta pasta em um local permanente (por exemplo,
   C:\\Program Files\\Papers News).
2. Execute papers-news-win_x64.exe.
3. Mantenha papers-news-proxy.exe na mesma pasta. Ele é iniciado
   automaticamente pelo aplicativo e é o responsável por buscar os feeds
   sem erros de CORS.
4. Se o Windows SmartScreen avisar sobre um aplicativo não reconhecido,
   clique em "Mais informações" > "Executar assim mesmo". O executável
   não possui assinatura digital.

Licenças: este aplicativo é distribuído sob a licença MIT (arquivo
LICENSE). Os componentes de terceiros e seus textos completos estão em
THIRD-PARTY-NOTICES.txt.

Requisitos: Windows 10 ou 11 com o Microsoft Edge WebView2 Runtime
(presente por padrão no Windows 11 e na maioria dos Windows 10).

Seus dados (fontes, notícias em cache e favoritos) ficam salvos no
armazenamento local do aplicativo, neste computador.
`;

async function main() {
  assertFile(viteBin, "Execute npm install antes de empacotar.");
  assertFile(neuBin, "Execute npm install antes de empacotar.");
  assertFile(postjectBin, "Execute npm install antes de empacotar.");
  assertFile(
    path.join(root, "bin", "neutralino-win_x64.exe"),
    'Execute "npm run desktop:update" para baixar os binarios do Neutralino.',
  );
  assertFile(path.join(root, "LICENSE"), "O arquivo LICENSE do projeto nao foi encontrado.");
  assertFile(
    path.join(root, "THIRD-PARTY-NOTICES.txt"),
    "O arquivo THIRD-PARTY-NOTICES.txt nao foi encontrado.",
  );

  rmSync(distRoot, { recursive: true, force: true });
  // O `neu build` empacota todo o conteudo de `.tmp`, nao apenas
  // `resources`. Sem limpar, restos de execucoes anteriores (inclusive o
  // blob do proxy) entram no `resources.neu` e inflam o pacote.
  rmSync(tmpRoot, { recursive: true, force: true });

  await run(node, [viteBin, "build"], "Build do Vite");
  await run(node, [neuBin, "build"], "Pacote do Neutralino");

  // O Neutralino gera binarios para todas as plataformas. A release do
  // GitHub deste projeto distribui apenas o Windows x64.
  const keep = new Set([`papers-news-${platform}.exe`, "resources.neu"]);
  for (const entry of readdirSync(bundleDir)) {
    if (keep.has(entry)) continue;
    rmSync(path.join(bundleDir, entry), { recursive: true, force: true });
  }

  mkdirSync(workDir, { recursive: true });
  writeFileSync(
    seaConfigPath,
    JSON.stringify(
      {
        main: "scripts/feed-proxy.cjs",
        output: ".tmp/sea/proxy-sea.blob",
        disableExperimentalSEAWarning: true,
      },
      null,
      2,
    ),
  );

  await run(
    node,
    ["--experimental-sea-config", seaConfigPath],
    "Geracao do blob do proxy",
  );

  copyFileSync(node, proxyPath);
  await run(
    node,
    [
      postjectBin,
      proxyPath,
      "NODE_SEA_BLOB",
      seaBlobPath,
      "--sentinel-fuse",
      seaFuse,
    ],
    "Injecao do proxy no executavel",
  );

  writeFileSync(path.join(bundleDir, "LEIA-ME.txt"), readme, "utf8");
  copyFileSync(path.join(root, "LICENSE"), path.join(bundleDir, "LICENSE"));
  copyFileSync(
    path.join(root, "THIRD-PARTY-NOTICES.txt"),
    path.join(bundleDir, "THIRD-PARTY-NOTICES.txt"),
  );

  await run(
    "tar",
    ["-a", "-c", "-f", zipPath, "-C", distRoot, "papers-news"],
    "Compactacao do pacote",
  );

  const hash = createHash("sha256")
    .update(readFileSync(zipPath))
    .digest("hex");

  writeFileSync(`${zipPath}.sha256`, `${hash}  ${zipName}\n`, "utf8");

  console.log(`\nPacote pronto: ${zipPath}`);
  console.log(`SHA-256: ${hash}`);
}

main().catch((error) => {
  console.error("\nFalha ao empacotar:", error.message);
  process.exit(1);
});
