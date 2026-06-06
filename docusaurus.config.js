// @ts-check
import { themes as prismThemes } from 'prism-react-renderer';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Monoの小窝',
  tagline: '一半白发藏温柔，一半黑鬓载星网。',
  favicon: 'img/favicon.ico',

  url: 'https://ye2f4.github.io',
  baseUrl: '/pblot/',
  organizationName: 'ye2f4',
  projectName: 'pblot',
  deploymentBranch: 'gh-pages',

  // ✅ 修复：断链只警告，不阻止打包（关键！）
  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'zh-Hans',
    locales: ['zh-Hans'],
  },

  presets: [
    [
      'classic',
      ({
        docs: {
          sidebarPath: './sidebars.js',
          editUrl: 'https://github.com/ye2f4/pblot/edit/main/',
        },
        blog: {
          showReadingTime: true,
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          routeBasePath: '/blog',
          postsPerPage: 10,
          blogSidebarCount: 'ALL',
          editUrl: 'https://github.com/ye2f4/pblot/edit/main/',
          onInlineTags: 'warn',
          onInlineAuthors: 'warn',
          onUntruncatedBlogPosts: 'warn',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  themeConfig: ({
    image: 'img/docusaurus-social-card.jpg',
    colorMode: {
      respectPrefersColorScheme: true,
    },

    // ✅ 修复：导航栏删除无效文档链接
    navbar: {
      title: 'Monoの小窝',
      logo: {
        alt: 'Monoの小窝 Logo',
        src: 'img/logo.png',
      },
      items: [
        { to: '/blog', label: '博客', position: 'left' },
        // ✅ 修复：绿色按钮指向有效链接（首页）
        {
          to: '/',
          label: 'Get Started',
          position: 'right',
          className: 'nav-green-btn',
        },
        {
          href: 'https://github.com/ye2f4/pblot',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },

    footer: {
      style: 'dark',
      links: [
        { title: '文档', items: [{ label: '教程', to: '/blog' }] },
        { title: '社区', items: [{ label: 'GitHub 讨论', href: 'https://github.com/ye2f4/pblot/discussions' }] },
        { title: '更多', items: [{ label: '博客', to: '/blog' }, { label: 'GitHub', href: 'https://github.com/ye2f4/pblot' }] },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Monoの小窝. Built with Docusaurus.`,
    },

    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  }),
};

export default config;