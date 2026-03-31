import { useEffect, useRef, useState, type ReactElement } from 'react'
import { CUSTOM_LABEL_OPTION } from '../lib/contactChannelLabels'

/** In-app preset picker for email or phone labels (no native select). */
export default function ChannelLabelMenu({
  id,
  label,
  presets,
  onChange
}: {
  id: string
  label: string
  presets: readonly string[]
  onChange: (next: string) => void
}): ReactElement {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const listboxId = `${id}-listbox`

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const inPreset = (presets as readonly string[]).includes(label)
  const customText = !inPreset ? label.trim() : ''
  const summary = inPreset ? label : customText || CUSTOM_LABEL_OPTION
  const placeholderSummary = !inPreset && !customText

  const pick = (next: string) => {
    onChange(next)
    setOpen(false)
  }

  return (
    <div ref={wrapRef} className="channel-label-menu-wrap">
      <button
        type="button"
        id={id}
        className="channel-label-menu-trigger focus-ring"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false)
        }}
      >
        <span className={placeholderSummary ? 'channel-label-menu-text channel-label-menu-text--muted' : 'channel-label-menu-text'}>
          {summary}
        </span>
        <span className="channel-label-menu-chevron" aria-hidden>
          ▾
        </span>
      </button>
      {open && (
        <div id={listboxId} className="channel-label-menu-panel scroll-y" role="listbox">
          {presets.map((p) => {
            const on = label === p
            return (
              <button
                key={p}
                type="button"
                role="option"
                aria-selected={on}
                className={`channel-label-menu-hit focus-ring${on ? ' channel-label-menu-hit--active' : ''}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(p)}
              >
                {p}
              </button>
            )
          })}
          <button
            type="button"
            role="option"
            aria-selected={!inPreset}
            className={`channel-label-menu-hit focus-ring${!inPreset ? ' channel-label-menu-hit--active' : ''}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => pick('')}
          >
            {CUSTOM_LABEL_OPTION}
          </button>
        </div>
      )}
    </div>
  )
}
