import { useCallback, useState, type Dispatch, type SetStateAction } from 'react'

interface Draft {
  address?: string
  latitude?: number
  longitude?: number
}

export default function AddressFields<T extends Draft>({
  draft,
  editing,
  setDraft
}: {
  draft: Partial<T> & Draft
  editing: boolean
  setDraft: Dispatch<SetStateAction<Partial<T> | null>>
}): React.ReactElement {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

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
      {err && (
        <p className="small" style={{ marginTop: 8, color: 'var(--danger)' }}>
          {err}
        </p>
      )}
      {hasPin && (
        <p className="muted small" style={{ marginTop: 10, marginBottom: 0 }}>
          Map: {draft.latitude!.toFixed(5)}, {draft.longitude!.toFixed(5)}
        </p>
      )}
      {!editing && !hasPin && (draft.address ?? '').trim() && (
        <p className="muted small" style={{ marginTop: 8, marginBottom: 0 }}>
          No coordinates yet. Edit and use Place on map.
        </p>
      )}
    </div>
  )
}
