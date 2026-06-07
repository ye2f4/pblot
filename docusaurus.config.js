import path from "node:path";
import remarkDefList from "remark-deflist";

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: "Monoの小窝",
  tagline: "一半白发藏温柔，一半黑鬓载星网。",
  url: "https://ye2f4.github.io",
  baseUrl: "/pblot/",
  trailingSlash: true,
  onBrokenLinks: "warn",
  favicon: "img/logo.svg",
  organizationName: "ye2f4",
  projectName: "pblot",

  future: {
    faster: {
      rspackBundler: true,
      rspackPersistentCache: true,
    },
    v4: {
      useCssCascadeLayers: false,
    },
  },

  themeConfig: {
    respectPrefersColorScheme: true,
    docs: { sidebar: { autoCollapseCategories: true } },
    navbar: {
      hideOnScroll: false,
      title: "Monoの小窝",
      logo: { alt: "Mono Logo", src: "img/logo.svg", srcDark: "img/logo.svg" },
      items: [
        { label: "文章", to: "/docs/introduction/", position: "left" },
        { label: "博客", to: "/blog/", position: "left" },
        { label: "下载", to: "/downloads/", position: "left" },
        { type: "search", position: "right" },
        { label: "GitHub", href: "https://github.com/ye2f4", position: "right" },
      ],
    },
    footer: {
      copyright: `Powered by Docusaurus & GitHub Pages © ${new Date().getFullYear()} Monoの小窝`,
    },
    algolia: {
      appId: "IG2GQB8L3V",
      apiKey: "2e4348812173ec7ea6f7879c7032bb21",
      indexName: "meshtastic",
      contextualSearch: true,
      searchPagePath: "search",
    },
    colorMode: { respectPrefersColorScheme: true },
    mermaid: {
      theme: { light: "base", dark: "base" },
      options: {
        themeVariables: {
          primaryColor: "#67EA94",
          primaryTextColor: "#1a1a1a",
          primaryBorderColor: "#4D4D4D",
          lineColor: "#EAD67E",
          secondaryColor: "#EA67BD",
          tertiaryColor: "#677CEA",
        },
      },
    },
    prism: { additionalLanguages: ["shell-session", "bash"] },
  },

  plugins: [
    () => ({
      name: "docusaurus-tailwindcss",
      configurePostCss(postcssOptions) {
        postcssOptions.plugins.push(require("tailwindcss"));
        postcssOptions.plugins.push(require("autoprefixer"));
        return postcssOptions;
      },
    }),
    () => ({
      name: "docusaurus-webpack-alias",
      configureWebpack() {
        return {
          resolve: { alias: { "@": path.resolve(__dirname, "src") } },
        };
      },
    }),
    "@docusaurus/plugin-vercel-analytics",
  ],

  scripts: [],

  presets: [
    [
      "@docusaurus/preset-classic",
      {
        docs: {
          sidebarPath: require.resolve("./sidebars.js"),
          editUrl: "https://github.com/ye2f4/pblot/edit/master/",
          breadcrumbs: false,
          showLastUpdateAuthor: true,
          remarkPlugins: [remarkDefList],
        },
        blog: {
          blogTitle: "Monoの小窝 博客",
          blogDescription: "个人随笔、技术分享与生活记录",
        },
        theme: { customCss: require.resolve("./src/css/custom.css") },
      },
    ],
  ],

  customFields: {},
  i18n: { defaultLocale: "en", locales: ["en"] },
  markdown: { mermaid: true },
  themes: ["@docusaurus/theme-mermaid"],
};

export default config;