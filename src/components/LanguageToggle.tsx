import { useLocale } from '../i18n/locale'

/** Switches between the English and Chinese versions. Labelled in the language it switches to. */
export default function LanguageToggle({ className = '' }: { className?: string }) {
  const { locale, t, toggleLocale } = useLocale()
  return (
    <button
      type="button"
      className={`quiet-button language-toggle ${className}`}
      onClick={toggleLocale}
      lang={locale === 'en' ? 'zh-Hant' : 'en'}
      aria-label={t.switchLanguageLabel}
    >
      {t.switchLanguage}
    </button>
  )
}
