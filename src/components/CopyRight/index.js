import { useEffect } from 'react';

export default function CopyRight() {
  useEffect(() => {
    const copy = (e) => {
      e.preventDefault();
      const text = window.getSelection().toString();
      const copyText = `${text}\n\n来源：pblot\n\n作者：ye2f4`;
      navigator.clipboard.writeText(copyText);
    };
    document.addEventListener('copy', copy);
    return () => document.removeEventListener('copy', copy);
  }, []);

  return null;
}