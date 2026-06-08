import { useColorMode } from "@docusaurus/theme-common";
import BrowserOnly from "@docusaurus/core/lib/client/exports/BrowserOnly";
import React, { useState, useEffect } from "react";
import { supabase } from "@/supabase/supabaseClient";
import useBaseUrl from "@docusaurus/useBaseUrl";

export default function Comments(): JSX.Element {
  const { colorMode } = useColorMode();
  const baseUrl = useBaseUrl("");

  return (
    <BrowserOnly fallback={<div style={{ margin: "2rem 0", padding: "1rem" }}>加载评论中...</div>}>
      {() => <CommentsClient colorMode={colorMode} baseUrl={baseUrl} />}
    </BrowserOnly>
  );
}

function CommentsClient({ colorMode, baseUrl }: { colorMode: string; baseUrl: string }) {
  const [user, setUser] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const postId = window.location.pathname;
  const defaultAvatar = `${baseUrl}img/avatar.png`;

  // 获取评论
  const fetchComments = async () => {
    const { data } = await supabase
      .from("comments")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: false });
    setComments(data || []);
  };

  // 修复报错：trim undefined 问题
  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert("请先登录！");
      return;
    }
    const trimContent = content?.trim() || "";
    if (!trimContent) return;

    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", user.id)
        .single();

      const userAvatar = profile?.avatar_url || defaultAvatar;
      const userName = user.user_metadata?.full_name || user.email || "用户";

      await supabase.from("comments").insert([
        {
          user_id: user.id,
          username: userName,
          avatar_url: userAvatar,
          content: trimContent,
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

      <form onSubmit={submitComment} style={{ marginBottom: "1rem" }}>
        <textarea
          value={content}
          // 修复：e.target.value
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
              {item.avatar_url && !item.avatar_url.startsWith('http') ? (
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: '#f0f7ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18
                }}>
                  {item.avatar_url}
                </div>
              ) : (
                <img
                  src={item.avatar_url || defaultAvatar}
                  style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover" }}
                  alt="avatar"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = defaultAvatar;
                  }}
                />
              )}

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