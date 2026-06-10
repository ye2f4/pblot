import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';

// 开发工具列表（自行修改）
const tools = [
  {
    name: "VS Code",
    desc: "前端必用编辑器，插件丰富，轻量高效，支持全语言开发",
    tag: "编辑器",
    url: "https://code.visualstudio.com/"
  },
  {
    name: "ApiPost",
    desc: "接口调试工具，支持 RESTful、GraphQL 接口测试",
    tag: "接口测试",
    url: "https://www.apipost.cn/"
  },
  {
    name: "Snipaste",
    desc: "高效截图+贴图工具，提升文档编写、开发效率",
    tag: "效率工具",
    url: "https://www.snipaste.com/"
  },
  {
    name: "ProcessOn",
    desc: "在线流程图、思维导图工具，无需安装，云端存储",
    tag: "绘图工具",
    url: "https://www.processon.com/"
  },
  {
    name: "Docker Desktop",
    desc: "容器化部署工具，统一开发环境，快速搭建服务",
    tag: "部署工具",
    url: "https://www.docker.com/"
  }
];

export default function Tools() {
  return (
    <Layout title="开发工具" description="程序员必备开发工具合集">
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
            <h1 style={{ fontSize: "32px", color: "#1a1a1a", margin: 0 }}>🔧 开发工具</h1>
            <p style={{ color: "#666", marginTop: "10px" }}>提升效率 · 简化工作 · 精选推荐</p>
          </div>

          <hr style={{ border: "none", height: "1px", background: "#eee", margin: "30px 0" }} />

          <div style={{ display: "flex", flexWrap: "wrap", gap: "20px" }}>
            {tools.map((item, index) => (
              <div key={index} style={{
                flex: "1 1 280px", padding: "22px", background: "#fff",
                borderRadius: "16px", boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                transition: "0.3s"
              }}
                onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-4px)"}
                onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 style={{ margin: 0, fontSize: "18px", color: "#222" }}>{item.name}</h3>
                  <span style={{
                    padding: "4px 8px", background: "#e3f2fd", color: "#0277bd",
                    borderRadius: "10px", fontSize: "12px"
                  }}>{item.tag}</span>
                </div>
                
                <p style={{ color: "#666", fontSize: "14px", lineHeight: "1.6", margin: "12px 0 18px 0" }}>
                  {item.desc}
                </p>

                <Link to={item.url} target="_blank" style={{
                  display: "block", width: "100%", textAlign: "center",
                  padding: "9px 0", background: "#4285f4", color: "#fff",
                  borderRadius: "10px", textDecoration: "none", fontSize: "14px"
                }}>立即使用</Link>
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
