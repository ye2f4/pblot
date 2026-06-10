// ==============================================
// 导入依赖模块
// ==============================================
import path from "node:path";
import remarkDefList from "remark-deflist";

/**
 * @type {import('@docusaurus/types').Config}
 */
const config = {
  title: "Monoの小窝",
  tagline: "一半白发藏温柔，一半白发载星网。",
  url: "https://monoblog.cc.cd",
  baseUrl: "/",
  trailingSlash: false,
  onBrokenLinks: "warn",
  favicon: "img/logo.svg",
  organizationName: "ye2f4",
  projectName: "",

  // 已彻底关闭实验模式，无崩溃
  future: {},

  headTags: [
    {
      tagName: 'link',
      attributes: {
        rel: 'preload',
        href: '/img/bg_big.webp',
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
        content: "Monoの小窝，专注ESP32P4智能手表、LVGL开发、Meshtastic Mesh网络、开源硬件、技术分享",
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
  ],

  themeConfig: {
    respectPrefersColorScheme: true,
    docs: { sidebar: { autoCollapseCategories: true } },
    navbar: {
      hideOnScroll: false,
      title: "Monoの小窝",
      logo: {
        alt: "Mono Logo",
        src: "img/logo.svg",
        srcDark: "img/logo.svg",
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

        // ✅ 绿色聊天按钮（自动适配样式）
        {
          label: "聊天",
          to: "/chat/",
          position: "right",
          className: "navbar-chat-btn",
        },
        // ✅ GitHub 统一风格按钮
        {
          label: "GitHub",
          href: "https://github.com/ye2f4",
          position: "right",
          className: "navbar-github-btn",
        },
      ],
    },
    footer: {
      copyright: `Powered by Docusaurus & GitHub Pages © ${new Date().getFullYear()} Monoの小窝`,
    },
    // ✅ 已彻底删除所有 algolia 配置（崩溃根源）
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
          tertiaryColor: "#67CEA9",
        },
      },
    },
    prism: {
      additionalLanguages: ["shell-session", "bash"]
    },
    image: "img/og-image.png",
  },

  // ✅ 正确的本地搜索插件（无崩溃、支持中文）
  plugins: [
    [require.resolve("@easyops-cn/docusaurus-search-local"), {
      hashed: true,
      language: ["zh", "en"],
      highlightSearchTermsOnTargetPage: true,
    }],
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

  presets: [
    [
      "@docusaurus/preset-classic",
      {
        docs: {
          sidebarPath: require.resolve("./sidebars.js"),
          editUrl: "https://github.com/ye2f4/edit/master/",
          breadcrumbs: false,
          showLastUpdateAuthor: true,
          remarkPlugins: [remarkDefList],
        },
        blog: {
          blogTitle: "Monoの小窝",
          blogDescription: "个人随笔、技术分享、开源教程",
          postsPerPage: 10,
          blogSidebarCount: 5,
          onUntruncatedBlogPosts: "ignore",
        },
        theme: {
          customCss: require.resolve("./src/css/custom.css"),
        },
        sitemap: {
          changefreq: "weekly",
          priority: 0.7,
          lastmod: "date",
        },
      },
    ],
  ],

  i18n: { defaultLocale: "en", locales: ["en"] },
  markdown: { mermaid: true },
};

export default config;
