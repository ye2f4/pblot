"use strict";(self.webpackChunkMono_=self.webpackChunkMono_||[]).push([["392"],{3819(e,t,a){a.r(t),a.d(t,{default:()=>m});var r=a(1684),n=a(2888),o=a(7387);let s="weather_selected_location",i=e=>`blog_weather_cache_${e}`,l={icon:"\u{1F324}\uFE0F",anim:"iconFloat"},c=(0,n.memo)(()=>{let[e,t]=(0,n.useState)({});return(0,n.useEffect)(()=>{let e=6*Math.random()+3,a=90*Math.random()+5,r=4*Math.random(),n=5*Math.random()+3;t({position:"absolute",left:`${a}%`,top:`${80*Math.random()+10}%`,width:e,height:e,borderRadius:"50%",background:"rgba(66,133,244,0.15)",animation:`particleFloat ${n}s ease-in-out infinite`,animationDelay:`${r}s`,pointerEvents:"none"})},[]),(0,r.jsx)("div",{style:e})}),d=`
@keyframes particleFloat {
  0% { transform: translateY(0) scale(1); opacity:0.2; }
  50% { transform: translateY(-10px) scale(1.15); opacity:0.45; }
  100% { transform: translateY(0) scale(1); opacity:0.2; }
}
@keyframes iconPulse {
  0%,100% { transform: scale(1); }
  50% { transform: scale(1.12); }
}
@keyframes iconFloat {
  0%,100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}
@keyframes iconDrop {
  0%,100% { transform: translateY(0); }
  50% { transform: translateY(6px); }
}
@keyframes iconFlash {
  0%,100% { opacity:1; }
  50% { opacity:0.35; }
}
@keyframes iconSpin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
@keyframes iconFade {
  0%,100% { opacity:0.65; }
  50% { opacity:1; }
}
@keyframes boxFadeIn {
  from { opacity:0; transform: translateY(15px); }
  to { opacity:1; transform: translateY(0); }
}
`,m=(0,n.memo)(()=>{let e=(0,o.W6)(),[t,a]=(0,n.useState)(null),[m,p]=(0,n.useState)(!0),[f,g]=(0,n.useState)(""),[u,x]=(0,n.useState)(!1),y=Array.from({length:4},(e,t)=>t),[h,b]=(0,n.useState)(()=>{let e=localStorage.getItem(s);if(e)try{return JSON.parse(e)}catch(e){}return{lat:39.9042,lon:116.4074,name:"\u5317\u4EAC",code:"beijing"}}),S=(0,n.useCallback)(async e=>{p(!0),g("");let t=i(e.code);try{let r=new URLSearchParams({latitude:e.lat,longitude:e.lon,current:"temperature_2m",timezone:"auto"}),n=await fetch(`https://api.open-meteo.com/v1/forecast?${r.toString()}`,{signal:AbortSignal.timeout(8e3)});if(!n.ok)throw Error("\u6C14\u8C61\u63A5\u53E3\u8BF7\u6C42\u5931\u8D25");let o=await n.json();if(console.log("\u76F4\u62FF\u5B8C\u6574OM\u6570\u636E",o),!o?.current)throw Error("\u6C14\u8C61\u6570\u636E\u4E3A\u7A7A");localStorage.setItem(t,JSON.stringify({data:o,cacheTime:Date.now()})),a(o)}catch(e){g(e.message||"\u5929\u6C14\u52A0\u8F7D\u5F02\u5E38"),console.error("\u8BF7\u6C42\u9519\u8BEF",e)}finally{p(!1)}},[]);(0,n.useEffect)(()=>{let e=setTimeout(()=>x(!0),60),t=(e=>{let t=i(e),a=localStorage.getItem(t);if(!a)return null;try{let e=JSON.parse(a);if(Date.now()-e.cacheTime<6e5)return e.data;return localStorage.removeItem(t),null}catch(e){return localStorage.removeItem(t),null}})(h.code);t?(a(t),p(!1)):S(h);let r=setInterval(()=>S(h),6e5);return()=>{clearTimeout(e),clearInterval(r)}},[S,h]),(0,n.useEffect)(()=>{let e=()=>{if(!document.hidden){let e=localStorage.getItem(s);if(e)try{let t=JSON.parse(e);t.code!==h.code&&(b(t),localStorage.removeItem(i(h.code)),S(t))}catch(e){}}};return document.addEventListener("visibilitychange",e),()=>document.removeEventListener("visibilitychange",e)},[h,S]);let{icon:v,anim:j}=l;return(0,r.jsxs)(r.Fragment,{children:[(0,r.jsx)("style",{dangerouslySetInnerHTML:{__html:d}}),(0,r.jsxs)("div",{style:{position:"relative",overflow:"hidden",width:"100%",boxSizing:"border-box",padding:"14px 16px",borderRadius:"18px",background:"linear-gradient(135deg, rgba(66,133,244,0.06), rgba(100,160,255,0.12))",boxShadow:"0 3px 14px rgba(66,133,244,0.1)",animation:u?"boxFadeIn 0.5s ease-out forwards":"none",opacity:0,transform:"translateY(15px)",transition:"box-shadow 0.3s ease, transform 0.2s ease",fontFamily:"system-ui, -apple-system, sans-serif"},onMouseEnter:e=>{e.currentTarget.style.boxShadow="0 5px 18px rgba(66,133,244,0.16)",e.currentTarget.style.transform="translateY(-2px)"},onMouseLeave:e=>{e.currentTarget.style.boxShadow="0 3px 14px rgba(66,133,244,0.1)",e.currentTarget.style.transform="translateY(0)"},children:[y.map(e=>(0,r.jsx)(c,{},e)),(0,r.jsxs)("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px"},children:[(0,r.jsxs)("span",{style:{fontSize:"13px",fontWeight:500,color:"#1ce306"},children:[h.name," \xb7 \u5B9E\u65F6\u6C14\u8C61"]}),(0,r.jsx)("button",{onClick:()=>e.push("/locations"),style:{fontSize:"11px",padding:"3px 8px",borderRadius:"999px",border:"1px solid rgba(66,133,244,0.25)",background:"rgba(66,133,244,0.08)",color:"#0060fc",cursor:"pointer",transition:"all 0.2s ease"},onMouseEnter:e=>{e.target.style.background="rgba(66,133,244,0.18)",e.target.style.borderColor="rgba(66,133,244,0.4)"},onMouseLeave:e=>{e.target.style.background="rgba(66,133,244,0.08)",e.target.style.borderColor="rgba(66,133,244,0.25)"},children:"\u{1F4CD} \u5207\u6362\u4F4D\u7F6E"})]}),m&&(0,r.jsxs)("div",{style:{textAlign:"center",padding:"16px 0"},children:[(0,r.jsx)("span",{style:{fontSize:"28px",display:"inline-block",animation:"iconFloat 2s ease-in-out infinite"},children:"\u{1F324}\uFE0F"}),(0,r.jsx)("p",{style:{margin:"6px 0 0",color:"var(--ifm-color-emphasis-600)",fontSize:"13px"},children:"\u52A0\u8F7D\u5929\u6C14..."})]}),f&&!m&&(0,r.jsxs)("div",{style:{textAlign:"center",padding:"16px 0"},children:[(0,r.jsx)("span",{style:{fontSize:"28px",color:"var(--ifm-color-danger)"},children:"\u26A0\uFE0F"}),(0,r.jsx)("p",{style:{margin:"6px 0 0",color:"var(--ifm-color-danger)",fontSize:"12px"},children:f})]}),t&&!m&&!f&&(0,r.jsx)(r.Fragment,{children:(0,r.jsxs)("div",{style:{display:"flex",alignItems:"flex-end",justifyContent:"space-between",marginBottom:"8px"},children:[(0,r.jsx)("div",{children:(0,r.jsxs)("div",{style:{fontSize:"36px",fontWeight:700,color:"var(--ifm-color-emphasis-900)",lineHeight:1},children:[t.current.temperature_2m,(0,r.jsx)("span",{style:{fontSize:"16px",fontWeight:400},children:"\u2103"})]})}),(0,r.jsx)("span",{style:{fontSize:"42px",display:"inline-block",animation:`${j} 2.8s ease-in-out infinite`,filter:"drop-shadow(0 2px 4px rgba(66,133,244,0.2))"},children:v})]})})]})]})})}}]);