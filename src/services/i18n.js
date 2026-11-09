// Idioma da interface do Papers News.
//
// O português é o idioma padrão e também o fallback: se uma chave ainda não
// tiver tradução em inglês, o texto em português aparece no lugar em vez de a
// interface ficar vazia.
export const languageStorageKey = "papers-news:language:v1";

export const languages = [
  { id: "pt-BR", label: "Português", code: "PT" },
  { id: "en", label: "English", code: "EN" },
];

export const defaultLanguage = "pt-BR";

export function isLanguage(value) {
  return languages.some((language) => language.id === value);
}

export function normalizeLanguage(value) {
  return isLanguage(value) ? value : defaultLanguage;
}

export function loadLanguage() {
  try {
    return normalizeLanguage(
      globalThis.localStorage?.getItem(languageStorageKey),
    );
  } catch {
    return defaultLanguage;
  }
}

export function saveLanguage(language) {
  try {
    globalThis.localStorage?.setItem(languageStorageKey, normalizeLanguage(language));
  } catch {
    // Sem armazenamento disponível: o idioma ainda vale nesta sessão.
  }
}

export function applyLanguage(language) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = normalizeLanguage(language);
}

const translations = {
  "pt-BR": {
    "app.brandAria": "Papers News, ir para todas as notícias",
    "nav.space": "SEU ESPAÇO",
    "nav.aria": "Navegação principal",
    "nav.all": "Todas as notícias",
    "nav.favorites": "Favoritos",
    "nav.sources": "Fontes",
    "nav.settings": "Configurações",
    "nav.version": "versão {version}",

    "search.sources": "Buscar fonte",
    "search.feed": "Buscar no seu feed",

    "refresh.updating": "Atualizando",
    "refresh.update": "Atualizar",
    "refresh.updatingAria": "Atualizando feed",
    "refresh.updateAria": "Atualizar feed",

    "feed.aria": "Feed de notícias",
    "feed.favoritesAria": "Notícias favoritas",
    "feed.title": "Seu feed",
    "feed.favoritesTitle": "Favoritos",
    "feed.note": "em ordem cronológica",
    "feed.favoritesNote": "guardados para ler depois",
    "feed.count": ({ count }) =>
      `${count} ${count === 1 ? "publicação" : "publicações"}`,
    "feed.demoTitle": "Conteúdo de demonstração.",
    "feed.demoText":
      "Estas publicações são fictícias. Adicione um site em Fontes para acompanhar notícias reais.",
    "feed.updating": "Atualizando publicações…",
    "feed.loading": "Carregando publicações…",
    "feed.emptyFavoritesTitle": "Sua coleção começa aqui",
    "feed.emptyFavoritesText":
      "Salve uma publicação com o marcador para encontrá-la aqui.",
    "feed.emptyTitle": "Nenhuma publicação encontrada",
    "feed.emptyText": "Tente outro termo de busca ou volte mais tarde.",
    "feed.footer": "Você chegou ao fim das publicações disponíveis.",

    "item.unknownDate": "Data desconhecida",
    "item.demoTag": "DEMO",
    "item.read": "Ler aqui",
    "item.openDemo": "Abrir exemplo",
    "item.open": "Abrir publicação",
    "item.save": "Salvar nos favoritos",
    "item.unsave": "Remover dos favoritos",
    "item.openError": "Não foi possível abrir o link.",

    "sources.eyebrow": "PERSONALIZE SEU FEED",
    "sources.title": "Fontes",
    "sources.note": "os sites que você acompanha",
    "sources.count": ({ shown, total, filtered }) => {
      if (total === 0) return "0 fontes";
      const unit = total === 1 ? "fonte" : "fontes";
      return filtered ? `${shown} de ${total} ${unit}` : `${total} ${unit}`;
    },
    "sources.notice":
      "Cole o endereço do site (por exemplo, https://exemplo.com/) e o Papers News encontra o feed automaticamente. Se preferir, informe o endereço direto do RSS/Atom. O proxy local é iniciado junto com o app, então não depende de serviços públicos.",
    "sources.nameLabel": "Nome da fonte (opcional)",
    "sources.namePlaceholder": "Usar o nome do site",
    "sources.urlLabel": "Endereço do site",
    "sources.urlPlaceholder": "exemplo.com ou https://exemplo.com/feed/",
    "sources.searching": "Procurando feed...",
    "sources.add": "Buscar e adicionar",
    "sources.verifying": "Verificando o site e buscando publicações…",
    "sources.invalidUrl": "Informe um endereço de site válido.",
    "sources.invalidProtocol": "Informe um endereço de site HTTP ou HTTPS.",
    "sources.listTitle": "Fontes cadastradas",
    "sources.listNote": "Sites e feeds encontrados",
    "sources.emptyTitle": "Nenhuma fonte cadastrada",
    "sources.emptyText": "Adicione um site para buscar suas publicações.",
    "sources.emptyFilteredTitle": "Nenhuma fonte encontrada",
    "sources.emptyFilteredText": "Tente outro termo de busca.",
    "sources.feedLabel": "Feed: {url}",
    "sources.removeAria": "Remover {name}",
    "sources.removeTitle": "Remover fonte",
    "sources.removeDialogTitle": "Remover fonte?",
    "sources.removeDialogBefore": "Você quer realmente remover",
    "sources.removeDialogAfter": "da sua lista de fontes?",
    "sources.cancel": "Cancelar",
    "sources.remove": "Remover",

    "settings.title": "Configurações",
    "settings.note": "deixe o seu espaço com a sua cara",
    "settings.language": "Idioma",
    "settings.languageText": "Escolha o idioma da interface do aplicativo.",
    "settings.languageHint": "A mudança vale para toda a interface.",
    "settings.appearance": "Aparência",
    "settings.appearanceText": "Escolha como o Papers News deve ser exibido.",
    "settings.theme": "Tema",
    "settings.themeHint": "Claro para o dia, escuro para ambientes com pouca luz.",
    "settings.themeAria": "Tema da interface",
    "settings.themeLight": "Claro",
    "settings.themeDark": "Escuro",
    "settings.themeLightAria": "Tema claro",
    "settings.themeDarkAria": "Tema escuro",
    "settings.reading": "Leitura",
    "settings.readingText": "Ajuste o texto do feed e do modo de leitura.",
    "settings.fontSize": "Tamanho do texto",
    "settings.fontSizeHint":
      "{level} — o tamanho vale para toda a interface.",
    "settings.fontSizeAria": "Tamanho do texto",
    "settings.fontScaleSmall": "Pequeno",
    "settings.fontScaleLarge": "Maior",
    "settings.previewKicker": "PRÉ-VISUALIZAÇÃO",
    "settings.previewTitle": "Uma leitura confortável, do seu jeito",
    "settings.previewText":
      "As notícias aparecem em ordem cronológica, com espaço para respirar. Ajuste o tamanho até encontrar o que funciona melhor para você.",
    "settings.storage": "Armazenamento",
    "settings.storageText":
      "Defina por quanto tempo as notícias ficam guardadas neste computador.",
    "settings.retention": "Apagar notícias antigas",
    "settings.retentionHint": ({ days }) =>
      `As notícias são apagadas depois de ${days} ${
        days === 1 ? "dia" : "dias"
      }. Favoritos ficam guardados para sempre.`,
    "settings.retentionAria": "Apagar notícias antigas",
    "settings.day": "dia",
    "settings.days": "dias",
    "settings.custom": "Personalizado",
    "settings.footnote":
      "Suas preferências ficam salvas apenas neste computador.",
    "settings.privacyTitle": "Sem coleta de dados",
    "settings.privacyText":
      "Não coletamos nada: fontes, notícias e favoritos ficam salvos localmente, no seu computador. O código é aberto e você pode conferi-lo no repositório do projeto.",
    "settings.repository": "Abrir repositório no GitHub",
    "settings.repositoryError": "Não foi possível abrir o navegador.",

    "reader.back": "Voltar",
    "reader.loading": "Preparando a leitura…",
    "reader.limited":
      "O texto completo não pôde ser carregado agora. Mostrando o resumo da publicação.",
    "reader.noText":
      "Esta publicação não trouxe texto para leitura. Abra a publicação no site para continuar.",
    "reader.footer": "Você está lendo no Papers News.",
    "reader.continue": "Continuar no site",

    "font.small": "Pequeno",
    "font.default": "Padrão",
    "font.medium": "Médio",
    "font.large": "Grande",
    "font.larger": "Maior",

    "app.refreshPartial":
      "Atualização parcial. Não foi possível atualizar: {detail}. Notícias antigas permanecem disponíveis quando há cache.",
    "app.moreSources": ({ count }) =>
      `e mais ${count} ${count === 1 ? "fonte" : "fontes"}`,
    "app.refreshError": "Não foi possível atualizar o feed. Tente novamente.",
    "app.storageFull":
      "O armazenamento local está cheio. Remova fontes ou favoritos para liberar espaço.",
    "app.saveError": "Não foi possível salvar suas alterações neste dispositivo.",
    "app.alreadyAdded": "Este site já está cadastrado.",
    "app.addSourceError": "Não foi possível adicionar este site.",

    "error.feedLoad":
      "Não foi possível carregar {url}.{proxyHint} Detalhes: {detail}",
    "error.proxyHint":
      ' O proxy local não está ativo; rode "npm run dev" (ou "npm run proxy") e tente de novo.',
    "error.allOrigins": "AllOrigins respondeu HTTP {status}",
    "error.rss2json": "RSS2JSON respondeu HTTP {status}",
    "error.rss2jsonRead": "RSS2JSON não conseguiu ler este feed.",
    "error.alternativesFailed":
      " Alternativas públicas também falharam ({detail}).",
    "error.feedNotFound":
      "Não encontrei um feed RSS/Atom em {url}. Se o site publica um feed, informe o endereço direto dele (por exemplo, {example}). Detalhes: {detail}",
    "error.feedNotFoundHint":
      "Não encontrei um feed RSS/Atom em {url}. Verifique se o site publica um feed ou informe o endereço direto dele (por exemplo, {example}).",
    "error.openPage":
      'Não foi possível abrir {url}. O proxy local não está ativo; rode "npm run dev" (ou "npm run proxy") e tente novamente. Detalhes: {detail}',
    "error.notAFeed": "O endereço não retornou um feed RSS/Atom.",
    "error.unknownSource": "Fonte desconhecida",
  },

  en: {
    "app.brandAria": "Papers News, go to all news",
    "nav.space": "YOUR SPACE",
    "nav.aria": "Main navigation",
    "nav.all": "All news",
    "nav.favorites": "Favorites",
    "nav.sources": "Sources",
    "nav.settings": "Settings",
    "nav.version": "version {version}",

    "search.sources": "Search sources",
    "search.feed": "Search your feed",

    "refresh.updating": "Updating",
    "refresh.update": "Refresh",
    "refresh.updatingAria": "Refreshing feed",
    "refresh.updateAria": "Refresh feed",

    "feed.aria": "News feed",
    "feed.favoritesAria": "Favorite news",
    "feed.title": "Your feed",
    "feed.favoritesTitle": "Favorites",
    "feed.note": "in chronological order",
    "feed.favoritesNote": "saved for later",
    "feed.count": ({ count }) =>
      `${count} ${count === 1 ? "story" : "stories"}`,
    "feed.demoTitle": "Demo content.",
    "feed.demoText":
      "These stories are fictional. Add a site in Sources to follow real news.",
    "feed.updating": "Updating stories…",
    "feed.loading": "Loading stories…",
    "feed.emptyFavoritesTitle": "Your collection starts here",
    "feed.emptyFavoritesText":
      "Save a story with the bookmark to find it here.",
    "feed.emptyTitle": "No stories found",
    "feed.emptyText": "Try another search term or come back later.",
    "feed.footer": "You've reached the end of the available stories.",

    "item.unknownDate": "Unknown date",
    "item.demoTag": "DEMO",
    "item.read": "Read here",
    "item.openDemo": "Open example",
    "item.open": "Open article",
    "item.save": "Save to favorites",
    "item.unsave": "Remove from favorites",
    "item.openError": "Couldn't open the link.",

    "sources.eyebrow": "PERSONALIZE YOUR FEED",
    "sources.title": "Sources",
    "sources.note": "the sites you follow",
    "sources.count": ({ shown, total, filtered }) => {
      if (total === 0) return "0 sources";
      const unit = total === 1 ? "source" : "sources";
      return filtered ? `${shown} of ${total} ${unit}` : `${total} ${unit}`;
    },
    "sources.notice":
      "Paste the site address (for example, https://example.com/) and Papers News finds the feed automatically. If you prefer, enter the direct RSS/Atom address. The local proxy starts with the app, so it doesn't depend on public services.",
    "sources.nameLabel": "Source name (optional)",
    "sources.namePlaceholder": "Use the site name",
    "sources.urlLabel": "Site address",
    "sources.urlPlaceholder": "example.com or https://example.com/feed/",
    "sources.searching": "Looking for a feed...",
    "sources.add": "Find and add",
    "sources.verifying": "Checking the site and fetching stories…",
    "sources.invalidUrl": "Enter a valid site address.",
    "sources.invalidProtocol": "Enter an HTTP or HTTPS site address.",
    "sources.listTitle": "Saved sources",
    "sources.listNote": "Sites and feeds found",
    "sources.emptyTitle": "No sources yet",
    "sources.emptyText": "Add a site to fetch its stories.",
    "sources.emptyFilteredTitle": "No sources found",
    "sources.emptyFilteredText": "Try another search term.",
    "sources.feedLabel": "Feed: {url}",
    "sources.removeAria": "Remove {name}",
    "sources.removeTitle": "Remove source",
    "sources.removeDialogTitle": "Remove source?",
    "sources.removeDialogBefore": "Do you really want to remove",
    "sources.removeDialogAfter": "from your sources list?",
    "sources.cancel": "Cancel",
    "sources.remove": "Remove",

    "settings.title": "Settings",
    "settings.note": "make your space your own",
    "settings.language": "Language",
    "settings.languageText": "Choose the language of the app interface.",
    "settings.languageHint": "The change applies to the whole interface.",
    "settings.appearance": "Appearance",
    "settings.appearanceText": "Choose how Papers News looks.",
    "settings.theme": "Theme",
    "settings.themeHint": "Light for daytime, dark for low-light rooms.",
    "settings.themeAria": "Interface theme",
    "settings.themeLight": "Light",
    "settings.themeDark": "Dark",
    "settings.themeLightAria": "Light theme",
    "settings.themeDarkAria": "Dark theme",
    "settings.reading": "Reading",
    "settings.readingText": "Adjust the text in the feed and the reading view.",
    "settings.fontSize": "Text size",
    "settings.fontSizeHint": "{level} — the size applies to the whole interface.",
    "settings.fontSizeAria": "Text size",
    "settings.fontScaleSmall": "Small",
    "settings.fontScaleLarge": "Larger",
    "settings.previewKicker": "PREVIEW",
    "settings.previewTitle": "Comfortable reading, your way",
    "settings.previewText":
      "Stories appear in chronological order, with room to breathe. Adjust the size until you find what works best for you.",
    "settings.storage": "Storage",
    "settings.storageText":
      "Choose how long stories stay saved on this computer.",
    "settings.retention": "Delete old stories",
    "settings.retentionHint": ({ days }) =>
      `Stories are deleted after ${days} ${
        days === 1 ? "day" : "days"
      }. Favorites are kept forever.`,
    "settings.retentionAria": "Delete old stories",
    "settings.day": "day",
    "settings.days": "days",
    "settings.custom": "Custom",
    "settings.footnote": "Your preferences are saved only on this computer.",
    "settings.privacyTitle": "No data collection",
    "settings.privacyText":
      "We collect nothing: sources, stories and favorites are saved locally, on your computer. The code is open and you can check it in the project repository.",
    "settings.repository": "Open repository on GitHub",
    "settings.repositoryError": "Couldn't open the browser.",

    "reader.back": "Back",
    "reader.loading": "Preparing the reading view…",
    "reader.limited":
      "The full text couldn't be loaded right now. Showing the story summary.",
    "reader.noText":
      "This story didn't include any text to read. Open the story on the site to continue.",
    "reader.footer": "You're reading in Papers News.",
    "reader.continue": "Continue on site",

    "font.small": "Small",
    "font.default": "Default",
    "font.medium": "Medium",
    "font.large": "Large",
    "font.larger": "Larger",

    "app.refreshPartial":
      "Partial update. Couldn't update: {detail}. Older stories stay available when cached.",
    "app.moreSources": ({ count }) =>
      `and ${count} more ${count === 1 ? "source" : "sources"}`,
    "app.refreshError": "Couldn't refresh the feed. Try again.",
    "app.storageFull":
      "Local storage is full. Remove sources or favorites to free up space.",
    "app.saveError": "Couldn't save your changes on this device.",
    "app.alreadyAdded": "This site is already added.",
    "app.addSourceError": "Couldn't add this site.",

    "error.feedLoad":
      "Couldn't load {url}.{proxyHint} Details: {detail}",
    "error.proxyHint":
      ' The local proxy isn\'t running; run "npm run dev" (or "npm run proxy") and try again.',
    "error.allOrigins": "AllOrigins responded HTTP {status}",
    "error.rss2json": "RSS2JSON responded HTTP {status}",
    "error.rss2jsonRead": "RSS2JSON couldn't read this feed.",
    "error.alternativesFailed": " Public fallbacks also failed ({detail}).",
    "error.feedNotFound":
      "I couldn't find an RSS/Atom feed at {url}. If the site publishes a feed, enter its direct address (for example, {example}). Details: {detail}",
    "error.feedNotFoundHint":
      "I couldn't find an RSS/Atom feed at {url}. Check whether the site publishes a feed or enter its direct address (for example, {example}).",
    "error.openPage":
      'Couldn\'t open {url}. The local proxy isn\'t running; run "npm run dev" (or "npm run proxy") and try again. Details: {detail}',
    "error.notAFeed": "The address didn't return an RSS/Atom feed.",
    "error.unknownSource": "Unknown source",
  },
};

let activeLanguage = loadLanguage();

export function setActiveLanguage(language) {
  activeLanguage = normalizeLanguage(language);
}

export function getActiveLanguage() {
  return activeLanguage;
}

export function translate(language, key, vars) {
  const normalized = normalizeLanguage(language);
  const dictionary = translations[normalized] ?? translations[defaultLanguage];
  const value = dictionary[key] ?? translations[defaultLanguage][key];

  if (value === undefined) return key;
  if (typeof value === "function") return value(vars ?? {});
  if (!vars) return value;

  return value.replace(/\{(\w+)\}/g, (match, name) =>
    vars[name] === undefined ? match : String(vars[name]),
  );
}

/** Tradução no idioma ativo (usada também fora de componentes React). */
export function t(key, vars) {
  return translate(activeLanguage, key, vars);
}
