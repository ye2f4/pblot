// 后台通用配置面板的字段定义（schema 驱动）。
// 每个字段以「点路径」作为 site_config 表的 key（如 texts.announcement），
// 前端会按点路径合并进 siteData，从而覆盖静态 siteData.json 的值，全站立即生效。
//
// 支持的 type：
//   text     单行文本
//   textarea 多行文本
//   toggle   开关（存布尔值，写入 siteData.features.*）
//   number   数字

export const ADMIN_CONFIG_SCHEMA = [
  {
    group: '站点文案',
    items: [
      {
        key: 'texts.announcement',
        label: '站点公告',
        help: '显示在中间栏「站点公告」处',
        type: 'textarea',
        placeholder: '欢迎来到Mono的小窝！本站为个人技术分享站点~',
      },
      {
        key: 'texts.welcomeTitle',
        label: '首页欢迎标题',
        type: 'text',
        placeholder: '欢迎来到Monoの小窝',
      },
      {
        key: 'texts.visitorWelcome',
        label: '访客欢迎语',
        help: '未登录用户看到的提示',
        type: 'text',
        placeholder: '欢迎访客，登录解锁完整功能',
      },
      {
        key: 'branding.tagline',
        label: '站点标语',
        type: 'text',
        placeholder: '一半黑发藏温柔，一半白发载星网。',
      },
      {
        key: 'about',
        label: '关于本站简介',
        type: 'textarea',
        placeholder: '本站是Mono的个人技术分享博客……',
      },
    ],
  },
  {
    group: 'SEO / 元信息',
    items: [
      {
        key: 'meta.description',
        label: '网站描述（meta description）',
        type: 'textarea',
        placeholder: 'Monoの小窝，专注ESP32P4……',
      },
      {
        key: 'meta.ogTitle',
        label: '社交分享标题（og:title）',
        type: 'text',
      },
      {
        key: 'meta.ogDescription',
        label: '社交分享描述（og:description）',
        type: 'textarea',
      },
    ],
  },
  {
    group: '首页板块开关',
    items: [
      {
        key: 'features.showBlogPreview',
        label: '首页左侧显示「博客速览」',
        help: '关闭后左侧卡片改为显示站点标语',
        type: 'toggle',
        default: true,
      },
    ],
  },
];

// 按点路径取值
export function getByPath(obj, path) {
  if (!obj || !path) return undefined;
  return path.split('.').reduce((cur, k) => (cur == null ? undefined : cur[k]), obj);
}
