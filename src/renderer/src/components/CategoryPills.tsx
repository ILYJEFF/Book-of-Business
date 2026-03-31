import type { ContactCategory } from '../../../shared/types'

const ORDER: ContactCategory[] = ['personal', 'work', 'networking', 'other']

const labels: Record<ContactCategory, string> = {
  personal: 'Personal',
  work: 'Work',
  networking: 'Network',
  other: 'Other'
}

export default function CategoryPills({
  value,
  onChange,
  disabled
}: {
  value: ContactCategory
  onChange: (c: ContactCategory) => void
  disabled?: boolean
}): React.ReactElement {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {ORDER.map((c) => {
        const on = c === value
        return (
          <button
            key={c}
            type="button"
            disabled={disabled}
            className="focus-ring"
            onClick={() => onChange(c)}
            style={{
              border: `1px solid ${on ? 'rgba(138,180,212,0.45)' : 'var(--border-subtle)'}`,
              background: on ? 'var(--accent-dim)' : 'transparent',
              color: on ? 'var(--text-primary)' : 'var(--text-secondary)',
              borderRadius: 999,
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: 600
            }}
          >
            {labels[c]}
          </button>
        )
      })}
    </div>
  )
}
