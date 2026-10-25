# Changelog

Todas as mudanças relevantes deste projeto são documentadas aqui.

## [0.3.1] - 2026-10-25

### Adicionado

- Pacote para Windows com `npm run desktop:package`, gerando `papers-news-0.3.1-win_x64.zip` com o aplicativo, o proxy de feeds, `resources.neu`, instruções e checksum SHA-256.
- Proxy de feeds também distribuído como executável próprio (`papers-news-proxy.exe`), gerado com Node.js Single Executable Applications.
- Release no GitHub com o ZIP para Windows.

### Corrigido

- O app desktop não carregava o cliente do Neutralino (`NL_MODE` não é definido nesta versão), impedindo o uso da API nativa e o início automático do proxy.
- O proxy de feeds agora é iniciado automaticamente pelo app desktop quando necessário.
- Dados do desktop passam a persistir entre execuções: a porta local é fixa (`51789`), mantendo o mesmo endereço de origem do `localStorage`.
- A build do pacote limpa `.tmp` antes de empacotar, evitando incluir arquivos temporários no `resources.neu`.

### Alterado

- Proxy renomeado para `scripts/feed-proxy.cjs` para ser compatível com o Node.js SEA.
- Versão do aplicativo atualizada para `0.3.1`.

## [0.3.0] - 2026-10-25

### Adicionado

- Proxy local de feeds (`scripts/feed-proxy.mjs`) em `http://127.0.0.1:8787`, iniciado automaticamente por `npm run dev`, `npm run preview` e `npm run desktop` através de `scripts/launch.mjs`.
- Leitura direta de XML RSS 2.0, Atom e RDF com `DOMParser`, sem depender de conversores públicos.
- Descoberta de feeds em páginas HTML via `<link rel="alternate">`, links de feed e hubs de feeds.
- Lista de feeds conhecidos para sites populares que não anunciam o RSS na página (g1, UOL, Folha, CNN Brasil, Exame, InfoMoney, Olhar Digital, Canaltech, Brasil de Fato e BBC Brasil).
- Suporte a caminhos comuns como `/feed/`, `/rss`, `/rss.xml`, `/atom.xml`, `/index.xml` e `/feeds/posts/default`.
- Script `npm run proxy` para iniciar somente o proxy.
- Testes do interpretador de feeds (RSS, Atom, RDF, entidades HTML, imagens e iniciais) e da descoberta automática.

### Corrigido

- Erro de CORS ao adicionar sites: a requisição agora sai do proxy local, usando o IP do usuário.
- Feeds com URLs de imagem malformadas (host duplicado) são corrigidos automaticamente.
- Imagens de vídeo/embed deixam de ser usadas como capa; a imagem é escolhida entre descrição, conteúdo, thumbnails e enclosures.
- Feeds de comentários do WordPress não são mais confundidos com o feed principal.
- Respostas de erro do proxy não exibem mais HTML bruto nas mensagens do app.
- Feeds com entidades HTML inválidas (como `&nbsp;`) passam a ser interpretados.
- Charset dos feeds é respeitado pelo proxy (incluindo ISO-8859-1).

### Alterado

- Versão do aplicativo atualizada para `0.3.0`.
- RSS2JSON e AllOrigins passam a ser apenas alternativas quando o proxy local não está disponível.
- Texto da tela de Fontes e README explicam o funcionamento do proxy e da descoberta automática.

## [0.2.0] - 2026-10-25

### Corrigido

- App desktop agora usa o servidor local do Neutralino (`enableServer: true`), necessário para carregar os recursos de `resources/`.
- `npm run desktop` passa a gerar a build do Vite antes de abrir o Neutralino, evitando abrir uma versão antiga ou vazia.
- Builds antigos deixam de se acumular em `resources/assets/`; apenas os arquivos da versão atual são mantidos.
- Artigos de demonstração não reaparecem mais quando o usuário remove todas as fontes reais.
- Feeds válidos, porém vazios, passam a ser tratados como atualização bem-sucedida.
- Publicações sem data válida deixam de receber a data atual e aparecem como “Data desconhecida”, no fim do feed.
- Imagens relativas de feeds agora são resolvidas com base no link da publicação.
- Iniciais de fontes são geradas corretamente, ignorando conectores como “de”, “da” e “do”.
- Links duplicados dentro de um mesmo feed são descartados.
- Logo da marca agora funciona como botão de início e não aponta mais para uma âncora inexistente.
- Indicador da barra lateral reflete o estado real das fontes, em vez de exibir “Modo demonstração” permanentemente.
- Busca passa a filtrar também a lista de fontes na tela de Fontes.
- Aviso de atualização parcial limita a quantidade de erros exibidos.
- Mensagem específica para armazenamento local cheio (`QuotaExceededError`).
- Avatares de fontes antigas usam fallback quando `sourceInitials` não está presente.

### Adicionado

- Utilitário compartilhado de ordenação por data, com datas inválidas sempre ao final.
- Testes para feed vazio, ausência de fontes reais, datas inválidas, imagens relativas, iniciais, deduplicação e ordenação.
- Metadados do aplicativo no `neutralino.config.json`.

### Alterado

- Versão do aplicativo atualizada para `0.2.0`.
- README com o fluxo correto do desktop e uma seção de solução de problemas.
