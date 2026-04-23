import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import { translations } from '../i18n/translations'

const LanguageContext = createContext({ lang: 'en', t: k => k })

export function LanguageProvider({ children }) {
  const { user } = useAuth()
  const [lang, setLang] = useState('en')

  useEffect(() => {
    if (!user?.id) return
    supabase
      .from('profiles')
      .select('preferred_language')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        const l = data?.preferred_language
        if (l === 'es' || l === 'en') setLang(l)
      })
  }, [user?.id])

  // t(key) — returns the translated string, falls back to English
  function t(key) {
    return translations[lang]?.[key] ?? translations.en[key] ?? key
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLang() {
  return useContext(LanguageContext)
}
