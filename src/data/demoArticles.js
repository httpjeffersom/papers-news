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
