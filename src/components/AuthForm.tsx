import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import styles from "./AuthForm.module.css";

export default function AuthForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [user, setUser] = useState<any>(null);

  // 获取登录状态
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user || null);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_, session) => {
        setUser(session?.user || null);
      },
    );

    return () => authListener.subscription.unsubscribe();
  }, []);

  // 注册
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) setMessage("❌ 注册失败：" + error.message);
    else {
      setMessage("✅ 注册成功！请登录");
      setIsLogin(true);
    }
    setLoading(false);
  };

  // 密码登录
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) setMessage("❌ 登录失败：" + error.message);
    else window.location.reload();
    setLoading(false);
  };

  // GitHub 登录（附属）
  const handleGithub = async () => {
    await supabase.auth.signInWithOAuth({ provider: "github" });
  };

  // 退出登录
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  // 已登录状态
  if (user) {
    return (
      <div className={styles.authCard}>
        <h3>✅ 已登录</h3>
        <p>账号：{user.email}</p>
        <button onClick={handleLogout} className={styles.logoutBtn}>
          退出登录
        </button>
      </div>
    );
  }

  // 未登录：显示表单
  return (
    <div className={styles.authCard}>
      <h2>{isLogin ? "账号登录" : "注册账号"}</h2>
      <form onSubmit={isLogin ? handleLogin : handleRegister}>
        <input
          type="email"
          placeholder="邮箱"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className={styles.input}
        />
        <input
          type="password"
          placeholder="密码（≥6位）"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className={styles.input}
        />
        <button type="submit" disabled={loading} className={styles.mainBtn}>
          {loading ? "处理中..." : isLogin ? "登录" : "注册"}
        </button>
      </form>

      {message && <p className={styles.msg}>{message}</p>}

      <p className={styles.toggle}>
        {isLogin ? "没有账号？" : "已有账号？"}
        <span onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? " 去注册" : " 去登录"}
        </span>
      </p>

      <div className={styles.divider}>其他方式</div>
      <button onClick={handleGithub} className={styles.githubBtn}>
        GitHub 登录
      </button>
    </div>
  );
}
