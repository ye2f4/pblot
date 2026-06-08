import path from "node:path";
import remarkDefList from "remark-deflist";

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: "Monoの小窝",
  tagline: "一半白发藏温柔，一半黑鬓载星网。",
  url: "https://ye2f4.github.io",
  baseUrl: "/pblot/",
  trailingSlash: true,
  onBrokenLinks: "throw",
  favicon: "img/logo.svg",
  organizationName: "ye2f4",
  projectName: "pblot",

  future: {
    faster: {
      // ✅ 启用所有官方推荐的Docusaurus Faster优化
      swcJsLoader: true, // 用SWC替代Babel转译JS
      swcJsMinimizer: true, // 用SWC替代Terser压缩JS
      swcHtmlMinimizer: true, // 用SWC替代html-minifier压缩HTML
      lightningCssMinimizer: true, // 用Lightning CSS替代cssnano压缩CSS
      rspackBundler: true, // 用Rspack替代Webpack打包
      rspackPersistentCache: true, // 启用Rspack持久化缓存，二次构建提速10倍
      mdxCrossCompilerCache: true, // MDX文件只编译一次（浏览器+Node.js共享）
      ssgWorkerThreads: true, // 多线程执行静态站点生成
      gitEagerVcs: true, // 一次性读取整个Git仓库，加速文件信息获取
    },
    v4: {
      useCssCascadeLayers: false,
      // ✅ 必须开启才能使用ssgWorkerThreads
      removeLegacyPostBuildHeadAttribute: true,
    },
  },

  // 全局SEO元数据
  headTags: [
    {
      tagName: "meta",
      attributes: {
        name: "description",
        content: "Monoの小窝，专注ESP32P4智能手表、LVGL开发、Meshtastic Mesh网络、开源硬件与技术分享",
      },
    },
    {
      tagName: "meta",
      attributes: {
        name: "keywords",
        content: "ESP32P4,智能手表,LVGL,Meshtastic,开源硬件,Docusaurus,游戏模组,React教程",
      },
    },
    { tagName: "meta", attributes: { name: "author", content: "Mono" } },
    { tagName: "meta", attributes: { name: "robots", content: "index,follow" } },
    // 🔥 预加载LCP图片（性能提升350ms）
    {
      tagName: 'link',
      attributes: {
        rel: 'preload',
        href: '/pblot/img/bar1.png',
        as: 'image',
        type: 'image/png',
        fetchpriority: 'high',
      },
    },
    // 静态资源缓存策略
    {
      tagName: "meta",
      attributes: {
        "http-equiv": "Cache-Control",
        content: "public, max-age=31536000, immutable",
      },
    },
  ],

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
    // 你的专属Algolia密钥（正确）
    algolia: {
      appId: "CQDTG18WX6",
      apiKey: "0f4ef075e41fbdaa5b918048b90984b2",
      indexName: "CrimsonFang",
      contextualSearch: true,
      searchPagePath: "search",
      searchParameters: { hitsPerPage: 10 },
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
    // 社交分享默认图
    image: "img/og-image.png",
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
          // 🔥 启用source maps，解决"Missing source maps"
          devtool: 'source-map',
        };
      },
    }),
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
          postsPerPage: 10,
          blogSidebarCount: 5,
          // 忽略博客截断警告
          onUntruncatedBlogPosts: "ignore",
          // 开启RSS订阅
          feedOptions: {
            type: "all",
            copyright: `Copyright © ${new Date().getFullYear()} Monoの小窝`,
          },
        },
        theme: { customCss: require.resolve("./src/css/custom.css") },
        // 自动生成站点地图
        sitemap: {
          changefreq: "weekly",
          priority: 0.5,
          ignorePatterns: ["/tags/**", "/categories/**", "/blog/archive/**"],
        },
      },
    ],
  ],

  customFields: {},
  i18n: { defaultLocale: "en", locales: ["en"] },
  markdown: {
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: "warn"
    }
  },
};

export default config;