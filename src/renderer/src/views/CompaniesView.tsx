import { useCallback, useMemo, useState } from 'react'
import type { Company } from '../../../shared/types'
import { useApp } from '../context/AppContext'

export default function CompaniesView(): React.ReactElement {
  const { companies, industries, refresh } = useApp()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Partial<Company> | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const industryMap = useMemo(
    () => new Map(industries.map((i) => [i.id, i.name] as const)),
    [industries]
  )

  const selected = useMemo(
    () => companies.find((c) => c.id === selectedId) ?? null,
    [companies, selectedId]
  )

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
    setDraft({ name: '', website: '', industryId: '', notes: '' })
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
      await refresh()
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
    await refresh()
    setSelectedId(null)
    setDraft(null)
    setEditing(false)
    setConfirmDelete(false)
  }, [selected, refresh])

  const display = editing && draft ? draft : selected

  const coInitial = (name: string) => (name.trim()[0] ?? '?').toUpperCase()

  return (
    <div className="split-view">
      <div className="list-column">
        <div className="list-toolbar">
          <button type="button" className="btn btn-primary focus-ring btn-block" onClick={startCreate}>
            New company
          </button>
        </div>
        <div className="scroll-y list-rows">
          {companies.map((c) => {
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
                    {c.industryId ? industryMap.get(c.industryId) ?? 'Industry' : 'No industry linked'}
                  </div>
                </div>
              </button>
            )
          })}
          {companies.length === 0 && (
            <div className="list-empty">
              <p className="list-empty-title">No companies yet</p>
              <p className="list-empty-text">Add orgs you work with, then tie them to people and sectors.</p>
            </div>
          )}
        </div>
      </div>

      <div className="scroll-y detail-column">
        {!display && (
          <div className="empty-canvas">
            <div className="empty-canvas-visual" aria-hidden />
            <h2 className="empty-canvas-title">Open a company record</h2>
            <p className="empty-canvas-text">Choose a row on the left or create a company to track sites, industry, and notes.</p>
            <div className="empty-canvas-actions">
              <button type="button" className="btn btn-primary focus-ring" onClick={startCreate}>
                New company
              </button>
            </div>
          </div>
        )}
        {display && (
          <div className="detail-inner">
            <header className="detail-hero">
              <div className="detail-hero-main">
                <div className="avatar avatar--lg">{coInitial(display.name ?? '')}</div>
                <div style={{ minWidth: 0 }}>
                  <h2 className="detail-title">{display.name || 'Untitled company'}</h2>
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
                  {industries.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </select>
              </div>
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
        )}
      </div>
    </div>
  )
}
