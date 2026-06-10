/**
 * 环境工具：判断是否为浏览器环境（SSR/客户端区分）
 */
export const isBrowser = typeof window !== 'undefined';