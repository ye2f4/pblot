import { useColorMode } from "@docusaurus/theme-common";
import React, { useState, useEffect } from "react";
import { supabase } from "@/supabase/supabaseClient";
import useBaseUrl from "@docusaurus/useBaseUrl";

// 替换为你的评论组件，替代原 Giscus
export default function Comments(): JSX.Element {
  const { colorMode } = useColorMode();
  const baseUrl = useBaseUrl("");
  const [user, setUser] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  // 获取当前页面路径作为唯一ID
  const postId = window.location.pathname;

  // 获取评论
  const fetchComments = async () => {
    const { data } = await supabase
      .from("comments")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: false });
    setComments(data || []);
  };

  // 发布评论
  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert("请先登录！");
      return;
    }
    if (!content.trim()) return;

    setLoading(true);
    try {
      await supabase.from("comments").insert([
        {
          user_id: user.id,
          username: user.user_metadata?.full_name || user.email,
          avatar_url: user.user_metadata?.avatar_url || `${baseUrl}img/avatar.png`,
          content: content.trim(),
          post_id: postId,
        },
      ]);
      setContent("");
      fetchComments();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // 监听登录状态
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user || null);
    });

    const { data } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user || null);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  // 加载评论
  useEffect(() => {
    fetchComments();
  }, [postId]);

  return (
    <div style={{ 
      margin: "2rem 0", 
      padding: "1rem",
      backgroundColor: colorMode === "dark" ? "#1a1a1a" : "#fff",
      borderRadius: "8px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
    }}>
      <h3 style={{ marginBottom: "1rem" }}>评论区</h3>

      {/* 发布评论 */}
      <form onSubmit={submitComment} style={{ marginBottom: "1rem" }}>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={loading || !user}
          placeholder="发表你的评论..."
          style={{
            width: "100%",
            minHeight: "80px",
            padding: "0.5rem",
            borderRadius: "4px",
            border: "1px solid #ddd",
            marginBottom: "0.5rem",
          }}
        />
        <button
          type="submit"
          disabled={loading || !user}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: "#4285f4",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "发布中..." : "发布评论"}
        </button>
      </form>

      {/* 评论列表 */}
      <div>
        {comments.length === 0 ? (
          <p style={{ color: "#999" }}>暂无评论，快来发表第一条评论吧！</p>
        ) : (
          comments.map((item) => (
            <div key={item.id} style={{ 
              padding: "0.8rem 0", 
              borderBottom: "1px solid #eee",
              display: "flex",
              gap: "0.8rem",
            }}>
              <img
                src={item.avatar_url}
                style={{ width: "32px", height: "32px", borderRadius: "50%" }}
                alt="avatar"
              />
              <div>
                <div style={{ fontWeight: "bold", fontSize: "14px" }}>{item.username}</div>
                <p style={{ margin: "0.2rem 0", fontSize: "14px" }}>{item.content}</p>
                <div style={{ fontSize: "12px", color: "#999" }}>
                  {new Date(item.created_at).toLocaleString()}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}