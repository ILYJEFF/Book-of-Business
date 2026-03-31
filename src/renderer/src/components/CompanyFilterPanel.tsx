import type { Dispatch, ReactElement, SetStateAction } from 'react'
import type { Industry } from '../../../shared/types'
import {
  activeCompanyFilterCount,
  createDefaultCompanyFilters,
  type CompanyFilterModel
} from '../lib/recordFilters'
import { industryPathLabel } from '../lib/format'
import { orderIndustriesForUi } from '../lib/industryTree'

export default function CompanyFilterPanel({
  filters,
  setFilters,
  industries,
  industryMap,
  total,
  shown,
  onNew
}: {
  filters: CompanyFilterModel
  setFilters: Dispatch<SetStateAction<CompanyFilterModel>>
  industries: Industry[]
  industryMap: Map<string, Industry>
  total: number
  shown: number
  onNew: () => void
}): ReactElement {
  const active = activeCompanyFilterCount(filters)
  const industriesOrdered = orderIndustriesForUi(industries)

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
          aria-label="Search companies"
        />
      </div>

      <div className="filter-grid-2">
        <div>
          <label className="filter-section-label" htmlFor="co-flt-ind">
            Industry
          </label>
          <select
            id="co-flt-ind"
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
        <div>
          <label className="filter-section-label" htmlFor="co-flt-map">
            Map pin
          </label>
          <select
            id="co-flt-map"
            className="select-input focus-ring filter-select"
            value={filters.mapPin}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                mapPin: e.target.value as CompanyFilterModel['mapPin']
              }))
            }
          >
            <option value="any">Any</option>
            <option value="mapped">On the map</option>
            <option value="unmapped">Not on the map</option>
          </select>
        </div>
      </div>

      {active > 0 && (
        <button
          type="button"
          className="btn btn-ghost focus-ring btn-block filter-clear-btn"
          onClick={() => setFilters(createDefaultCompanyFilters())}
        >
          Clear {active} filter{active === 1 ? '' : 's'}
        </button>
      )}

      <button type="button" className="btn btn-primary focus-ring btn-block filter-new-btn" onClick={onNew}>
        New company
      </button>
    </div>
  )
}
