import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import downloadData from '../data/Download.json';

const downloadList = downloadData.resourceList;
const categoryMap = downloadData.categoryMap;

export default function DownloadPage() {
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
            description="本站技术教程、工具、源码、素材、硬件手册免费下载"
        >
            <div style={{
                minHeight: "70vh",
                padding: "40px 20px",
                background: "var(--ifm-color-emphasis-100)",
                display: "flex",
                justifyContent: "center"
            }}>
                <div style={{
                    width: "100%",
                    maxWidth: "1000px",
                    background: "var(--ifm-card-background-color)",
                    borderRadius: "20px",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                    padding: "40px"
                }}>
                    <div style={{ textAlign: "center", marginBottom: "35px" }}>
                        <h1 style={{
                            fontSize: "32px",
                            color: "var(--ifm-text-color)",
                            margin: "0 0 10px 0",
                            fontWeight: 700
                        }}>
                            资料下载中心
                        </h1>
                        <p style={{ fontSize: "16px", color: "var(--ifm-color-emphasis-600)", margin: 0 }}>
                            整理各类技术文档、工具、源码、素材与硬件手册，持续更新中
                        </p>
                    </div>

                    <hr style={{
                        border: "none",
                        height: "1px",
                        background: "var(--ifm-color-emphasis-300)",
                        margin: "30px 0"
                    }} />

                    {Object.keys(resourceGroups).map(cateKey => (
                        <div key={cateKey} style={{ marginBottom: "40px" }}>
                            <h2 style={{
                                fontSize: "20px",
                                color: "#4285f4",
                                margin: "0 0 20px 0",
                                paddingLeft: "8px",
                                borderLeft: "4px solid #4285f4"
                            }}>
                                {categoryMap[cateKey]}
                            </h2>

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
                                            background: "var(--ifm-card-background-color)",
                                            borderRadius: "16px",
                                            boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                                            border: "1px solid var(--ifm-color-emphasis-300)",
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
                                        <h3 style={{
                                            fontSize: "17px",
                                            color: "var(--ifm-text-color)",
                                            margin: "0 0 10px 0",
                                            fontWeight: 600
                                        }}>
                                            {item.title}
                                        </h3>

                                        <p style={{
                                            fontSize: "14px",
                                            color: "var(--ifm-color-emphasis-600)",
                                            lineHeight: "1.7",
                                            margin: "0 0 15px 0",
                                            minHeight: "40px"
                                        }}>
                                            {item.desc}
                                        </p>

                                        <div style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            fontSize: "13px",
                                            color: "var(--ifm-color-emphasis-600)",
                                            marginBottom: "18px"
                                        }}>
                                            <span>📦 {item.size}</span>
                                            <span>📅 {item.date}</span>
                                        </div>

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

                    <div style={{ textAlign: "center", marginTop: "20px" }}>
                        <Link
                            to="/"
                            style={{
                                display: "inline-block",
                                padding: "10px 24px",
                                background: "var(--ifm-color-emphasis-100)",
                                color: "#4285f4",
                                borderRadius: "10px",
                                textDecoration: "none",
                                fontSize: "14px",
                                fontWeight: 500,
                                transition: "all 0.2s ease"
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = "var(--ifm-color-emphasis-300)";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = "var(--ifm-color-emphasis-100)";
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