export function formatTimeInZone(iana: string, date: Date): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      timeZone: iana,
      weekday: 'short',
      hour: 'numeric',
      minute: '2-digit'
    }).format(date)
  } catch {
    return ''
  }
}

/** Short clock label such as "CST" plus the IANA id for clarity. */
export function shortZoneLabel(iana: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: iana,
      timeZoneName: 'short'
    }).formatToParts(dateForZoneLabel(iana))
    const abbr = parts.find((p) => p.type === 'timeZoneName')?.value
    return abbr ? `${abbr} · ${iana}` : iana
  } catch {
    return iana
  }
}

/** Noon UTC often yields a stable abbreviation vs midnight edge cases. */
function dateForZoneLabel(iana: string): Date {
  try {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: iana,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
    const probe = new Date('2024-06-15T12:00:00Z')
    if (fmt.format(probe)) return probe
  } catch {
    /* fall through */
  }
  return new Date()
}
