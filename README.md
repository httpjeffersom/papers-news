# Papers News

[![Licença: MIT](https://img.shields.io/badge/licen%C3%A7a-MIT-blue.svg)](LICENSE)
[![Sem telemetria](https://img.shields.io/badge/telemetria-nenhuma-brightgreen.svg)](PRIVACY.md)
[![Dados locais](https://img.shields.io/badge/dados-100%25%20locais-informational.svg)](PRIVACY.md)

Um leitor pessoal de notícias para acompanhar publicações de diferentes sites em um só lugar. O Papers News encontra feeds RSS/Atom, reúne as notícias em ordem cronológica e permite guardar artigos para ler depois.

**Código aberto, licença MIT, dados 100% locais e sem telemetria.**

![Ilustração de uma publicação no Papers News](public/images/demo-learning.svg)

## Privacidade e dados

- **Tudo fica no seu computador.** Fontes, notícias em cache e favoritos são salvos no `localStorage` do aplicativo. Não existe conta, nuvem, sincronização ou backup remoto.
- **Zero telemetria.** Nenhum analytics, anúncio, rastreador ou relatório de erro. O projeto não mantém servidor e nada é enviado ao autor.
- **Nenhum dado pessoal é coletado.** Não são pedidos nome, e-mail, localização ou identificadores de dispositivo.
- **Offline para leitura.** O que já foi carregado continua acessível sem internet; atualizar as fontes e baixar imagens novas exige conexão.
- **Código aberto (MIT).** Qualquer pessoa pode auditar exatamente o que o aplicativo faz.

O app acessa apenas os sites cujos feeds você cadastra, os servidores das imagens dessas notícias e, como contingência, serviços públicos de CORS. Se o proxy local falhar, a URL do feed pode ser enviada a `rss2json.com` ou `allorigins.win` como última alternativa — isso está detalhado em [PRIVACY.md](PRIVACY.md). O proxy local escuta somente em `127.0.0.1`.

## Recursos

- Feed de notícias com busca por título, resumo e nome da fonte.
- Favoritos para guardar publicações.
- Cadastro e remoção de sites e feeds RSS/Atom.
- Atualização das publicações das fontes cadastradas.
- Fontes, notícias em cache e favoritos preservados no armazenamento local.
- Retenção de 30 dias: notícias antigas são apagadas para liberar espaço, mas os favoritos ficam guardados para sempre.
- Leitura das notícias em cache sem conexão com a internet.
- Atualização parcial: uma fonte indisponível não impede as demais de atualizar.
- Interface Fluent Design (Windows 11), com tema claro ou escuro.
- Configurações de tema e de tamanho do texto (cinco níveis, com pré-visualização).
- Modo de leitura dentro do app, no estilo Instapaper, sem menus e anúncios.
- Interface responsiva em português, com estados de carregamento, erro e lista vazia.
- Abertura de publicações no navegador padrão do sistema.

## Tecnologias

- React 18
- Vite 6
- Neutralino.js para a aplicação desktop
- JavaScript, HTML e CSS

> Apesar de ser uma aplicação desktop, este projeto usa Neutralino.js — não Electron.

## Estrutura do projeto

- `src/components/`: cabeçalho, navegação, feed de notícias, fontes, configurações e modo de leitura.
- `src/services/`: consulta e interpretação de feeds, armazenamento local e integração desktop para abrir links.
- `src/utils/`: utilitários compartilhados, como a ordenação de publicações por data.
- `src/styles/`: tokens de design, estilos globais e estilos das telas.
- `src/data/`: publicações e fontes de demonstração.
- `public/images/`: ilustrações usadas no conteúdo de demonstração.
- `scripts/`: proxy local de feeds, launcher do Vite/Neutralino e empacotador do executável Windows.
- `neutralino.config.json`: configuração da janela e dos recursos do app desktop.
- `PRIVACY.md`: política de privacidade e detalhes sobre os dados locais.
- `LICENSE` e `THIRD-PARTY-NOTICES.txt`: licença MIT do projeto e licenças dos componentes de terceiros.
- `resources/`: arquivos gerados pelo build do Vite; não são versionados.

## Requisitos

- Node.js 18 ou superior e npm
- Para iniciar a aplicação desktop, os recursos e binários do Neutralino.js

## Desenvolvimento

Instale as dependências:

```bash
npm install
```

Inicie a interface no navegador:

```bash
npm run dev
```

O comando inicia automaticamente o proxy local de feeds em `http://127.0.0.1:8787`. É ele que permite ao navegador (ou ao WebView do desktop) ler feeds de qualquer site sem esbarrar em CORS.

Gere a versão de produção:

```bash
npm run build
```

Execute os testes:

```bash
npm test
```

Para preparar/atualizar e iniciar a versão desktop:

```bash
npm run desktop:update
npm run desktop
```

O comando `npm run desktop` gera a build de produção antes de abrir o Neutralino.js, então não é necessário rodar `npm run build` separadamente. O `desktop:update` só precisa ser executado na primeira vez ou quando os binários/cliente do Neutralino forem atualizados.

### Executável do Windows

Para gerar o pacote distribuível (`papers-news-<versão>-win_x64.zip`):

```bash
npm run desktop:package
```

O pacote fica em `dist/` e contém:

- `papers-news-win_x64.exe` — aplicativo;
- `papers-news-node.exe` — runtime Node.js assinado que executa o proxy de feeds;
- `feed-proxy.cjs` — script do proxy, iniciado automaticamente pelo app;
- `resources.neu` — interface compilada;
- `LEIA-ME.txt` — instruções de uso;
- `LICENSE` — licença MIT do projeto;
- `THIRD-PARTY-NOTICES.txt` — licenças dos componentes de terceiros (Node.js, Neutralinojs, React).

O comando também gera o arquivo `.sha256` com o checksum do ZIP. O proxy roda no `papers-news-node.exe`, o runtime Node.js oficial assinado pela OpenJS Foundation, em vez de um executável próprio gerado com [Single Executable Applications](https://nodejs.org/api/single-executable-applications.html). Assim o binário mantém a assinatura digital e não é bloqueado pelo Controle de Aplicativo do Windows. Mantenha o runtime e o `feed-proxy.cjs` na mesma pasta do aplicativo.

## Fontes RSS/Atom

Basta colar o endereço principal do site (por exemplo, `https://exemplo.com/`). O Papers News tenta descobrir o feed sozinho, nesta ordem:

1. usa a própria URL, se ela já parecer um feed;
2. abre a página e procura `<link rel="alternate">` com RSS/Atom e links de feed;
3. tenta feeds conhecidos de alguns sites populares;
4. testa caminhos comuns como `/feed/`, `/rss.xml`, `/atom.xml`, `/index.xml` e `/feeds/posts/default`;
5. se um desses caminhos for uma página com vários feeds, testa os feeds encontrados nela.

Se o site não publica RSS/Atom ou não expõe o endereço, ainda é possível informar o feed diretamente (por exemplo, `https://exemplo.com/feed/`).

A leitura acontece no proxy local (`scripts/feed-proxy.cjs`), que baixa o XML e o entrega ao app com os cabeçalhos de CORS necessários. O proxy usa o seu próprio IP, segue redirecionamentos, respeita o charset do feed, bloqueia endereços privados e limita a resposta a 15 MB. RSS2JSON e AllOrigins continuam existindo apenas como alternativas caso o proxy não esteja rodando.

No app desktop empacotado, o proxy roda em `papers-news-node.exe` com o script `feed-proxy.cjs` e é iniciado sob demanda pelo próprio aplicativo.

## Scripts disponíveis

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Inicia o proxy local e o servidor de desenvolvimento do Vite |
| `npm run proxy` | Inicia somente o proxy local de feeds |
| `npm run build` | Gera os arquivos de produção em `resources/` |
| `npm run preview` | Gera a build e a pré-visualiza com o proxy local ativo |
| `npm test` | Executa os testes automatizados |
| `npm run desktop` | Gera a build, inicia o proxy e abre o app com Neutralino.js |
| `npm run desktop:package` | Gera o ZIP do executável Windows com o proxy embutido |
| `npm run desktop:update` | Prepara ou atualiza os binários e o cliente do Neutralino.js |

## Solução de problemas

- **A janela do desktop abre em branco:** confirme que `enableServer` está como `true` em `neutralino.config.json` e execute `npm run desktop:update` para baixar o cliente `resources/js/neutralino.js`, depois `npm run desktop`.
- **A janela fica preta depois de fechar e abrir o app (versões até 0.4.0):** o proxy da versão antiga (`papers-news-proxy.exe`) continuava rodando e prendia a porta `51789`. Feche esse processo no Gerenciador de Tarefas (ou reinicie o computador) uma vez e atualize para a 0.4.1; a partir dela o proxy encerra junto com o app.
- **O modo de leitura mostra apenas o resumo:** alguns sites escondem o texto atrás de login, paywall ou proteção contra robôs. Nesse caso, o Papers News exibe o resumo do feed e mantém o botão "Abrir publicação" para continuar no site.
- **O executável do Windows não busca notícias:** mantenha o `papers-news-node.exe` e o `feed-proxy.cjs` na mesma pasta do `papers-news-win_x64.exe`. Eles são iniciados automaticamente; se você os removeu, gere o pacote novamente com `npm run desktop:package`.
- **Não consigo adicionar um site:** confirme que o proxy local está ativo. `npm run dev`, `npm run preview` e `npm run desktop` o iniciam automaticamente; para rodar separado, use `npm run proxy`. Se a porta `8787` estiver ocupada por outro programa, inicie o proxy com `FEED_PROXY_PORT=8790` e defina `VITE_FEED_PROXY_URL=http://127.0.0.1:8790` para o app.
- **Os dados do desktop não são salvos entre execuções:** o app usa a porta fixa `51789` (em `neutralino.config.json`) justamente para manter o mesmo endereço local e preservar fontes, cache e favoritos no `localStorage`. Não altere essa porta sem necessidade.
- **O site não tem feed:** alguns sites não publicam RSS/Atom. Nesse caso, não há como montar o feed; cadastre a URL direta de um feed do mesmo site, se existir.
- **O feed não atualiza:** verifique a conexão com o site. Se o proxy estiver desligado, o app tenta RSS2JSON e AllOrigins, que são serviços públicos e podem aplicar limites de uso.
- **Aviso de armazenamento cheio:** remova fontes ou favoritos antigos. O estado do leitor é salvo no `localStorage` com a chave `papers-news:state:v1`.

Consulte também o [CHANGELOG.md](CHANGELOG.md) para ver o que mudou em cada versão.

## Licença

O Papers News é um projeto de **código aberto** distribuído sob a **licença MIT**. Veja [LICENSE](LICENSE) para o texto completo.

As bibliotecas de terceiros mantêm suas próprias licenças. Os textos completos dos componentes distribuídos no pacote estão em [THIRD-PARTY-NOTICES.txt](THIRD-PARTY-NOTICES.txt); as dependências de desenvolvimento estão listadas em `package.json` e `package-lock.json`.

