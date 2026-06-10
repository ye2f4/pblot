// ==============================================
// 导入依赖模块
// ==============================================
import path from "node:path";
import fs from "node:fs";
import remarkDefList from "remark-deflist";

// 环境 & 域名常量
const isDev = process.env.NODE_ENV === "development";
const SITE_DOMAIN = "monoblog.cc.cd";

/**
 * @type {import('@docusaurus/types').Config}
 */
const config = {
  title: "Monoの小窝",
  tagline: "一半白发藏温柔，一半白发载星网。",
  url: "https://monoblog.cc.cd",
  baseUrl: "/",
  trailingSlash: false,

  // 断链告警规范写法（消除弃用警告）
  onBrokenLinks: "warn",
  markdown: {
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: "warn"
    }
  },

  favicon: "img/logo.svg",
  organizationName: "ye2f4",
  projectName: "",
  deploymentBranch: "gh-pages",

  headTags: [
    {
      tagName: 'link',
      attributes: {
        rel: 'preload',
        href: '/img/logo.svg',
        as: 'image',
        type: 'image/svg+xml',
        fetchpriority: 'high',
      },
    },
    {
      tagName: 'link',
      attributes: {
        rel: 'dns-prefetch',
        href: 'https://xwhwcmorcmgpfpocmgez.supabase.co',
      },
    },
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
      tagName: 'meta',
      attributes: {
        'http-equiv': 'Content-Security-Policy',
        content: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://xwhwcmorcmgpfpocmgez.supabase.co",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "img-src 'self' data: https: blob:",
          "font-src 'self' https://fonts.gstatic.com",
          "connect-src 'self' https://xwhwcmorcmgpfpocmgez.supabase.co wss://xwhwcmorcmgpfpocmgez.supabase.co",
          "frame-src 'self'",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self'",
        ].join('; '),
      },
    },
    {
      tagName: 'meta',
      attributes: {
        'http-equiv': 'X-Frame-Options',
        content: 'DENY',
      },
    },
    {
      tagName: 'meta',
      attributes: {
        'http-equiv': 'X-Content-Type-Options',
        content: 'nosniff',
      },
    },
    {
      tagName: 'meta',
      attributes: {
        'http-equiv': 'Referrer-Policy',
        content: 'strict-origin-when-cross-origin',
      },
    },
    {
      tagName: 'meta',
      attributes: {
        'http-equiv': 'Permissions-Policy',
        content: 'camera=(), microphone=(), geolocation=()',
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
    {
      tagName: 'script',
      attributes: {
        type: 'application/ld+json',
      },
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Blog",
        "name": "Monoの小窝",
        "description": "专注ESP32P4智能手表、LVGL开发、Meshtastic Mesh网络、开源硬件、技术分享",
        "url": "https://monoblog.cc.cd",
        "author": {
          "@type": "Person",
          "name": "Mono"
        },
        "publisher": {
          "@type": "Organization",
          "name": "Monoの小窝",
          "logo": {
            "@type": "ImageObject",
            "url": "https://monoblog.cc.cd/img/avatar.webp"
          }
        }
      }),
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
        {
          type: "dropdown",
          label: "工具箱",
          position: "left",
          items: [
            { label: "硬件监控", to: "/hardware/" },
            { label: "代码片段", to: "/snippets/" },
            { label: "PCB元器件", to: "/pcb/" },
            { label: "时光胶囊", to: "/capsule/" },
            { label: "排行榜", to: "/leaderboard/" },
          ],
        },
        {
          type: "dropdown",
          label: "更多",
          position: "left",
          items: [
            { label: "更新日志", to: "/changelog/" },
            { label: "隐私政策", to: "/privacy/" },
            { label: "用户协议", to: "/terms/" },
            { label: "RSS订阅", to: "/rss/" },
          ],
        },
        { label: "关于", to: "/about/", position: "left" },
        {
          label: "聊天",
          to: "/chat/",
          position: "right",
          className: "navbar-chat-btn",
        },
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

  plugins: [
    // 自动生成CNAME插件
    function AutoGenerateCNAMEPlugin() {
      return {
        name: "auto-generate-cname",
        async postBuild({ outDir }) {
          const cnameFilePath = path.join(outDir, "CNAME");
          fs.writeFileSync(cnameFilePath, SITE_DOMAIN, "utf8");
          console.log(`✅ [插件] 已自动生成 CNAME 文件: ${cnameFilePath}`);
        },
      };
    },

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
          devtool: isDev ? "source-map" : false,
        };
      },
    }),
  ],

  future: {
    faster: true,
    v4: true,
  },

  presets: [
    [
      "@docusaurus/preset-classic",
      {
        docs: {
          sidebarPath: require.resolve("./sidebars.js"),
          editUrl: "https://github.com/ye2f4/edit/master/",
          breadcrumbs: true,
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
          changefreq: 'weekly',
          priority: 0.7,
          lastmod: 'date',
          ignorePatterns: [
            '/tags/**',
            '/categories/**',
            '/search',
            '/rss',
          ],
        },
      },
    ],
  ],

  plugins: [
    // 自动生成CNAME插件
    function AutoGenerateCNAMEPlugin() {
      return {
        name: "auto-generate-cname",
        async postBuild({ outDir }) {
          const cnameFilePath = path.join(outDir, "CNAME");
          fs.writeFileSync(cnameFilePath, SITE_DOMAIN, "utf8");
          console.log(`✅ [插件] 已自动生成 CNAME 文件: ${cnameFilePath}`);
        },
      };
    },

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
          devtool: isDev ? "source-map" : false,
        };
      },
    }),

    ["@docusaurus/faster", {
      imageOptimization: true,
      swcJsLoader: true,
      swcJsMinimizer: true,
      lightningCssMinimizer: true,
      mdxRs: true,
    }],
  ],
  i18n: {
    defaultLocale: "zh-CN",
    locales: ["zh-CN"]
  },
};

export default config;