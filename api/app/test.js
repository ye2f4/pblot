// 隔离测试：非 catch-all 的嵌套 api 函数，验证 /api/app/* 目录是否可调用。
export default function handler(req) {
  return new Response('API APP TEST OK: ' + req.url, { status: 200 });
}
