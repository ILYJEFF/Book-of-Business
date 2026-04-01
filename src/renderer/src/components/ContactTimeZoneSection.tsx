import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import type { Contact } from '../../../shared/types'
import { formatTimeInZone, shortZoneLabel } from '../lib/contactTimeZoneDisplay'
import { timeZoneFromCoordinates } from '../lib/geoTimeZone'
import TimeZoneSearchMenu from './TimeZoneSearchMenu'

export default function ContactTimeZoneSection({
  draft,
  editing,
  setDraft
}: {
  draft: Partial<Contact>
  editing: boolean
  setDraft: Dispatch<SetStateAction<Partial<Contact> | null>>
}): React.ReactElement {
  const hasPin =
    draft.latitude != null &&
    draft.longitude != null &&
    Number.isFinite(draft.latitude) &&
    Number.isFinite(draft.longitude)

  const pinTz = useMemo(() => {
    if (!hasPin || draft.latitude == null || draft.longitude == null) return undefined
    return timeZoneFromCoordinates(draft.latitude, draft.longitude)
  }, [hasPin, draft.latitude, draft.longitude])

  const tz = (draft.timeZone ?? '').trim()

  const [, bump] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => bump((n) => n + 1), 30_000)
    return () => window.clearInterval(id)
  }, [])

  const now = useMemo(() => new Date(), [bump])
  const savedClock = tz ? formatTimeInZone(tz, now) : ''
  const pinClock = pinTz ? formatTimeInZone(pinTz, now) : ''

  return (
    <div className="contact-tz-section">
      <label className="field-label" htmlFor="contact-tz-trigger">
        Time zone
      </label>
      {editing ? (
        <>
          <TimeZoneSearchMenu
            id="contact-tz-trigger"
            value={tz || undefined}
            onChange={(next) => setDraft((d) => (d ? { ...d, timeZone: next } : d))}
          />
          {hasPin && (
            <div className="contact-tz-actions">
              <button
                type="button"
                className="btn btn-ghost focus-ring"
                disabled={!pinTz}
                onClick={() => pinTz && setDraft((d) => (d ? { ...d, timeZone: pinTz } : d))}
              >
                Match map pin
              </button>
              {!pinTz && (
                <span className="muted small">Could not infer a zone from these coordinates.</span>
              )}
            </div>
          )}
          <p className="muted small contact-tz-hint">
            Verifying an address or dragging the pin updates the draft zone when lookup succeeds. You can override here.
          </p>
        </>
      ) : (
        <>
          {tz ? (
            <p className="contact-tz-readout">
              <span className="contact-tz-name">{shortZoneLabel(tz)}</span>
              {savedClock ? <span className="contact-tz-clock muted"> · {savedClock}</span> : null}
            </p>
          ) : hasPin && pinTz ? (
            <p className="contact-tz-readout muted">
              Not saved. Pin suggests <span className="contact-tz-name">{shortZoneLabel(pinTz)}</span>
              {pinClock ? <span> · {pinClock}</span> : null}. Edit and save to store a zone.
            </p>
          ) : (
            <p className="contact-tz-readout muted">Not set. Edit to choose a zone or place a map pin.</p>
          )}
          {!tz && !hasPin ? null : tz && pinTz && tz !== pinTz && hasPin ? (
            <p className="muted small contact-tz-pin-hint">
              Pin is in {shortZoneLabel(pinTz)}
              {pinClock ? ` (${pinClock})` : ''}. Saved zone stays until you change it.
            </p>
          ) : null}
        </>
      )}
    </div>
  )
}
