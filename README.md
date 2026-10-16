# Papers News

Um leitor pessoal de notícias para acompanhar publicações de diferentes sites em um só lugar. O Papers News encontra feeds RSS/Atom, reúne as notícias em ordem cronológica e permite guardar artigos para ler depois.

![Ilustração de uma publicação no Papers News](public/images/demo-learning.svg)

## Recursos

- Feed de notícias com busca por título, resumo e nome da fonte.
- Favoritos para guardar publicações.
- Cadastro e remoção de sites e feeds RSS/Atom.
- Atualização das publicações das fontes cadastradas.
- Interface responsiva em português, com estados de carregamento, erro e lista vazia.
- Abertura de publicações no navegador padrão do sistema.

## Tecnologias

- React 18
- Vite 6
- Neutralino.js para a aplicação desktop
- JavaScript, HTML e CSS

> Apesar de ser uma aplicação desktop, este projeto usa Neutralino.js — não Electron.

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

Para preparar/atualizar e iniciar a versão desktop:

```bash
npm run desktop:update
npm run desktop
```

## Fontes RSS/Atom

É possível cadastrar a URL principal de um site. O aplicativo tenta localizar feeds RSS/Atom comuns; quando a descoberta automática não funciona, informe diretamente a URL do feed, por exemplo `https://tecnoblog.net/feed/`.

A leitura dos feeds usa o serviço público [RSS2JSON](https://rss2json.com/), que recebe o endereço do feed consultado. A descoberta automática da URL do feed pode consultar a página pelo proxy público [AllOrigins](https://allorigins.win/). A disponibilidade dessas integrações depende dos serviços externos e das políticas de acesso dos sites.

## Scripts disponíveis

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Inicia o servidor de desenvolvimento do Vite |
| `npm run build` | Gera os arquivos de produção em `resources/` |
| `npm run preview` | Pré-visualiza a build de produção |
| `npm run desktop` | Inicia o app com Neutralino.js |
| `npm run desktop:update` | Prepara ou atualiza os recursos e binários do Neutralino.js |
