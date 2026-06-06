import React, { useState, useEffect } from 'react';
import Layout from '@theme/Layout';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './index.module.css';
import homeData from '../data/home.json';
import { supabase } from '../supabase/supabaseClient';

export default function Home() {
  const base = useBaseUrl('');
  const [now, setNow] = useState(new Date());
  const [currentUser, setCurrentUser] = useState(null);
  const [userCount, setUserCount] = useState(0);
  const [newestUserName, setNewestUserName] = useState('');

  // ✅ 新增：注册/登录表单状态
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  // 实时时钟
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 登录状态监听 + 会员统计 + 最新用户
  useEffect(() => {
    // 监听登录状态
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setCurrentUser(session?.user || null);
      if (event === 'SIGNED_IN') {
        window.history.replaceState({}, document.title, '/');
      }
    });

    // 获取会员总数
    const getUserTotal = async () => {
      const { count } = await supabase.from('users').select('*', { count: 'exact', head: true });
      setUserCount(count || 0);
    };

    // 获取最新注册用户
    const getNewestUser = async () => {
      try {
        const { data } = await supabase
          .from('users')
          .select('raw_user_meta_data, email')
          .order('created_at', { ascending: false })
          .limit(1);

        if (data && data.length > 0) {
          const user = data[0];
          const name = user.raw_user_meta_data?.name || user.email.split('@')[0] || '新用户';
          setNewestUserName(name);
        } else {
          setNewestUserName(homeData.newUser);
        }
      } catch (err) {
        setNewestUserName(homeData.newUser);
      }
    };

    getUserTotal();
    getNewestUser();

    return () => subscription.unsubscribe();
  }, []);

  // ✅ 新增：邮箱密码注册
  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg('');
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) setMsg(`❌ ${error.message}`);
    else {
      setMsg('✅ 注册成功！请登录');
      setIsLogin(true);
    }
    setLoading(false);
  };

  // ✅ 新增：邮箱密码登录
  const handlePwdLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setMsg(`❌ ${error.message}`);
    setLoading(false);
  };

  // 原有：GitHub登录（附属选项）
  const loginGithub = () => supabase.auth.signInWithOAuth({ 
    provider: 'github',
    options: { redirectTo: 'https://ye2f4.github.io/pblot/' }
  });
  
  // 退出登录
  const logout = () => supabase.auth.signOut().then(() => window.location.reload());

  // 日本曜日 + 英文星期
  const weekJp = ['日', '月', '火', '水', '木', '金', '土'][now.getDay()];
  const weekEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()];

  return (
    <Layout title="Monoの小窝">
      {/* 顶部横幅 */}
      <section className={styles.topBannerWrap} style={{ backgroundImage: `url(${base}img/top_header_bg.png)` }}>
        <div className={styles.bannerLeft}>
          <div className={styles.topStatWrap}>
            <div className={styles.statItem}><span className={styles.statCircle}>今</span><p>今日:{homeData.todayCount}</p></div>
            <div className={styles.statItem}><span className={styles.statCircle}>昨</span><p>昨日:{homeData.yestCount}</p></div>
            <div className={styles.statItem}><span className={styles.statCircle}>总</span><p>总帖:{homeData.totalPost}</p></div>
            <div className={styles.statItem}><span className={styles.statCircle}>会</span><p>会员:{userCount}</p></div>
            <div className={styles.statItem}><span className={styles.statCircle}>新</span><p>最新:{newestUserName}</p></div>
          </div>
        </div>

        {/* ✅ 修复：登录区域（主：账号密码 / 附：GitHub） */}
        <div className={styles.bannerRight}>
          <div className={styles.clockText}>{now.toLocaleTimeString()}</div>
          <div className={styles.dateText}>
            {weekJp}曜日 ({weekEn})<br/>
            {now.getFullYear()}-{(now.getMonth()+1+'').padStart(2,'0')}-{(now.getDate()+'').padStart(2,'0')}
          </div>
          
          <div className={styles.userBox}>
            {currentUser ? (
              // 已登录展示
              <div className={styles.userInfo}>
                <img src={currentUser.user_metadata?.avatar_url} style={{width:30,borderRadius:'50%'}} alt="头像"/>
                <span>{currentUser.user_metadata?.name || currentUser.email}</span>
                <button onClick={logout} className={styles.logoutBtn}>退出</button>
              </div>
            ) : (
              // 未登录：账号密码表单
              <div style={{width:'280px',padding:'10px'}}>
                <form onSubmit={isLogin ? handlePwdLogin : handleRegister}>
                  <input
                    type="email"
                    placeholder="邮箱"
                    value={email}
                    onChange={(e)=>setEmail(e.target.value)}
                    required
                    style={{width:'100%',padding:'6px',margin:'4px 0',borderRadius:'4px',border:'1px solid #ccc'}}
                  />
                  <input
                    type="password"
                    placeholder="密码≥6位"
                    value={password}
                    onChange={(e)=>setPassword(e.target.value)}
                    required
                    style={{width:'100%',padding:'6px',margin:'4px 0',borderRadius:'4px',border:'1px solid #ccc'}}
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    style={{width:'100%',padding:'6px',background:'#0070f3',color:'#fff',border:'none',borderRadius:'4px',margin:'4px 0',cursor:'pointer'}}
                  >
                    {loading ? '处理中...' : isLogin ? '登录' : '注册'}
                  </button>
                </form>

                {msg && <p style={{margin:'4px 0',fontSize:'12px',color:'#ff4444'}}>{msg}</p>}

                {/* 切换登录/注册 */}
                <p style={{margin:'4px 0',fontSize:'12px',cursor:'pointer'}} onClick={()=>setIsLogin(!isLogin)}>
                  {isLogin ? '没有账号？去注册' : '已有账号？去登录'}
                </p>

                {/* 附属：GitHub登录 */}
                <button
                  onClick={loginGithub}
                  style={{width:'100%',padding:'6px',background:'#333',color:'#fff',border:'none',borderRadius:'4px',margin:'4px 0',cursor:'pointer'}}
                >
                  GitHub 登录
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 主内容（完全保留你原有代码） */}
      <div className={styles.pageWrap}>
        <main className={styles.mainLeft}>
          <div className={styles.annBanner}><img src={base+"img/home_ann_banner.png"} alt="公告"/></div>
          <section className={styles.tipWrap}>
            <h4>📢小喇叭</h4>
            <div className={styles.tipList}>
              <p>一条云朵云：<a href="/blog">帖子链接</a> 06-05 22:12</p>
              <p>编者言：高考在即...<a href="/blog">帖子链接</a> 05-31 17:48</p>
            </div>
          </section>
          {homeData.categoryList.map((cate, i) => (
            <section className={styles.blockWrap} key={i}>
              <h3 className={styles.blockTitle}>{cate.name} <span className={styles.subAdmin}>版主：xxx</span></h3>
              <div className={styles.twoColGrid}>
                {cate.child.map((item, j) => (
                  <div className={styles.colCard} key={j}>
                    <h4>{item.title}</h4>
                    <p>主题:{item.num1} | 帖数:{item.num2}</p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </main>

        {/* 侧边栏（完全保留） */}
        <aside className={styles.sidebarRight}>
          <div className={styles.signBtnBox}>
            <button className={styles.greenBtn} onClick={()=>currentUser?alert('签到成功'):alert('请先登录')}>签到</button>
            <button className={styles.orangeBtn}>导航</button>
          </div>
          <div className={styles.adBox}><img src={base+"img/ad_right_1.png"} alt="广告"/></div>
          <div className={styles.adBox}><img src={base+"img/ad_right_2.png"} alt="广告"/></div>
          <div className={styles.adBox}><img src={base+"img/ad_right_3.png"} alt="广告"/></div>
          <div className={styles.tagWrap}><h4>标签</h4><div className={styles.tagList}>{homeData.tagList.map((t,i)=><span key={i} className={styles.tagItem}>{t}</span>)}</div></div>
          <div className={styles.rankWrap}><h4>排行</h4>{homeData.rankList.map((item,i)=><div key={i} className={styles.rankItem}>{i+1}. {item.title}</div>)}</div>
          <div className={styles.commentWrap}><h4>最新评论</h4><p>暂无评论</p></div>
        </aside>
      </div>
    </Layout>
  );
}