import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react'

const BLUR_MS = 160

/**
 * Single-select searchable field for filter rails. Replaces a long native `<select>`.
 */
export default function FilterCombobox({
  id,
  label,
  placeholder,
  value,
  onChange,
  options,
  maxResults = 14,
  /** When options exceed this count, the list stays empty until the user types (long lists stay searchable). */
  typeaheadThreshold = 14,
  listboxId
}: {
  id: string
  label: string
  placeholder: string
  value: string
  onChange: (id: string) => void
  options: { id: string; label: string }[]
  maxResults?: number
  typeaheadThreshold?: number
  listboxId: string
}): ReactElement {
  const wrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const skipBlurClearRef = useRef(false)
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')

  const selectedLabel = useMemo(() => options.find((o) => o.id === value)?.label ?? '', [options, value])

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const long = options.length > typeaheadThreshold
    if (!needle) {
      if (long) return []
      return options.slice(0, maxResults)
    }
    return options.filter((o) => o.label.toLowerCase().includes(needle)).slice(0, maxResults)
  }, [options, q, maxResults, typeaheadThreshold])

  const displayValue = open ? q : selectedLabel

  const pick = (id: string) => {
    skipBlurClearRef.current = true
    onChange(id)
    setOpen(false)
    setQ('')
    inputRef.current?.blur()
  }

  const clear = () => {
    skipBlurClearRef.current = true
    onChange('')
    setQ('')
    setOpen(false)
    inputRef.current?.focus()
  }

  return (
    <div ref={wrapRef} className="filter-combo">
      <label className="filter-refine-label" htmlFor={id}>
        {label}
      </label>
      <div className="filter-combo-inner">
        <div className="search-wrap filter-combo-search-wrap">
          <input
            ref={inputRef}
            id={id}
            type="search"
            autoComplete="off"
            spellCheck={false}
            role="combobox"
            aria-expanded={open}
            aria-controls={listboxId}
            aria-autocomplete="list"
            className="search-input search-input--filter focus-ring"
            placeholder={placeholder}
            value={displayValue}
            onChange={(e) => {
              setQ(e.target.value)
              setOpen(true)
            }}
            onFocus={() => {
              setOpen(true)
              setQ(selectedLabel)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault()
                setOpen(false)
                setQ('')
                inputRef.current?.blur()
              }
              if (e.key === 'Enter' && open && filtered.length > 0) {
                e.preventDefault()
                pick(filtered[0].id)
              }
            }}
            onBlur={() => {
              window.setTimeout(() => {
                setOpen(false)
                const skip = skipBlurClearRef.current
                skipBlurClearRef.current = false
                if (!skip && q.trim() === '' && value) onChange('')
                setQ('')
              }, BLUR_MS)
            }}
          />
        </div>
        {value ? (
          <button
            type="button"
            className="filter-combo-clear focus-ring"
            aria-label={`Clear ${label}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={clear}
          >
            ×
          </button>
        ) : null}
      </div>
      {open && (
        <div id={listboxId} className="filter-combo-panel scroll-y" role="listbox">
          {filtered.length === 0 && q.trim() === '' && options.length > typeaheadThreshold ? (
            <div className="filter-combo-empty muted small">Type to search this list.</div>
          ) : filtered.length === 0 ? (
            <div className="filter-combo-empty muted small">No matches. Try another spelling.</div>
          ) : (
            filtered.map((o) => (
              <button
                key={o.id}
                type="button"
                role="option"
                aria-selected={o.id === value}
                className={`filter-combo-hit focus-ring${o.id === value ? ' filter-combo-hit--active' : ''}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(o.id)}
              >
                {o.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
