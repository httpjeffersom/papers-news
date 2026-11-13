# Pacote MSIX e Microsoft Store

Esta pasta contém o necessário para transformar o Papers News em um pacote
**MSIX** de Windows x64 e enviá-lo à Microsoft Store.

## O que é gerado

`npm run desktop:msix` faz, nesta ordem:

1. gera o ZIP portátil com `npm run desktop:package`;
2. copia o aplicativo, o runtime Node.js e o proxy para uma pasta de palco;
3. gera os ícones exigidos pelo Windows a partir de `public/app-icon.png`;
4. preenche `AppxManifest.xml` com os valores de `msix.config.json`;
5. compacta tudo com o `MakeAppx.exe`, quando ele está instalado;
6. grava `dist/papers-news-<versão>-win_x64.msix` e o `.sha256`.

Se o `MakeAppx` não estiver disponível, a pasta de palco e o manifesto são
gerados mesmo assim, com instruções para concluir.

## Antes de publicar

### 1. Identidade do pacote

Os valores do Partner Center já estão configurados em `appx/msix.config.json`
(produto **papers-news**, ID da Store `9PPS3L9JTFJN`):

| Campo no Partner Center | Campo no `msix.config.json` |
| --- | --- |
| Package/Identity/Name | `identityName` = `JeffersomBenvindo.papers-news` |
| Package/Identity/Publisher | `publisher` = `CN=2FBB0D15-A230-426C-B07C-E8FAF80D41A9` |
| Package/Properties/PublisherDisplayName | `publisherDisplayName` = `Jeffersom Benvindo` |

O `publisher` tem o formato `CN=...` e precisa ser idêntico ao do Partner
Center. O `identityName` não pode ser alterado depois da primeira publicação,
porque é ele que identifica os dados do aplicativo nas atualizações. Se um dia
você criar outro produto no Partner Center, copie os novos valores para cá.

### 2. Instale o MakeAppx

O `MakeAppx.exe` vem com o Windows SDK. No Visual Studio Installer, instale o
componente **Ferramentas de Assinatura do SDK do Windows** (ou o SDK do Windows
completo). Depois confirme:

```powershell
where.exe makeappx.exe
```

Se estiver em outro lugar, defina antes de empacotar:

```powershell
$env:MAKEAPPX_PATH = "C:\caminho\para\makeappx.exe"
```

### 3. Gere e valide

```powershell
npm run desktop:msix
```

Para exigir que o `.msix` seja realmente gerado (falha se o MakeAppx não
existir), use:

```powershell
node scripts/package-msix.mjs --require-makeappx
```

Para reaproveitar um pacote portátil já gerado, sem refazer o build:

```powershell
node scripts/package-msix.mjs --skip-build
```

## Teste local (opcional)

A Microsoft Store reassina o pacote na publicação; **não é necessário comprar
certificado de autoridade certificadora**. Para instalar o `.msix` no seu
computador antes de enviar, ele precisa estar assinado por um certificado
confiável e o Windows precisa permitir a instalação de aplicativos de fora da
Store (sideload). No Windows 11 isso normalmente já vem habilitado; caso
contrário, ative em **Configurações → Sistema → Para desenvolvedores**.

Um fluxo de teste comum (execute o passo 3 em um PowerShell **como
administrador**):

```powershell
# 1. Crie um certificado de teste com o mesmo Publisher do manifesto.
$publisher = "CN=2FBB0D15-A230-426C-B07C-E8FAF80D41A9"
$cert = New-SelfSignedCertificate `
  -Type Custom `
  -Subject $publisher `
  -KeyUsage DigitalSignature `
  -FriendlyName "Papers News (teste)" `
  -CertStoreLocation "Cert:\CurrentUser\My" `
  -TextExtension @("2.5.29.37={text}1.3.6.1.5.5.7.3.3")
$password = ConvertTo-SecureString -String "senha-de-teste" -Force -AsPlainText
Export-PfxCertificate -Cert $cert -FilePath "$env:TEMP\papers-news-teste.pfx" -Password $password
Export-Certificate -Cert $cert -FilePath "$env:TEMP\papers-news-teste.cer"

# 2. Assine uma cópia com o signtool (também vem no Windows SDK).
Copy-Item "dist\papers-news-1.0.0-win_x64.msix" "$env:TEMP\papers-news-teste.msix"
signtool sign /fd SHA256 /f "$env:TEMP\papers-news-teste.pfx" /p "senha-de-teste" `
  "$env:TEMP\papers-news-teste.msix"

# 3. Confie no certificado e instale (PowerShell como administrador).
Import-Certificate -FilePath "$env:TEMP\papers-news-teste.cer" -CertStoreLocation "Cert:\LocalMachine\TrustedPeople"
Add-AppxPackage "$env:TEMP\papers-news-teste.msix"
```

Para remover: `Get-AppxPackage *PapersNews* | Remove-AppxPackage`.

O certificado de teste também pode ser removido depois:
`Get-ChildItem Cert:\LocalMachine\TrustedPeople | Where-Object Subject -eq "CN=2FBB0D15-A230-426C-B07C-E8FAF80D41A9" | Remove-Item`.

## Envio à Microsoft Store

1. Rode `npm run desktop:msix` com a versão nova em `package.json`.
2. No Partner Center, abra **Pacotes** e envie o `.msix`.
3. Preencha a descrição, capturas de tela e a política de privacidade
   (`PRIVACY.md`).
4. Envie para certificação.

A Store reassina o pacote e o distribui. O aplicativo é Win32 com
`runFullTrust` porque o Neutralino abre uma janela nativa e usa o WebView2.

### Observações para a certificação

- O aplicativo **não** coleta telemetria, não pede login e não tem anúncios.
- O proxy de feeds escuta apenas em `127.0.0.1` (loopback) e não aceita
  requisições de páginas abertas no navegador (`Sec-Fetch-Site: cross-site`).
- No desktop, o app **não** usa serviços públicos de CORS: se o proxy local
  falhar, ele mostra um erro em vez de enviar a URL do feed a terceiros.
- O HTML dos feeds é reconstruído a partir de uma lista de tags permitidas e
  inserido no leitor; scripts, formulários, iframes e atributos de evento são
  descartados.
- Links externos só são abertos no navegador padrão quando usam `http:` ou
  `https:`.
- A interface desktop usa uma Política de Segurança de Conteúdo restritiva,
  definida em `neutralino.config.json` (`serverHeaders`).

## Limitações conhecidas

- **Porta fixa 51789.** O IndexedDB e o `localStorage` pertencem à origem
  `http://127.0.0.1:51789`. Mudar a porta órfã os dados salvos. Como a porta é
  fixa, abrir duas instâncias ao mesmo tempo pode falhar na segunda.
- **WebView2.** O Windows 11 já inclui o runtime; no Windows 10 ele precisa
  estar instalado (normalmente vem pelo Microsoft Edge).
- **Somente x64.** O manifesto e o pacote são gerados para `x64`. Para ARM64
  seria preciso um build separado do Neutralino e do runtime Node.js.
- **Dados no MSIX.** Como o pacote é instalado em uma pasta somente leitura
  (`WindowsApps`), o Neutralino grava os dados internos em
  `dataLocation: "system"`. O WebView2 e o IndexedDB ficam na área virtualizada
  do pacote, preservada nas atualizações e removida na desinstalação.

## Estrutura dos arquivos

- `AppxManifest.xml` — modelo do manifesto; os `{{MARCADORES}}` são
  substituídos no empacotamento.
- `msix.config.json` — identidade, textos e cor de fundo do pacote.
- `../scripts/package-msix.mjs` — monta o palco, chama o MakeAppx e gera o hash.
- `../scripts/generate-msix-assets.ps1` — gera os PNGs exigidos pelo Windows.
