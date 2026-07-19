'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';

// 投稿内容渲染样式（Markdown 基础排版，不依赖外部 CSS 文件，随组件内联）
const MD_CSS = `
.md-body { line-height: 1.75; font-size: 15px; color: var(--ifm-font-color-base); word-wrap: break-word; }
.md-body h1, .md-body h2, .md-body h3, .md-body h4 { line-height: 1.3; margin: 1.4em 0 .5em; }
.md-body h1 { font-size: 1.7em; border-bottom: 1px solid var(--ifm-color-emphasis-200); padding-bottom: .3em; }
.md-body h2 { font-size: 1.4em; }
.md-body h3 { font-size: 1.2em; }
.md-body p { margin: .8em 0; }
.md-body a { color: var(--ifm-color-primary); text-decoration: underline; }
.md-body img { max-width: 100%; border-radius: 8px; margin: .5em 0; }
.md-body pre { background: #0d1117; color: #e6edf3; padding: 14px 16px; border-radius: 10px; overflow: auto; font-size: 13px; }
.md-body code { background: rgba(127,127,127,.18); padding: .15em .4em; border-radius: 5px; font-size: .9em; }
.md-body pre code { background: transparent; padding: 0; }
.md-body blockquote { margin: 1em 0; padding: .4em 1em; border-left: 4px solid var(--ifm-color-primary); background: var(--ifm-color-emphasis-100); color: var(--ifm-color-emphasis-700); border-radius: 0 8px 8px 0; }
.md-body table { border-collapse: collapse; width: 100%; margin: 1em 0; }
.md-body th, .md-body td { border: 1px solid var(--ifm-color-emphasis-300); padding: 6px 10px; }
.md-body ul, .md-body ol { padding-left: 1.5em; }
.md-body hr { border: none; border-top: 1px solid var(--ifm-color-emphasis-200); margin: 1.5em 0; }
`;

// 统一的内容渲染组件：投稿正文 / 实时预览共用
export default function MarkdownView({ content, className }: { content?: string; className?: string }) {
  return (
    <>
      <style>{MD_CSS}</style>
      <div className={`md-body ${className || ''}`}>
        <ReactMarkdown
          components={{
            a: (props: any) => <a {...props} target="_blank" rel="noreferrer" />,
          }}
        >
          {content || ''}
        </ReactMarkdown>
      </div>
    </>
  );
}
