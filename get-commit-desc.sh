#!/bin/bash
set -e

# =====================================================================
# 更新日志解析脚本
# 约定：发布提交格式为  update:VX.X  （例如 update:V2.3）
# 只识别这一种提交作为「版本发布点」，不再区分 feature/fix/improvement。
# 版本号、标题、摘要均自动从 Git 历史生成。
# =====================================================================

# ---------------------------------------------------------------------
# 1. 定位最近两次 update: 发布提交，确定版本号与统计区间
# ---------------------------------------------------------------------
# 所有 update: 提交的哈希（按时间倒序，第 1 条为本次发布）
UPDATE_HASHES=$(git log --grep="^update:" --pretty=format:"%H")
CUR_HASH=$(echo "$UPDATE_HASHES" | sed -n '1p')
PREV_HASH=$(echo "$UPDATE_HASHES" | sed -n '2p')

# 本次发布提交的完整标题（形如 update:V2.3）
UPDATE_MSG=$(git log -n 1 --pretty=format:"%s" "${CUR_HASH:-HEAD}")

# 从 update:VX.X 中提取版本号；提取失败则回退到 Git Tag，再回退到 v0.0.1
VERSION=$(echo "$UPDATE_MSG" | sed -E 's/^update:[[:space:]]*//I')
if [ -z "$VERSION" ] || [ "$VERSION" = "$UPDATE_MSG" ]; then
  VERSION=$(git describe --tags --abbrev=0 2>/dev/null || echo "v0.0.1")
fi
echo "VERSION=$VERSION" >> "$GITHUB_ENV"
echo "[调试] 版本号: $VERSION"

# 固定类型为 update（其它分类不再使用）
echo "TYPE=update" >> "$GITHUB_ENV"

# 标题
TITLE="$VERSION 版本更新"
echo "TITLE=$TITLE" >> "$GITHUB_ENV"
echo "[调试] 标题: $TITLE"

# ---------------------------------------------------------------------
# 2. 计算统计区间：上一次 update 提交 → 本次 update 提交
# ---------------------------------------------------------------------
if [ -n "$PREV_HASH" ]; then
  RANGE="$PREV_HASH..$CUR_HASH"
else
  # 首次发布：取本次提交之前的全部历史
  RANGE="$CUR_HASH"
fi
echo "[调试] 统计区间: $RANGE"

# ---------------------------------------------------------------------
# 3. 自动生成更新摘要
#    (a) 区间内的提交记录（排除 update: 发布提交本身）
#    (b) 按目录归类的文件改动概览
# ---------------------------------------------------------------------

# (a) 提交记录
COMMIT_LINES=$(git log $RANGE --no-merges --pretty=format:"%s" 2>/dev/null \
  | grep -viE "^update:" \
  | grep -viE "^merge " \
  | sed 's/^/- /')

# (b) 文件改动 → 按顶层目录归类为中文模块名
if [ -n "$PREV_HASH" ]; then
  CHANGED_FILES=$(git diff --name-only "$PREV_HASH" "$CUR_HASH" 2>/dev/null)
else
  CHANGED_FILES=$(git show --name-only --pretty=format: "$CUR_HASH" 2>/dev/null)
fi

module_of() {
  case "$1" in
    src/pages/*)       echo "页面" ;;
    src/components/*)   echo "组件" ;;
    src/theme/*)        echo "主题" ;;
    src/css/*)          echo "样式" ;;
    src/data/*)         echo "站点数据" ;;
    src/*)              echo "前端逻辑" ;;
    docs/*)             echo "文档" ;;
    blog/*)             echo "博客" ;;
    supabase/*)         echo "数据库" ;;
    static/*)           echo "静态资源" ;;
    .github/*)          echo "CI/CD" ;;
    scripts/*)          echo "脚本" ;;
    *)                  echo "其它" ;;
  esac
}

MODULE_LINES=""
if [ -n "$CHANGED_FILES" ]; then
  MODULES=$(echo "$CHANGED_FILES" | while read -r f; do
    [ -z "$f" ] && continue
    module_of "$f"
  done | sort | uniq -c | sort -rn)
  # 形如 "  12 组件" → "- 组件（12 个文件）"
  MODULE_LINES=$(echo "$MODULES" | sed -E 's/^[[:space:]]*([0-9]+)[[:space:]]+(.*)$/- \2（\1 个文件）/')
fi

# ---------------------------------------------------------------------
# 3.5 导出原始材料，供工作流里的「可选 AI 摘要」步骤使用
#      格式：以 ===标记=== 分段，AI 步骤按标记提取对应段落
# ---------------------------------------------------------------------
{
  echo "===COMMIT_LOG==="
  printf '%s\n' "$COMMIT_LINES"
  echo "===END==="
  echo "===DIFF_STAT==="
  printf '%s\n' "$CHANGED_FILES"
  echo "===END==="
} > changelog_raw.txt

# 组装完整摘要
SUMMARY="📝 本次更新（$VERSION）"

if [ -n "$COMMIT_LINES" ]; then
  SUMMARY="$SUMMARY

改动记录：
$COMMIT_LINES"
fi

if [ -n "$MODULE_LINES" ]; then
  SUMMARY="$SUMMARY

涉及模块：
$MODULE_LINES"
fi

# 若既无提交记录也无文件改动，给出兜底文案
if [ -z "$COMMIT_LINES" ] && [ -z "$MODULE_LINES" ]; then
  SUMMARY="$SUMMARY

本次为常规版本发布。"
fi

echo "[调试] 摘要预览:"
echo "$SUMMARY"

# 转义为可安全写入 GITHUB_ENV 与 JSON 的单行文本（\" 与 \n）
ESC_DESC=$(printf '%s' "$SUMMARY" | sed 's/\\/\\\\/g; s/"/\\"/g' | sed ':a;N;$!ba;s/\n/\\n/g')
echo "DESC=$ESC_DESC" >> "$GITHUB_ENV"
