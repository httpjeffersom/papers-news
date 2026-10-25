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
- `neutralino.config.json`: configuração da janela e dos recursos do app desktop.
- `resources/`: arquivos gerados pelo build do Vite; não são versionados.

## Requisitos

- Node.js e npm
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

É possível cadastrar a URL principal de um site. O aplicativo tenta localizar feeds RSS/Atom comuns; quando a descoberta automática não funciona, informe diretamente a URL do feed, por exemplo `https://tecnoblog.net/feed/`.

A leitura dos feeds usa o serviço público [RSS2JSON](https://rss2json.com/), que recebe o endereço do feed consultado. A descoberta automática da URL do feed pode consultar a página pelo proxy público [AllOrigins](https://allorigins.win/). A disponibilidade dessas integrações depende dos serviços externos e das políticas de acesso dos sites.

## Scripts disponíveis

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Inicia o servidor de desenvolvimento do Vite |
| `npm run build` | Gera os arquivos de produção em `resources/` |
| `npm run preview` | Pré-visualiza a build de produção |
| `npm run desktop` | Gera a build e inicia o app com Neutralino.js |
| `npm run desktop:update` | Prepara ou atualiza os binários e o cliente do Neutralino.js |

## Solução de problemas

- **A janela do desktop abre em branco:** confirme que `enableServer` está como `true` em `neutralino.config.json` e execute `npm run desktop:update` para baixar o cliente `resources/js/neutralino.js`, depois `npm run desktop`.
- **O feed não atualiza:** os serviços RSS2JSON e AllOrigins são públicos e podem ficar indisponíveis ou aplicar limites de uso. Tente novamente mais tarde ou cadastre diretamente a URL do feed.
- **Aviso de armazenamento cheio:** remova fontes ou favoritos antigos. O estado do leitor é salvo no `localStorage` com a chave `papers-news:state:v1`.

Consulte também o [CHANGELOG.md](CHANGELOG.md) para ver o que mudou em cada versão.
