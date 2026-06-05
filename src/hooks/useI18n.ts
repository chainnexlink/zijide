import { useState, useEffect, useCallback } from 'react';
import { translations, Language, languages } from '../i18n';

type Translations = typeof translations.zh;

export function useI18n() {
  const getSavedLang = (): Language => {
    try {
      const saved = localStorage.getItem('warrescue-language') as Language;
      if (saved && languages.find(l => l.code === saved)) return saved;
    } catch (e) { /* localStorage 不可用时忽略 */ }
    return 'zh';
  };
  // 初始就读取已保存语言，避免首屏先以 'zh' 渲染、导致"加载时翻译并缓存"的文案被定格成中文
  const [language, setLanguageState] = useState<Language>(getSavedLang);
  const [dir, setDir] = useState<'ltr' | 'rtl'>(() => languages.find(l => l.code === getSavedLang())?.dir || 'ltr');

  useEffect(() => {
    const saved = getSavedLang();
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
