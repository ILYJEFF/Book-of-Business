import { useEffect, useMemo, useRef, useState } from 'react'
import { BUSINESS_DEPARTMENTS, BUSINESS_DEPARTMENT_SET } from '../lib/businessDepartments'

export default function DepartmentMenu({
  id,
  value,
  onChange
}: {
  id: string
  value: string | undefined
  onChange: (next: string | undefined) => void
}): React.ReactElement {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const cur = (value ?? '').trim()
  const orphan = useMemo(() => {
    if (!cur || BUSINESS_DEPARTMENT_SET.has(cur)) return null
    return cur
  }, [cur])

  const summary = cur || 'Not specified'
  const unspecified = !cur

  const pick = (next: string | undefined) => {
    onChange(next)
    setOpen(false)
  }

  const listboxId = `${id}-listbox`

  return (
    <div ref={wrapRef} className="dept-menu-wrap">
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
        <div id={listboxId} className="dept-menu-panel scroll-y" role="listbox">
          <button
            type="button"
            role="option"
            aria-selected={unspecified}
            className={`dept-menu-hit focus-ring${unspecified ? ' dept-menu-hit--active' : ''}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => pick(undefined)}
          >
            Not specified
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
            </button>
          )}
          {BUSINESS_DEPARTMENTS.map((name) => {
            const on = cur === name
            return (
              <button
                key={name}
                type="button"
                role="option"
                aria-selected={on}
                className={`dept-menu-hit focus-ring${on ? ' dept-menu-hit--active' : ''}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(name)}
              >
                {name}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
