export const LOCALE_CATALOG = {
  ru: { name: 'Русский', file: 'ru.json' },
  en: { name: 'English', file: 'en.json' },
} as const

export type LocaleCode = keyof typeof LOCALE_CATALOG

export const DEFAULT_LOCALE_CODES: LocaleCode[] = ['ru', 'en']

export function parseLocaleCodesFromEnv(raw = process.env.NUXT_PUBLIC_LOCALES): LocaleCode[] {
  const fallback = [...DEFAULT_LOCALE_CODES]
  if (!raw?.trim()) {
    return fallback
  }

  let codes: string[]
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) {
      return fallback
    }
    codes = parsed.map(String)
  }
  catch {
    codes = raw.split(',').map((part) => part.trim())
  }

  const valid = codes.filter((code): code is LocaleCode => code in LOCALE_CATALOG)
  return valid.length > 0 ? valid : fallback
}

export function resolveDefaultLocale(
  codes: LocaleCode[],
  raw = process.env.NUXT_PUBLIC_DEFAULT_LOCALE,
): LocaleCode {
  const candidate = raw?.trim()
  if (candidate && codes.includes(candidate as LocaleCode)) {
    return candidate as LocaleCode
  }
  return codes[0]!
}

export function buildI18nLocales(codes: LocaleCode[]) {
  return codes.map((code) => ({
    code,
    name: LOCALE_CATALOG[code].name,
    file: LOCALE_CATALOG[code].file,
  }))
}
