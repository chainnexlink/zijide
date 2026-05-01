import { useState, useEffect, useCallback } from 'react';
import { translations, Language, languages } from '../i18n';

type Translations = typeof translations.zh;

export function useI18n() {
  const [language, setLanguageState] = useState<Language>('zh');
  const [dir, setDir] = useState<'ltr' | 'rtl'>('ltr');

  useEffect(() => {
    const saved = localStorage.getItem('warrescue-language') as Language;
    if (saved && languages.find(l => l.code === saved)) {
      setLanguageState(saved);
      const langInfo = languages.find(l => l.code === saved);
      setDir(langInfo?.dir || 'ltr');
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = dir;
  }, [language, dir]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    const langInfo = languages.find(l => l.code === lang);
    setDir(langInfo?.dir || 'ltr');
    localStorage.setItem('warrescue-language', lang);
  }, []);

  const t = useCallback((key: string): string => {
    const dict = translations[language] as Record<string, string>;
    const fallback = translations.en as Record<string, string>;
    return dict[key] || fallback[key] || key;
  }, [language]);

  return {
    language,
    setLanguage,
    t,
    dir,
    languages,
  };
}
