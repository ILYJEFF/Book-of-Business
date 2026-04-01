import { useEffect, useMemo, useState } from 'react'

const US_ZONE_STRIP: { iana: string; title: string; subtitle: string; bandClass: string }[] = [
  { iana: 'America/Honolulu', title: 'Hawaii', subtitle: 'HST', bandClass: 'tz-map-band--pacific' },
  { iana: 'America/Anchorage', title: 'Alaska', subtitle: 'AK', bandClass: 'tz-map-band--alaska' },
  { iana: 'America/Los_Angeles', title: 'Pacific', subtitle: 'PT', bandClass: 'tz-map-band--pt' },
  { iana: 'America/Denver', title: 'Mountain', subtitle: 'MT', bandClass: 'tz-map-band--mt' },
  { iana: 'America/Phoenix', title: 'Arizona', subtitle: 'no DST', bandClass: 'tz-map-band--az' },
  { iana: 'America/Chicago', title: 'Central', subtitle: 'CT', bandClass: 'tz-map-band--ct' },
  { iana: 'America/New_York', title: 'Eastern', subtitle: 'ET', bandClass: 'tz-map-band--et' },
  { iana: 'America/Puerto_Rico', title: 'Atlantic', subtitle: 'PR & VI', bandClass: 'tz-map-band--atl' }
]

function formatBandTime(iana: string, date: Date): { time: string; dateLine: string } {
  try {
    const time = new Intl.DateTimeFormat(undefined, {
      timeZone: iana,
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit'
    }).format(date)
    const dateLine = new Intl.DateTimeFormat(undefined, {
      timeZone: iana,
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    }).format(date)
    return { time, dateLine }
  } catch {
    return { time: '?', dateLine: '' }
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
        <h1 className="tz-map-view-title">US time zones</h1>
        <p className="tz-map-view-lead muted small">
          Strip map of major US zones with live clocks. Your system reports <strong>{localLabel}</strong> as this device&apos;s
          zone.
        </p>
      </header>

      <div className="tz-map-strip" role="list" aria-label="United States time zones west to east">
        {US_ZONE_STRIP.map((z) => {
          const { time, dateLine } = formatBandTime(z.iana, now)
          return (
            <article key={z.iana} className={`tz-map-band ${z.bandClass}`} role="listitem">
              <div className="tz-map-band-top">
                <span className="tz-map-band-title">{z.title}</span>
                <span className="tz-map-band-sub muted">{z.subtitle}</span>
              </div>
              <time className="tz-map-band-time" dateTime={now.toISOString()}>
                {time}
              </time>
              {dateLine ? <p className="tz-map-band-date muted small">{dateLine}</p> : null}
              <p className="tz-map-band-iana small">{z.iana}</p>
            </article>
          )
        })}
      </div>

      <p className="muted small tz-map-footnote">
        Boundaries on the ground are irregular; this is a quick visual, not legal or civic truth. Arizona and other
        exceptions use real IANA ids above.
      </p>
    </div>
  )
}
