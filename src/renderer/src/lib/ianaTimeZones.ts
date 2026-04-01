/** Fallback when `Intl.supportedValuesOf` is unavailable (older runtimes). */
const FALLBACK_IANA_ZONES: string[] = [
  'Africa/Cairo',
  'Africa/Johannesburg',
  'America/Anchorage',
  'America/Boise',
  'America/Chicago',
  'America/Denver',
  'America/Halifax',
  'America/Los_Angeles',
  'America/Mexico_City',
  'America/New_York',
  'America/Phoenix',
  'America/Sao_Paulo',
  'America/St_Johns',
  'America/Toronto',
  'Asia/Dubai',
  'Asia/Hong_Kong',
  'Asia/Kolkata',
  'Asia/Shanghai',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Melbourne',
  'Australia/Sydney',
  'Europe/Amsterdam',
  'Europe/Berlin',
  'Europe/London',
  'Europe/Madrid',
  'Europe/Paris',
  'Europe/Zurich',
  'Pacific/Auckland',
  'Pacific/Honolulu'
]

let cache: string[] | null = null

export function listIanaTimeZones(): string[] {
  if (cache) return cache
  try {
    const fn = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf
    if (typeof fn === 'function') {
      const raw = fn.call(Intl, 'timeZone')
      if (Array.isArray(raw) && raw.length > 0) {
        cache = [...raw].sort((a, b) => a.localeCompare(b))
        return cache
      }
    }
  } catch {
    /* ignore */
  }
  cache = [...FALLBACK_IANA_ZONES].sort((a, b) => a.localeCompare(b))
  return cache
}
