# Changelog

Todas as mudanças relevantes deste projeto são documentadas aqui.

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
