-- ============================================================
-- 友链初始数据（幂等：按 url 去重，重复执行不会产生重复行）
-- 依赖：20260717_admin_review.sql 已创建 friend_links 表
-- ============================================================

INSERT INTO public.friend_links (name, url, avatar, description, tag, sort_order, is_approved)
SELECT v.name, v.url, v.avatar, v.description, v.tag, v.sort_order, TRUE
FROM (VALUES
  -- 朋友（真实友链）
  ('XingHuiSama の 宝藏之地', 'https://www.xinghuisama.top/', 'https://www.xinghuisama.top/favicon.ico',
   '毛玻璃风格个人博客，专注 GROMACS 分子动力学模拟与神经网络计算', '朋友', 0),

  -- 技术社区 / 资源
  ('GitHub',        'https://github.com',                 NULL, '全球最大的代码托管平台',        '技术', 10),
  ('稀土掘金',       'https://juejin.cn',                  NULL, '面向开发者的技术社区',          '技术', 11),
  ('V2EX',          'https://v2ex.com',                   NULL, '创意工作者社区',                '技术', 12),
  ('Stack Overflow','https://stackoverflow.com',          NULL, '程序员问答社区',                '技术', 13),
  ('MDN Web Docs',  'https://developer.mozilla.org',      NULL, 'Web 开发权威文档',              '技术', 14),
  ('哔哩哔哩',       'https://www.bilibili.com',           NULL, '弹幕视频社区',                  '资源', 20),
  ('知乎',          'https://www.zhihu.com',              NULL, '中文问答与知识社区',            '资源', 21),
  ('CSDN',          'https://www.csdn.net',               NULL, '中文 IT 技术社区',              '资源', 22),
  ('开源中国',       'https://www.oschina.net',            NULL, '开源技术社区',                  '资源', 23),
  ('InfoQ',         'https://www.infoq.cn',               NULL, '企业级技术内容平台',            '资源', 24)
) AS v(name, url, avatar, description, tag, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.friend_links f WHERE f.url = v.url
);
