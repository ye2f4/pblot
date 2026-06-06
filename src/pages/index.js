import React, { useState, useEffect } from 'react';
import Layout from '@theme/Layout';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './index.module.css';
import homeData from '../data/home.json';
import { supabase } from '../supabase/client';

export default function Home() {
  const base = useBaseUrl('');
  const [now, setNow] = useState(new Date());
  const [currentUser, setCurrentUser] = useState(null);
  const [userCount, setUserCount] = useState(0);

  // 实时时钟
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 登录状态监听 + 统计会员数
  useEffect(() => {
    // 监听登录
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setCurrentUser(session?.user || null);
    });

    // 获取会员总数
    const getUserTotal = async () => {
      const { count } = await supabase.from('users').select('*', { count: 'exact', head: true });
      setUserCount(count || 0);
    };
    getUserTotal();

    return () => subscription.unsubscribe();
  }, []);

  // 登录/退出
  const login = () => supabase.auth.signInWithOAuth({ provider: 'github' });
  const logout = () => supabase.auth.signOut();

  const weekJp = ['日', '一', '二', '三', '四', '五', '六'][now.getDay()];
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
            {/* 🔥 动态会员数（云端实时） */}
            <div className={styles.statItem}><span className={styles.statCircle}>会</span><p>会员:{userCount}</p></div>
            <div className={styles.statItem}><span className={styles.statCircle}>新</span><p>最新:{homeData.newUser}</p></div>
          </div>
        </div>

        {/* 登录区域 */}
        <div className={styles.bannerRight}>
          <div className={styles.clockText}>{now.toLocaleTimeString()}</div>
          <div className={styles.dateText}>土曜日({weekJp}) {weekEn}<br/>{now.getFullYear()}-{(now.getMonth()+1+'').padStart(2,'0')}-{(now.getDate()+'').padStart(2,'0')}</div>
          <div className={styles.userBox}>
            {currentUser ? (
              <div className={styles.userInfo}>
                <img src={currentUser.user_metadata.avatar_url} style={{width:30,borderRadius:'50%'}} alt="头像"/>
                <span>{currentUser.user_metadata.name || currentUser.email}</span>
                <button onClick={logout} className={styles.logoutBtn}>退出</button>
              </div>
            ) : (
              <button onClick={login} className={styles.loginBtn}>GitHub 登录</button>
            )}
          </div>
        </div>
      </section>

      {/* 主内容（不变） */}
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

        {/* 侧边栏（不变） */}
        <aside className={styles.sidebarRight}>
          <div className={styles.signBtnBox}>
            <button className={styles.greenBtn} onClick={()=>currentUser?alert('签到成功'):login()}>签到</button>
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