const now = Date.now();

export const demoArticles = [
  {
    id: "demo-1",
    sourceId: "source-demo-1",
    sourceName: "Caderno de Tecnologia",
    sourceInitials: "CT",
    title: "Demonstração: pequenas ferramentas, novas formas de aprender",
    summary:
      "Um exemplo de resumo para visualizar como uma publicação de tecnologia aparece no feed. Este conteúdo foi criado para a demonstração do aplicativo.",
    publishedAt: new Date(now - 18 * 60 * 1000).toISOString(),
    image: "/images/demo-learning.svg",
    url: "https://example.com/",
    content: [
      "<p>Esta é uma publicação fictícia, criada apenas para mostrar como o modo de leitura do Papers News funciona.</p>",
      "<h2>Uma leitura sem distrações</h2>",
      "<p>Aqui você encontra o texto da notícia em uma página limpa, com o tamanho de letra escolhido nas configurações. Links, imagens e citações continuam no lugar, mas menus, anúncios e barras laterais ficam de fora.</p>",
      "<blockquote>Ler é um pequeno intervalo no meio do dia.</blockquote>",
      "<p>Quando o texto completo não vem no feed, o Papers News busca a página original e tenta extrair apenas o conteúdo principal. Se isso não for possível, o resumo continua disponível para leitura.</p>",
    ].join(""),
    isDemo: true,
  },
  {
    id: "demo-2",
    sourceId: "source-demo-2",
    sourceName: "Notas de Ciência",
    sourceInitials: "NC",
    title: "Demonstração: observando padrões no mundo natural",
    summary:
      "Texto ilustrativo, sem relação com uma notícia real. O resumo ocupa poucas linhas para manter a leitura do feed leve e confortável.",
    publishedAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
    image: "/images/demo-nature.svg",
    url: "https://example.com/",
    content: [
      "<p>Texto ilustrativo, sem relação com uma notícia real. Ele existe para que você possa experimentar a leitura dentro do aplicativo antes de adicionar suas próprias fontes.</p>",
      "<h2>Do feed para a página</h2>",
      "<p>O Papers News mantém o conteúdo em cache no seu computador. Assim, uma publicação salva nos favoritos continua legível mesmo quando o site original está fora do ar.</p>",
      "<p>Use o botão Ler aqui em qualquer cartão do feed. Para voltar, pressione Esc ou use o botão Voltar no topo da leitura.</p>",
    ].join(""),
    isDemo: true,
  },
  {
    id: "demo-3",
    sourceId: "source-demo-3",
    sourceName: "Boletim de Cultura",
    sourceInitials: "BC",
    title: "Demonstração: ideias que atravessam diferentes disciplinas",
    summary:
      "Uma publicação fictícia para testar títulos, imagens e metadados. Nenhuma fonte ou integração real está sendo simulada.",
    publishedAt: new Date(now - 26 * 60 * 60 * 1000).toISOString(),
    image: "/images/demo-culture.svg",
    url: "https://example.com/",
    content: [
      "<p>Uma publicação fictícia para testar títulos, imagens e metadados. Nenhuma fonte ou integração real está sendo simulada.</p>",
      "<h2>Um espaço pessoal</h2>",
      "<p>As fontes, as notícias em cache e os favoritos ficam salvos apenas neste computador. O Papers News não tem conta, nem envia seus dados para servidores próprios.</p>",
      "<p>Personalize o tema e o tamanho do texto em Configurações, logo abaixo de Fontes no menu do seu espaço.</p>",
    ].join(""),
    isDemo: true,
  },
];

export const demoArticlesInEnglish = [
  {
    id: "demo-1",
    sourceId: "source-demo-1",
    sourceName: "Technology Notebook",
    sourceInitials: "TN",
    title: "Demo: small tools, new ways to learn",
    summary:
      "A sample summary to show how a technology story looks in the feed. This content was created for the app demonstration.",
    publishedAt: new Date(now - 18 * 60 * 1000).toISOString(),
    image: "/images/demo-learning.svg",
    url: "https://example.com/",
    content: [
      "<p>This is a fictional story, created only to show how the Papers News reading view works.</p>",
      "<h2>Distraction-free reading</h2>",
      "<p>Here you find the story text on a clean page, with the font size chosen in Settings. Links, images and quotes stay in place, while menus, ads and sidebars are left out.</p>",
      "<blockquote>Reading is a small break in the middle of the day.</blockquote>",
      "<p>When the full text isn't in the feed, Papers News fetches the original page and tries to extract just the main content. If that isn't possible, the summary remains available for reading.</p>",
    ].join(""),
    isDemo: true,
  },
  {
    id: "demo-2",
    sourceId: "source-demo-2",
    sourceName: "Science Notes",
    sourceInitials: "SN",
    title: "Demo: observing patterns in the natural world",
    summary:
      "Illustrative text, unrelated to a real story. The summary takes a few lines to keep the feed light and comfortable.",
    publishedAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
    image: "/images/demo-nature.svg",
    url: "https://example.com/",
    content: [
      "<p>Illustrative text, unrelated to a real story. It exists so you can try reading inside the app before adding your own sources.</p>",
      "<h2>From the feed to the page</h2>",
      "<p>Papers News keeps content cached on your computer. That way, a story saved in favorites stays readable even when the original site is offline.</p>",
      "<p>Use the Read here button on any card in the feed. To go back, press Esc or use the Back button at the top of the reading view.</p>",
    ].join(""),
    isDemo: true,
  },
  {
    id: "demo-3",
    sourceId: "source-demo-3",
    sourceName: "Culture Bulletin",
    sourceInitials: "CB",
    title: "Demo: ideas that cross different disciplines",
    summary:
      "A fictional story to test titles, images and metadata. No real source or integration is being simulated.",
    publishedAt: new Date(now - 26 * 60 * 60 * 1000).toISOString(),
    image: "/images/demo-culture.svg",
    url: "https://example.com/",
    content: [
      "<p>A fictional story to test titles, images and metadata. No real source or integration is being simulated.</p>",
      "<h2>A personal space</h2>",
      "<p>Sources, cached news and favorites are saved only on this computer. Papers News has no account and doesn't send your data to its own servers.</p>",
      "<p>Customize the theme and text size in Settings, right below Sources in your space menu.</p>",
    ].join(""),
    isDemo: true,
  },
];

export const demoSources = [
  {
    id: "source-demo-1",
    name: "Caderno de Tecnologia",
    url: "https://example.com/tecnologia.xml",
    isDemo: true,
  },
  {
    id: "source-demo-2",
    name: "Notas de Ciência",
    url: "https://example.com/ciencia.xml",
    isDemo: true,
  },
  {
    id: "source-demo-3",
    name: "Boletim de Cultura",
    url: "https://example.com/cultura.xml",
    isDemo: true,
  },
];

export const demoSourcesInEnglish = [
  {
    id: "source-demo-1",
    name: "Technology Notebook",
    url: "https://example.com/tecnologia.xml",
    isDemo: true,
  },
  {
    id: "source-demo-2",
    name: "Science Notes",
    url: "https://example.com/ciencia.xml",
    isDemo: true,
  },
  {
    id: "source-demo-3",
    name: "Culture Bulletin",
    url: "https://example.com/cultura.xml",
    isDemo: true,
  },
];

export function getDemoArticles(language) {
  return language === "en" ? demoArticlesInEnglish : demoArticles;
}

export function getDemoSources(language) {
  return language === "en" ? demoSourcesInEnglish : demoSources;
}
