# Changelog

Todas as mudanças relevantes deste projeto são documentadas aqui.

## [0.5.0] - 2026-10-28

### Adicionado

- Aba **Configurações** no menu do seu espaço, com ícone e nome, reunindo as preferências do aplicativo.
- Tema claro ou escuro movido para Configurações, em um controle segmentado com rótulos.
- Tamanho do texto em cinco níveis (Pequeno, Padrão, Médio, Grande e Maior), com barra deslizante e pré-visualização que acompanha a escolha. A preferência é lembrada entre execuções.
- **Ler aqui:** modo de leitura dentro do app no estilo Instapaper, com página branca e texto escuro (ou escura com texto claro no tema escuro), sem menus e anúncios. O botão aparece antes de "Abrir publicação".
- Extração do conteúdo principal da página original quando o feed traz apenas o resumo, com sanitização de scripts, formulários e links inseguros.
- Pequeno slogan ao lado de "Fontes", no mesmo padrão de Favoritos e do feed.

### Alterado

- O botão **Atualizar** agora usa o azul de destaque do Fluent.
- Na aba Favoritos, o subtítulo passou a ser "guardados para ler depois".

## [0.4.1] - 2026-10-28

### Corrigido

- O aplicativo não abre mais com a tela preta depois de já ter sido executado e fechado: o proxy de feeds, iniciado pelo app, herdava o socket do servidor local e continuava rodando depois do fechamento. Na execução seguinte, a porta `51789` aparecia ocupada e a janela ficava preta. Agora o proxy encerra sozinho quando o aplicativo termina.
- O aplicativo não fecha mais sozinho ao abrir quando o proxy não é encontrado: o caminho do `papers-news-proxy.exe` passa a ser montado a partir do diretório real do aplicativo, e a saída do comando de inicialização é descartada.

## [0.4.0] - 2026-10-27

### Adicionado

- Interface redesenhada com Fluent Design (Windows 11): tipografia Segoe UI Variable, controles de 4 px, cartões de 8 px, acrílico na barra superior e indicador de seleção na navegação.
- Tema claro ou escuro, com a escolha lembrada entre execuções.
- Alternador de tema segmentado na barra superior, acessível por teclado.
- Política de privacidade em [PRIVACY.md](PRIVACY.md): todos os dados ficam no dispositivo, sem telemetria, com detalhes sobre o que sai do dispositivo, limites do uso offline e como apagar os dados.
- Destaque de privacidade e de código aberto (MIT) no README, com badges e resumo no topo.

### Alterado

- As notícias passam a ser exibidas em cartões, no lugar da lista com divisórias.
- Cabeçalho do feed mais direto: apenas o título, com "em ordem cronológica" ao lado.
- Os textos aproveitam toda a largura do cartão, e a coluna de leitura passou de 840 px para 1000 px.
- O indicador de status ao lado da contagem de fontes foi removido.
- Fonte e Informações passam a usar InfoBars e cartões do Fluent.

### Removido

- O modo de tema automático: a interface tem apenas os modos claro e escuro.

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
- Licença MIT adicionada ao projeto, com `LICENSE` e `THIRD-PARTY-NOTICES.txt` incluídos no pacote para Windows (Node.js, Neutralinojs e React).

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
