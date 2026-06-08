import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';

// ===================== 【在这里维护下载资源列表】 =====================
// 格式说明：
// title: 文件名/资源名
// desc: 简要描述
// size: 文件大小
// date: 更新日期
// url: 下载地址（站内文件 / 外部网盘链接均可）
// type: 分类（tutorial 教程 / tool 工具 / source 源码 / asset 素材）
const downloadList = [
    // 教程类
    {
        title: "前端开发入门教程",
        desc: "HTML/CSS/JS 零基础全套学习文档，附带示例代码",
        size: "12.8 MB",
        date: "2026-06-09",
        url: "/files/tutorial/frontend-beginner.pdf",
        type: "tutorial"
    },
    {
        title: "Docusaurus 搭建博客手册",
        desc: "本站同款博客搭建全流程、配置详解、踩坑记录",
        size: "4.2 MB",
        date: "2026-06-08",
        url: "/files/tutorial/docusaurus-guide.pdf",
        type: "tutorial"
    },
    // 工具类
    {
        title: "常用开发工具合集",
        desc: "开发辅助软件、插件、绿色工具包",
        size: "86.5 MB",
        date: "2026-06-05",
        url: "https://pan.baidu.com/s/xxxxxxx", // 外部网盘链接示例
        type: "tool"
    },
    {
        title: "作者",
        desc: "作者",
        size: "2 MB",
        date: "2026-06-05",
        url: "/static/avatar.png", // 外部网盘链接示例
        type: "tool"
    },
    // 源码类
    {
        title: "本站首页完整源码",
        desc: "TopBanner 公告+统计+时钟组件全套源码",
        size: "0.3 MB",
        date: "2026-06-09",
        url: "/files/source/topbanner-code.zip",
        type: "source"
    },
    // 素材类
    {
        title: "网站背景&图标素材包",
        desc: "站点使用的背景图、图标、装饰资源",
        size: "24.6 MB",
        date: "2026-06-01",
        url: "/files/asset/site-material.zip",
        type: "asset"
    }
];

// 分类标题映射
const categoryMap = {
    tutorial: "📚 技术教程",
    tool: "🔧 工具软件",
    source: "💻 项目源码",
    asset: "🎨 素材资源"
};

export default function DownloadPage() {
    // 按分类筛选资源
    const groupByCategory = (list) => {
        const groups = {};
        list.forEach(item => {
            if (!groups[item.type]) groups[item.type] = [];
            groups[item.type].push(item);
        });
        return groups;
    };

    const resourceGroups = groupByCategory(downloadList);

    return (
        <Layout
            title="资料下载"
            description="本站技术教程、工具、源码、素材免费下载"
        >
            {/* 页面外层容器 */}
            <div style={{
                minHeight: "70vh",
                padding: "40px 20px",
                background: "#f8f9fa",
                display: "flex",
                justifyContent: "center"
            }}>

                {/* 主内容容器 */}
                <div style={{
                    width: "100%",
                    maxWidth: "1000px",
                    background: "rgba(255,255,255,0.95)",
                    borderRadius: "20px",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                    padding: "40px",
                    backdropFilter: "blur(8px)"
                }}>

                    {/* 页面头部标题 */}
                    <div style={{ textAlign: "center", marginBottom: "35px" }}>
                        <h1 style={{
                            fontSize: "32px",
                            color: "#1a1a1a",
                            margin: "0 0 10px 0",
                            fontWeight: 700
                        }}>
                            资料下载中心
                        </h1>
                        <p style={{ fontSize: "16px", color: "#666", margin: 0 }}>
                            整理各类技术文档、工具、源码与素材，持续更新中
                        </p>
                    </div>

                    <hr style={{
                        border: "none",
                        height: "1px",
                        background: "#eee",
                        margin: "30px 0"
                    }} />

                    {/* 遍历分类区块 */}
                    {Object.keys(resourceGroups).map(cateKey => (
                        <div key={cateKey} style={{ marginBottom: "40px" }}>
                            {/* 分类标题 */}
                            <h2 style={{
                                fontSize: "20px",
                                color: "#4285f4",
                                margin: "0 0 20px 0",
                                paddingLeft: "8px",
                                borderLeft: "4px solid #4285f4"
                            }}>
                                {categoryMap[cateKey]}
                            </h2>

                            {/* 下载卡片网格 */}
                            <div style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: "20px"
                            }}>
                                {resourceGroups[cateKey].map((item, idx) => (
                                    <div
                                        key={idx}
                                        style={{
                                            flex: "1 1 280px",
                                            minWidth: "280px",
                                            maxWidth: "320px",
                                            padding: "20px",
                                            background: "#fff",
                                            borderRadius: "16px",
                                            boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                                            border: "1px solid #f0f0f0",
                                            transition: "all 0.3s ease",
                                            cursor: "default"
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.transform = "translateY(-6px)";
                                            e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.12)";
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.transform = "translateY(0)";
                                            e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.06)";
                                        }}
                                    >
                                        {/* 资源名称 */}
                                        <h3 style={{
                                            fontSize: "17px",
                                            color: "#222",
                                            margin: "0 0 10px 0",
                                            fontWeight: 600
                                        }}>
                                            {item.title}
                                        </h3>

                                        {/* 资源描述 */}
                                        <p style={{
                                            fontSize: "14px",
                                            color: "#666",
                                            lineHeight: "1.7",
                                            margin: "0 0 15px 0",
                                            minHeight: "40px"
                                        }}>
                                            {item.desc}
                                        </p>

                                        {/* 大小 + 日期 行 */}
                                        <div style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            fontSize: "13px",
                                            color: "#999",
                                            marginBottom: "18px"
                                        }}>
                                            <span>📦 {item.size}</span>
                                            <span>📅 {item.date}</span>
                                        </div>

                                        {/* 下载按钮 */}
                                        <Link
                                            to={item.url}
                                            target={item.url.startsWith("http") ? "_blank" : "_self"}
                                            style={{
                                                display: "block",
                                                width: "100%",
                                                textAlign: "center",
                                                padding: "10px 0",
                                                background: "#4285f4",
                                                color: "#fff",
                                                borderRadius: "10px",
                                                textDecoration: "none",
                                                fontSize: "14px",
                                                fontWeight: 500,
                                                transition: "background 0.2s ease"
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.background = "#1976d2";
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.background = "#4285f4";
                                            }}
                                        >
                                            📥 立即下载
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    {/* 底部返回按钮 */}
                    <div style={{ textAlign: "center", marginTop: "20px" }}>
                        <Link
                            to="/"
                            style={{
                                display: "inline-block",
                                padding: "10px 24px",
                                background: "#f0f4ff",
                                color: "#4285f4",
                                borderRadius: "10px",
                                textDecoration: "none",
                                fontSize: "14px",
                                fontWeight: 500,
                                transition: "all 0.2s ease"
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = "#e0ecff";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = "#f0f4ff";
                            }}
                        >
                            ← 返回首页
                        </Link>
                    </div>

                </div>
            </div>
        </Layout>
    );
}