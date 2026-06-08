// ==============================================
// 导入React核心库及钩子函数
// ==============================================
// React: 核心库
// useState: 状态管理钩子，用于声明组件内部状态
// useEffect: 副作用钩子，用于处理组件生命周期、数据获取、事件监听等
// useRef: 引用钩子，用于保存DOM引用或不会触发重渲染的变量
// lazy: 组件懒加载钩子，用于代码分割，延迟加载非关键组件
// Suspense: 懒加载组件的加载状态容器，显示加载中提示
import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';

// ==============================================
// 导入Docusaurus框架提供的基础组件
// ==============================================
// Layout: Docusaurus全局布局组件，自动包含导航栏、页脚和主题样式
import Layout from '@theme/Layout';
// Link: Docusaurus站内链接组件，比原生<a>标签多了预加载、SPA跳转等优化
import Link from '@docusaurus/Link';
// useBaseUrl: 自动处理站点基础路径的钩子，适配GitHub Pages子目录部署
import useBaseUrl from '@docusaurus/useBaseUrl';

// ==============================================
// 导入样式和静态数据
// ==============================================
// CSS Modules样式文件，实现样式隔离，避免全局样式冲突
import styles from './index.module.css';
// 全站静态数据集中管理文件，所有文案、链接、配置都放在这里，便于统一修改
import siteData from '../data/siteData.json';
// 全局自定义CSS，存放通用样式和动画
import '../css/home.css';

// ==============================================
// 导入Supabase客户端
// ==============================================
// Supabase客户端实例，用于用户认证、数据库查询、实时订阅等功能
import { supabase } from '../supabase/supabaseClient';

// index.js 顶部添加节流函数
const throttle = (fn, delay) => {
  let lastTime = 0;
  return (...args) => {
    const now = Date.now();
    if (now - lastTime >= delay) {
      fn.apply(this, args);
      lastTime = now;
    }
  };
};

const showError = (message) => {
  alert(message);
  console.error(message);
};

// ==============================================
// 性能优化：组件级代码分割（懒加载）
// ==============================================
// 所有不在首屏显示的组件都使用lazy()延迟加载
// 首屏渲染时不会加载这些组件的代码，大幅减少首屏JS体积
const Slider = lazy(() => import('react-slick')); // 轮播图组件（位于首屏下方）
const CommentSection = lazy(() => import('../components/CommentSection')); // 评论区组件
const AdSection = lazy(() => import('../components/AdSection')); // 广告区组件

// ==============================================
// 导入轮播图组件的样式（必须导入，否则轮播图无法正常显示）
// ==============================================
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';

// ==============================================
// 组件元数据配置
// ==============================================
// ssr: false 禁用服务端渲染
// 原因：本组件大量使用window、localStorage、Supabase认证等客户端专属API
// 禁用SSR可以避免水合不匹配错误，同时加快首屏渲染速度
export const metadata = {
  ssr: false,
};

// ==============================================
// 首页组件主函数
// ==============================================
export default function Home() {
  // ============================================
  // 基础工具变量
  // ============================================
  // 获取站点基础路径，自动适配GitHub Pages的/pblot/子目录
  const base = useBaseUrl('');
  // 组件挂载状态标记，防止组件卸载后更新状态导致内存泄漏
  const isMountedRef = useRef(true);

  // ============================================
  // 界面状态管理
  // ============================================
  // 标记是否在客户端环境运行，服务端渲染时为false
  const [isClient, setIsClient] = useState(false);
  // 当前时间状态，用于顶部时钟显示，每秒更新一次
  const [now, setNow] = useState(new Date());
  // 主内容区DOM引用，用于判断元素是否在视口中
  const mainContentRef = useRef(null);

  // ============================================
  // 用户认证状态管理
  // ============================================
  // 当前登录用户信息，未登录时为null
  const [user, setUser] = useState(null);
  // GitHub登录按钮的加载状态，登录过程中显示"登录中..."
  const [loading, setLoading] = useState(false);
  // 标记用户会话是否已检查完成，用于显示骨架屏
  const [isSessionChecked, setIsSessionChecked] = useState(false);

  // ============================================
  // 统计数据状态管理
  // ============================================
  // 注册用户总数
  const [userCount, setUserCount] = useState(0);
  // 最新注册用户的用户名
  const [latestUser, setLatestUser] = useState("暂无");

  // ============================================
  // 评论区状态管理
  // ============================================
  // 评论列表数组
  const [comments, setComments] = useState([]);
  // 评论输入框的内容
  const [commentContent, setCommentContent] = useState('');
  // 评论提交按钮的加载状态
  const [commentLoading, setCommentLoading] = useState(false);
  // 标记评论区是否已加载，用于滚动加载逻辑
  const [commentsLoaded, setCommentsLoaded] = useState(false);

  // ============================================
  // 数据获取函数：获取用户统计数据
  // 功能：从Supabase查询总用户数和最新注册用户
  // 性能优化：非关键数据，页面渲染完成后延迟加载
  // ============================================
  const fetchUserStats = async () => {
    // 组件已卸载或不在客户端环境时，不执行请求，防止内存泄漏
    if (!isClient || !isMountedRef.current) return;

    try {
      // 查询users表的总记录数
      // count: 'exact' - 使用精确计数模式
      // head: true - 只返回计数，不返回具体数据，减少网络传输
      const { count } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      // 查询最新注册的1个用户
      // order('created_at', { ascending: false }) - 按创建时间倒序排列
      // limit(1) - 只返回1条记录
      // single() - 将结果数组转换为单个对象
      const { data: lastUser } = await supabase
        .from('users')
        .select('raw_user_meta_data, email')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // 组件仍挂载时才更新状态，防止内存泄漏
      if (isMountedRef.current) {
        // 更新总用户数，count为null时显示0
        setUserCount(count || 0);
        // 优先级获取用户名：自定义名称 > 首选用户名 > 邮箱前缀 > 默认值"新用户"
        const name =
          lastUser?.raw_user_meta_data?.name ||
          lastUser?.raw_user_meta_data?.preferred_username ||
          lastUser?.email?.split('@')[0] ||
          "新用户";
        // 更新最新用户名称
        setLatestUser(name);
      }
    } catch (e) {
      // 捕获并打印错误，不影响页面其他功能
      console.log("获取用户统计失败", e);
    }
  };

  // ============================================
  // 数据获取函数：获取最新评论
  // 功能：从Supabase查询最新的10条评论
  // 性能优化：滚动到评论区时才加载
  // ============================================
  const fetchComments = async () => {
    // 组件已卸载或不在客户端环境时，不执行请求
    if (!isClient || !isMountedRef.current) return;

    // 查询comments表的最新10条评论
    const { data } = await supabase
      .from('comments')
      .select('*')
      .order('created_at', { ascending: false }) // 按创建时间倒序
      .limit(10); // 只加载最新10条，减少渲染压力

    // 组件仍挂载时才更新评论列表
    if (isMountedRef.current) {
      setComments(data || []);
    }
  };

  // ============================================
  // 事件处理函数：GitHub OAuth登录
  // 功能：调用Supabase的GitHub OAuth认证接口
  // ============================================
  const handleGitHubLogin = async () => {
    // 不在客户端环境时不执行
    if (!isClient) return;
    // 设置登录按钮为加载状态，防止重复点击
    setLoading(true);

    try {
      // 从静态数据获取站点根URL和回调路径，避免硬编码
      const rootUrl = siteData.siteUrl || "https://ye2f4.github.io";
      const cbPath = siteData.callbackPath || "/pblot/callback";
      // 拼接完整的OAuth回调地址
      const redirectUrl = rootUrl + cbPath;

      // 调用Supabase的OAuth登录接口
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "github", // 指定认证提供商为GitHub
        options: {
          redirectTo: redirectUrl, // 登录成功后的跳转地址
          scopes: "user:email" // 请求获取用户邮箱权限
        }
      });

      // 如果登录出错，弹出错误提示
      if (error) {
        alert(`${siteData.texts.loginTips.loginFailed}${error.message}`);
      }
    } catch (err) {
      // 捕获网络错误等异常
      alert(`${siteData.texts.loginTips.loginError}${err.message}`);
    } finally {
      // 无论成功失败，都关闭加载状态
      setLoading(false);
    }
  };

  // ============================================
  // 事件处理函数：用户退出登录
  // 功能：清除用户会话和本地存储的token
  // ============================================
  const handleSignOut = async () => {
    try {
      // 调用Supabase的退出登录接口
      const { error } = await supabase.auth.signOut();
      if (error) {
        // 退出失败提示
        alert(`${siteData.texts.loginTips.logoutFailed}${error.message}`);
      } else {
        // 退出成功：清空用户状态
        setUser(null);
        // 清除本地存储的认证token
        //localStorage.removeItem('supabase.auth.token');
      }
    } catch (err) {
      // 捕获异常
      alert(`${siteData.texts.loginTips.logoutError}${err.message}`);
    }
  };

  // ============================================
  // 事件处理函数：提交评论
  // 功能：将用户输入的评论保存到Supabase数据库
  // ============================================
  const handleSubmitComment = async (e) => {
    // 阻止表单默认的提交刷新行为
    e.preventDefault();

    // 未登录用户提示登录
    if (!user) return alert(siteData.texts.comments.loginTip);
    // 空评论不提交
    if (!commentContent.trim()) return;

    // 设置评论提交按钮为加载状态
    setCommentLoading(true);
    try {
      // 插入评论到comments表
      await supabase.from('comments').insert([{
        user_id: user.id, // 评论者ID
        username: user.user_metadata?.full_name || user.email, // 评论者名称
        avatar_url: user.user_metadata?.avatar_url || `${base}avatar.png`, // 评论者头像
        content: commentContent.trim() // 评论内容（去除首尾空格）
      }]);

      // 提交成功：清空输入框
      setCommentContent('');
      // 重新加载评论列表，显示最新评论
      fetchComments();
      // 弹出成功提示
      alert(siteData.texts.comments.success);
    } catch (err) {
      // 捕获并打印错误
      showError(err);
    } finally {
      // 关闭加载状态
      setCommentLoading(false);
    }
  };

  // ============================================
  // 生命周期钩子：组件挂载/卸载处理
  // 功能：
  // 1. 标记客户端运行状态
  // 2. 启动时钟定时器
  // 3. 监听滚动事件实现评论区懒加载
  // 4. 组件卸载时清理定时器和事件监听器
  // ============================================
  useEffect(() => {
    // 组件挂载时：标记为已挂载和客户端环境
    isMountedRef.current = true;
    setIsClient(true);

    // 启动时钟定时器：每秒更新一次当前时间
    const timer = setInterval(() => {
      // 组件仍挂载时才更新时间
      if (isMountedRef.current) {
        setNow(new Date());
      }
    }, 1000);

    // 滚动事件处理函数：滚动到600px时加载评论区
    const handleScroll = () => {
      // 滚动距离超过600px且评论区未加载且组件已挂载时
      if (window.scrollY > 600 && !commentsLoaded && isMountedRef.current) {
        // 标记评论区已加载
        setCommentsLoaded(true);
        // 加载评论数据
        fetchComments();
      }
    };

    // 添加滚动事件监听器
    // passive: true - 标记为被动监听器，提升滚动性能
    window.addEventListener('scroll', throttle(handleScroll, 200), { passive: true });

    // 组件卸载时的清理函数
    return () => {
      // 标记组件已卸载
      isMountedRef.current = false;
      // 清除时钟定时器
      clearInterval(timer);
      // 移除滚动事件监听器
      window.removeEventListener('scroll', handleScroll);
    };
  }, [commentsLoaded]); // 依赖commentsLoaded，避免重复加载评论

  // ============================================
  // 生命周期钩子：用户认证状态管理
  // 功能：
  // 1. 页面加载时检查用户会话
  // 2. 监听认证状态变化（登录/退出）
  // 3. 清理订阅防止内存泄漏
  // ============================================
  useEffect(() => {
    // 不在客户端或组件已卸载时不执行
    if (!isClient || !isMountedRef.current) return;

    // 获取当前用户会话
    const fetchUser = async () => {
      try {
        // 从Supabase获取当前会话
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && isMountedRef.current) {
          // 有会话：更新用户状态
          setUser({ ...session.user });
        } else {
          // 无会话：调用getUser()再次确认
          const { data: { user } } = await supabase.auth.getUser();
          if (isMountedRef.current) {
            // 更新用户状态（存在则为用户对象，不存在则为null）
            setUser(user ? { ...user } : null);
          }
        }
      } catch (err) {
        // 捕获并打印错误
        showError('获取用户失败：', err);
      } finally {
        // 标记会话检查完成，用于显示真实数据而非骨架屏
        if (isMountedRef.current) {
          setIsSessionChecked(true);
        }
      }
    };

    // 执行用户会话检查
    fetchUser();

    // 订阅认证状态变化事件（登录/退出时自动触发）
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (isMountedRef.current) {
        if (session?.user) {
          // 用户登录：更新用户状态
          setUser({ ...session.user });
          // 清除URL中的hash（OAuth回调后会留下#access_token等参数）
          if (window.location.hash) {
            window.history.replaceState(null, document.title, window.location.pathname);
          }
        } else {
          // 用户退出：清空用户状态
          setUser(null);
        }
      }
    });

    // 组件卸载时取消认证状态订阅
    return () => {
      subscription.unsubscribe();
    };
  }, [isClient]); // 依赖isClient，确保只在客户端执行

  // ============================================
  // 生命周期钩子：非关键数据延迟加载
  // 功能：页面渲染完成500ms后再加载用户统计数据
  // 性能优化：不影响首屏渲染速度
  // ============================================
  useEffect(() => {
    // 不在客户端或组件已卸载时不执行
    if (!isClient || !isMountedRef.current) return;

    // 延迟500ms加载用户统计数据，优先保证首屏渲染
    const timer = setTimeout(() => {
      fetchUserStats();
    }, 500);

    // 订阅Supabase实时事件：新用户注册时自动更新统计数据
    const channel = supabase.channel('auth-users');
    channel
      .on('postgres_changes', {
        event: 'INSERT', // 监听插入事件
        schema: 'auth', // 监听auth schema
        table: 'users' // 监听users表
      }, () => fetchUserStats()) // 有新用户时重新获取统计数据
      .subscribe();

    // 组件卸载时的清理函数
    return () => {
      // 清除定时器
      clearTimeout(timer);
      // 移除实时订阅
      channel.unsubscribe();
    };
  }, [isClient]); // 依赖isClient，确保只在客户端执行

  // ============================================
  // 配置对象：轮播图组件配置
  // 性能优化：禁用不必要的动画，降低速度，减少主线程压力
  // ============================================
  const carouselSettings = {
    dots: false, // 禁用底部圆点指示器
    infinite: true, // 开启无限循环
    speed: 300, // 切换动画速度（单位：ms），从默认500ms降低到300ms
    slidesToShow: 1, // 每次显示1张图片
    slidesToScroll: 1, // 每次滚动1张图片
    autoplay: true, // 开启自动播放
    autoplaySpeed: 6000, // 自动播放间隔（单位：ms），从默认5000ms增加到6000ms
    arrows: true, // 显示左右切换箭头
    lazyLoad: false, // 禁用react-slick自带的懒加载，手动控制更精确
    pauseOnHover: true, // 鼠标悬停时暂停自动播放
    fade: true, // 使用淡入淡出效果，比滑动效果更流畅
    cssEase: 'ease-in-out', // 缓动函数，使动画更自然
    centerMode: false, // 禁用居中模式
    centerPadding: '0px', // 居中模式的内边距，禁用后设为0
    // 自定义上一张按钮（符合可访问性标准）
    prevArrow: (
      <button
        type="button"
        aria-label="查看上一张轮播图" // 屏幕阅读器标签
        style={{
          left: 15, // 距离左侧15px
          zIndex: 20, // 层级高于轮播图
          minWidth: 48, // 最小宽度48px，符合可访问性的触摸尺寸要求
          minHeight: 48, // 最小高度48px
          border: 'none', // 无边框
          background: 'rgba(255,255,255,0.9)', // 半透明白色背景
          borderRadius: '50%', // 圆形按钮
          fontSize: 20, // 箭头字体大小
          cursor: 'pointer', // 鼠标悬停时显示手型
          display: 'flex', // 弹性布局，使箭头居中
          alignItems: 'center', // 垂直居中
          justifyContent: 'center', // 水平居中
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)', // 轻微阴影
        }}
      >
        ‹
      </button>
    ),
    // 自定义下一张按钮（与上一张按钮样式一致）
    nextArrow: (
      <button
        type="button"
        aria-label="查看下一张轮播图"
        style={{
          right: 15,
          zIndex: 20,
          minWidth: 48,
          minHeight: 48,
          border: 'none',
          background: 'rgba(255,255,255,0.9)',
          borderRadius: '50%',
          fontSize: 20,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}
      >
        ›
      </button>
    ),
    // 响应式配置：屏幕宽度小于768px时的设置
    responsive: [
      { breakpoint: 768, settings: { arrows: false, fade: false } }
    ]
  };

  // ============================================
  // 工具函数：获取星期几的日文和英文名称
  // ============================================
  const weekJp = siteData.texts.weekJp[now.getDay()]; // getDay()返回0-6，对应周日到周六
  const weekEn = siteData.texts.weekEn[now.getDay()];

  // ============================================
  // 工具函数：获取用户头像URL
  // 功能：优先使用用户的GitHub头像，加载失败时使用默认头像
  // ============================================
  const getAvatarUrl = () => {
    // 未登录时返回默认头像
    if (!user) return `${base}avatar.png`;
    // 从用户元数据获取头像URL
    const avatar = user.user_metadata?.avatar_url || user.raw_user_meta_data?.avatar_url;
    // 验证URL是否为有效HTTP地址，是则返回，否则返回默认头像
    return avatar && avatar.startsWith('http') ? avatar : `${base}avatar.png`;
  };

  // ============================================
  // 工具函数：获取用户名
  // 功能：按优先级获取用户显示名称
  // 优先级：自定义全名 > 首选用户名 > 原始名称 > 邮箱前缀 > 默认值"用户"
  // ============================================
  const getUserName = () => {
    // 未登录时返回"用户"
    if (!user) return "用户";
    return (
      user.user_metadata?.full_name ||
      user.user_metadata?.preferred_username ||
      user.raw_user_meta_data?.name ||
      user.email ||
      "用户"
    );
  };

  // ============================================
  // 服务端渲染时返回null
  // 因为我们禁用了SSR，所以服务端不渲染任何内容
  // ============================================
  if (!isClient) return null;

  // ============================================
  // 组件渲染部分（JSX）
  // ============================================
  return (
    // Docusaurus全局布局组件，设置页面标题
    <Layout title={siteData.siteTitle}>
      {/* ========================================
          顶部横幅（LCP核心元素）
          性能优化重点：
          1. 内联背景图，避免CSS文件加载延迟
          2. 提前设置背景色作为占位符，消除加载闪烁
          3. 使用100% auto保持图片原始宽高比
          4. 禁用所有影响LCP的动画
          ======================================== */}
      <section
        className={styles.topBannerWrap}
        style={{
          // 与背景图底色一致的占位背景色，消除图片加载时的闪烁
          backgroundColor: '#f8f9fa',
          // 内联背景图，避免CSS文件加载延迟导致LCP变慢
          backgroundImage: `url(${base}img/bg_big.webp)`,
          // 背景图尺寸：宽度100%，高度自动，保持原始宽高比
          backgroundSize: '100% auto',
          // 背景图位置：水平居中，垂直顶部对齐，正好显示核心内容
          backgroundPosition: 'center top',
          // 不重复背景图
          backgroundRepeat: 'no-repeat',
          // 精确控制内边距，让背景图正好包裹内容
          padding: '25px 15px',
          // 宽度100%，占满整个屏幕
          width: '100%',
          // 隐藏超出容器的背景部分
          overflow: 'hidden',
          // 移动端适配
          '@media (max-width: 768px)': {
            padding: '20px 10px', // 减小内边距
            backgroundPosition: 'center -5px', // 向上偏移5px，显示更多内容
          },
        }}
      >
        {/* 顶部横幅内容容器，最大宽度1200px，居中显示 */}
        <div className="top-row" style={{ maxWidth: 1200, margin: '0 auto' }}>
          {/* 左侧：公告栏 */}
          <div className="top-col">
            <div style={{
              display: 'flex', // 弹性布局，图标和文字并排
              alignItems: 'center', // 垂直居中
              gap: 10, // 图标和文字间距10px
              height: '100%', // 占满父容器高度
            }}>
              {/* 公告图标 */}
              <span style={{ fontSize: 24 }}>📢</span>
              {/* 公告文字 */}
              <p style={{ margin: 0, fontSize: 14, color: '#333', lineHeight: 1.5 }}>
                {siteData.texts.announcement}
              </p>
            </div>
          </div>

          {/* 中间：统计数据和时钟 */}
          <div className="top-col" style={{ flex: 2, minWidth: 400 }}>
            <div style={{
              display: 'flex', // 统计数据和时钟并排
              justifyContent: 'space-between', // 两端对齐
              alignItems: 'center', // 垂直居中
              height: '100%' // 占满父容器高度
            }}>
              {/* ====================================
                  统计数据容器
                  性能优化：彻底修复CLS
                  1. 设置固定最小高度
                  2. 数据加载时显示骨架屏
                  ==================================== */}
              <div className="stats-container" style={{
                display: 'flex', // 统计项横向排列
                gap: 15, // 统计项间距15px
                flexWrap: 'wrap', // 空间不足时自动换行
                minHeight: '60px', // 固定最小高度，防止布局偏移
                alignItems: 'center', // 垂直居中
              }}>
                {/* 会话检查完成：显示真实统计数据 */}
                {isSessionChecked ? (
                  // 遍历siteData.stats数组，渲染每个统计项
                  siteData.stats.map((item, i) => {
                    // 根据统计项标签动态设置显示值
                    let showValue = item.value;
                    if (item.label === "会") showValue = `会员:${userCount}`;
                    if (item.label === "新") showValue = `最新:${latestUser}`;

                    return (
                      <div
                        key={i}
                        style={{
                          textAlign: 'center', // 文字居中
                          minWidth: 40, // 最小宽度40px
                        }}
                      >
                        {/* 统计项图标/标签容器 */}
                        <div style={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%', // 圆形
                          backgroundColor: 'rgba(0,0,0,0.05)', // 浅灰色背景
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto 6px', // 底部间距6px
                        }}>
                          {/* 统计项标签（今/昨/总/会/新） */}
                          <span style={{ fontSize: 20, fontWeight: 'bold' }}>{item.label}</span>
                        </div>
                        {/* 统计值 */}
                        <p style={{ color: item.color, fontSize: 11, margin: 0, textAlign: 'center' }}>
                          {showValue}
                        </p>
                      </div>
                    );
                  })
                ) : (
                  // 会话检查中：显示骨架屏
                  // 生成5个骨架屏项，与实际统计项数量一致
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} style={{
                      textAlign: 'center',
                      minWidth: 40,
                      opacity: 0.5, // 半透明
                    }}>
                      {/* 圆形骨架屏 */}
                      <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        backgroundColor: 'rgba(0,0,0,0.05)',
                        margin: '0 auto 6px',
                      }} />
                      {/* 文字骨架屏 */}
                      <div style={{
                        width: 40,
                        height: 12,
                        backgroundColor: 'rgba(0,0,0,0.05)',
                        borderRadius: 4,
                      }} />
                    </div>
                  ))
                )}
              </div>

              {/* 时钟显示容器 */}
              <div className="clock-container" style={{
                padding: 0, // 去除内边距
                backgroundColor: 'transparent', // 透明背景
                backdropFilter: 'none', // 去除毛玻璃效果
                textAlign: 'right', // 文字右对齐
                minWidth: 160 // 最小宽度160px
              }}>
                {/* 时间显示 */}
                <div className="pixel-font clock-text" style={{
                  fontSize: 24,
                  color: '#333',
                  marginBottom: 4,
                  textShadow: 'none', // 去除文字阴影
                }}>
                  {now.toLocaleTimeString()} {/* 本地化时间字符串 */}
                </div>
                {/* 星期显示 */}
                <div className="date-text" style={{
                  fontSize: 14,
                  color: '#666',
                  marginBottom: 4,
                }}>
                  {weekJp}曜日 ({weekEn})
                </div>
                {/* 日期显示 */}
                <div className="pixel-font date-text" style={{
                  fontSize: 16,
                  color: '#333',
                  textShadow: 'none',
                }}>
                  {/* 格式化日期为YYYY-MM-DD */}
                  {now.getFullYear()}-{(now.getMonth() + 1 + '').padStart(2, '0')}-{(now.getDate() + '').padStart(2, '0')}
                </div>
              </div>
            </div>
          </div>

          {/* 右侧：登录/用户信息 */}
          <div className="top-col">
            {/* 已登录状态：显示用户信息和操作按钮 */}
            {user ? (
              <div style={{
                display: 'flex', // 垂直排列
                flexDirection: 'column',
                alignItems: 'center', // 水平居中
                gap: 12, // 元素间距12px
                height: '100%', // 占满父容器高度
                justifyContent: 'center' // 垂直居中
              }}>
                {/* 用户头像 */}
                <img
                  src={getAvatarUrl()}
                  alt={getUserName()} // 图片alt属性，符合可访问性
                  width="50" // 固定宽度
                  height="50" // 固定高度，防止布局偏移
                  loading="lazy" // 头像懒加载
                  onError={(e) => e.target.src = `${base}avatar.png`} // 加载失败时使用默认头像
                  style={{
                    borderRadius: '50%', // 圆形头像
                    objectFit: 'cover', // 保持图片比例，裁剪多余部分
                    boxShadow: '0 4px 8px rgba(0,0,0,0.1)' // 轻微阴影
                  }}
                />
                {/* 用户名 */}
                <span style={{ fontSize: 14, fontWeight: 500, color: '#333' }}>
                  {getUserName()}
                </span>
                {/* 个人中心按钮 */}
                <Link
                  to="/pblot/profile"
                  className="btn-hover"
                  aria-label="进入个人中心" // 屏幕阅读器标签
                  style={{
                    width: '100%', // 占满容器宽度
                    padding: '6px 12px',
                    backgroundColor: '#4285f4', // 蓝色
                    color: '#fff', // 白色文字
                    border: 'none',
                    borderRadius: 4, // 圆角
                    fontSize: 14,
                    cursor: 'pointer',
                    minWidth: 48, // 符合可访问性的最小尺寸
                    minHeight: 48,
                    textDecoration: 'none', // 去除下划线
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {siteData.texts.buttons.profile}
                </Link>
                {/* 退出登录按钮 */}
                <button
                  className="btn-hover"
                  onClick={handleSignOut}
                  aria-label="退出当前账号"
                  style={{
                    width: '100%',
                    padding: '6px 12px',
                    backgroundColor: '#dc3545', // 红色
                    color: '#fff',
                    border: 'none',
                    borderRadius: 4,
                    fontSize: 14,
                    cursor: 'pointer',
                    minWidth: 48,
                    minHeight: 48,
                  }}
                >
                  {siteData.texts.buttons.logout}
                </button>
              </div>
            ) : (
              // 未登录状态：显示登录按钮
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 12,
                height: '100%',
                justifyContent: 'center'
              }}>
                {/* 默认头像 */}
                <img
                  src={`${base}avatar.png`}
                  alt="默认头像"
                  width="50"
                  height="50"
                  loading="lazy"
                  style={{
                    borderRadius: '50%',
                    objectFit: 'cover',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                  }}
                />
                {/* 登录和注册按钮 */}
                <div style={{ display: 'flex', gap: 8, width: '100%' }}>
                  {/* 登录按钮 */}
                  <Link
                    to="/pblot/login"
                    className="btn-hover"
                    aria-label="登录账号"
                    style={{
                      flex: 1, // 两个按钮平分宽度
                      padding: '6px 12px',
                      background: '#4285f4',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 4,
                      fontSize: 14,
                      cursor: 'pointer',
                      minWidth: 48,
                      minHeight: 48,
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {siteData.texts.buttons.login}
                  </Link>
                  {/* 注册按钮 */}
                  <Link
                    to="/pblot/register"
                    className="btn-hover"
                    aria-label="注册新账号"
                    style={{
                      flex: 1,
                      padding: '6px 12px',
                      background: '#999', // 灰色
                      color: '#fff',
                      border: 'none',
                      borderRadius: 4,
                      fontSize: 14,
                      cursor: 'pointer',
                      minWidth: 48,
                      minHeight: 48,
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {siteData.texts.buttons.register}
                  </Link>
                </div>
                {/* GitHub登录按钮 */}
                <button
                  className="btn-hover"
                  onClick={handleGitHubLogin}
                  disabled={loading} // 登录过程中禁用按钮
                  aria-label="使用GitHub账号登录"
                  style={{
                    width: '100%',
                    padding: '6px 12px',
                    backgroundColor: '#333', // 黑色
                    color: '#fff',
                    border: 'none',
                    borderRadius: 4,
                    fontSize: 14,
                    cursor: loading ? 'not-allowed' : 'pointer', // 加载时显示禁止光标
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6, // 图标和文字间距6px
                    opacity: loading ? 0.7 : 1, // 加载时半透明
                    minWidth: 48,
                    minHeight: 48,
                  }}
                >
                  {/* GitHub图标SVG */}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                  {/* 按钮文字，加载时显示"登录中..." */}
                  {loading ? siteData.texts.buttons.logging : siteData.texts.buttons.githubLogin}
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ========================================
          主内容区
          ======================================== */}
      <div
        ref={mainContentRef} // 绑定DOM引用
        className="main-content"
        style={{
          maxWidth: 1200, // 最大宽度1200px
          margin: '20px auto', // 上下间距20px，水平居中
          padding: '0 15px', // 左右内边距15px
          display: 'flex', // 垂直排列
          flexDirection: 'column',
          gap: 20, // 区块间距20px
          width: '100%', // 宽度100%
        }}
      >
        {/* ======================================
            主内容区顶部：标签按钮和通知栏
            ====================================== */}
        <div
          className="main-content-top"
          style={{
            display: 'flex', // 横向排列
            gap: 15, // 元素间距15px
            alignItems: 'center', // 垂直居中
            width: '100%',
          }}
        >
          {/* 标签按钮组 */}
          <div className="tab-buttons" style={{ display: 'flex', gap: 10, marginBottom: 0 }}>
            {/* 遍历siteData.tabs数组，渲染每个标签按钮 */}
            {siteData.tabs.map((tab, i) => (
              <Link
                key={i}
                to={tab.link}
                className="btn-hover"
                aria-label={`查看${tab.name}内容`}
                style={{
                  padding: '8px 16px',
                  backgroundColor: tab.color, // 每个标签使用不同颜色
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap', // 文字不换行
                  textDecoration: 'none',
                  minWidth: 48,
                  minHeight: 48,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {tab.name}
              </Link>
            ))}
          </div>

          {/* 滚动通知栏 */}
          <div
            className="notification-bar"
            style={{
              height: 40, // 固定高度
              backgroundColor: '#E3F2FD', // 浅蓝色背景
              borderRadius: 8, // 圆角
              display: 'flex',
              alignItems: 'center', // 垂直居中
              overflow: 'hidden', // 隐藏超出部分
              flex: 1, // 占满剩余空间
              padding: '0 12px', // 左右内边距12px
            }}
          >
            {/* 滚动文字 */}
            <span
              style={{
                whiteSpace: 'nowrap', // 文字不换行
                animation: 'scrollText 18s linear infinite', // 18秒循环滚动
                color: '#004085', // 深蓝色文字
                fontSize: 14
              }}
            >
              {siteData.texts.notification}
            </span>
          </div>

          {/* 操作按钮组 */}
          <div className="action-buttons" style={{ display: 'flex', gap: 10, marginBottom: 0 }}>
            {/* 签到按钮 */}
            <Link
              to="/pblot/signin"
              className="btn-hover"
              aria-label="每日签到领取奖励"
              style={{
                padding: '8px 16px',
                backgroundColor: '#34a853', // 绿色
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                fontSize: 14,
                whiteSpace: 'nowrap',
                textDecoration: 'none',
                minWidth: 48,
                minHeight: 48,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {siteData.texts.buttons.signIn}
            </Link>
            {/* 抽贴按钮 */}
            <Link
              to="/pblot/draw"
              className="btn-hover"
              aria-label="每日抽奖"
              style={{
                padding: '8px 16px',
                backgroundColor: '#ff9800', // 橙色
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                fontSize: 14,
                whiteSpace: 'nowrap',
                textDecoration: 'none',
                minWidth: 48,
                minHeight: 48,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {siteData.texts.buttons.drawPost}
            </Link>
          </div>
        </div>

        {/* ======================================
            内容主体：左侧内容区 + 右侧边栏
            ====================================== */}
        <div style={{ display: 'flex', gap: 20, width: '100%' }}>
          {/* ====================================
              左侧内容区（占7份宽度）
              包含：轮播图、快速导航、最新更新、标签云、友情链接、关于本站
              ==================================== */}
          <div
            className="left-container"
            style={{
              flex: 7, // 占7份宽度
              minWidth: 0, // 防止flex子元素内容溢出
            }}
          >
            {/* ==================================
                轮播图组件
                性能优化：
                1. 固定高度，防止布局偏移（CLS）
                2. 使用Suspense包裹，加载时显示骨架屏
                3. 第一张图片使用eager加载和高优先级
                ================================== */}
            <div style={{
              backgroundColor: '#fff', // 白色背景
              padding: 0, // 无内边距
              borderRadius: 8, // 圆角
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)', // 轻微阴影
              width: '100%',
              overflow: 'hidden', // 隐藏超出部分
              marginBottom: 20, // 底部间距20px
              minHeight: '350px', // 固定最小高度，防止布局偏移
            }}>
              {/* Suspense容器：轮播图加载时显示骨架屏 */}
              <Suspense fallback={
                <div style={{
                  height: 350, // 与轮播图高度一致
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#999',
                  // 使用第一张轮播图作为骨架屏背景
                  backgroundImage: `url(${base}img/bar1.webp)`,
                  backgroundSize: 'contain',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                }}>
                  加载中...
                </div>
              }>
                {/* 只在客户端渲染轮播图，避免SSR问题 */}
                {isClient && (
                  <Slider {...carouselSettings}>
                    {/* 遍历轮播图数组 */}
                    {siteData.carouselImages.map((img, i) => (
                      <div key={i} style={{ textAlign: 'center' }}>
                        <img
                          src={`${base}img/${img.filename}`}
                          alt={img.title}
                          width="1200" // 固定宽度
                          height="350" // 固定高度
                          // 第一张图片高优先级加载，其余懒加载
                          loading={i === 0 ? "eager" : "lazy"}
                          fetchpriority={i === 0 ? "high" : "auto"}
                          style={{
                            borderRadius: 0,
                            maxHeight: 350, // 最大高度350px
                            objectFit: 'contain', // 保持图片比例，完整显示
                            backgroundColor: '#f5f5f5' // 背景色填充空白区域
                          }}
                        />
                        {/* 轮播图标题 */}
                        <p style={{
                          marginTop: 8,
                          marginBottom: 8,
                          fontSize: 14,
                        }}>{img.title}</p>
                      </div>
                    ))}
                  </Slider>
                )}
              </Suspense>
            </div>

            {/* 快速导航 */}
            <div className="section-card">
              <h3 className="section-title">{siteData.texts.quickNavTitle}</h3>
              <div className="nav-grid">
                {/* 遍历快速导航数组 */}
                {siteData.quickNav.map((item, i) => (
                  <Link
                    key={i}
                    to={item.link}
                    className="nav-card"
                    style={{ borderLeft: `4px solid ${item.color}` }} // 左侧彩色边框
                  >
                    <span className="nav-icon">{item.icon}</span>
                    <span className="nav-name">{item.name}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* 最新更新 */}
            <div className="section-card">
              <h3 className="section-title">{siteData.texts.updatesTitle}</h3>
              <ul className="update-list">
                {/* 遍历更新日志数组 */}
                {siteData.updates.map((item, i) => (
                  <li key={i} className="update-item">
                    <span className="update-date">{item.date}</span>
                    <span className="update-content">{item.content}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 技术标签云 */}
            <div className="section-card">
              <h3 className="section-title">{siteData.texts.tagsTitle}</h3>
              <div className="tag-cloud">
                {/* 遍历标签数组 */}
                {siteData.tags.map((tag, i) => (
                  <Link
                    key={i}
                    to={`/pblot/tags/${tag.name.toLowerCase()}`}
                    className="tag-item"
                    style={{
                      backgroundColor: `${tag.color}20`, // 标签颜色+20%透明度
                      color: tag.color,
                      border: `1px solid ${tag.color}40` // 边框颜色+40%透明度
                    }}
                  >
                    {tag.name}
                    <span className="tag-count">({tag.count})</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* 友情链接和关于本站（并排显示） */}
            <div style={{ display: 'flex', gap: 20, width: '100%' }}>
              {/* 友情链接 */}
              <div className="section-card" style={{ flex: 1 }}>
                <h3 className="section-title">{siteData.texts.friendsTitle}</h3>
                <div className="friend-list">
                  {/* 遍历友情链接数组 */}
                  {siteData.friends.map((friend, i) => (
                    <a
                      key={i}
                      href={friend.url}
                      target="_blank" // 新窗口打开
                      rel="noopener noreferrer" // 安全属性
                      className="friend-link"
                    >
                      {friend.name}
                    </a>
                  ))}
                </div>
              </div>

              {/* 关于本站 */}
              <div className="section-card" style={{ flex: 1 }}>
                <h3 className="section-title">{siteData.texts.aboutTitle}</h3>
                <p className="about-text">{siteData.about}</p>
              </div>
            </div>
          </div>

          {/* ====================================
              右侧边栏（占3份宽度）
              包含：最新主题排行榜、评论区、广告区
              ==================================== */}
          <div
            className="sidebar-container"
            style={{
              flex: 3, // 占3份宽度
              minWidth: 0,
            }}
          >
            {/* 最新主题排行榜 */}
            <div style={{
              backgroundColor: '#fff',
              padding: 15,
              borderRadius: 8,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              marginBottom: 15,
              width: '100%'
            }}>
              <h4 style={{
                margin: '0 0 15px 0',
                fontSize: 16,
                position: 'relative',
                paddingBottom: 8,
                borderBottom: '2px solid #f0f0f0', // 底部边框
              }}>
                {siteData.texts.rankTitle}
                <span style={{
                  display: 'inline-block',
                  marginLeft: 8,
                  fontSize: 12,
                  color: '#4285f4',
                }}>🔥</span>
              </h4>
              <div>
                {/* 遍历排行榜数组 */}
                {siteData.rankList.map((item, i) => {
                  // 前三名使用不同颜色：红、黄、绿
                  const numColor = i === 0 ? '#ea4335' : i === 1 ? '#fbbc05' : i === 2 ? '#34a853' : '#999';
                  return (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '12px 0',
                        // 前6项显示底部分隔线
                        borderBottom: i < 6 ? '1px solid #f0f0f0' : 'none',
                        transition: 'all 0.3s ease', // 过渡动画
                        cursor: 'pointer',
                      }}
                      // 鼠标悬停效果：右移5px，背景变浅
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateX(5px)';
                        e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.02)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateX(0)';
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      {/* 排名数字 */}
                      <span style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        backgroundColor: numColor,
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        marginRight: 10,
                      }}>{i + 1}</span>
                      {/* 文章标题链接 */}
                      <Link
                        to={item.link}
                        style={{
                          flex: 1, // 占满剩余空间
                          fontSize: 14,
                          color: '#333',
                          textDecoration: 'none',
                          whiteSpace: 'nowrap', // 文字不换行
                          overflow: 'hidden', // 隐藏超出部分
                          textOverflow: 'ellipsis', // 超出部分显示省略号
                          padding: '4px 0',
                        }}
                      >
                        {item.title}
                      </Link>
                      {/* 发布日期 */}
                      <span style={{ fontSize: 12, color: '#999', whiteSpace: 'nowrap', marginLeft: 8 }}>
                        {item.date}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ==================================
                评论区组件
                性能优化：延迟加载，滚动到评论区时才渲染
                ================================== */}
            <Suspense fallback={
              // 加载时显示骨架屏
              <div style={{
                backgroundColor: '#fff',
                padding: 15,
                borderRadius: 8,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                marginBottom: 15,
                width: '100%',
                minHeight: '400px', // 固定高度，防止布局偏移
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#999',
              }}>
                加载中...
              </div>
            }>
              {/* 只有commentsLoaded为true时才渲染评论区 */}
              {commentsLoaded && (
                <CommentSection
                  comments={comments}
                  commentContent={commentContent}
                  setCommentContent={setCommentContent}
                  commentLoading={commentLoading}
                  handleSubmitComment={handleSubmitComment}
                  user={user}
                  base={base}
                  siteData={siteData}
                />
              )}
            </Suspense>

            {/* ==================================
                广告区组件
                性能优化：延迟加载，不影响首屏渲染
                ================================== */}
            <Suspense fallback={null}>
              <AdSection ads={siteData.ads} base={base} />
            </Suspense>
          </div>
        </div>
      </div>
    </Layout>
  );
}