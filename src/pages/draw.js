import React, { useState } from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';

// 自定义抽贴内容（可随意修改）
const POSTS = [
    "前端性能优化最佳实践",
    "React Hooks 从入门到精通",
    "Docusaurus 主题定制教程",
    "CSS 现代布局技巧大全",
    "JavaScript 异步编程详解",
    "接口请求与异常处理",
    "响应式设计完全指南",
    "网站SEO优化技巧",
    "本地存储与数据持久化",
    "常见bug排查思路"
];

export default function Lottery() {
    const [result, setResult] = useState("");
    const [rolling, setRolling] = useState(false);

    // 随机抽贴
    const drawPost = () => {
        if (rolling) return;
        setRolling(true);
        setResult("抽取中...");

        // 模拟随机动画
        let count = 0;
        const timer = setInterval(() => {
            const random = POSTS[Math.floor(Math.random() * POSTS.length)];
            setResult(random);
            count++;
            if (count > 10) {
                clearInterval(timer);
                setRolling(false);
            }
        }, 80);
    };

    return (
        <Layout title="随机抽贴" description="趣味抽贴，随机学习">
            <div style={{
                minHeight: "70vh", padding: "40px 20px", background: "#f8f9fa",
                display: "flex", justifyContent: "center", alignItems: "center"
            }}>
                <div style={{
                    width: "100%", maxWidth: "600px", background: "rgba(255,255,255,0.95)",
                    borderRadius: "20px", boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                    padding: "40px", textAlign: "center"
                }}>
                    <h1 style={{ fontSize: "28px", color: "#1a1a1a", margin: "0 0 10px 0" }}>
                        🎲 随机抽贴
                    </h1>
                    <p style={{ color: "#666", margin: "0 0 40px 0" }}>
                        点击按钮，随机抽取一篇学习内容
                    </p>

                    {/* 抽贴结果 */}
                    <div style={{
                        minHeight: "80px", padding: "20px", marginBottom: "30px",
                        border: "2px dashed #4285f4", borderRadius: "16px",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "16px", color: result ? "#333" : "#999"
                    }}>
                        {result || "点击下方按钮开始抽取"}
                    </div>

                    {/* 抽取按钮 */}
                    <button
                        onClick={drawPost}
                        disabled={rolling}
                        style={{
                            width: "180px", padding: "14px 0", fontSize: "16px", fontWeight: "600",
                            borderRadius: "12px", border: "none", cursor: rolling ? "not-allowed" : "pointer",
                            background: rolling ? "#e0e0e0" : "#4285f4", color: "#fff",
                            transition: "0.3s", marginBottom: "20px"
                        }}
                    >
                        {rolling ? "抽取中..." : "🎯 一键抽贴"}
                    </button>

                    <br />
                    <Link to="/" style={{
                        display: "inline-block", padding: "8px 20px",
                        color: "#4285f4", textDecoration: "none", fontSize: "14px"
                    }}>
                        ← 返回首页
                    </Link>
                </div>
            </div>
        </Layout>
    );
}