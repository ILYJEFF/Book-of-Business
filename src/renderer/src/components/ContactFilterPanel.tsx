import type { Dispatch, ReactElement, SetStateAction } from 'react'
import type { Company, Industry } from '../../../shared/types'
import {
  activeContactFilterCount,
  CONTACT_CATEGORIES,
  createDefaultContactFilters,
  type ContactFilterModel
} from '../lib/recordFilters'
import { industryPathLabel } from '../lib/format'
import { orderIndustriesForUi } from '../lib/industryTree'

export default function ContactFilterPanel({
  filters,
  setFilters,
  companies,
  industries,
  industryMap,
  total,
  shown,
  onNew
}: {
  filters: ContactFilterModel
  setFilters: Dispatch<SetStateAction<ContactFilterModel>>
  companies: Company[]
  industries: Industry[]
  industryMap: Map<string, Industry>
  total: number
  shown: number
  onNew: () => void
}): ReactElement {
  const active = activeContactFilterCount(filters)
  const industriesOrdered = orderIndustriesForUi(industries)

  const toggleCategory = (id: (typeof CONTACT_CATEGORIES)[0]['id']) => {
    setFilters((f) => {
      const next = new Set(f.categories)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return { ...f, categories: next }
    })
  }

  return (
    <div className="filter-panel">
      <div className="filter-panel-head">
        <span className="filter-panel-title">Index</span>
        <span className="filter-panel-count" aria-live="polite">
          {shown === total ? `${total} total` : `${shown} of ${total}`}
        </span>
      </div>

      <div className="search-wrap filter-panel-search">
        <input
          className="search-input focus-ring"
          placeholder="Search"
          value={filters.query}
          onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))}
          aria-label="Search contacts"
        />
      </div>

      <div className="filter-section">
        <span className="filter-section-label">Relationship</span>
        <div className="filter-chip-row" role="group" aria-label="Filter by relationship">
          {CONTACT_CATEGORIES.map(({ id, label }) => {
            const on = filters.categories.has(id)
            return (
              <button
                key={id}
                type="button"
                className={`filter-chip focus-ring${on ? ' filter-chip--on' : ''}`}
                onClick={() => toggleCategory(id)}
              >
                {label}
              </button>
            )
          })}
        </div>
        <p className="filter-hint muted small">All types until you pick one or more.</p>
      </div>

      <div className="filter-grid-2">
        <div>
          <label className="filter-section-label" htmlFor="flt-co">
            Linked company
          </label>
          <select
            id="flt-co"
            className="select-input focus-ring filter-select"
            value={filters.companyId}
            onChange={(e) => setFilters((f) => ({ ...f, companyId: e.target.value }))}
          >
            <option value="">Any company</option>
            {[...companies].sort((a, b) => a.name.localeCompare(b.name)).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="filter-section-label" htmlFor="flt-ind">
            Linked industry
          </label>
          <select
            id="flt-ind"
            className="select-input focus-ring filter-select"
            value={filters.industryId}
            onChange={(e) => setFilters((f) => ({ ...f, industryId: e.target.value }))}
          >
            <option value="">Any industry</option>
            {industriesOrdered.map(({ industry: i }) => (
              <option key={i.id} value={i.id}>
                {industryPathLabel(industryMap, i.id)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="filter-grid-2">
        <div>
          <label className="filter-section-label" htmlFor="flt-map">
            Map pin
          </label>
          <select
            id="flt-map"
            className="select-input focus-ring filter-select"
            value={filters.mapPin}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                mapPin: e.target.value as ContactFilterModel['mapPin']
              }))
            }
          >
            <option value="any">Any</option>
            <option value="mapped">On the map</option>
            <option value="unmapped">Not on the map</option>
          </select>
        </div>
        <div className="filter-actions-col">
          {active > 0 && (
            <button
              type="button"
              className="btn btn-ghost focus-ring btn-block filter-clear-btn"
              onClick={() => setFilters(createDefaultContactFilters())}
            >
              Clear {active} filter{active === 1 ? '' : 's'}
            </button>
          )}
        </div>
      </div>

      <button type="button" className="btn btn-primary focus-ring btn-block filter-new-btn" onClick={onNew}>
        New contact
      </button>
    </div>
  )
}
