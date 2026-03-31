import { useMemo, useState, type Dispatch, type ReactElement, type SetStateAction } from 'react'
import type { Company, Industry, Tag } from '../../../shared/types'
import {
  activeContactFilterCount,
  CONTACT_CATEGORIES,
  createDefaultContactFilters,
  facetContactFilterCount,
  type ContactFilterModel
} from '../lib/recordFilters'
import { industryPathLabel } from '../lib/format'
import { orderIndustriesForUi } from '../lib/industryTree'
import FilterCombobox from './FilterCombobox'

const MAP_PIN_CHOICES: { id: ContactFilterModel['mapPin']; label: string }[] = [
  { id: 'any', label: 'Any' },
  { id: 'mapped', label: 'On the map' },
  { id: 'unmapped', label: 'No pin' }
]

/** List column: search, new contact, counts. */
export default function ContactFilterPanel({
  filters,
  setFilters,
  total,
  shown,
  onNew
}: {
  filters: ContactFilterModel
  setFilters: Dispatch<SetStateAction<ContactFilterModel>>
  total: number
  shown: number
  onNew: () => void
}): ReactElement {
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
    </div>
  )
}

/** Static right rail: facet filters (Contacts view only). */
export function ContactFiltersRail({
  filters,
  setFilters,
  companies,
  industries,
  industryMap,
  tags,
  shown,
  total
}: {
  filters: ContactFilterModel
  setFilters: Dispatch<SetStateAction<ContactFilterModel>>
  companies: Company[]
  industries: Industry[]
  industryMap: Map<string, Industry>
  tags: Tag[]
  shown: number
  total: number
}): ReactElement {
  const [tagQuery, setTagQuery] = useState('')
  const industriesOrdered = orderIndustriesForUi(industries)
  const active = activeContactFilterCount(filters)
  const facetCount = facetContactFilterCount(filters)

  const tagsSorted = useMemo(() => [...tags].sort((a, b) => a.name.localeCompare(b.name)), [tags])
  const tagNeedle = tagQuery.trim().toLowerCase()
  const tagsForUi = useMemo(
    () =>
      tagNeedle ? tagsSorted.filter((t) => t.name.toLowerCase().includes(tagNeedle)) : tagsSorted,
    [tagsSorted, tagNeedle]
  )

  const companyOptions = useMemo(
    () =>
      [...companies]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((c) => ({ id: c.id, label: c.name })),
    [companies]
  )

  const industryOptions = useMemo(
    () =>
      industriesOrdered.map(({ industry: i }) => ({
        id: i.id,
        label: industryPathLabel(industryMap, i.id)
      })),
    [industriesOrdered, industryMap]
  )

  const toggleCategory = (id: (typeof CONTACT_CATEGORIES)[0]['id']) => {
    setFilters((f) => {
      const next = new Set(f.categories)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return { ...f, categories: next }
    })
  }

  const toggleTagFilter = (id: string) => {
    setFilters((f) => {
      const next = new Set(f.tagIds)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return { ...f, tagIds: next }
    })
  }

  return (
    <>
      <header className="contact-filters-rail-header">
        <div className="contact-filters-rail-header-top">
          <h2 className="contact-filters-rail-title">List filters</h2>
          {facetCount > 0 ? <span className="filter-badge filter-badge--rail">{facetCount}</span> : null}
        </div>
        <p className="contact-filters-rail-meta" aria-live="polite">
          {shown === total ? `${total} in list` : `${shown} of ${total} shown`}
        </p>
        <p className="contact-filters-rail-hint">Works with the search box in the list column.</p>
      </header>

      <div className="contact-filters-rail-body scroll-y">
        <div className="filter-refine-card filter-refine-card--rail">
          <div className="filter-refine-card-head">
            <span className="filter-refine-kicker">Relationship</span>
            <p className="filter-refine-help">Match any chosen type. None means all.</p>
          </div>
          <div className="filter-chip-row filter-chip-row--comfort" role="group" aria-label="Filter by relationship">
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
        </div>

        <div className="filter-refine-card filter-refine-card--rail">
          <div className="filter-refine-card-head">
            <span className="filter-refine-kicker">Tags</span>
            <p className="filter-refine-help">Match any selected tag.</p>
          </div>
          {tagsSorted.length === 0 ? (
            <p className="filter-refine-empty muted small">No tags yet.</p>
          ) : (
            <>
              <div className="search-wrap filter-tag-search-wrap">
                <input
                  type="search"
                  className="search-input search-input--filter focus-ring"
                  placeholder="Search tags…"
                  value={tagQuery}
                  onChange={(e) => setTagQuery(e.target.value)}
                  aria-label="Search tags to filter"
                />
              </div>
              <div
                className="filter-chip-scroll filter-chip-scroll--rail scroll-y"
                role="group"
                aria-label="Filter by tags"
              >
                <div className="filter-chip-row filter-chip-row--comfort">
                  {tagsForUi.map((t) => {
                    const on = filters.tagIds.has(t.id)
                    return (
                      <button
                        key={t.id}
                        type="button"
                        className={`filter-chip focus-ring${on ? ' filter-chip--on' : ''}`}
                        onClick={() => toggleTagFilter(t.id)}
                      >
                        {t.name}
                      </button>
                    )
                  })}
                </div>
              </div>
              {tagNeedle && tagsForUi.length === 0 ? (
                <p className="filter-refine-empty muted small">No tag names match.</p>
              ) : null}
            </>
          )}
        </div>

        <div className="filter-refine-card filter-refine-card--rail filter-refine-card--duo">
          <FilterCombobox
            id="flt-co-rail"
            listboxId="flt-co-rail-listbox"
            label="Linked company"
            placeholder="Search companies…"
            value={filters.companyId}
            onChange={(companyId) => setFilters((f) => ({ ...f, companyId }))}
            options={companyOptions}
          />
          <FilterCombobox
            id="flt-ind-rail"
            listboxId="flt-ind-rail-listbox"
            label="Linked industry"
            placeholder="Search industries…"
            value={filters.industryId}
            onChange={(industryId) => setFilters((f) => ({ ...f, industryId }))}
            options={industryOptions}
            typeaheadThreshold={12}
          />
        </div>

        <div className="filter-refine-card filter-refine-card--rail">
          <div className="filter-refine-card-head">
            <span className="filter-refine-kicker">Map pin</span>
            <p className="filter-refine-help">On the map or not.</p>
          </div>
          <div className="filter-chip-row filter-chip-row--comfort" role="group" aria-label="Filter by map pin">
            {MAP_PIN_CHOICES.map(({ id, label }) => {
              const on = filters.mapPin === id
              return (
                <button
                  key={id}
                  type="button"
                  className={`filter-chip focus-ring${on ? ' filter-chip--on' : ''}`}
                  onClick={() => setFilters((f) => ({ ...f, mapPin: id }))}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        {active > 0 ? (
          <button
            type="button"
            className="btn btn-ghost focus-ring btn-block filter-clear-btn contact-filters-rail-clear"
            onClick={() => setFilters(createDefaultContactFilters())}
          >
            Clear all filters ({active})
          </button>
        ) : null}
      </div>
    </>
  )
}
