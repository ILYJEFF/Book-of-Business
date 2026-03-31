import { useEffect, useRef, useState, type Dispatch, type ReactElement, type SetStateAction } from 'react'
import type { Company, Industry } from '../../../shared/types'
import {
  activeContactFilterCount,
  CONTACT_CATEGORIES,
  createDefaultContactFilters,
  facetContactFilterCount,
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
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const prevFacets = useRef(0)
  const active = activeContactFilterCount(filters)
  const facetCount = facetContactFilterCount(filters)
  const industriesOrdered = orderIndustriesForUi(industries)

  useEffect(() => {
    if (facetCount > 0 && prevFacets.current === 0) setAdvancedOpen(true)
    prevFacets.current = facetCount
  }, [facetCount])

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
        <span className="filter-panel-title">Contacts</span>
        <span className="filter-panel-count" aria-live="polite">
          {shown === total ? `${total} total` : `${shown} of ${total}`}
        </span>
      </div>

      <div className="search-wrap filter-panel-search">
        <input
          className="search-input focus-ring"
          placeholder="Search names, companies, notes…"
          value={filters.query}
          onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))}
          aria-label="Search contacts"
        />
      </div>

      <button type="button" className="btn btn-primary focus-ring btn-block filter-new-btn" onClick={onNew}>
        New contact
      </button>

      <button
        type="button"
        className="filter-toggle-btn focus-ring"
        aria-expanded={advancedOpen}
        onClick={() => setAdvancedOpen((o) => !o)}
      >
        <span className="filter-toggle-label">{advancedOpen ? 'Hide filters' : 'More filters'}</span>
        {facetCount > 0 && <span className="filter-badge">{facetCount}</span>}
        <span className={`filter-toggle-icon${advancedOpen ? ' filter-toggle-icon--open' : ''}`} aria-hidden />
      </button>

      {advancedOpen && (
        <div className="filter-advanced scroll-y">
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
            <p className="filter-hint muted small">Leave all off to include every relationship.</p>
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
                  Clear all ({active})
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
