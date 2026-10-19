import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import en from '../locales/en.json';
import ar from '../locales/ar.json';
import { ApiError } from '../api/client';

export type TranslationKey = keyof typeof en;
export function useI18n() {
  const [params, setParams] = useSearchParams();
  const locale = params.get('lang') === 'ar' ? 'ar' : 'en';
  const dictionary: Record<TranslationKey, string> = locale === 'ar' ? ar : en;
  useEffect(() => { document.documentElement.lang = locale; document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr'; }, [locale]);
  const t = (key: TranslationKey, variables: Record<string, string | number> = {}) => dictionary[key].replace(/\{(\w+)\}/g, (_, name) => String(variables[name] ?? ''));
  const href = (path: string) => `${path}${path.includes('?') ? '&' : '?'}lang=${locale}`;
  const formatLocale = locale === 'ar' ? 'ar-SA' : 'en-SA';
  return {
    locale, t, href,
    toggle: () => { const next = new URLSearchParams(params); next.set('lang', locale === 'en' ? 'ar' : 'en'); setParams(next, { replace: true }); },
    number: (value: number) => new Intl.NumberFormat(formatLocale).format(value),
    money: (minor: number) => new Intl.NumberFormat(formatLocale, { style: 'currency', currency: 'SAR' }).format(minor / 100),
    time: (date: string) => new Intl.DateTimeFormat(formatLocale, { timeZone: 'Asia/Riyadh', hour: '2-digit', minute: '2-digit' }).format(new Date(date)),
    date: (date: string, time = false) => new Intl.DateTimeFormat(formatLocale, { timeZone: 'Asia/Riyadh', year: 'numeric', month: 'short', day: 'numeric', ...(time ? { hour: '2-digit', minute: '2-digit' } : {}) }).format(new Date(date)),
    errorText: (error: unknown) => {
      const key = `err_${error instanceof ApiError ? error.code : 'INTERNAL_ERROR'}`;
      return dictionary[key as TranslationKey] ?? dictionary.err_INTERNAL_ERROR;
    },
  };
}
