// ==============================================
// 导入依赖模块
// ==============================================
import path from "node:path";
import fs from "node:fs";
import React from "react";
import remarkDefList from "remark-deflist";
import siteData from "./src/data/siteData.json" with { type: "json" };

// 环境 & 域名常量
const isDev = process.env.NODE_ENV === "development";
const SITE_DOMAIN = new URL(siteData.siteUrl).hostname;

const m = siteData.meta || {};
const b = siteData.branding || {};
const t = siteData.theme || {};
const currentYear = new Date().getFullYear();

/**
 * @type {import('@docusaurus/types').Config}
 */
const config = {
  title: siteData.siteTitle,
  tagline: b.tagline,
  url: siteData.siteUrl,
  baseUrl: siteData.basePath,
  trailingSlash: false,

  onBrokenLinks: "warn",
  markdown: {
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: "warn"
    }
  },

  favicon: b.favicon,
  organizationName: siteData.organizationName,
  projectName: "",

  headTags: [
    {
      tagName: 'link',
      attributes: {
        rel: 'preload', href: '/img/logo.svg', as: 'image',
        type: 'image/svg+xml', fetchpriority: 'high',
      },
    },
    {
      tagName: 'link',
      attributes: { rel: 'dns-prefetch', href: 'https://xwhwcmorcmgpfpocmgez.supabase.co' },
    },
    {
      tagName: 'link',
      attributes: {
        rel: 'preload', href: '/img/bg_big.webp', as: 'image',
        type: 'image/webp', fetchpriority: 'high',
      },
    },
    {
      tagName: 'link',
      attributes: { rel: 'preconnect', href: 'https://xwhwcmorcmgpfpocmgez.supabase.co', crossorigin: 'anonymous' },
    },
    {
      tagName: 'link',
      attributes: { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    },
    {
      tagName: 'meta',
      attributes: { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    },
    // 预加载轮播首张图片（LCP 关键资源），静态首图会立即渲染
    {
      tagName: 'link',
      attributes: {
        rel: 'preload', href: '/img/0.webp', as: 'image',
        type: 'image/webp', fetchpriority: 'high',
      },
    },
    {
      tagName: 'link',
      attributes: { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: 'anonymous' },
    },
    {
      tagName: 'link',
      attributes: {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap',
        media: 'print', onload: "this.media='all'",
      },
    },
    {
      tagName: 'meta',
      attributes: {
        'http-equiv': 'Content-Security-Policy',
        content: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://xwhwcmorcmgpfpocmgez.supabase.co https://va.vercel-scripts.com https://unpkg.com https://cdnjs.cloudflare.com",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com https://cdnjs.cloudflare.com",
          "img-src 'self' data: https: blob: https://*.tile.openstreetmap.org https://*.basemaps.cartocdn.com https://*.is.autonavi.com",
          "font-src 'self' https://fonts.gstatic.com data:",
          "connect-src 'self' https://xwhwcmorcmgpfpocmgez.supabase.co wss://xwhwcmorcmgpfpocmgez.supabase.co https://vitals.vercel-analytics.com https://api.open-meteo.com https://ipapi.co https://*.tile.openstreetmap.org https://*.basemaps.cartocdn.com",
          "frame-src 'self'",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self'",
        ].join('; '),
      },
    },
    {
      tagName: 'meta',
      attributes: { 'http-equiv': 'X-Content-Type-Options', content: 'nosniff' },
    },
    {
      tagName: 'meta',
      attributes: { 'http-equiv': 'Referrer-Policy', content: 'strict-origin-when-cross-origin' },
    },
    {
      tagName: 'meta',
      attributes: { 'http-equiv': 'Permissions-Policy', content: 'camera=(), microphone=(), geolocation=self' },
    },
    {
      tagName: "meta",
      attributes: { name: "description", content: m.description },
    },
    {
      tagName: "meta",
      attributes: { name: "keywords", content: m.keywords },
    },
    {
      tagName: 'script',
      attributes: { type: 'application/ld+json' },
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Blog",
        "name": siteData.siteTitle,
        "description": m.description,
        "url": siteData.siteUrl,
        "author": { "@type": "Person", "name": siteData.siteAuthor },
        "publisher": {
          "@type": "Organization",
          "name": siteData.siteTitle,
          "logo": { "@type": "ImageObject", "url": b.avatarImage }
        }
      }),
    },
    // WebSite + 站内搜索动作（Sitelinks 搜索框）
    {
      tagName: 'script',
      attributes: { type: 'application/ld+json' },
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": siteData.siteTitle,
        "url": siteData.siteUrl,
        "description": m.description,
        "potentialAction": {
          "@type": "SearchAction",
          "target": {
            "@type": "EntryPoint",
            "urlTemplate": `${siteData.siteUrl}/search?q={search_term_string}`
          },
          "query-input": "required name=search_term_string"
        }
      }),
    },
    { tagName: "meta", attributes: { name: "author", content: siteData.siteAuthor } },
    { tagName: "meta", attributes: { name: "robots", content: "index,follow" } },
    // Open Graph
    { tagName: "meta", attributes: { property: "og:type", content: "website" } },
    { tagName: "meta", attributes: { property: "og:title", content: m.ogTitle } },
    { tagName: "meta", attributes: { property: "og:description", content: m.ogDescription } },
    { tagName: "meta", attributes: { property: "og:url", content: siteData.siteUrl } },
    { tagName: "meta", attributes: { property: "og:image", content: m.ogImage } },
    { tagName: "meta", attributes: { property: "og:site_name", content: siteData.siteTitle } },
    { tagName: "meta", attributes: { property: "og:locale", content: m.ogLocale } },
    // Twitter Card
    { tagName: "meta", attributes: { name: "twitter:card", content: "summary_large_image" } },
    { tagName: "meta", attributes: { name: "twitter:title", content: m.twitterTitle } },
    { tagName: "meta", attributes: { name: "twitter:description", content: m.twitterDescription } },
    { tagName: "meta", attributes: { name: "twitter:image", content: m.ogImage } },
  ],

  themeConfig: {
    colorMode: {
      defaultMode: 'light',
      respectPrefersColorScheme: true,
      disableSwitch: false,
    },
    primaryColor: t.primaryColor,
    secondaryColor: t.secondaryColor,
    docs: { sidebar: { autoCollapseCategories: true } },
    navbar: {
      hideOnScroll: siteData.navbarConfig?.hideOnScroll ?? false,
      title: siteData.siteTitle,
      items: siteData.navbarConfig?.items || [],
    },
    footer: {
      style: siteData.footerConfig?.style || 'dark',
      links: siteData.footerConfig?.links || [],
      copyright: `Copyright © ${currentYear} ${siteData.siteTitle}. Powered by Docusaurus & Vercel.`,
    },
    mermaid: {
      theme: { light: "base", dark: "base" },
      options: {
        themeVariables: {
          primaryColor: t.primaryColor,
          primaryTextColor: "#1a1a1a",
          primaryBorderColor: "#4D4D4D",
          lineColor: "#EAD67E",
          secondaryColor: t.secondaryColor,
          tertiaryColor: "#67CEA9",
        },
      },
    },
    prism: {
      additionalLanguages: ["shell-session", "bash"]
    },
    image: m.ogImage,
  },

  plugins: [
    require.resolve("./plugins/sync-blog-plugin"),
    require.resolve("./plugins/deploy-ui-plugin"),
    // 全局 SEO：挂载 SeoCanonical，为每个路由注入 <link rel="canonical">
    // （用 require 懒加载浏览器组件，避免在 Node 端构建时执行 React 渲染）
    function seoCanonicalPlugin() {
      return {
        name: "seo-canonical-plugin",
        wrapRootLayout(children) {
          const SeoCanonical = require("./src/components/SeoCanonical").default;
          return React.createElement(
            React.Fragment,
            null,
            React.createElement(SeoCanonical, null),
            children
          );
        },
      };
    },
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
          editUrl: `${siteData.githubUrl}/pblot/edit/master/`,
          breadcrumbs: true,
          // 关闭 git 依赖的 lastUpdate：Vercel 构建环境（尤其上传模式/部分 clone）无完整 git 工作树，
          // 会导致 "outside any Git worktree" 构建失败，进而阻塞整站部署。
          remarkPlugins: [remarkDefList],
        },
        blog: {
          blogTitle: b.blogTitle,
          blogDescription: b.blogDescription,
          postsPerPage: 10,
          blogSidebarCount: 5,
          onUntruncatedBlogPosts: 'ignore',
          feedOptions: {
            type: 'all',
            copyright: `© ${currentYear} ${siteData.siteTitle}`,
            language: 'zh-CN'
          }
        },
        theme: {
          customCss: require.resolve("./src/css/custom.css"),
        },
        sitemap: {
          changefreq: 'weekly',
          priority: 0.7,
          lastmod: 'date',
          ignorePatterns: ['/tags/**', '/categories/**', '/search'],
        },
      },
    ],
  ],

  i18n: {
    defaultLocale: "zh-CN",
    locales: ["zh-CN"]
  },
};

export default config;
