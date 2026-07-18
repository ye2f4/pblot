<#
.SYNOPSIS
  download-music.ps1 —— 通过公开解析网关下载网易云音乐到本地（零安装，Windows 自带）
.DESCRIPTION
  原理同 .mjs 版：用 api.injahow.cn/meting 解析网关，在命令行直接下载 mp3 + lrc。
  新电脑无需安装 Node/Python，双击或在 PowerShell 里跑即可（Windows 10/11 自带 PowerShell）。

用法:
  .\download-music.ps1 -Id <歌曲ID|歌单ID> [-Playlist] [-List] [-Out <dir>] [-NoLrc] [-Help]

示例:
  .\download-music.ps1 -Id 1330348068
  .\download-music.ps1 -Id 3778678 -Playlist
  .\download-music.ps1 -Id 3778678 -Playlist -List
  .\download-music.ps1 -Id 1330348068 -Out ./static/music -NoLrc
#>
$ErrorActionPreference = 'Stop'

# ---- 手动解析参数（避免 [switch] 与 Invoke-RestMethod 在 PS5.1 的参数绑定 bug）----
$Id = ''
$Playlist = $false
$ViewOnly = $false
$NoLrc = $false
$Help = $false
$Out = ''
$i = 0
while ($i -lt $args.Count) {
  $a = $args[$i]
  switch ($a) {
    '-Id'      { $Id = $args[++$i] }
    '-Playlist'{ $Playlist = $true }
    '-List'    { $List = $true }
    '-NoLrc'   { $NoLrc = $true }
    '-Help'    { $Help = $true }
    '-Out'     { $Out = $args[++$i] }
    default    { if (-not $Id) { $Id = $a } }
  }
  $i++
}

$API = 'https://api.injahow.cn/meting/'
$UA = @{ 'User-Agent' = 'Mozilla/5.0' }

if ($Help -or -not $Id) {
  Write-Host @'

网易云音乐下载工具（.ps1 / 零安装，Windows 自带 PowerShell）

用法:
  .\download-music.ps1 -Id <歌曲ID|歌单ID> [选项]

选项:
  -Playlist    把 Id 当“歌单ID”，下载歌单内全部歌曲
  -List        仅列出歌曲(歌名/歌手/ID)，不下载
  -Out <dir>   输出目录 (默认 ./static/music)
  -NoLrc       不下载歌词
  -Help        显示本帮助

示例:
  .\download-music.ps1 -Id 1330348068
  .\download-music.ps1 -Id 3778678 -Playlist
  .\download-music.ps1 -Id 3778678 -Playlist -List

'@
  exit 0
}

# 默认输出目录：脚本所在目录的上一级下的 static/music
if (-not $Out) {
  $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
  $parent = Split-Path -Parent $scriptDir
  $Out = Join-Path $parent 'static' | Join-Path -ChildPath 'music'
}

function Sanitize {
  param([string]$name)
  $s = [string]($name -replace '[\\/:*?"<>|]', '_')
  $s = $s -replace '\s+', ' '
  $s = $s.Trim()
  if ($s.Length -gt 120) { $s = $s.Substring(0, 120) }
  return $s
}

# ---- 解析要处理的歌曲列表 ----
$songs = @()
if ($Playlist) {
  Write-Host "解析歌单 $Id ..."
  $url = "$API`?server=netease&type=playlist&id=$Id"
  $list = Invoke-RestMethod -Uri $url -Headers $UA -TimeoutSec 30
  foreach ($s in $list) {
    $sid = ''
    if ($s.url -match '[?&]id=(\d+)') { $sid = $Matches[1] }
    if ($sid) { $songs += @{ id = $sid; name = $s.name; artist = $s.artist } }
  }
} else {
  Write-Host "解析单曲 $Id ..."
  $url = "$API`?server=netease&type=song&id=$Id"
  $list = Invoke-RestMethod -Uri $url -Headers $UA -TimeoutSec 30
  if ($list.Count -eq 0) { Write-Error '未找到该歌曲'; exit 1 }
  $s = $list[0]
  $songs += @{ id = $Id; name = $s.name; artist = $s.artist }
}

if ($songs.Count -eq 0) { Write-Host '没有可处理的歌曲'; exit 0 }



# ---- 仅查看模式 ----
if ($ViewOnly) {
  Write-Host "`n共 $($songs.Count) 首："
  for ($i = 0; $i -lt $songs.Count; $i++) {
    $s = $songs[$i]
    '{0,3}. {1} - {2}  [id={3}]' -f ($i + 1), $s.name, $s.artist, $s.id | Write-Host
  }
  Write-Host "`n复制上面任意歌曲的 id，可直接下载："
  Write-Host "  .\download-music.ps1 -Id $($songs[0].id)"
  exit 0
}

# ---- 下载模式 ----
New-Item -ItemType Directory -Force -Path $Out | Out-Null
Write-Host "`n共 $($songs.Count) 首，输出到 $Out"
foreach ($s in $songs) {
  $base = Sanitize -name "$($s.name) - $($s.artist)"
  $mp3 = Join-Path $Out "$base.mp3"
  if (Test-Path $mp3) {
    Write-Host "  已存在，跳过: $base.mp3"
    continue
  }
  try {
    $u = "$API`?server=netease&type=url&id=$($s.id)"
    Invoke-WebRequest -Uri $u -Headers $UA -TimeoutSec 120 -OutFile $mp3
    $sz = (Get-Item $mp3).Length
    if ($sz -lt 1024) { throw "文件过小($sz 字节)，可能不是有效音频" }
    Write-Host ('  mp3: ' + $base + '.mp3  (' + '{0:N2}' -f ($sz / 1MB) + ' MB)')

    if (-not $NoLrc) {
      try {
        $lu = "$API`?server=netease&type=lrc&id=$($s.id)"
        $lrcText = (Invoke-WebRequest -Uri $lu -Headers $UA -TimeoutSec 30).Content
        if ($lrcText -and $lrcText.Contains('[')) {
          Set-Content -Path (Join-Path $Out "$base.lrc") -Value $lrcText -Encoding UTF8
          Write-Host ('  lrc: ' + $base + '.lrc')
        }
      } catch {
        Write-Host ('  lrc 跳过: ' + $_.Exception.Message)
      }
    }
  } catch {
    Write-Host ('  失败 ' + $s.name + ': ' + $_.Exception.Message)
  }
}
Write-Host "完成 -> $Out"
