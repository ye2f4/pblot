// 双轨同步/部署 配置文件示例
// 用法：复制为 scripts/deploy.config.mjs 并填入你的值（该文件已在 .gitignore 之外，
//       但含有密钥，请勿提交！或改用环境变量 GITHUB_TOKEN 等）。
export default {
  GITHUB_TOKEN: '',          // GitHub PAT，需 repo 权限
  GITHUB_REPO: 'your-name/your-repo', // owner/name
  GITHUB_BRANCH: 'main',     // 目标分支
  GITHUB_COMMIT_MSG: 'deploy: 自动同步',
  VERCEL_DEPLOY_HOOK: '',    // 可选：Vercel Deploy Hook URL（B 线）
  DEPLOY_DRY_RUN: '0',       // '1' 时只扫描不推送
};
