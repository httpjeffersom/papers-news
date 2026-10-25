# Papers News

Um leitor pessoal de notícias para acompanhar publicações de diferentes sites em um só lugar. O Papers News encontra feeds RSS/Atom, reúne as notícias em ordem cronológica e permite guardar artigos para ler depois.

![Ilustração de uma publicação no Papers News](public/images/demo-learning.svg)

## Recursos

- Feed de notícias com busca por título, resumo e nome da fonte.
- Favoritos para guardar publicações.
- Cadastro e remoção de sites e feeds RSS/Atom.
- Atualização das publicações das fontes cadastradas.
- Fontes, notícias em cache e favoritos preservados no armazenamento local.
- Atualização parcial: uma fonte indisponível não impede as demais de atualizar.
- Interface responsiva em português, com estados de carregamento, erro e lista vazia.
- Abertura de publicações no navegador padrão do sistema.

## Tecnologias

- React 18
- Vite 6
- Neutralino.js para a aplicação desktop
- JavaScript, HTML e CSS

> Apesar de ser uma aplicação desktop, este projeto usa Neutralino.js — não Electron.

## Estrutura do projeto

- `src/components/`: cabeçalho, navegação, feed de notícias e gerenciamento de fontes.
- `src/services/`: consulta e interpretação de feeds, armazenamento local e integração desktop para abrir links.
- `src/utils/`: utilitários compartilhados, como a ordenação de publicações por data.
- `src/styles/`: tokens de design, estilos globais e estilos das telas.
- `src/data/`: publicações e fontes de demonstração.
- `public/images/`: ilustrações usadas no conteúdo de demonstração.
- `scripts/`: proxy local de feeds e launcher que inicia o proxy junto com o Vite/Neutralino.
- `neutralino.config.json`: configuração da janela e dos recursos do app desktop.
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

## Fontes RSS/Atom

Basta colar o endereço principal do site (por exemplo, `https://tecnoblog.net/`). O Papers News tenta descobrir o feed sozinho, nesta ordem:

1. usa a própria URL, se ela já parecer um feed;
2. abre a página e procura `<link rel="alternate">` com RSS/Atom e links de feed;
3. tenta feeds conhecidos de alguns sites populares;
4. testa caminhos comuns como `/feed/`, `/rss.xml`, `/atom.xml`, `/index.xml` e `/feeds/posts/default`;
5. se um desses caminhos for uma página com vários feeds, testa os feeds encontrados nela.

Se o site não publica RSS/Atom ou não expõe o endereço, ainda é possível informar o feed diretamente (por exemplo, `https://tecnoblog.net/feed/`).

A leitura acontece no proxy local (`scripts/feed-proxy.mjs`), que baixa o XML e o entrega ao app com os cabeçalhos de CORS necessários. O proxy usa o seu próprio IP, segue redirecionamentos, respeita o charset do feed, bloqueia endereços privados e limita a resposta a 15 MB. RSS2JSON e AllOrigins continuam existindo apenas como alternativas caso o proxy não esteja rodando.

## Scripts disponíveis

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Inicia o proxy local e o servidor de desenvolvimento do Vite |
| `npm run proxy` | Inicia somente o proxy local de feeds |
| `npm run build` | Gera os arquivos de produção em `resources/` |
| `npm run preview` | Gera a build e a pré-visualiza com o proxy local ativo |
| `npm test` | Executa os testes automatizados |
| `npm run desktop` | Gera a build, inicia o proxy e abre o app com Neutralino.js |
| `npm run desktop:update` | Prepara ou atualiza os binários e o cliente do Neutralino.js |

## Solução de problemas

- **A janela do desktop abre em branco:** confirme que `enableServer` está como `true` em `neutralino.config.json` e execute `npm run desktop:update` para baixar o cliente `resources/js/neutralino.js`, depois `npm run desktop`.
- **Não consigo adicionar um site:** confirme que o proxy local está ativo. `npm run dev`, `npm run preview` e `npm run desktop` o iniciam automaticamente; para rodar separado, use `npm run proxy`. Se a porta `8787` estiver ocupada por outro programa, inicie o proxy com `FEED_PROXY_PORT=8790` e defina `VITE_FEED_PROXY_URL=http://127.0.0.1:8790` para o app.
- **O site não tem feed:** alguns sites não publicam RSS/Atom. Nesse caso, não há como montar o feed; cadastre a URL direta de um feed do mesmo site, se existir.
- **O feed não atualiza:** verifique a conexão com o site. Se o proxy estiver desligado, o app tenta RSS2JSON e AllOrigins, que são serviços públicos e podem aplicar limites de uso.
- **Aviso de armazenamento cheio:** remova fontes ou favoritos antigos. O estado do leitor é salvo no `localStorage` com a chave `papers-news:state:v1`.

Consulte também o [CHANGELOG.md](CHANGELOG.md) para ver o que mudou em cada versão.
