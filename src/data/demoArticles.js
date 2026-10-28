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
