import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';

// 开源项目列表（自行修改）
const projects = [
    {
        name: "个人博客系统",
        desc: "基于 Docusaurus 开发的轻量化静态博客，支持文档、博客、下载中心一体化",
        tech: ["Docusaurus", "React", "JavaScript"],
        github: "https://github.com/yourname/blog",
        demo: "/",
        status: "维护中"
    },
    {
        name: "前端工具库",
        desc: "常用前端工具函数封装，简化开发流程，提升开发效率",
        tech: ["JavaScript", "TypeScript", "Rollup"],
        github: "https://github.com/yourname/utils",
        demo: "#",
        status: "已发布"
    },
    {
        name: "UI 组件库",
        desc: "轻量级移动端 UI 组件库，简洁易用，无第三方依赖",
        tech: ["CSS3", "JavaScript", "HTML5"],
        github: "https://github.com/yourname/ui",
        demo: "#",
        status: "开发中"
    }
];

export default function OpenSource() {
    return (
        <Layout title="开源项目" description="个人开源项目集合">
            <div style={{
                minHeight: "70vh", padding: "40px 20px", background: "#f8f9fa",
                display: "flex", justifyContent: "center"
            }}>
                <div style={{
                    width: "100%", maxWidth: "1000px", background: "rgba(255,255,255,0.95)",
                    borderRadius: "20px", boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                    padding: "40px", backdropFilter: "blur(8px)"
                }}>
                    <div style={{ textAlign: "center", marginBottom: "30px" }}>
                        <h1 style={{ fontSize: "32px", color: "#1a1a1a", margin: 0 }}>🚀 开源项目</h1>
                        <p style={{ color: "#666", marginTop: "10px" }}>开放共享 · 共同进步 · 持续迭代</p>
                    </div>

                    <hr style={{ border: "none", height: "1px", background: "#eee", margin: "30px 0" }} />

                    <div style={{ display: "flex", flexWrap: "wrap", gap: "25px" }}>
                        {projects.map((item, index) => (
                            <div key={index} style={{
                                flex: "1 1 300px", padding: "24px", background: "#fff",
                                borderRadius: "16px", boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                                border: "1px solid #f0f0f0", transition: "0.3s"
                            }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = "translateY(-5px)";
                                    e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.12)";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = "translateY(0)";
                                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.06)";
                                }}
                            >
                                <h3 style={{ margin: "0 0 10px 0", color: "#222", fontSize: "19px" }}>{item.name}</h3>
                                <p style={{ color: "#666", lineHeight: "1.7", fontSize: "14px", minHeight: "45px" }}>{item.desc}</p>

                                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", margin: "12px 0" }}>
                                    {item.tech.map(t => (
                                        <span key={t} style={{
                                            padding: "4px 10px", background: "#f0f7ff", color: "#4285f4",
                                            borderRadius: "12px", fontSize: "12px"
                                        }}>{t}</span>
                                    ))}
                                    <span style={{
                                        padding: "4px 10px", background: "#e8f5e9", color: "#2e7d32",
                                        borderRadius: "12px", fontSize: "12px"
                                    }}>{item.status}</span>
                                </div>

                                <div style={{ display: "flex", gap: "10px", marginTop: "15px" }}>
                                    <Link to={item.github} target="_blank" style={{
                                        flex: 1, textAlign: "center", padding: "8px 0",
                                        background: "#24292e", color: "#fff", borderRadius: "10px",
                                        textDecoration: "none", fontSize: "14px"
                                    }}>GitHub</Link>
                                    <Link to={item.demo} style={{
                                        flex: 1, textAlign: "center", padding: "8px 0",
                                        background: "#4285f4", color: "#fff", borderRadius: "10px",
                                        textDecoration: "none", fontSize: "14px"
                                    }}>在线演示</Link>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div style={{ textAlign: "center", marginTop: "40px" }}>
                        <Link to="/" style={{
                            padding: "10px 24px", background: "#f0f4ff", color: "#4285f4",
                            borderRadius: "10px", textDecoration: "none", fontSize: "14px"
                        }}>← 返回首页</Link>
                    </div>
                </div>
            </div>
        </Layout>
    );
}