import { useCallback, useMemo, useState } from 'react'
import type { Industry } from '../../../shared/types'
import { useApp } from '../context/AppContext'

export default function IndustriesView(): React.ReactElement {
  const { industries, refresh } = useApp()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Partial<Industry> | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const selected = useMemo(
    () => industries.find((i) => i.id === selectedId) ?? null,
    [industries, selectedId]
  )

  const open = useCallback((i: Industry) => {
    setSelectedId(i.id)
    setCreating(false)
    setEditing(false)
    setDraft({ ...i })
    setConfirmDelete(false)
  }, [])

  const startCreate = useCallback(() => {
    setSelectedId(null)
    setCreating(true)
    setEditing(true)
    setDraft({ name: '', description: '' })
    setConfirmDelete(false)
  }, [])

  const startEdit = useCallback((i: Industry) => {
    setCreating(false)
    setSelectedId(i.id)
    setEditing(true)
    setDraft({ ...i })
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
      const saved = await window.book.saveIndustry({
        ...draft,
        name: draft.name.trim(),
        description: draft.description?.trim() || undefined
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
    await window.book.deleteIndustry(selected.id)
    await refresh()
    setSelectedId(null)
    setDraft(null)
    setEditing(false)
    setConfirmDelete(false)
  }, [selected, refresh])

  const display = editing && draft ? draft : selected

  const indInitial = (name: string) => (name.trim()[0] ?? '?').toUpperCase()

  return (
    <div className="split-view">
      <div className="list-column">
        <div className="list-toolbar">
          <button type="button" className="btn btn-primary focus-ring btn-block" onClick={startCreate}>
            New industry
          </button>
        </div>
        <div className="scroll-y list-rows">
          {industries.map((i) => {
            const on = i.id === selectedId && !creating
            const desc = i.description
              ? i.description.length > 88
                ? `${i.description.slice(0, 88)}…`
                : i.description
              : 'No description yet'
            return (
              <button
                key={i.id}
                type="button"
                onClick={() => open(i)}
                className={`list-row focus-ring${on ? ' list-row--active' : ''}`}
              >
                <div className="avatar avatar--sm">{indInitial(i.name)}</div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="list-row-title">{i.name}</div>
                  <div className="list-row-sub">{desc}</div>
                </div>
              </button>
            )
          })}
          {industries.length === 0 && (
            <div className="list-empty">
              <p className="list-empty-title">No industries yet</p>
              <p className="list-empty-text">Define a few sectors you care about, then link companies and contacts.</p>
            </div>
          )}
        </div>
      </div>

      <div className="scroll-y detail-column">
        {!display && (
          <div className="empty-canvas">
            <div className="empty-canvas-visual" aria-hidden />
            <h2 className="empty-canvas-title">Shape your taxonomy</h2>
            <p className="empty-canvas-text">Industries help you scan the book at a glance. Select one on the left or add your first.</p>
            <div className="empty-canvas-actions">
              <button type="button" className="btn btn-primary focus-ring" onClick={startCreate}>
                New industry
              </button>
            </div>
          </div>
        )}
        {display && (
          <div className="detail-inner">
            <header className="detail-hero">
              <div className="detail-hero-main">
                <div className="avatar avatar--lg">{indInitial(display.name ?? '')}</div>
                <div style={{ minWidth: 0 }}>
                  <h2 className="detail-title">{display.name || 'Untitled industry'}</h2>
                  <p className="detail-meta">{creating ? 'New entry' : 'Industry JSON in your library'}</p>
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
                <div className="alert-danger-title">Delete this industry?</div>
                <p className="muted small" style={{ marginTop: 8, marginBottom: 0 }}>
                  Companies and contacts may still reference this id until you edit them.
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
                <label className="field-label" htmlFor="ind-name">
                  Name
                </label>
                <input
                  id="ind-name"
                  className="text-input focus-ring"
                  disabled={!editing}
                  value={display.name ?? ''}
                  onChange={(e) => editing && setDraft((d) => (d ? { ...d, name: e.target.value } : d))}
                />
              </div>
              <div>
                <label className="field-label" htmlFor="ind-desc">
                  Description
                </label>
                <textarea
                  id="ind-desc"
                  className="textarea-input focus-ring"
                  disabled={!editing}
                  placeholder="How you think about this space, subsegments, notes…"
                  value={display.description ?? ''}
                  onChange={(e) => editing && setDraft((d) => (d ? { ...d, description: e.target.value } : d))}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
