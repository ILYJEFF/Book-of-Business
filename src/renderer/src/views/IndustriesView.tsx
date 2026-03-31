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

  return (
    <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
      <div
        style={{
          width: 300,
          minWidth: 240,
          borderRight: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-raised)'
        }}
      >
        <div style={{ padding: 14 }}>
          <button type="button" className="btn btn-primary focus-ring" style={{ width: '100%' }} onClick={startCreate}>
            New industry
          </button>
        </div>
        <div className="scroll-y" style={{ flex: 1 }}>
          {industries.map((i) => {
            const on = i.id === selectedId && !creating
            return (
              <button
                key={i.id}
                type="button"
                onClick={() => open(i)}
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
                <div style={{ fontWeight: 600 }}>{i.name}</div>
                {i.description && (
                  <div className="muted small" style={{ marginTop: 4, lineHeight: 1.4 }}>
                    {i.description.length > 90 ? `${i.description.slice(0, 90)}…` : i.description}
                  </div>
                )}
              </button>
            )
          })}
          {industries.length === 0 && (
            <div className="muted small" style={{ padding: 20 }}>
              Start with a few sectors you track: healthcare, fintech, real estate, and so on.
            </div>
          )}
        </div>
      </div>

      <div className="scroll-y" style={{ flex: 1, background: 'var(--bg-base)' }}>
        {!display && (
          <div className="muted" style={{ padding: 48 }}>
            Select an industry or add a new one.
          </div>
        )}
        {display && (
          <div style={{ padding: '28px 36px 48px', maxWidth: 600 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 600 }}>{display.name || 'Untitled industry'}</div>
                <div className="muted small" style={{ marginTop: 6 }}>
                  {creating ? 'New entry' : 'Industry taxonomy on disk'}
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
                <div style={{ fontWeight: 600 }}>Delete this industry?</div>
                <div className="muted small" style={{ marginTop: 6 }}>
                  Companies and contacts may still reference this id until you edit them.
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
