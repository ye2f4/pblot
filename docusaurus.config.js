// ==============================================
// 导入依赖模块
// ==============================================
// Node.js内置路径模块，用于处理文件和目录路径
import path from "node:path";
// Markdown扩展插件：支持定义列表语法（术语: 解释）
import remarkDefList from "remark-deflist";

/**
 * @type {import('@docusaurus/types').Config}
 * TypeScript类型声明，提供代码提示和类型检查
 */
const config = {
  // ============================================
  // 站点基础信息配置（决定网站的核心身份）
  // ============================================
  title: "Monoの小窝",
  tagline: "一半白发藏温柔，一半黑鬓载星网。",
  url: "https://ye2f4.github.io",
  baseUrl: "/pblot/",
  trailingSlash: false, // 🔥 修复死链
  onBrokenLinks: "warn", // 🔥 不阻断打包
  favicon: "img/logo.svg",
  organizationName: "ye2f4",
  projectName: "pblot",

  // ============================================
  // 未来特性与性能优化配置
  // ============================================
  //future: {
  //  faster: {
  //    swcJsLoader: true,
  //    swcJsMinimizer: true,
  //    swcHtmlMinimizer: true,
  //    lightningCssMinimizer: true,
  //    rspackBundler: true,
  //    rspackPersistentCache: true,
  //    mdxCrossCompilerCache: true,
  //    gitEagerVcs: true,
  //  },
  //  v4: {
  //    useCssCascadeLayers: false,
  //    removeLegacyPostBuildHeadAttribute: true,
  //  },
  //},

  // ============================================
  // 全局HTML头部标签配置
  // ============================================
  headTags: [
    {
      tagName: 'link',
      attributes: {
        rel: 'preload',
        href: '/pblot/img/bg_big.webp',
        as: 'image',
        type: 'image/webp',
        fetchpriority: 'high',
      },
    },
    {
      tagName: 'link',
      attributes: {
        rel: 'preconnect',
        href: 'https://xwhwcmorcmgpfpocmgez.supabase.co',
        crossorigin: 'anonymous',
      },
    },
    {
      tagName: 'link',
      attributes: {
        rel: 'preconnect',
        href: 'https://fonts.googleapis.com',
      },
    },
    {
      tagName: 'link',
      attributes: {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossorigin: 'anonymous',
      },
    },
    {
      tagName: 'link',
      attributes: {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap',
        media: 'print',
        onload: "this.media='all'",
      },
    },
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
    //{
    //tagName: "meta",
    //attributes: {
    //"http-equiv": "Cache-Control",
    // content: "public, max-age=31536000, immutable",
    //},
    //},
    {
      tagName: "meta",
      attributes: {
        name: "algolia-site-verification",
        content: "5CB8AFBEBF426B824"
      }
    },
  ],

  // ============================================
  // 主题配置
  // ============================================
  themeConfig: {
    respectPrefersColorScheme: true,
    docs: { sidebar: { autoCollapseCategories: true } },
    navbar: {
      hideOnScroll: false,
      title: "Monoの小窝",
      logo: {
        alt: "Mono Logo",
        src: "img/logo.svg",
        srcDark: "img/logo.svg"
      },
      items: [
        { label: "首页", to: "/", position: "left" },
        { label: "文章", to: "/docs/introduction/", position: "left" },
        { label: "博客", to: "/blog/", position: "left" },
        {
          type: "dropdown",
          label: "资源",
          position: "left",
          items: [
            { label: "资料下载", to: "/downloads/" },
            { label: "开源项目", to: "/projects/" },
            { label: "开发工具", to: "/tools/" },
          ],
        },
        { label: "关于", to: "/about/", position: "left" },
        { type: "search", position: "right" },
        { label: "GitHub", href: "https://github.com/ye2f4", position: "right" },
      ],
    },
    footer: {
      copyright: `Powered by Docusaurus & GitHub Pages © ${new Date().getFullYear()} Monoの小窝`,
    },
    algolia: {
      appId: "ROGAN8VK8F",
      apiKey: "fe400fed06536292c70c9f6ef42f24f9",
      indexName: "ye2f4_github_io_rogan8vk8f_pages",
      contextualSearch: false, // 关闭自动追加语言、文档版本过滤
      searchPagePath: false,
      searchParameters: {
        hitsPerPage: 10,
        facetFilters: [], // 手动清空所有筛选条件
      },
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
    prism: {
      additionalLanguages: ["shell-session", "bash"]
    },
    image: "img/og-image.png",
  },

  // ============================================
  // 插件配置
  // ============================================
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
          resolve: {
            alias: { "@": path.resolve(__dirname, "src") }
          },
          devtool: 'source-map',
        };
      },
    }),
  ],

  scripts: [],

  // ============================================
  // 预设配置
  // ============================================
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
          onUntruncatedBlogPosts: "ignore",
          feedOptions: {
            type: "all",
            copyright: `Copyright © ${new Date().getFullYear()} Monoの小窝`,
          },
        },
        theme: {
          customCss: require.resolve("./src/css/custom.css")
        },
        sitemap: {
          changefreq: "weekly",
          priority: 0.7,
          lastmod: "date", // 🔥 自动更新时间，SEO 暴增
          ignorePatterns: ["/tags/**", "/categories/**", "/blog/archive/**"],
        },
      },
    ],
  ],

  customFields: {},

  i18n: {
    defaultLocale: "en",
    locales: ["en"]
  },

  markdown: {
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: "warn"
    }
  },
};

export default config;