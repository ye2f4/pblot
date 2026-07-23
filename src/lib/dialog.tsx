import React from 'react';

/**
 * 全局网页内弹窗（替代浏览器原生 alert / confirm）。
 * 通过 React Portal 挂载到 document.body，任何客户端组件都能调用。
 * 所有方法均返回 Promise，confirm 返回 boolean。
 * 由 Docusaurus src/utils/dialog.jsx / next-app/lib/dialog.tsx 迁移。
 */
let _root: any = null;
let _container: any = null;

function ensureRoot() {
  if (_root) return Promise.resolve(_root);
  if (typeof document === 'undefined') return Promise.resolve(null);
  return import('react-dom/client').then(({ createRoot }) => {
    if (_root) return _root;
    _container = document.createElement('div');
    _container.setAttribute('data-dialog-root', '');
    document.body.appendChild(_container);
    _root = createRoot(_container);
    return _root;
  });
}

function renderDialog(props: any) {
  return ensureRoot().then((root: any) => {
    if (!root) {
      if (props.type === 'confirm') return window.confirm(props.message);
      window.alert(props.message);
      return true;
    }
    return new Promise((resolve) => {
      const close = (val: boolean) => {
        root.render(null);
        resolve(val);
      };
      root.render(
        <DialogView
          {...props}
          onConfirm={() => close(true)}
          onCancel={() => close(false)}
        />,
      );
    });
  });
}

function DialogView({ type, title, message, confirmText, cancelText, onConfirm, onCancel }: any) {
  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
    padding: '20px',
    animation: 'dialogFadeIn 0.18s ease',
  };
  const boxStyle: React.CSSProperties = {
    background: 'var(--ifm-card-background-color, #fff)',
    color: 'var(--ifm-font-color-base, #1c1e21)',
    borderRadius: '14px',
    padding: '28px',
    maxWidth: '420px',
    width: '100%',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    animation: 'dialogPopIn 0.18s ease',
  };
  const titleStyle: React.CSSProperties = { margin: '0 0 12px', fontSize: '17px', fontWeight: 600 };
  const msgStyle: React.CSSProperties = {
    margin: '0 0 24px', fontSize: '14px', lineHeight: 1.7, whiteSpace: 'pre-wrap',
    color: 'var(--ifm-color-emphasis-700, #444)',
  };
  const btnRow: React.CSSProperties = { display: 'flex', justifyContent: 'flex-end', gap: '10px' };
  const baseBtn: React.CSSProperties = {
    padding: '9px 22px', borderRadius: '8px', fontSize: '14px', border: 'none', cursor: 'pointer', transition: 'opacity 0.2s ease',
  };
  const cancelBtn: React.CSSProperties = {
    ...baseBtn, background: 'var(--ifm-color-emphasis-200, #e9ecef)', color: 'var(--ifm-font-color-base, #1c1e21)',
  };
  const confirmBtn: React.CSSProperties = {
    ...baseBtn, background: type === 'confirm' ? '#dc2626' : '#2196f3', color: '#fff',
  };

  return (
    <div style={overlayStyle} onClick={type === 'alert' ? undefined : onCancel}>
      <div style={boxStyle} onClick={(e) => e.stopPropagation()}>
        <h3 style={titleStyle}>{title}</h3>
        <p style={msgStyle}>{message}</p>
        <div style={btnRow}>
          {type === 'confirm' && (
            <button style={cancelBtn} onClick={onCancel}>{cancelText}</button>
          )}
          <button style={confirmBtn} onClick={onConfirm}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
}

/** 提示框，点击确认后 resolve(true) */
export function showAlert(message: string, options: { title?: string; confirmText?: string } = {}) {
  return renderDialog({
    type: 'alert',
    title: options.title || '提示',
    message,
    confirmText: options.confirmText || '确定',
  });
}

/** 确认框，确认 resolve(true)，取消 resolve(false) */
export function showConfirm(message: string, options: { title?: string; confirmText?: string; cancelText?: string } = {}) {
  return renderDialog({
    type: 'confirm',
    title: options.title || '请确认',
    message,
    confirmText: options.confirmText || '确定',
    cancelText: options.cancelText || '取消',
  });
}

if (typeof document !== 'undefined') {
  const styleId = 'dialog-anim-style';
  if (!document.getElementById(styleId)) {
    const s = document.createElement('style');
    s.id = styleId;
    s.textContent = `
      @keyframes dialogFadeIn { from { opacity: 0 } to { opacity: 1 } }
      @keyframes dialogPopIn { from { transform: scale(0.95); opacity: 0 } to { transform: scale(1); opacity: 1 } }
    `;
    document.head.appendChild(s);
  }
}
