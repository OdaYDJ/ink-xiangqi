import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { STRINGS, type Locale, type Strings } from './strings'

interface LocaleValue {
  locale: Locale
  t: Strings
  setLocale: (l: Locale) => void
  toggleLocale: () => void
}

const LocaleContext = createContext<LocaleValue | null>(null)

const STORAGE_KEY = 'ink.lang'

function initialLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'en' || saved === 'zh') return saved
  } catch {
    /* storage unavailable */
  }
  const url = new URLSearchParams(window.location.search).get('lang')
  if (url === 'en' || url === 'zh') return url
  return navigator.language?.toLowerCase().startsWith('zh') ? 'zh' : 'en'
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale)

  useEffect(() => {
    document.documentElement.lang = STRINGS[locale].htmlLang
    document.title = locale === 'zh' ? '象奇 · Chess Unbound' : '象奇 · Chess Unbound'
  }, [locale])

  const setLocale = (l: Locale) => {
    try {
      localStorage.setItem(STORAGE_KEY, l)
    } catch {
      /* preference just won't persist */
    }
    setLocaleState(l)
  }

  const value: LocaleValue = {
    locale,
    t: STRINGS[locale],
    setLocale,
    toggleLocale: () => setLocale(locale === 'en' ? 'zh' : 'en'),
  }
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale(): LocaleValue {
  const v = useContext(LocaleContext)
  if (!v) throw new Error('useLocale must be used inside <LocaleProvider>')
  return v
}
