import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const node = process.execPath;
const packageJson = JSON.parse(
  readFileSync(path.join(root, "package.json"), "utf8"),
);
const msixConfigPath = path.join(root, "appx", "msix.config.json");
const manifestTemplatePath = path.join(root, "appx", "AppxManifest.xml");
const assetScript = path.join(root, "scripts", "generate-msix-assets.ps1");

const distRoot = path.join(root, "dist");
const bundleDir = path.join(distRoot, "papers-news");
const msixRoot = path.join(distRoot, "msix");
const stageDir = path.join(msixRoot, `papers-news-${packageJson.version}-x64`);
const msixPath = path.join(
  distRoot,
  `papers-news-${packageJson.version}-win_x64.msix`,
);

const requireMakeAppx = process.argv.includes("--require-makeappx");
const skipBuild = process.argv.includes("--skip-build");

function fail(message) {
  console.error(`\nFalha ao gerar o MSIX: ${message}`);
  process.exit(1);
}

function run(command, args, label) {
  return new Promise((resolve, reject) => {
    console.log(`\n> ${label}\n`);

    const child = spawn(command, args, {
      cwd: root,
      stdio: "inherit",
      windowsHide: true,
    });

    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${label} terminou com código ${code}.`));
    });
    child.on("error", reject);
  });
}

function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

function toMsixVersion(version) {
  if (typeof version !== "string" || version.includes("-")) {
    throw new Error(
      `A versão "${version}" não é estável. A Microsoft Store exige o formato Major.Minor.Build.Revision, sem sufixo.`,
    );
  }

  const parts = version.split(".").map(Number);
  if (
    parts.length === 0 ||
    parts.length > 4 ||
    parts.some(
      (part) => !Number.isInteger(part) || part < 0 || part > 65535,
    )
  ) {
    throw new Error(
      `A versão "${version}" não pode ser convertida para o formato do MSIX (0 a 65535 em cada parte).`,
    );
  }

  while (parts.length < 4) parts.push(0);
  return parts.join(".");
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function renderManifest(template, values) {
  const rendered = template.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_, key) => {
    if (!(key in values)) {
      throw new Error(`O manifesto usa {{${key}}}, mas não há valor para ele.`);
    }
    return escapeXml(values[key]);
  });

  if (rendered.includes("{{")) {
    throw new Error("Sobrou um marcador não substituído no manifesto.");
  }

  return rendered;
}

function findMakeAppx() {
  const candidates = [];

  if (process.env.MAKEAPPX_PATH) {
    candidates.push(process.env.MAKEAPPX_PATH);
  }

  candidates.push(path.join(root, ".tools", "makeappx.exe"));
  candidates.push(path.join(root, ".tools", "makeappx", "makeappx.exe"));

  const where = spawnSync("where", ["makeappx.exe"], {
    encoding: "utf8",
    windowsHide: true,
  });
  if (where.status === 0) {
    for (const line of where.stdout.split(/\r?\n/)) {
      if (line.trim()) candidates.push(line.trim());
    }
  }

  const kitRoots = [
    process.env["ProgramFiles(x86)"],
    process.env.ProgramFiles,
    "C:\\Program Files (x86)",
    "C:\\Program Files",
  ];

  for (const base of kitRoots) {
    if (!base) continue;

    const versionsDir = path.join(base, "Windows Kits", "10", "bin");
    if (!existsSync(versionsDir)) continue;

    const versions = readdirSync(versionsDir).sort().reverse();
    for (const version of versions) {
      candidates.push(
        path.join(versionsDir, version, "x64", "makeappx.exe"),
        path.join(versionsDir, version, "x86", "makeappx.exe"),
      );
    }
  }

  return candidates.find((candidate) => candidate && existsSync(candidate));
}

function assertFile(file, hint) {
  if (!existsSync(file)) {
    fail(`${file} não foi encontrado.${hint ? ` ${hint}` : ""}`);
  }
}

function validateAssets(assetsDir) {
  const required = [
    "StoreLogo.png",
    "Square44x44Logo.png",
    "Square150x150Logo.png",
    "Square310x310Logo.png",
    "Wide310x150Logo.png",
    "SplashScreen.png",
  ];

  for (const asset of required) {
    const file = path.join(assetsDir, asset);
    assertFile(file, "Rode novamente o empacotador para gerar os ícones.");
    if (statSync(file).size === 0) {
      fail(`O ícone ${asset} foi gerado vazio.`);
    }
  }
}

async function main() {
  if (process.platform !== "win32") {
    fail("o MSIX é um formato do Windows e só pode ser gerado nele.");
  }

  assertFile(msixConfigPath, "Crie appx/msix.config.json.");
  assertFile(manifestTemplatePath, "O modelo appx/AppxManifest.xml sumiu.");
  assertFile(assetScript, "O gerador de ícones não foi encontrado.");

  const config = readJson(msixConfigPath);
  for (const key of [
    "identityName",
    "publisher",
    "publisherDisplayName",
    "displayName",
    "shortName",
    "description",
    "backgroundColor",
    "assetsSource",
  ]) {
    if (typeof config[key] !== "string" || !config[key].trim()) {
      fail(`appx/msix.config.json precisa de um valor para "${key}".`);
    }
  }

  if (
    config.identityName === "Jeffersom.PapersNews" ||
    config.publisher === "CN=Jeffersom"
  ) {
    console.warn(
      "\nAviso: Identity/Name e Publisher ainda são exemplos. Para publicar na Microsoft Store, use os valores reservados no Partner Center (appx/msix.config.json).",
    );
  }

  const version = toMsixVersion(packageJson.version);
  assertFile(
    path.resolve(root, config.assetsSource),
    "A imagem de origem dos ícones não foi encontrada.",
  );

  if (!skipBuild) {
    await run(
      node,
      [path.join(root, "scripts", "package-desktop.mjs")],
      "Pacote portátil do Neutralino",
    );
  }

  assertFile(
    path.join(bundleDir, "papers-news-win_x64.exe"),
    "Gere o pacote portátil com npm run desktop:package.",
  );
  assertFile(
    path.join(bundleDir, "resources.neu"),
    "O pacote portátil está incompleto.",
  );

  rmSync(msixRoot, { recursive: true, force: true });
  mkdirSync(stageDir, { recursive: true });
  for (const entry of readdirSync(bundleDir)) {
    cpSync(path.join(bundleDir, entry), path.join(stageDir, entry), {
      recursive: true,
    });
  }

  // As instruções do ZIP portátil não fazem sentido dentro do pacote MSIX.
  rmSync(path.join(stageDir, "LEIA-ME.txt"), { force: true });

  const assetsDir = path.join(stageDir, "Assets");
  const powershell =
    process.env.SystemRoot &&
    existsSync(path.join(process.env.SystemRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe"))
      ? path.join(
          process.env.SystemRoot,
          "System32",
          "WindowsPowerShell",
          "v1.0",
          "powershell.exe",
        )
      : "powershell.exe";

  await run(
    powershell,
    [
      "-NoProfile",
      "-NonInteractive",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      assetScript,
      "-Source",
      path.resolve(root, config.assetsSource),
      "-Output",
      assetsDir,
      "-Background",
      config.backgroundColor,
    ],
    "Ícones do pacote",
  );

  validateAssets(assetsDir);

  const template = readFileSync(manifestTemplatePath, "utf8");
  const manifest = renderManifest(template, {
    IDENTITY_NAME: config.identityName,
    PUBLISHER: config.publisher,
    VERSION: version,
    DISPLAY_NAME: config.displayName,
    PUBLISHER_DISPLAY_NAME: config.publisherDisplayName,
    DESCRIPTION: config.description,
    BACKGROUND_COLOR: config.backgroundColor,
    SHORT_NAME: config.shortName,
  });

  writeFileSync(path.join(stageDir, "AppxManifest.xml"), manifest, "utf8");

  // Confere se todos os arquivos citados no manifesto existem no palco.
  for (const asset of [
    "StoreLogo.png",
    "Square44x44Logo.png",
    "Square150x150Logo.png",
    "Square310x310Logo.png",
    "Wide310x150Logo.png",
    "SplashScreen.png",
  ]) {
    assertFile(path.join(assetsDir, asset));
  }

  const makeappx = findMakeAppx();

  if (!makeappx) {
    const message = [
      "",
      "O MakeAppx não foi encontrado, então o pacote foi preparado mas não compilado.",
      `Pasta pronta para empacotar: ${stageDir}`,
      "",
      "Instale o Windows SDK (componente \"Ferramentas de Assinatura do SDK do Windows\"",
      "ou \"MSIX Packaging Tools\") e rode de novo:",
      "",
      "  npm run desktop:msix",
      "",
      "Se o MakeAppx estiver em outro caminho, defina MAKEAPPX_PATH antes de rodar:",
      "",
      '  set MAKEAPPX_PATH=C:\\caminho\\para\\makeappx.exe',
      "",
    ].join("\n");

    if (requireMakeAppx) {
      console.error(message);
      process.exit(1);
    }

    console.log(message);
    console.log(`Manifesto validado em: ${path.join(stageDir, "AppxManifest.xml")}`);
    return;
  }

  console.log(`\nMakeAppx encontrado em: ${makeappx}`);
  await run(
    makeappx,
    ["pack", "/d", stageDir, "/p", msixPath, "/o"],
    "Compactação do MSIX",
  );

  assertFile(msixPath, "O MakeAppx não gerou o arquivo esperado.");

  const hash = createHash("sha256")
    .update(readFileSync(msixPath))
    .digest("hex");
  writeFileSync(
    `${msixPath}.sha256`,
    `${hash}  ${path.basename(msixPath)}\n`,
    "utf8",
  );

  const sizeInMb = (statSync(msixPath).size / (1024 * 1024)).toFixed(1);
  console.log(`\nPacote MSIX pronto: ${msixPath}`);
  console.log(`Tamanho: ${sizeInMb} MB`);
  console.log(`SHA-256: ${hash}`);
  console.log(
    "\nPara a Microsoft Store, envie o .msix no Partner Center. A Store reassina o pacote; não é preciso comprar certificado.",
  );
}

main().catch((error) => {
  fail(error.message);
});
