import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import AddressPinMap from './AddressPinMap'

interface Draft {
  address?: string
  latitude?: number
  longitude?: number
}

export type SharePinPayload = { latitude: number; longitude: number; address?: string }

export default function AddressFields<T extends Draft>({
  draft,
  editing,
  setDraft,
  mapVariant = 'contact',
  sharePinAction
}: {
  draft: Partial<T> & Draft
  editing: boolean
  setDraft: Dispatch<SetStateAction<Partial<T> | null>>
  mapVariant?: 'contact' | 'company'
  /** Adds a control next to the coordinate summary to start another record at the same pin. */
  sharePinAction?: { label: string; title?: string; onClick: (p: SharePinPayload) => void }
}): React.ReactElement {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [latText, setLatText] = useState('')
  const [lonText, setLonText] = useState('')
  const latTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const lonTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    setLatText(
      draft.latitude != null && Number.isFinite(draft.latitude) ? String(draft.latitude) : ''
    )
  }, [draft.latitude])

  useEffect(() => {
    setLonText(
      draft.longitude != null && Number.isFinite(draft.longitude) ? String(draft.longitude) : ''
    )
  }, [draft.longitude])

  useEffect(() => {
    return () => {
      clearTimeout(latTimer.current)
      clearTimeout(lonTimer.current)
    }
  }, [])

  const geocode = useCallback(async () => {
    const line = (draft.address ?? '').trim()
    if (!line) {
      setErr('Enter an address first.')
      return
    }
    setBusy(true)
    setErr(null)
    try {
      const r = await window.book.geocodeSearch(line)
      if (!r) {
        setErr('No results. Try a fuller address.')
        return
      }
      setDraft((d) => (d ? { ...d, latitude: r.lat, longitude: r.lon } : d))
    } catch {
      setErr('Lookup failed. Try again in a moment.')
    } finally {
      setBusy(false)
    }
  }, [draft.address, setDraft])

  const clearPin = useCallback(() => {
    setErr(null)
    setDraft((d) => (d ? { ...d, latitude: undefined, longitude: undefined } : d))
  }, [setDraft])

  const hasPin =
    draft.latitude != null &&
    draft.longitude != null &&
    Number.isFinite(draft.latitude) &&
    Number.isFinite(draft.longitude)

  const parseCoord = (raw: string): number | undefined => {
    const t = raw.trim()
    if (t === '' || t === '-' || t === '.' || t === '-.') return undefined
    if (/^-?\d+\.$/.test(t)) return undefined
    const n = parseFloat(t)
    return Number.isFinite(n) ? n : undefined
  }

  const pushLatToDraft = useCallback(
    (text: string) => {
      const t = text.trim()
      const v = parseCoord(text)
      setDraft((d) => {
        if (!d) return d
        if (t === '') return { ...d, latitude: undefined }
        if (v !== undefined) return { ...d, latitude: v }
        return d
      })
    },
    [setDraft]
  )

  const pushLonToDraft = useCallback(
    (text: string) => {
      const t = text.trim()
      const v = parseCoord(text)
      setDraft((d) => {
        if (!d) return d
        if (t === '') return { ...d, longitude: undefined }
        if (v !== undefined) return { ...d, longitude: v }
        return d
      })
    },
    [setDraft]
  )

  return (
    <div>
      <label className="field-label" htmlFor="addr-line">
        Address (for map)
      </label>
      <input
        id="addr-line"
        className="text-input focus-ring"
        disabled={!editing}
        placeholder="Street, city, region"
        value={draft.address ?? ''}
        onChange={(e) => editing && setDraft((d) => (d ? { ...d, address: e.target.value } : d))}
      />
      {editing && (
        <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <button type="button" className="btn btn-ghost focus-ring" disabled={busy} onClick={() => void geocode()}>
            {busy ? 'Looking up…' : 'Place on map'}
          </button>
          {hasPin && (
            <button type="button" className="btn btn-ghost focus-ring" disabled={busy} onClick={clearPin}>
              Clear pin
            </button>
          )}
        </div>
      )}
      {editing && (
        <div className="form-row-2 address-pin-row">
          <div>
            <label className="field-label" htmlFor="addr-lat">
              Latitude
            </label>
            <input
              id="addr-lat"
              type="text"
              inputMode="decimal"
              className="text-input focus-ring"
              placeholder="e.g. 40.7128"
              autoComplete="off"
              value={latText}
              onChange={(e) => {
                if (!editing) return
                const t = e.target.value
                setLatText(t)
                clearTimeout(latTimer.current)
                latTimer.current = setTimeout(() => pushLatToDraft(t), 200)
              }}
              onBlur={() => {
                clearTimeout(latTimer.current)
                pushLatToDraft(latText)
              }}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="addr-lon">
              Longitude
            </label>
            <input
              id="addr-lon"
              type="text"
              inputMode="decimal"
              placeholder="e.g. -74.0060"
              autoComplete="off"
              className="text-input focus-ring"
              value={lonText}
              onChange={(e) => {
                if (!editing) return
                const t = e.target.value
                setLonText(t)
                clearTimeout(lonTimer.current)
                lonTimer.current = setTimeout(() => pushLonToDraft(t), 200)
              }}
              onBlur={() => {
                clearTimeout(lonTimer.current)
                pushLonToDraft(lonText)
              }}
            />
          </div>
        </div>
      )}
      {editing && (
        <p className="muted small address-pin-hint">
          Use Place on map from the address line, edit latitude and longitude if you want, or drag the pin on the preview map
          below.
        </p>
      )}
      {err && (
        <p className="small" style={{ marginTop: 8, color: 'var(--danger)' }}>
          {err}
        </p>
      )}
      {hasPin && (
        <div className="address-pin-coords-row">
          <p className="muted small address-pin-coords-text">
            {!editing ? 'Map pin' : 'Pin set'}: {draft.latitude!.toFixed(5)}, {draft.longitude!.toFixed(5)}
          </p>
          {sharePinAction && (
            <button
              type="button"
              className="btn btn-ghost address-pin-share-btn focus-ring"
              title={sharePinAction.title}
              onClick={() =>
                sharePinAction.onClick({
                  latitude: draft.latitude!,
                  longitude: draft.longitude!,
                  address: draft.address
                })
              }
            >
              {sharePinAction.label}
            </button>
          )}
        </div>
      )}
      {hasPin && (
        <AddressPinMap
          latitude={draft.latitude!}
          longitude={draft.longitude!}
          draggable={editing}
          variant={mapVariant}
          onDragEnd={
            editing
              ? (lat, lon) => setDraft((d) => (d ? { ...d, latitude: lat, longitude: lon } : d))
              : undefined
          }
        />
      )}
      {!editing && !hasPin && (draft.address ?? '').trim() && (
        <p className="muted small" style={{ marginTop: 8, marginBottom: 0 }}>
          No coordinates yet. Edit and use Place on map.
        </p>
      )}
    </div>
  )
}
