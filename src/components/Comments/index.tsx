import { useColorMode } from "@docusaurus/theme-common";
import BrowserOnly from "@docusaurus/core/lib/client/exports/BrowserOnly";
import React, { useState, useEffect } from "react";
import { supabase } from "@/supabase/supabaseClient";
import useBaseUrl from "@docusaurus/useBaseUrl";
import { useAuth } from "@/hooks/useAuth";

export default function Comments(): JSX.Element {
  const { colorMode } = useColorMode();
  const baseUrl = useBaseUrl("");

  return (
    <BrowserOnly fallback={<div className="stat-card">加载评论中...</div>}>
      {() => <CommentsClient colorMode={colorMode} baseUrl={baseUrl} />}
    </BrowserOnly>
  );
}

function CommentsClient({ colorMode, baseUrl }: { colorMode: string; baseUrl: string }) {
  // ========== 点赞模块状态 ==========
  const { user } = useAuth();
  const [likeCount, setLikeCount] = useState<number>(0);
  const [hasLiked, setHasLiked] = useState<boolean>(false);
  const [likeLoading, setLikeLoading] = useState<boolean>(false);

  // ========== 评论原有状态 ==========
  const [comments, setComments] = useState<any[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const postId = window.location.pathname;
  const defaultAvatar = `${baseUrl}img/avatar.png`;

  // 精准提取文章slug，兼容 /blog/xxx 和 /blog/xxx.html
  const getArticleSlug = () => {
    const path = window.location.pathname;
    if (!path.startsWith("/blog/")) return "";
    let slug = path.replace("/blog/", "");
    if (slug.endsWith(".html")) slug = slug.slice(0, -5);
    return slug;
  };
  const articleSlug = getArticleSlug();

  // ========== 加载点赞数据 ==========
  useEffect(() => {
    if (!articleSlug) return;
    const fetchLikes = async () => {
      const { count } = await supabase
        .from("article_likes")
        .select("*", { count: "exact", head: true })
        .eq("article_slug", articleSlug);
      setLikeCount(count ?? 0);

      if (user?.id) {
        const { data } = await supabase
          .from("article_likes")
          .select("id")
          .eq("article_slug", articleSlug)
          .eq("user_id", user.id)
          .single();
        setHasLiked(!!data);
      } else {
        setHasLiked(false);
      }
    };
    fetchLikes();
  }, [articleSlug, user?.id]);

  // ========== 点赞点击逻辑 ==========
  const handleLike = async () => {
    if (!user) {
      alert("请先登录后点赞");
      return;
    }
    if (hasLiked || likeLoading) return;
    setLikeLoading(true);
    try {
      const { error } = await supabase
        .from("article_likes")
        .insert({ user_id: user.id, article_slug: articleSlug });
      if (!error) {
        setLikeCount(prev => prev + 1);
        setHasLiked(true);
      }
    } catch (err) {
      console.error("点赞失败", err);
    } finally {
      setLikeLoading(false);
    }
  };

  // ========== 拉取评论列表 ==========
  const fetchComments = async () => {
    const { data } = await supabase
      .from("comments")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: false });
    setComments(data || []);
  };

  // ========== 提交评论 ==========
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
      console.error("评论提交错误：", err);
    } finally {
      setLoading(false);
    }
  };

  // 登录状态监听
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange(() => {
      fetchComments();
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    fetchComments();
  }, [postId]);

  return (
    <div className="stat-card" style={{ margin: "2rem 0" }}>
      {/* 点赞区域 */}
      <div style={{ marginBottom: "16px", textAlign: "center" }}>
        <button
          onClick={handleLike}
          disabled={hasLiked || likeLoading}
          style={{
            padding: "8px 24px",
            background: hasLiked ? "#22c55e" : "#4285f4",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            cursor: hasLiked ? "default" : "pointer",
            opacity: likeLoading ? 0.7 : 1,
          }}
        >
          {hasLiked ? "已点赞" : "👍 点赞"} ({likeCount})
        </button>
      </div>

      <h3 style={{ marginBottom: "1rem" }}>评论区</h3>

      <form onSubmit={submitComment} style={{ marginBottom: "1rem" }}>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={loading || !user}
          placeholder={user ? "发表你的评论..." : "登录后才可评论"}
          style={{
            width: "100%",
            minHeight: "80px",
            padding: "0.5rem",
            borderRadius: "4px",
            border: "1px solid var(--ifm-toc-border-color)",
            marginBottom: "0.5rem",
            background: colorMode === "dark" ? "#2a2a2a" : "#fff",
            color: "var(--ifm-font-color-base)",
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
            cursor: loading || !user ? "not-allowed" : "pointer",
            opacity: loading || !user ? 0.7 : 1,
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
            <div
              key={item.id}
              style={{
                padding: "0.8rem 0",
                borderBottom: "1px solid var(--ifm-toc-border-color)",
                display: "flex",
                gap: "0.8rem",
              }}
            >
              {item.avatar_url && !item.avatar_url.startsWith("http") ? (
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: "#f0f7ff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                    flexShrink: 0,
                  }}
                >
                  {item.avatar_url}
                </div>
              ) : (
                <img
                  src={item.avatar_url || defaultAvatar}
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    objectFit: "cover",
                    flexShrink: 0,
                  }}
                  alt="avatar"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = defaultAvatar;
                  }}
                />
              )}

              <div style={{ flex: 1 }}>
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