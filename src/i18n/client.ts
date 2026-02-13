/** biome-ignore-all lint/correctness/useHookAtTopLevel: <explanation> */
'use client'

import { Language } from '@interfaces/index'
import { useEffect, useState } from 'react'
import { useCookies } from 'react-cookie'
import { useTranslation as useTranslationOrg } from 'react-i18next'
import { cookieName } from './settings'

const runsOnServerSide = typeof window === 'undefined'

export function useSwitchLanguage(lng: Language, ns: string, options?: any) {
  const [cookies, setCookie] = useCookies([cookieName])
  const ret = useTranslationOrg(ns, options)
  const { i18n } = ret
  if (runsOnServerSide && lng && i18n.resolvedLanguage !== lng) {
    i18n.changeLanguage(lng)
  } else {
    const [activeLng, setActiveLng] = useState(i18n.resolvedLanguage)

    useEffect(() => {
      if (activeLng === i18n.resolvedLanguage) return
      setActiveLng(i18n.resolvedLanguage)
    }, [activeLng, i18n.resolvedLanguage])

    useEffect(() => {
      if (!lng || i18n.resolvedLanguage === lng) return
      i18n.changeLanguage(lng)
    }, [lng, i18n])

    useEffect(() => {
      if (cookies['i18next-chronos'] === lng) return
      setCookie(cookieName, lng, { path: '/' })
    }, [lng, cookies['i18next-chronos'], setCookie])
  }
  return ret
}
