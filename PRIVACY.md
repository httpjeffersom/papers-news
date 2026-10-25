# Política de Privacidade do Papers News

Última atualização: 25 de outubro de 2026
Versão do aplicativo: 0.3.1

## Resumo

- **Sem conta, sem login, sem nuvem e sem sincronização.**
- **Sem telemetria, analytics, anúncios, rastreadores ou relatórios de erro.**
- **Suas fontes, notícias em cache e favoritos ficam apenas no seu computador.**
- O aplicativo conversa diretamente com os sites cujos feeds você cadastrou e com os servidores das imagens dessas notícias.
- O código é aberto, sob licença **MIT**, e pode ser auditado por qualquer pessoa.

O Papers News não possui servidor próprio. Nada é enviado para o autor do projeto.

## Quais dados ficam no seu dispositivo

O aplicativo guarda um único estado no `localStorage` do WebView2, com a chave `papers-news:state:v1`:

| Dado | Conteúdo | Finalidade |
| --- | --- | --- |
| Fontes | nome, endereço do site e URL do feed | montar e atualizar o feed |
| Notícias em cache | título, resumo, link, data, nome da fonte e URL da imagem | leitura offline e atualização parcial |
| Favoritos | identificadores das publicações guardadas | manter a lista "Salvos" |

Não são coletados nem gravados pelo aplicativo: nome, e-mail, senha, localização, identificadores de dispositivo ou histórico de navegação.

O WebView2 mantém um cache próprio de páginas, imagens e dados do perfil na pasta do aplicativo; esse cache é gerenciado pelo runtime do Edge e não é enviado ao autor do Papers News.

No aplicativo desktop, esses dados ficam em:

```text
%APPDATA%\papers-news-win_x64.exe\EBWebView\Default\Local Storage
```

No navegador, ficam no armazenamento local do próprio site (`http://127.0.0.1:5173` em desenvolvimento ou a origem usada no preview). O espaço é limitado pelo `localStorage` do WebView2; quando ele enche, o app avisa e permite remover fontes ou favoritos.

## O que sai do dispositivo

O Papers News não coleta dados, mas é um leitor de notícias: para exibir conteúdo atualizado ele precisa acessar a internet.

1. **Atualização de feeds.** O app faz uma requisição ao site que você cadastrou (diretamente ou pelo proxy local em `http://127.0.0.1:8787`). Como em qualquer leitor RSS, esse site recebe seu endereço IP, um *user-agent* de navegador e a URL solicitada.
2. **Imagens das notícias.** As imagens são carregadas dos servidores das publicações. Esses servidores também veem seu endereço IP. O app não envia cookies desses sites nem scripts de rastreamento.
3. **Links abertos.** "Abrir publicação" abre o link no seu navegador padrão; a partir daí valem as políticas do site visitado.
4. **Serviços públicos de fallback.** Se o proxy local não estiver disponível (por exemplo, ao abrir o projeto no navegador sem `npm run dev` ou se o proxy falhar no desktop), o app tenta `api.allorigins.win` e `api.rss2json.com` para contornar CORS. Nesse caso, **a URL do feed é enviada a esses serviços de terceiros**. No app desktop o proxy local é iniciado automaticamente, então esse caminho só é usado como contingência.

O proxy local escuta apenas em `127.0.0.1` (loopback) por padrão e não é acessível pela internet.

## O que o aplicativo não faz

- Não cria conta, não pede e-mail e não envia dados para servidores do projeto.
- Não usa Google Analytics, Sentry, Firebase, PostHog ou qualquer SDK de telemetria.
- Não exibe anúncios nem compartilha dados com anunciantes.
- Não lê arquivos fora da pasta do aplicativo e dos dados do WebView2.
- Não altera configurações do Windows e não exige privilégios de administrador.
- Não instala serviços, drivers ou programas adicionais.

## Offline: o que funciona e o que não funciona

O Papers News é **local-first**, não um aplicativo totalmente offline:

- **Funciona sem internet:** abrir o app, navegar pelas notícias já carregadas, buscar, favoritar e ler o cache.
- **Precisa de internet:** atualizar as fontes e carregar imagens ainda não baixadas.
- **Primeira execução:** as publicações de demonstração são locais e aparecem mesmo sem conexão.

Por isso, a descrição correta é "dados 100% locais, sem nuvem e sem telemetria". Chamar de "app 100% offline" seria impreciso.

## Controle e exclusão dos dados

- Remova fontes e favoritos pela própria interface.
- Para apagar tudo no desktop: feche o aplicativo e exclua a pasta `%APPDATA%\papers-news-win_x64.exe`.
- No navegador: limpe os dados do site nas configurações do navegador.
- Não há exportação ou backup integrado nesta versão; os dados ficam em um único armazenamento local.

## Conteúdo de terceiros

Os textos, imagens e links exibidos pertencem às publicações cadastradas. O aplicativo apenas lê feeds públicos e não hospeda, copia ou redistribui esse conteúdo. Direitos autorais e termos de uso de cada site continuam valendo.

## Runtime e sistema

A interface é renderizada pelo Microsoft Edge WebView2. O comportamento de rede do próprio WebView2 (atualizações e recursos do Edge) segue as configurações do Windows e da Microsoft, não do Papers News. O aplicativo não coleta nem envia esses dados.

## Alterações nesta política

Mudanças relevantes serão registradas no [CHANGELOG](CHANGELOG.md) e nesta página, com atualização da data no topo.

## Contato

Dúvidas ou relatos de problemas: abra uma issue em
<https://github.com/httpjeffersom/papers-news/issues>.
