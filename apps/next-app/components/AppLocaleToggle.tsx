'use client';

import { type CSSProperties } from 'react';
import { useLocale } from '@/lib/i18n';

const btnStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: '2.25rem',
  minHeight: '2.25rem',
  padding: 0,
  border: 'none',
  background: 'transparent',
  color: 'hsl(var(--muted-foreground))',
  cursor: 'pointer',
  borderRadius: '0.375rem',
  fontSize: '0.85rem',
  fontWeight: 600,
};

export default function AppLocaleToggle() {
  const { locale, setLocale, t } = useLocale();
  return (
    <button
      type="button"
      aria-label={t('language')}
      title={t('language')}
      onClick={() => setLocale(locale === 'zh-CN' ? 'en' : 'zh-CN')}
      style={btnStyle}
    >
      {locale === 'zh-CN' ? 'EN' : '中'}
    </button>
  );
}
