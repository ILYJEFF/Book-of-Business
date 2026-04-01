import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import type { GeocodeResult } from '../../../shared/types'
import { timeZoneFromCoordinates } from '../lib/geoTimeZone'
import AddressPinMap from './AddressPinMap'

function suggestionLine(r: GeocodeResult): string {
  const f = r.formattedAddress?.trim()
  if (f) return f
  return r.displayName.trim()
}

/** Loose compare for "your line vs suggestion" messaging */
function addressesLooselyMatch(a: string, b: string): boolean {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
  return norm(a) === norm(b)
}

interface Draft {
  address?: string
  latitude?: number
  longitude?: number
  timeZone?: string
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
  const [verify, setVerify] = useState<{
    userInput: string
    result: GeocodeResult
    suggestion: string
  } | null>(null)
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
      setVerify({ userInput: line, result: r, suggestion: suggestionLine(r) })
    } catch {
      setErr('Lookup failed. Try again in a moment.')
    } finally {
      setBusy(false)
    }
  }, [draft.address])

  const applyVerifyUseSuggestion = useCallback(() => {
    if (!verify) return
    const { result, suggestion } = verify
    setDraft((d) => {
      if (!d) return d
      const tz = timeZoneFromCoordinates(result.lat, result.lon)
      return {
        ...d,
        address: suggestion,
        latitude: result.lat,
        longitude: result.lon,
        ...(tz ? { timeZone: tz } : {})
      }
    })
    setVerify(null)
  }, [verify, setDraft])

  const applyVerifyKeepWording = useCallback(() => {
    if (!verify) return
    const { result } = verify
    setDraft((d) => {
      if (!d) return d
      const tz = timeZoneFromCoordinates(result.lat, result.lon)
      return { ...d, latitude: result.lat, longitude: result.lon, ...(tz ? { timeZone: tz } : {}) }
    })
    setVerify(null)
  }, [verify, setDraft])

  const dismissVerify = useCallback(() => {
    setVerify(null)
  }, [])

  const clearPin = useCallback(() => {
    setErr(null)
    setDraft((d) => (d ? { ...d, latitude: undefined, longitude: undefined, timeZone: undefined } : d))
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
            {busy ? 'Looking up…' : 'Verify & place on map'}
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
          Verify &amp; place on map looks up your line (OpenStreetMap), shows a suggested address, and asks you to confirm
          before setting coordinates. It is not postal-service certification. You can still edit lat/long or drag the pin.
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
              ? (lat, lon) =>
                  setDraft((d) => {
                    if (!d) return d
                    const tz = timeZoneFromCoordinates(lat, lon)
                    return { ...d, latitude: lat, longitude: lon, ...(tz ? { timeZone: tz } : {}) }
                  })
              : undefined
          }
        />
      )}
      {!editing && !hasPin && (draft.address ?? '').trim() && (
        <p className="muted small" style={{ marginTop: 8, marginBottom: 0 }}>
          No coordinates yet. Edit and use Verify &amp; place on map.
        </p>
      )}

      {verify && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="addr-verify-title"
          onClick={(e) => e.target === e.currentTarget && dismissVerify()}
        >
          <div className="modal-panel modal-panel--geocode">
            <h3 id="addr-verify-title" className="address-verify-title">
              Confirm this address
            </h3>
            <p className="muted small address-verify-lead">
              We found a location on the map. Choose whether to keep your wording or use the suggested line. Suggestions
              come from OpenStreetMap (community map data), not the post office.
            </p>
            {addressesLooselyMatch(verify.userInput, verify.suggestion) ? (
              <p className="address-verify-match-note">Your text closely matches the suggestion.</p>
            ) : null}
            <div className="address-verify-compare">
              <div className="address-verify-box">
                <div className="address-verify-box-label">You entered</div>
                <div>{verify.userInput}</div>
              </div>
              <div className="address-verify-box address-verify-box--suggested">
                <div className="address-verify-box-label">Suggested</div>
                <div>{verify.suggestion}</div>
              </div>
            </div>
            <div className="address-verify-actions">
              <button type="button" className="btn btn-primary focus-ring" onClick={applyVerifyUseSuggestion}>
                Use suggested &amp; set pin
              </button>
              <button type="button" className="btn btn-ghost focus-ring" onClick={applyVerifyKeepWording}>
                Keep my wording, set pin only
              </button>
              <button type="button" className="btn btn-ghost focus-ring" onClick={dismissVerify}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
