#!/bin/bash
set -e

# 1. 读取最新Git Tag作为版本号，无Tag默认v0.0.1
LATEST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
if [ -z "$LATEST_TAG" ]; then
  VERSION="v0.0.1"
else
  VERSION="$LATEST_TAG"
fi
echo "VERSION=$VERSION" >> $GITHUB_ENV
echo "[调试] 识别版本: $VERSION"

# 2. 获取本次推送对比master分支的全部提交记录
COMMITS=$(git log origin/master..HEAD --pretty=format:"%s")

# 拼接描述文本，转义JSON特殊字符
FULL_DESC="本次部署提交记录：
$COMMITS"
ESC_DESC=$(echo "$FULL_DESC" | sed 's/"/\\"/g' | sed ':a;N;$!ba;s/\n/\\n/g')
echo "DESC=$ESC_DESC" >> $GITHUB_ENV

# 取第一条提交作为日志标题
FIRST_COMMIT=$(git log origin/master..HEAD --pretty=format:"%s" | head -n1)
ESC_TITLE=$(echo "$FIRST_COMMIT" | sed 's/"/\\"/g')
echo "TITLE=$ESC_TITLE" >> $GITHUB_ENV
echo "[调试] 日志标题: $FIRST_COMMIT"

# 3. 自动判断更新分类type
TYPE="improvement"
COMMIT_PREFIXES=$(git log origin/master..HEAD --pretty=format:"%s" | awk -F: '{print $1}' | sort | uniq)

if echo "$COMMIT_PREFIXES" | grep -q "^feat$"; then
  TYPE="feature"
elif echo "$COMMIT_PREFIXES" | grep -q "^fix$"; then
  TYPE="fix"
elif echo "$COMMIT_PREFIXES" | grep -q "^perf\|^optimize\|^refactor"; then
  TYPE="improvement"
fi
echo "TYPE=$TYPE" >> $GITHUB_ENV
echo "[调试] 自动分类类型: $TYPE"