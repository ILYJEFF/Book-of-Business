import type { ContactCategory } from '../../../shared/types'
import { CONTACT_CATEGORY_ORDER } from '../lib/recordFilters'

const labels: Record<ContactCategory, string> = {
  personal: 'Personal',
  work: 'Work',
  networking: 'Network',
  client: 'Client',
  candidate: 'Candidate',
  family: 'Family',
  other: 'Other'
}

export default function CategoryPills({
  value,
  onToggle,
  disabled
}: {
  value: ContactCategory[]
  onToggle: (c: ContactCategory) => void
  disabled?: boolean
}): React.ReactElement {
  const set = new Set(value)
  return (
    <div className="segment-group segment-group--multi" role="group" aria-label="Relationship (choose any that apply)">
      {CONTACT_CATEGORY_ORDER.map((c) => {
        const on = set.has(c)
        return (
          <button
            key={c}
            type="button"
            disabled={disabled}
            className={`segment focus-ring${on ? ' segment--on' : ''}`}
            aria-pressed={on}
            onClick={() => onToggle(c)}
          >
            {labels[c]}
          </button>
        )
      })}
    </div>
  )
}
