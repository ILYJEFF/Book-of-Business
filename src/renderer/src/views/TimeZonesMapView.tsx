import { useEffect, useMemo, useState } from 'react'
import { US_STATE_TILES, tileZoneClass } from '../lib/usStatesTileMapData'

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

  return (
    <div className="tz-map-view">
      <header className="tz-map-view-header">
        <p className="folio-kicker">Reference</p>
        <h1 className="tz-map-view-title">US state clocks</h1>
        <p className="tz-map-view-lead muted small">
          All fifty states on an equal-area tile map. Each clock uses the{' '}
          <strong>capital city</strong> time zone. Your device reports <strong>{localLabel}</strong>.
        </p>
      </header>

      <div className="tz-state-map-scroll scroll-x">
        <div className="tz-state-grid" role="list" aria-label="United States: local time by state">
          {US_STATE_TILES.map((s) => {
            const { time, day } = formatStateClock(s.iana, now)
            const zc = tileZoneClass(s.iana)
            return (
              <article
                key={s.abbr}
                className={`tz-state-tile ${zc}`}
                role="listitem"
                style={{ gridColumn: s.col + 1, gridRow: s.row + 1 }}
                title={`${s.name}: ${s.iana}`}
              >
                <span className="tz-state-abbr">{s.abbr}</span>
                <span className="tz-state-name muted">{s.name}</span>
                <time className="tz-state-time" dateTime={now.toISOString()}>
                  {time}
                </time>
                {day ? <span className="tz-state-day muted">{day}</span> : null}
              </article>
            )
          })}
        </div>
      </div>

      <p className="muted small tz-map-footnote">
        Idaho, Oregon, Florida, Texas, and others span more than one official zone. Here you see the capital&apos;s
        zone only. Arizona (Phoenix) does not observe daylight saving time.
      </p>
    </div>
  )
}
