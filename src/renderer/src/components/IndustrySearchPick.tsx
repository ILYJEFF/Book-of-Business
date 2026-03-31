import { useEffect, useMemo, useRef, useState } from 'react'
import type { Industry } from '../../../shared/types'
import { industryPathLabel } from '../lib/format'

const MAX_RESULTS = 14

export default function IndustrySearchPick({
  label,
  emptyLibrary,
  industries,
  industryMap,
  selectedIds,
  disabled,
  onAdd,
  onRemove,
  maxSelected
}: {
  label: string
  emptyLibrary: string
  industries: Industry[]
  industryMap: Map<string, Industry>
  selectedIds: string[]
  disabled: boolean
  onAdd: (id: string) => void
  onRemove: (id: string) => void
  /** When `1`, behaves as a single industry (company form). Omit for multi-select (contacts). */
  maxSelected?: number
}): React.ReactElement {
  const single = maxSelected === 1
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])

  const suggestions = useMemo(() => {
    const available = industries.filter((i) => !selectedSet.has(i.id))
    const needle = q.trim().toLowerCase()
    if (!needle) return []
    const hits = available.filter((i) => {
      const path = industryPathLabel(industryMap, i.id).toLowerCase()
      return path.includes(needle) || i.name.toLowerCase().includes(needle)
    })
    hits.sort((a, b) =>
      industryPathLabel(industryMap, a.id).localeCompare(industryPathLabel(industryMap, b.id))
    )
    return hits.slice(0, MAX_RESULTS)
  }, [industries, industryMap, q, selectedSet])

  const pick = (id: string) => {
    onAdd(id)
    setQ('')
    setOpen(false)
    inputRef.current?.focus()
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false)
      return
    }
    if (e.key === 'Enter' && suggestions.length > 0) {
      e.preventDefault()
      pick(suggestions[0].id)
    }
  }

  if (industries.length === 0) {
    return (
      <div>
        <span className="field-label">{label}</span>
        <div className="muted small">{emptyLibrary}</div>
      </div>
    )
  }

  return (
    <div ref={wrapRef} className="industry-search">
      <span className="field-label">{label}</span>

      {selectedIds.length > 0 && (
        <ul className="industry-search-chips" aria-label={single ? 'Selected industry' : 'Selected industries'}>
          {selectedIds.map((id) => (
            <li key={id} className="industry-search-chip">
              <span className="industry-search-chip-label">{industryPathLabel(industryMap, id)}</span>
              {!disabled && (
                <button
                  type="button"
                  className="industry-search-chip-remove focus-ring"
                  aria-label={`Remove ${industryPathLabel(industryMap, id)}`}
                  onClick={() => onRemove(id)}
                >
                  ×
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {!disabled && (
        <>
          <div className="industry-search-field">
            <input
              ref={inputRef}
              type="search"
              autoComplete="off"
              spellCheck={false}
              className="industry-search-input focus-ring"
              placeholder="Type to search industries…"
              value={q}
              onChange={(e) => {
                setQ(e.target.value)
                setOpen(true)
              }}
              onFocus={() => setOpen(true)}
              onKeyDown={onKeyDown}
              aria-expanded={open}
              aria-controls="industry-search-results"
              aria-autocomplete="list"
            />
          </div>
          <p className="industry-search-hint muted small">
            Matches on full path (for example Manufacturing · Metal). Enter adds the first result.
          </p>
          {open && q.trim().length > 0 && (
            <div id="industry-search-results" className="industry-search-panel scroll-y" role="listbox">
              {suggestions.length === 0 ? (
                <div className="industry-search-empty muted small">No matches. Try another word.</div>
              ) : (
                suggestions.map((i) => (
                  <button
                    key={i.id}
                    type="button"
                    role="option"
                    className="industry-search-hit focus-ring"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pick(i.id)}
                  >
                    {industryPathLabel(industryMap, i.id)}
                  </button>
                ))
              )}
            </div>
          )}
        </>
      )}

      {disabled && selectedIds.length === 0 && (
        <div className="muted small">{single ? 'No industry linked.' : 'No industries linked.'}</div>
      )}
    </div>
  )
}
