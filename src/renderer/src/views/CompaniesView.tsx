import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Company } from '../../../shared/types'
import AddressFields from '../components/AddressFields'
import { useApp } from '../context/AppContext'
import { industryPathLabel } from '../lib/format'
import { orderIndustriesForUi } from '../lib/industryTree'

export default function CompaniesView(): React.ReactElement {
  const { companies, industries, refresh, openRecordRequest, clearOpenRecordRequest } = useApp()
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Partial<Company> | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const industryMap = useMemo(
    () => new Map(industries.map((i) => [i.id, i] as const)),
    [industries]
  )

  const industriesOrdered = useMemo(() => orderIndustriesForUi(industries), [industries])

  const selected = useMemo(
    () => companies.find((c) => c.id === selectedId) ?? null,
    [companies, selectedId]
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return companies
    return companies.filter((c) => {
      const ind = c.industryId ? industryPathLabel(industryMap, c.industryId) : ''
      const blob = [c.name, c.website ?? '', c.notes ?? '', c.address ?? '', ind].join(' ').toLowerCase()
      return blob.includes(q)
    })
  }, [companies, query, industryMap])

  const open = useCallback((c: Company) => {
    setSelectedId(c.id)
    setCreating(false)
    setEditing(false)
    setDraft({ ...c })
    setConfirmDelete(false)
  }, [])

  const startCreate = useCallback(() => {
    setSelectedId(null)
    setCreating(true)
    setEditing(true)
    setDraft({ name: '', website: '', industryId: '', notes: '', address: '' })
    setConfirmDelete(false)
  }, [])

  const startEdit = useCallback((c: Company) => {
    setCreating(false)
    setSelectedId(c.id)
    setEditing(true)
    setDraft({ ...c })
    setConfirmDelete(false)
  }, [])

  const cancelEdit = useCallback(() => {
    if (creating) {
      setCreating(false)
      setDraft(null)
      setEditing(false)
      return
    }
    if (selected) {
      setDraft({ ...selected })
      setEditing(false)
    }
  }, [creating, selected])

  const save = useCallback(async () => {
    if (!draft?.name?.trim()) return
    setSaving(true)
    try {
      const saved = await window.book.saveCompany({
        ...draft,
        name: draft.name.trim(),
        website: draft.website?.trim() || undefined,
        industryId: draft.industryId || undefined,
        notes: draft.notes?.trim() || undefined
      })
      await refresh({ background: true })
      setSelectedId(saved.id)
      setDraft({ ...saved })
      setEditing(false)
      setCreating(false)
      setConfirmDelete(false)
    } finally {
      setSaving(false)
    }
  }, [draft, refresh])

  const remove = useCallback(async () => {
    if (!selected) return
    await window.book.deleteCompany(selected.id)
    await refresh({ background: true })
    setSelectedId(null)
    setDraft(null)
    setCreating(false)
    setEditing(false)
    setConfirmDelete(false)
  }, [selected, refresh])

  const display = editing && draft ? draft : selected

  const previewOpen = selectedId !== null || creating

  const dismissPreview = useCallback(() => {
    setConfirmDelete(false)
    setCreating(false)
    setEditing(false)
    setSelectedId(null)
    setDraft(null)
  }, [])

  useEffect(() => {
    if (selectedId && !creating && !companies.some((c) => c.id === selectedId)) {
      dismissPreview()
    }
  }, [selectedId, creating, companies, dismissPreview])

  useEffect(() => {
    if (!previewOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismissPreview()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [previewOpen, dismissPreview])

  useEffect(() => {
    if (!openRecordRequest) return
    if (openRecordRequest.kind !== 'company') {
      clearOpenRecordRequest()
      return
    }
    const c = companies.find((x) => x.id === openRecordRequest.id)
    clearOpenRecordRequest()
    if (c) open(c)
  }, [openRecordRequest, companies, clearOpenRecordRequest, open])

  const coInitial = (name: string) => (name.trim()[0] ?? '?').toUpperCase()

  return (
    <div className="split-view split-view--browse">
      <div className="list-column list-column--browse">
        <div className="list-browse-scroll scroll-y">
          <div className="list-results-sticky list-toolbar--search">
            <div className="search-wrap">
              <input
                className="search-input focus-ring"
                placeholder="Search company name, industry, site, notes…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Filter companies in this list"
              />
            </div>
            <button type="button" className="btn btn-primary focus-ring btn-block" onClick={startCreate}>
              New company
            </button>
          </div>
          <div className="list-results-body">
            {filtered.map((c) => {
              const on = c.id === selectedId && !creating
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => open(c)}
                  className={`list-row focus-ring${on ? ' list-row--active' : ''}`}
                >
                  <div className="avatar avatar--sm">{coInitial(c.name)}</div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="list-row-title">{c.name}</div>
                    <div className="list-row-sub">
                      {c.industryId ? industryPathLabel(industryMap, c.industryId) : 'No industry linked'}
                    </div>
                  </div>
                </button>
              )
            })}
            {filtered.length === 0 &&
              (companies.length === 0 ? (
                <div className="list-empty">
                  <p className="list-empty-title">No companies yet</p>
                  <p className="list-empty-text">Add orgs you work with, then tie them to people and sectors.</p>
                </div>
              ) : (
                <div className="list-empty">
                  <p className="list-empty-title">No results</p>
                  <p className="list-empty-text">Nothing matches that search. Clear the field or try another term.</p>
                </div>
              ))}
          </div>
        </div>
      </div>

      {previewOpen && display && (
        <>
          <button
            type="button"
            className="detail-backdrop"
            aria-label="Close preview"
            onClick={dismissPreview}
          />
          <aside
            className="detail-column detail-column--overlay"
            aria-modal="true"
            role="dialog"
            aria-labelledby="company-preview-title"
          >
            <div className="detail-overlay-top">
              <button type="button" className="detail-overlay-dismiss btn btn-ghost focus-ring" onClick={dismissPreview}>
                Close
              </button>
            </div>
            <div className="detail-inner scroll-y">
            <header className="detail-hero">
              <div className="detail-hero-main">
                <div className="avatar avatar--lg">{coInitial(display.name ?? '')}</div>
                <div style={{ minWidth: 0 }}>
                  <h2 id="company-preview-title" className="detail-title">
                    {display.name || 'Untitled company'}
                  </h2>
                  <p className="detail-meta">{creating ? 'New entry' : 'Company JSON in your library'}</p>
                </div>
              </div>
              <div className="detail-actions">
                {!editing ? (
                  <>
                    <button type="button" className="btn btn-ghost focus-ring" onClick={() => selected && startEdit(selected)}>
                      Edit
                    </button>
                    <button type="button" className="btn btn-danger focus-ring" onClick={() => setConfirmDelete(true)}>
                      Delete
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button" className="btn btn-ghost focus-ring" onClick={cancelEdit} disabled={saving}>
                      Cancel
                    </button>
                    <button type="button" className="btn btn-primary focus-ring" onClick={() => void save()} disabled={saving}>
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                  </>
                )}
              </div>
            </header>

            {confirmDelete && (
              <div className="alert-danger">
                <div className="alert-danger-title">Delete this company?</div>
                <p className="muted small" style={{ marginTop: 8, marginBottom: 0 }}>
                  Contacts may still reference this id until you edit them. The file is removed from the companies folder.
                </p>
                <div className="alert-danger-actions">
                  <button type="button" className="btn btn-ghost focus-ring" onClick={() => setConfirmDelete(false)}>
                    Back
                  </button>
                  <button type="button" className="btn btn-danger focus-ring" onClick={() => void remove()}>
                    Delete permanently
                  </button>
                </div>
              </div>
            )}

            <div className="form-grid" style={{ marginTop: confirmDelete ? 22 : 0 }}>
              <div>
                <label className="field-label" htmlFor="co-name">
                  Company name
                </label>
                <input
                  id="co-name"
                  className="text-input focus-ring"
                  disabled={!editing}
                  value={display.name ?? ''}
                  onChange={(e) => editing && setDraft((d) => (d ? { ...d, name: e.target.value } : d))}
                />
              </div>
              <div>
                <label className="field-label" htmlFor="co-web">
                  Website
                </label>
                <input
                  id="co-web"
                  className="text-input focus-ring"
                  disabled={!editing}
                  placeholder="https://"
                  value={display.website ?? ''}
                  onChange={(e) => editing && setDraft((d) => (d ? { ...d, website: e.target.value } : d))}
                />
              </div>
              <div>
                <label className="field-label" htmlFor="co-ind">
                  Industry
                </label>
                <select
                  id="co-ind"
                  className="select-input focus-ring"
                  disabled={!editing}
                  value={display.industryId ?? ''}
                  onChange={(e) =>
                    editing &&
                    setDraft((d) =>
                      d ? { ...d, industryId: e.target.value || undefined } : d
                    )
                  }
                >
                  <option value="">None</option>
                  {industriesOrdered.map(({ industry: i }) => (
                    <option key={i.id} value={i.id}>
                      {industryPathLabel(industryMap, i.id)}
                    </option>
                  ))}
                </select>
              </div>
              <AddressFields<Company> draft={display} editing={editing} setDraft={setDraft} />
              <div>
                <label className="field-label" htmlFor="co-notes">
                  Notes
                </label>
                <textarea
                  id="co-notes"
                  className="textarea-input focus-ring"
                  disabled={!editing}
                  placeholder="Account notes, champions, renewal timing…"
                  value={display.notes ?? ''}
                  onChange={(e) => editing && setDraft((d) => (d ? { ...d, notes: e.target.value } : d))}
                />
              </div>
            </div>
            </div>
          </aside>
        </>
      )}
    </div>
  )
}
