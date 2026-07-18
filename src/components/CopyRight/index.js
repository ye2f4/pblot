import { useEffect } from 'react';
import siteData from '../../data/siteData.json';

export default function CopyRight() {
  useEffect(() => {
    const copy = (e) => {
      e.preventDefault();
      const text = window.getSelection().toString();
      const source = siteData.siteUrl || 'https://monoblog.cc.cd';
      const author = siteData.siteTitle || 'Mono';
      const copyText = `${text}\n\n来源：${source}\n\n作者：${author}`;
      navigator.clipboard.writeText(copyText);
    };
    document.addEventListener('copy', copy);
    return () => document.removeEventListener('copy', copy);
  }, []);

  return null;
}
