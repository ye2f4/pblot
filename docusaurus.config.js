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
  // 网站标题，显示在浏览器标签页和导航栏
  title: "Monoの小窝",
  // 网站标语，显示在首页和元数据中
  tagline: "一半白发藏温柔，一半黑鬓载星网。",
  // 网站部署的根URL（GitHub Pages的域名）
  url: "https://ye2f4.github.io",
  // 网站的基础路径（部署在子目录时必须设置）
  // 这里表示网站部署在 https://ye2f4.github.io/pblot/ 下
  baseUrl: "/pblot/",
  // URL末尾是否自动添加斜杠，避免404错误
  trailingSlash: true,
  // 检测到断裂链接时的处理方式：throw=构建失败，warn=仅警告，ignore=忽略
  onBrokenLinks: "throw",
  // 网站图标路径（相对于static目录）
  favicon: "img/logo.svg",
  // GitHub组织/用户名（用于部署和编辑链接）
  organizationName: "ye2f4",
  // GitHub仓库名（用于部署和编辑链接）
  projectName: "pblot",

  // ============================================
  // 未来特性与性能优化配置
  // 开启所有Docusaurus v3的实验性性能优化
  // ============================================
  future: {
    faster: {
      // 使用SWC代替Babel编译JS，速度提升10倍
      swcJsLoader: true,
      // 使用SWC压缩JS代码
      swcJsMinimizer: true,
      // 使用SWC压缩HTML代码
      swcHtmlMinimizer: true,
      // 使用LightningCSS代替PostCSS压缩CSS，速度提升100倍
      lightningCssMinimizer: true,
      // 使用Rspack代替Webpack作为打包器，构建速度提升5-10倍
      rspackBundler: true,
      // 开启Rspack持久化缓存，增量构建速度提升100倍
      rspackPersistentCache: true,
      // 开启MDX跨编译器缓存
      mdxCrossCompilerCache: true,
      // 优化Git版本控制检测
      gitEagerVcs: true,
    },
    v4: {
      // 禁用CSS级联层（避免样式冲突）
      useCssCascadeLayers: false,
      // 移除遗留的postBuild头部属性
      removeLegacyPostBuildHeadAttribute: true,
    },
  },

  // ============================================
  // 全局HTML头部标签配置
  // 所有页面都会自动注入这些标签到<head>中
  // 包含：性能优化、SEO、外部资源加载
  // ============================================
  headTags: [
    // ✅ 性能优化：预加载LCP核心元素（顶部背景图）
    // 浏览器会在解析HTML时优先加载这个图片，大幅提升LCP
    {
      tagName: 'link',
      attributes: {
        rel: 'preload', // 预加载指令
        href: '/pblot/img/bg_big.webp', // 预加载的图片路径
        as: 'image', // 资源类型
        type: 'image/webp', // 资源MIME类型
        fetchpriority: 'high', // 最高优先级
      },
    },
    // ✅ 性能优化：预连接Supabase服务器
    // 提前建立TCP连接，减少后续API请求的延迟
    {
      tagName: 'link',
      attributes: {
        rel: 'preconnect', // 预连接指令
        href: 'https://xwhwcmorcmgpfpocmgez.supabase.co',
        crossorigin: 'anonymous', // 跨域请求不携带凭据
      },
    },
    // ✅ 性能优化：预连接Google Fonts服务器
    {
      tagName: 'link',
      attributes: {
        rel: 'preconnect',
        href: 'https://fonts.googleapis.com',
      },
    },
    // ✅ 性能优化：预连接Google Fonts字体文件服务器
    {
      tagName: 'link',
      attributes: {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossorigin: 'anonymous',
      },
    },
    // ✅ 性能优化：异步加载Google Fonts样式表
    // media="print" 表示打印时才加载，加载完成后通过onload改为all
    // 避免阻塞首屏渲染
    {
      tagName: 'link',
      attributes: {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap',
        media: 'print', // 初始媒体类型为打印
        onload: "this.media='all'", // 加载完成后改为所有媒体
      },
    },
    // ✅ SEO优化：网站描述（搜索引擎结果页显示）
    {
      tagName: "meta",
      attributes: {
        name: "description",
        content: "Monoの小窝，专注ESP32P4智能手表、LVGL开发、Meshtastic Mesh网络、开源硬件与技术分享",
      },
    },
    // ✅ SEO优化：网站关键词
    {
      tagName: "meta",
      attributes: {
        name: "keywords",
        content: "ESP32P4,智能手表,LVGL,Meshtastic,开源硬件,Docusaurus,游戏模组,React教程",
      },
    },
    // ✅ SEO优化：作者信息
    { tagName: "meta", attributes: { name: "author", content: "Mono" } },
    // ✅ SEO优化：搜索引擎爬虫指令
    { tagName: "meta", attributes: { name: "robots", content: "index,follow" } },
    // ✅ 性能优化：静态资源缓存策略
    // 告诉浏览器静态资源缓存1年，且不可变
    {
      tagName: "meta",
      attributes: {
        "http-equiv": "Cache-Control",
        content: "public, max-age=31536000, immutable",
      },
    },
  ],

  // ============================================
  // 主题配置（决定网站的外观和交互）
  // ============================================
  themeConfig: {
    // 自动跟随系统深色/浅色模式
    respectPrefersColorScheme: true,
    // 文档侧边栏配置：自动折叠非当前分类
    docs: { sidebar: { autoCollapseCategories: true } },
    // 导航栏配置
    navbar: {
      // 滚动时是否隐藏导航栏
      hideOnScroll: false,
      // 导航栏标题
      title: "Monoの小窝",
      // 导航栏logo
      logo: {
        alt: "Mono Logo", // logo的alt属性
        src: "img/logo.svg", // 浅色模式logo
        srcDark: "img/logo.svg" // 深色模式logo（和浅色相同）
      },
      // 导航栏菜单项
      items: [
        { label: "首页", to: "/", position: "left" },
        { label: "文章", to: "/docs/introduction/", position: "left" },
        { label: "博客", to: "/blog/", position: "left" },
        // 👇 新增：下拉菜单【资源】
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
    // 页脚配置
    footer: {
      // 页脚版权信息
      copyright: `Powered by Docusaurus & GitHub Pages © ${new Date().getFullYear()} Monoの小窝`,
    },
    // ✅ Algolia搜索配置（全文搜索功能）
    algolia: {
      appId: "CQDTG18WX6", // Algolia应用ID
      apiKey: "0f4ef075e41fbdaa5b918048b90984b2", // 搜索API密钥（公开）
      indexName: "CrimsonFang", // 索引名称
      contextualSearch: true, // 上下文搜索（优先显示当前页面的结果）
      searchPagePath: "search", // 搜索结果页路径
      searchParameters: { hitsPerPage: 10 }, // 每页显示10条结果
    },
    // 颜色模式配置：自动跟随系统
    colorMode: { respectPrefersColorScheme: true },
    // ✅ Mermaid图表配置（流程图、时序图等）
    mermaid: {
      theme: { light: "base", dark: "base" }, // 使用基础主题
      options: {
        // 自定义图表颜色
        themeVariables: {
          primaryColor: "#67EA94", // 主色：绿色
          primaryTextColor: "#1a1a1a", // 主文字色
          primaryBorderColor: "#4D4D4D", // 主边框色
          lineColor: "#EAD67E", // 线条色：黄色
          secondaryColor: "#EA67BD", // 次色：粉色
          tertiaryColor: "#677CEA", // 第三色：蓝色
        },
      },
    },
    // ✅ Prism代码高亮配置
    prism: {
      // 额外支持的代码语言
      additionalLanguages: ["shell-session", "bash"]
    },
    // 社交分享默认图（分享到微信、Twitter等时显示的图片）
    image: "img/og-image.png",
  },

  // ============================================
  // 插件配置（扩展Docusaurus的功能）
  // ============================================
  plugins: [
    // 插件1：集成Tailwind CSS
    () => ({
      name: "docusaurus-tailwindcss",
      configurePostCss(postcssOptions) {
        // 添加Tailwind CSS和Autoprefixer到PostCSS插件链
        postcssOptions.plugins.push(require("tailwindcss"));
        postcssOptions.plugins.push(require("autoprefixer"));
        return postcssOptions;
      },
    }),
    // 插件2：配置Webpack路径别名
    () => ({
      name: "docusaurus-webpack-alias",
      configureWebpack() {
        return {
          resolve: {
            // 配置@别名指向src目录，简化导入路径
            // 例如：import '@/components/Button' 代替 import '../components/Button'
            alias: { "@": path.resolve(__dirname, "src") }
          },
          // 生成source-map，便于调试
          devtool: 'source-map',
        };
      },
    }),
  ],

  // ============================================
  // 全局脚本配置（所有页面都会加载的脚本）
  // ============================================
  scripts: [], // 这里没有额外的全局脚本

  // ============================================
  // 预设配置（Docusaurus核心功能集合）
  // ============================================
  presets: [
    [
      // 使用经典预设，包含docs、blog、theme、sitemap四个核心模块
      "@docusaurus/preset-classic",
      {
        // 文档模块配置
        docs: {
          // 侧边栏配置文件路径
          sidebarPath: require.resolve("./sidebars.js"),
          // 文档页面的"编辑此页"链接
          editUrl: "https://github.com/ye2f4/pblot/edit/master/",
          // 禁用面包屑导航
          breadcrumbs: false,
          // 显示最后更新作者
          showLastUpdateAuthor: true,
          // Markdown插件：添加定义列表支持
          remarkPlugins: [remarkDefList],
        },
        // 博客模块配置
        blog: {
          // 博客标题
          blogTitle: "Monoの小窝 博客",
          // 博客描述
          blogDescription: "个人随笔、技术分享与生活记录",
          // 每页显示10篇文章
          postsPerPage: 10,
          // 博客侧边栏显示5篇最新文章
          blogSidebarCount: 5,
          // 未截断的博客文章忽略警告
          onUntruncatedBlogPosts: "ignore",
          // RSS订阅配置
          feedOptions: {
            type: "all", // 生成RSS、Atom和JSON三种格式
            copyright: `Copyright © ${new Date().getFullYear()} Monoの小窝`,
          },
        },
        // 主题模块配置
        theme: {
          // 全局自定义CSS文件路径
          customCss: require.resolve("./src/css/custom.css")
        },
        // 站点地图配置（SEO优化）
        sitemap: {
          // 页面更新频率
          changefreq: "weekly",
          // 页面优先级
          priority: 0.5,
          // 忽略生成站点地图的路径
          ignorePatterns: ["/tags/**", "/categories/**", "/blog/archive/**"],
        },
      },
    ],
  ],

  // ============================================
  // 自定义字段（可以在组件中通过useDocusaurusContext()获取）
  // ============================================
  customFields: {}, // 这里没有自定义字段

  // ============================================
  // 国际化配置
  // ============================================
  i18n: {
    defaultLocale: "en", // 默认语言：英文
    locales: ["en"] // 支持的语言列表
  },

  // ============================================
  // Markdown处理配置
  // ============================================
  markdown: {
    // 开启Mermaid图表支持
    mermaid: true,
    hooks: {
      // 断裂的Markdown链接只警告不报错
      onBrokenMarkdownLinks: "warn"
    }
  },
};

// 导出配置对象
export default config;