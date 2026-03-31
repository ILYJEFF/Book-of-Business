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
    <div className="segment-group" role="group" aria-label="Relationship">
      {ORDER.map((c) => {
        const on = c === value
        return (
          <button
            key={c}
            type="button"
            disabled={disabled}
            className={`segment focus-ring${on ? ' segment--on' : ''}`}
            onClick={() => onChange(c)}
          >
            {labels[c]}
          </button>
        )
      })}
    </div>
  )
}
