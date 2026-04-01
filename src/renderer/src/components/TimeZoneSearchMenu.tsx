import { useEffect, useMemo, useRef, useState } from 'react'
import { listIanaTimeZones } from '../lib/ianaTimeZones'

export default function TimeZoneSearchMenu({
  id,
  value,
  onChange
}: {
  id: string
  value: string | undefined
  onChange: (next: string | undefined) => void
}): React.ReactElement {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const wrapRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  useEffect(() => {
    if (open) {
      setQ('')
      window.setTimeout(() => searchRef.current?.focus(), 0)
    }
  }, [open])

  const all = useMemo(() => listIanaTimeZones(), [])
  const cur = (value ?? '').trim()

  const orphan = useMemo(() => {
    if (!cur) return null
    return all.includes(cur) ? null : cur
  }, [cur, all])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return all
    return all.filter((z) => z.toLowerCase().includes(needle))
  }, [all, q])

  const summary = cur || 'Not set (optional)'
  const unspecified = !cur

  const pick = (next: string | undefined) => {
    onChange(next)
    setOpen(false)
  }

  const listboxId = `${id}-listbox`

  return (
    <div ref={wrapRef} className="dept-menu-wrap tz-menu-wrap">
      <button
        type="button"
        id={id}
        className="dept-menu-trigger focus-ring"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false)
        }}
      >
        <span className={unspecified ? 'dept-menu-summary dept-menu-summary--placeholder' : 'dept-menu-summary'}>
          {summary}
        </span>
        <span className="dept-menu-chevron" aria-hidden>
          ▾
        </span>
      </button>
      {open && (
        <div id={listboxId} className="dept-menu-panel tz-menu-panel" role="listbox">
          <div className="tz-menu-search-row">
            <input
              ref={searchRef}
              type="search"
              className="text-input focus-ring tz-menu-search"
              placeholder="Search zones…"
              value={q}
              aria-label="Filter time zones"
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.stopPropagation()
                  setOpen(false)
                }
              }}
            />
          </div>
          <div className="tz-menu-scroll scroll-y">
            <button
              type="button"
              role="option"
              aria-selected={unspecified}
              className={`dept-menu-hit focus-ring${unspecified ? ' dept-menu-hit--active' : ''}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(undefined)}
            >
              Not set
            </button>
            {orphan && (
              <button
                type="button"
                role="option"
                aria-selected={cur === orphan}
                className={`dept-menu-hit focus-ring${cur === orphan ? ' dept-menu-hit--active' : ''}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(orphan)}
              >
                {orphan}
                <span className="tz-menu-orphan-note"> (current)</span>
              </button>
            )}
            {filtered.slice(0, 400).map((z) => {
              const on = cur === z
              return (
                <button
                  key={z}
                  type="button"
                  role="option"
                  aria-selected={on}
                  className={`dept-menu-hit focus-ring${on ? ' dept-menu-hit--active' : ''}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(z)}
                >
                  {z}
                </button>
              )
            })}
            {filtered.length > 400 && (
              <p className="muted small tz-menu-cap">Refine search to see more matches.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
