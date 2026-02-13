import { Language } from '@interfaces/index'
export const fallbackLng = Language.TH
export const appLanguages = [fallbackLng, Language.EN]
export const defaultNS = 'common'
export const cookieName = 'i18next-chronos'

export function getOptions(lng = fallbackLng, ns = defaultNS) {
  return {
    // debug: true,
    supportedLngs: appLanguages,
    fallbackLng,
    lng,
    fallbackNS: defaultNS,
    defaultNS,
    ns,
  }
}
