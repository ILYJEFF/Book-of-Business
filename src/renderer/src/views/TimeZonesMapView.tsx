import { useEffect, useMemo, useState } from 'react'
import { US_STATE_COUNT, US_STATE_TILES } from '../lib/usStatesTileMapData'

function formatStateClock(iana: string, date: Date): { time: string; day: string } {
  try {
    const time = new Intl.DateTimeFormat(undefined, {
      timeZone: iana,
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit'
    }).format(date)
    const day = new Intl.DateTimeFormat(undefined, {
      timeZone: iana,
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    }).format(date)
    return { time, day }
  } catch {
    return { time: '?', day: '' }
  }
}

export default function TimeZonesMapView(): React.ReactElement {
  const [now, setNow] = useState(() => new Date())
  const [query, setQuery] = useState('')

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const localLabel = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'Local'
    } catch {
      return 'Local'
    }
  }, [])

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const sorted = [...US_STATE_TILES].sort((a, b) => a.name.localeCompare(b.name))
    if (!q) return sorted
    return sorted.filter((s) => {
      const blob = `${s.name} ${s.abbr} ${s.iana}`.toLowerCase()
      return blob.includes(q)
    })
  }, [query])

  return (
    <div className="tz-map-view">
      <header className="tz-map-view-header">
        <p className="folio-kicker">Reference</p>
        <h1 className="tz-map-view-title">US time zones list</h1>
        <p className="tz-map-view-lead muted small">
          Search all <strong>{US_STATE_COUNT} states</strong>. Each row shows the live local time for the state's
          capital city zone. Your device reports <strong>{localLabel}</strong>.
        </p>
      </header>

      <div className="tz-list-toolbar">
        <input
          type="search"
          className="text-input focus-ring tz-list-search"
          placeholder="Search state, code, or zone (e.g. Texas, TX, Chicago)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search time zone list"
        />
        <span className="muted small tz-list-count">
          {rows.length} shown
        </span>
      </div>

      <div className="tz-list-panel scroll-y" role="list" aria-label="United States time zones by state">
        {rows.map((s) => {
          const { time, day } = formatStateClock(s.iana, now)
          return (
            <article key={s.abbr} className="tz-list-row" role="listitem">
              <div className="tz-list-state">
                <span className="tz-list-abbr">{s.abbr}</span>
                <span>{s.name}</span>
              </div>
              <time className="tz-list-time" dateTime={now.toISOString()}>
                {time}
              </time>
              <div className="tz-list-meta muted">
                <span>{day}</span>
                <span>{s.iana}</span>
              </div>
            </article>
          )
        })}
        {rows.length === 0 && (
          <div className="list-empty tz-list-empty">
            <p className="list-empty-title">No states match</p>
            <p className="list-empty-text">Try a broader search term.</p>
          </div>
        )}
      </div>

      <p className="muted small tz-map-footnote">
        Idaho, Oregon, Florida, Texas, and others span more than one official zone. Here you see the capital&apos;s
        zone only. Arizona (Phoenix) does not observe daylight saving time.
      </p>
    </div>
  )
}
