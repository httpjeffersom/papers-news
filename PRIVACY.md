# Política de Privacidade do Papers News

Última atualização: 12 de novembro de 2026
Versão do aplicativo: 1.0.0

## Resumo

- **Sem conta, sem login, sem nuvem e sem sincronização.**
- **Sem telemetria, analytics, anúncios, rastreadores ou relatórios de erro.**
- **Suas fontes, notícias em cache e favoritos ficam apenas no seu computador.**
- O aplicativo conversa diretamente com os sites cujos feeds você cadastrou e com os servidores das imagens dessas notícias.
- O código é aberto, sob licença **MIT**, e pode ser auditado por qualquer pessoa.

O Papers News não possui servidor próprio. Nada é enviado para o autor do projeto.

## Quais dados ficam no seu dispositivo

O aplicativo guarda os dados em dois armazenamentos locais:

**IndexedDB (banco `papers-news`)** — fontes, notícias em cache e favoritos:

| Dado | Conteúdo | Finalidade |
| --- | --- | --- |
| Fontes | nome, endereço do site e URL do feed | montar e atualizar o feed |
| Notícias em cache | título, resumo, link, data, nome da fonte e URL da imagem | leitura offline e atualização parcial |
| Favoritos | identificadores das publicações guardadas | manter a lista "Salvos" |

**localStorage** — apenas preferências pequenas: tema, tamanho do texto, idioma e retenção das notícias.

O IndexedDB tem cota dinâmica, normalmente uma fração do espaço livre do disco, em vez do limite fixo de alguns megabytes do `localStorage`. Isso permite acompanhar muitos feeds sem que o aplicativo pare de salvar. Na primeira execução desta versão, o estado antigo de `papers-news:state:v1` é copiado para o IndexedDB e só removido do `localStorage` depois da conferência. Se o IndexedDB não estiver disponível, o app recorre ao `localStorage`.

Não são coletados nem gravados pelo aplicativo: nome, e-mail, senha, localização, identificadores de dispositivo ou histórico de navegação.

O WebView2 mantém um cache próprio de páginas, imagens e dados do perfil na pasta do aplicativo; esse cache é gerenciado pelo runtime do Edge e não é enviado ao autor do Papers News.

No aplicativo desktop portátil (ZIP), esses dados ficam em:

```text
%APPDATA%\papers-news-win_x64.exe\EBWebView\Default\IndexedDB
%APPDATA%\papers-news-win_x64.exe\EBWebView\Default\Local Storage
```

No pacote MSIX da Microsoft Store, o Windows virtualiza a pasta `%APPDATA%` do aplicativo. O caminho físico fica dentro do pacote e é preservado nas atualizações:

```text
%LOCALAPPDATA%\Packages\<PackageFamilyName>\LocalCache\Roaming\papers-news-win_x64.exe\EBWebView
```

A pasta de instalação do MSIX (`WindowsApps`) é somente leitura. Por isso os arquivos internos do Neutralino usam `dataLocation: "system"` e ficam na área de dados do usuário, não ao lado do executável.

No navegador, ficam no armazenamento local do próprio site (`http://127.0.0.1:5173` em desenvolvimento ou a origem usada no preview). O espaço disponível é definido pelo navegador; quando ele enche, o app avisa e permite remover fontes ou favoritos.

## O que sai do dispositivo

O Papers News não coleta dados, mas é um leitor de notícias: para exibir conteúdo atualizado ele precisa acessar a internet.

1. **Atualização de feeds.** O app faz uma requisição ao site que você cadastrou (diretamente ou pelo proxy local em `http://127.0.0.1:8787`). Como em qualquer leitor RSS, esse site recebe seu endereço IP, um *user-agent* de navegador e a URL solicitada.
2. **Imagens das notícias.** As imagens são carregadas dos servidores das publicações. Quando o feed não traz foto de capa, o app abre a página original da notícia (pelo proxy local) para procurar a imagem, como faria o modo de leitura. Esses servidores também veem seu endereço IP. O app não envia cookies desses sites nem scripts de rastreamento.
3. **Links abertos.** "Abrir publicação" e os links dentro do modo de leitura abrem no seu navegador padrão; a partir daí valem as políticas do site visitado.
4. **Serviços públicos de fallback (somente no navegador).** Ao abrir o projeto no navegador sem `npm run dev`, o proxy local pode não estar disponível. Nesse caso, o app tenta `api.rss2json.com` e `api.allorigins.win` como alternativa para contornar CORS e bloqueios do site, e **a URL do feed é enviada a esses serviços de terceiros**.

**No aplicativo desktop (portátil ou MSIX), esses serviços públicos não são usados.** O proxy local é iniciado automaticamente e é o único caminho de rede para os feeds. Se ele falhar, o app mostra um erro em vez de enviar a URL do feed a terceiros.

O proxy local escuta apenas em `127.0.0.1` (loopback) por padrão e não é acessível pela internet. Ele também recusa requisições de páginas abertas em outros sites (`Sec-Fetch-Site: cross-site`) e endereços de rede local/privada.

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
- **Versão portátil (ZIP):** feche o aplicativo e exclua a pasta `%APPDATA%\papers-news-win_x64.exe`.
- **Versão MSIX:** desinstale o Papers News em Configurações → Aplicativos. O Windows remove os dados virtualizados do pacote. Para apagar antes, feche o app e exclua `%LOCALAPPDATA%\Packages\<PackageFamilyName>`.
- No navegador: limpe os dados do site nas configurações do navegador.
- Não há exportação ou backup integrado nesta versão; os dados ficam nos armazenamentos locais descritos acima.

## Conteúdo de terceiros

Os textos, imagens e links exibidos pertencem às publicações cadastradas. O aplicativo apenas lê feeds públicos e não hospeda, copia ou redistribui esse conteúdo. Direitos autorais e termos de uso de cada site continuam valendo.

## Runtime e sistema

A interface é renderizada pelo Microsoft Edge WebView2. O comportamento de rede do próprio WebView2 (atualizações e recursos do Edge) segue as configurações do Windows e da Microsoft, não do Papers News. O aplicativo não coleta nem envia esses dados.

## Alterações nesta política

Mudanças relevantes serão registradas no [CHANGELOG](CHANGELOG.md) e nesta página, com atualização da data no topo.

## Contato

Dúvidas ou relatos de problemas: abra uma issue em
<https://github.com/httpjeffersom/papers-news/issues>.
