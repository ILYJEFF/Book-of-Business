import { useCallback, useMemo, useState } from 'react'
import type { Industry } from '../../../shared/types'
import { useApp } from '../context/AppContext'
import { industryPathLabel } from '../lib/format'
import { excludedParentIds, orderIndustriesForUi } from '../lib/industryTree'

export default function IndustriesView(): React.ReactElement {
  const { industries, refresh } = useApp()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Partial<Industry> | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const industryMap = useMemo(
    () => new Map(industries.map((i) => [i.id, i] as const)),
    [industries]
  )

  const ordered = useMemo(() => orderIndustriesForUi(industries), [industries])

  const selected = useMemo(
    () => industries.find((i) => i.id === selectedId) ?? null,
    [industries, selectedId]
  )

  const parentOptions = useMemo(() => {
    const ex = excludedParentIds(industries, draft?.id)
    return industries.filter((i) => !ex.has(i.id)).sort((a, b) => a.name.localeCompare(b.name))
  }, [industries, draft?.id])

  const open = useCallback((i: Industry) => {
    setSelectedId(i.id)
    setCreating(false)
    setEditing(false)
    setDraft({ ...i })
    setConfirmDelete(false)
    setDeleteError(null)
  }, [])

  const startCreate = useCallback((parentId?: string) => {
    setSelectedId(null)
    setCreating(true)
    setEditing(true)
    setDraft({ name: '', description: '', parentId: parentId || undefined })
    setConfirmDelete(false)
    setDeleteError(null)
  }, [])

  const startEdit = useCallback((i: Industry) => {
    setCreating(false)
    setSelectedId(i.id)
    setEditing(true)
    setDraft({ ...i })
    setConfirmDelete(false)
    setDeleteError(null)
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
      const parentTrimmed = draft.parentId?.trim()
      const payload: Partial<Industry> & { name: string } = {
        name: draft.name.trim(),
        description: draft.description?.trim() || undefined,
        parentId: parentTrimmed || undefined
      }
      if (draft.id) payload.id = draft.id
      const saved = await window.book.saveIndustry(payload)
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
    setDeleteError(null)
    try {
      await window.book.deleteIndustry(selected.id)
      await refresh()
      setSelectedId(null)
      setDraft(null)
      setEditing(false)
      setConfirmDelete(false)
    } catch (e) {
      const msg =
        e instanceof Error && e.message === 'INDUSTRY_HAS_CHILDREN'
          ? 'Move or delete sub-industries first, then try again.'
          : 'Could not delete this industry.'
      setDeleteError(msg)
    }
  }, [selected, refresh])

  const display = editing && draft ? draft : selected

  const indInitial = (name: string) => (name.trim()[0] ?? '?').toUpperCase()

  return (
    <div className="split-view">
      <div className="list-column list-column--industries">
        <div className="list-toolbar">
          <button type="button" className="btn btn-primary focus-ring btn-block" onClick={() => startCreate()}>
            New top-level industry
          </button>
          <p className="industry-list-hint">
            Nesting is saved on each file. Pick a parent with <strong>Edit</strong>, or use <strong>Add sub-industry</strong>{' '}
            on a row. Flat names here mean nothing is filed under a parent yet.
          </p>
        </div>
        <div className="scroll-y list-rows list-rows--industry-tree">
          {ordered.map(({ industry: i, depth }) => {
            const on = i.id === selectedId && !creating
            const isNested = depth > 0
            const parentName = i.parentId ? industryMap.get(i.parentId)?.name : null
            const descShort = i.description
              ? i.description.length > 64
                ? `${i.description.slice(0, 64)}…`
                : i.description
              : null
            return (
              <button
                key={i.id}
                type="button"
                data-depth={String(depth)}
                onClick={() => open(i)}
                className={`list-row list-row--industry focus-ring${isNested ? ' list-row--industry-nested' : ''}${on ? ' list-row--active' : ''}`}
              >
                <span className="industry-tree-indent" aria-hidden style={{ width: Math.max(0, (depth - 1) * 22 + (isNested ? 10 : 0)) }} />
                {isNested && <span className="industry-tree-join" aria-hidden />}
                <div
                  className={`avatar avatar--industry${isNested ? ' avatar--industry-nested' : ' avatar--sm'}`}
                >
                  {indInitial(i.name)}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className={`list-row-title${isNested ? ' list-row-title--nested-industry' : ''}`}>
                    {isNested && <span className="industry-nested-mark">Sub</span>}
                    <span className="list-row-title-text">{i.name}</span>
                  </div>
                  <div className={`list-row-sub${isNested ? ' list-row-sub--nested-industry' : ''}`}>
                    {isNested ? (
                      <>
                        <span className="industry-sub-hint">Filed under </span>
                        <span className="industry-sub-parent">{parentName ?? 'parent missing'}</span>
                        {descShort ? (
                          <>
                            <span className="industry-sub-dot"> · </span>
                            <span>{descShort}</span>
                          </>
                        ) : (
                          <span className="list-row-sub-muted"> · no notes yet</span>
                        )}
                      </>
                    ) : descShort ? (
                      descShort
                    ) : (
                      <span className="list-row-sub-muted">Top-level sector · no notes yet</span>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
          {industries.length === 0 && (
            <div className="list-empty">
              <p className="list-empty-title">No industries yet</p>
              <p className="list-empty-text">Start with a few top-level sectors. You can nest specialties underneath.</p>
            </div>
          )}
        </div>
      </div>

      <div className="scroll-y detail-column">
        {!display && (
          <div className="empty-canvas">
            <p className="folio-kicker">Industries</p>
            <div className="empty-canvas-rule" aria-hidden />
            <h2 className="empty-canvas-title">Nothing selected</h2>
            <p className="empty-canvas-text">Choose a row in the index or add a sector.</p>
            <div className="empty-canvas-actions">
              <button type="button" className="btn btn-primary focus-ring" onClick={() => startCreate()}>
                New top-level industry
              </button>
            </div>
          </div>
        )}
        {display && (
          <div className="detail-inner">
            <header className="detail-hero">
              <div className="detail-hero-main">
                <div className="avatar avatar--lg avatar--industry">{indInitial(display.name ?? '')}</div>
                <div style={{ minWidth: 0 }}>
                  <p className="folio-kicker folio-kicker--inline">Industry</p>
                  <h2 className="detail-title">{display.name || 'Untitled'}</h2>
                  <p className="detail-meta">
                    {creating
                      ? 'New entry'
                      : display.parentId
                        ? `Under ${industryPathLabel(industryMap, display.parentId)}`
                        : 'Top-level sector'}
                  </p>
                </div>
              </div>
              <div className="detail-actions">
                {!editing ? (
                  <>
                    <button
                      type="button"
                      className="btn btn-ghost focus-ring"
                      onClick={() => selected && startCreate(selected.id)}
                    >
                      Add sub-industry
                    </button>
                    <button type="button" className="btn btn-ghost focus-ring" onClick={() => selected && startEdit(selected)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger focus-ring"
                      onClick={() => {
                        setDeleteError(null)
                        setConfirmDelete(true)
                      }}
                    >
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
                {deleteError && <p className="muted small" style={{ marginTop: 8 }}>{deleteError}</p>}
                {!deleteError && (
                  <p className="muted small" style={{ marginTop: 8, marginBottom: 0 }}>
                    Companies and contacts may still reference this id until you edit them. Sub-industries must be removed or
                    reassigned first.
                  </p>
                )}
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
                <label className="field-label" htmlFor="ind-parent">
                  Parent industry
                </label>
                <select
                  id="ind-parent"
                  className="select-input focus-ring"
                  disabled={!editing}
                  value={display.parentId ?? ''}
                  onChange={(e) =>
                    editing &&
                    setDraft((d) =>
                      d
                        ? {
                            ...d,
                            parentId: e.target.value ? e.target.value : undefined
                          }
                        : d
                    )
                  }
                >
                  <option value="">Top level (no parent)</option>
                  {parentOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {industryPathLabel(industryMap, p.id)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label" htmlFor="ind-desc">
                  Description
                </label>
                <textarea
                  id="ind-desc"
                  className="textarea-input focus-ring"
                  disabled={!editing}
                  placeholder="How you think about this space, segments you track inside it…"
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
