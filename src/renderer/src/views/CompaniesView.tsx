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

  return (
    <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
      <div
        style={{
          width: 320,
          minWidth: 260,
          borderRight: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-raised)'
        }}
      >
        <div style={{ padding: 14 }}>
          <button type="button" className="btn btn-primary focus-ring" style={{ width: '100%' }} onClick={startCreate}>
            New company
          </button>
        </div>
        <div className="scroll-y" style={{ flex: 1 }}>
          {companies.map((c) => {
            const on = c.id === selectedId && !creating
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => open(c)}
                className="focus-ring"
                style={{
                  width: '100%',
                  border: 'none',
                  borderBottom: '1px solid var(--border-subtle)',
                  background: on ? 'var(--bg-panel)' : 'transparent',
                  padding: '12px 16px',
                  textAlign: 'left',
                  color: 'var(--text-primary)'
                }}
              >
                <div style={{ fontWeight: 600 }}>{c.name}</div>
                <div className="muted small" style={{ marginTop: 4 }}>
                  {c.industryId ? industryMap.get(c.industryId) ?? 'Industry' : 'No industry linked'}
                </div>
              </button>
            )
          })}
          {companies.length === 0 && (
            <div className="muted small" style={{ padding: 20 }}>
              Add the organizations you care about. Link them to industries and contacts.
            </div>
          )}
        </div>
      </div>

      <div className="scroll-y" style={{ flex: 1, background: 'var(--bg-base)' }}>
        {!display && (
          <div className="muted" style={{ padding: 48 }}>
            Select a company or create a new one.
          </div>
        )}
        {display && (
          <div style={{ padding: '28px 36px 48px', maxWidth: 640 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 600 }}>{display.name || 'Untitled company'}</div>
                <div className="muted small" style={{ marginTop: 6 }}>
                  {creating ? 'New entry' : 'Company record on disk'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
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
            </div>

            {confirmDelete && (
              <div
                style={{
                  marginTop: 20,
                  padding: 16,
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(229,115,115,0.35)',
                  background: 'rgba(229,115,115,0.06)'
                }}
              >
                <div style={{ fontWeight: 600 }}>Delete this company?</div>
                <div className="muted small" style={{ marginTop: 6 }}>
                  Contacts can still list this name until you edit them. Files are removed from the companies folder.
                </div>
                <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                  <button type="button" className="btn btn-ghost focus-ring" onClick={() => setConfirmDelete(false)}>
                    Back
                  </button>
                  <button type="button" className="btn btn-danger focus-ring" onClick={() => void remove()}>
                    Delete permanently
                  </button>
                </div>
              </div>
            )}

            <div style={{ marginTop: 28, display: 'grid', gap: 18 }}>
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
