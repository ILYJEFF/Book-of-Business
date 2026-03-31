import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Company, Contact, Industry } from '../../../shared/types'
import { useApp } from '../context/AppContext'
import AddressFields from '../components/AddressFields'
import CategoryPills from '../components/CategoryPills'
import ContactFilterPanel from '../components/ContactFilterPanel'
import IndustrySearchPick from '../components/IndustrySearchPick'
import { contactDisplayName, companyById, industryPathLabel, initials } from '../lib/format'
import { contactPassesFilters, createDefaultContactFilters } from '../lib/recordFilters'

function emptyContact(): Omit<Contact, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    firstName: '',
    lastName: '',
    title: '',
    category: 'work',
    emails: [],
    phones: [{ label: 'Cell', value: '' }],
    linkedinUrl: '',
    website: '',
    companyIds: [],
    industryIds: [],
    notes: '',
    address: ''
  }
}

export default function ContactsView(): React.ReactElement {
  const { contacts, companies, industries, refresh, openRecordRequest, clearOpenRecordRequest } = useApp()
  const [filters, setFilters] = useState(createDefaultContactFilters)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Partial<Contact> | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const companyMap = useMemo(
    () => new Map(companies.map((c) => [c.id, c] as const)),
    [companies]
  )
  const industryMap = useMemo(
    () => new Map(industries.map((i) => [i.id, i] as const)),
    [industries]
  )

  const selected = useMemo(
    () => contacts.find((c) => c.id === selectedId) ?? null,
    [contacts, selectedId]
  )

  const filtered = useMemo(
    () => contacts.filter((c) => contactPassesFilters(c, filters, companyMap, industryMap)),
    [contacts, filters, companyMap, industryMap]
  )

  const startCreate = useCallback(() => {
    setSelectedId(null)
    setCreating(true)
    setEditing(true)
    setConfirmDelete(false)
    setDraft({ ...emptyContact(), id: undefined })
  }, [])

  const startEdit = useCallback((c: Contact) => {
    setCreating(false)
    setSelectedId(c.id)
    setEditing(true)
    setConfirmDelete(false)
    setDraft({ ...c })
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
    if (!draft) return
    const first = (draft.firstName ?? '').trim()
    const last = (draft.lastName ?? '').trim()
    if (!first && !last) return
    setSaving(true)
    try {
      const emails = (draft.emails ?? []).map((e) => e.trim()).filter(Boolean)
      const saved = await window.book.saveContact({
        ...draft,
        firstName: first || 'Unknown',
        lastName: last || '',
        category: draft.category ?? 'work',
        emails,
        phones: (draft.phones ?? []).filter((p) => p.value?.trim()),
        companyIds: draft.companyIds ?? [],
        industryIds: draft.industryIds ?? []
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
    await window.book.deleteContact(selected.id)
    await refresh({ background: true })
    setSelectedId(null)
    setDraft(null)
    setEditing(false)
    setConfirmDelete(false)
  }, [selected, refresh])

  const openDetail = useCallback(
    (c: Contact) => {
      setSelectedId(c.id)
      setCreating(false)
      setEditing(false)
      setDraft({ ...c })
      setConfirmDelete(false)
    },
    []
  )

  useEffect(() => {
    if (!openRecordRequest) return
    if (openRecordRequest.kind !== 'contact') {
      clearOpenRecordRequest()
      return
    }
    const c = contacts.find((x) => x.id === openRecordRequest.id)
    clearOpenRecordRequest()
    if (c) openDetail(c)
  }, [openRecordRequest, contacts, clearOpenRecordRequest, openDetail])

  const displayDraft = editing && draft ? draft : selected

  return (
    <div className="split-view">
      <div className="list-column">
        <div className="list-toolbar list-toolbar--filters">
          <ContactFilterPanel
            filters={filters}
            setFilters={setFilters}
            companies={companies}
            industries={industries}
            industryMap={industryMap}
            total={contacts.length}
            shown={filtered.length}
            onNew={startCreate}
          />
        </div>
        <div className="scroll-y list-rows">
          {filtered.map((c) => {
            const on = c.id === selectedId && !creating
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => openDetail(c)}
                className={`list-row focus-ring${on ? ' list-row--active' : ''}`}
              >
                <div className="avatar avatar--sm">{initials(c)}</div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="list-row-title">{contactDisplayName(c)}</div>
                  <div className="list-row-sub">
                    {c.title ||
                      c.companyIds.map((id) => companyById(companyMap, id)).join(', ') ||
                      'No title yet'}
                  </div>
                </div>
              </button>
            )
          })}
          {filtered.length === 0 &&
            (contacts.length === 0 ? (
              <div className="list-empty">
                <p className="list-empty-title">No contacts yet</p>
                <p className="list-empty-text">Your people will appear here as soon as you add the first one.</p>
              </div>
            ) : (
              <div className="list-empty">
                <p className="list-empty-title">No results</p>
                <p className="list-empty-text">Nothing matches your filters or search. Clear filters or try different terms.</p>
              </div>
            ))}
        </div>
      </div>

      <div className="scroll-y detail-column">
        {!displayDraft && !creating && (
          <div className="empty-canvas">
            <div className="empty-canvas-rule" aria-hidden />
            <h2 className="empty-canvas-title">No row selected</h2>
            <p className="empty-canvas-text">Open an entry from the list, or add one. Each person is one JSON file in your folder.</p>
            <div className="empty-canvas-actions">
              <button type="button" className="btn btn-primary focus-ring" onClick={startCreate}>
                New contact
              </button>
              <span className="empty-canvas-hint">Writes to disk when you save</span>
            </div>
          </div>
        )}
        {displayDraft && (
          <div className="detail-inner">
            <header className="detail-hero">
              <div className="detail-hero-main">
                <div className="avatar avatar--lg">{initials(displayDraft as Contact)}</div>
                <div style={{ minWidth: 0 }}>
                  <h2 className="detail-title">{contactDisplayName(displayDraft as Contact)}</h2>
                  <p className="detail-meta">{creating ? 'New entry' : 'JSON file in your folder'}</p>
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
                <div className="alert-danger-title">Delete this contact?</div>
                <p className="muted small" style={{ marginTop: 8, marginBottom: 0 }}>
                  The JSON file will be removed from your library folder.
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

            <div className="form-grid">
              <div>
                <span className="field-label">Relationship</span>
                <CategoryPills
                  value={(displayDraft.category ?? 'work') as Contact['category']}
                  disabled={!editing}
                  onChange={(cat) => editing && setDraft((d) => (d ? { ...d, category: cat } : d))}
                />
              </div>

              <div className="form-row-2">
                <div>
                  <label className="field-label" htmlFor="fn">
                    First name
                  </label>
                  <input
                    id="fn"
                    className="text-input focus-ring"
                    disabled={!editing}
                    value={displayDraft.firstName ?? ''}
                    onChange={(e) => editing && setDraft((d) => (d ? { ...d, firstName: e.target.value } : d))}
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="ln">
                    Last name
                  </label>
                  <input
                    id="ln"
                    className="text-input focus-ring"
                    disabled={!editing}
                    value={displayDraft.lastName ?? ''}
                    onChange={(e) => editing && setDraft((d) => (d ? { ...d, lastName: e.target.value } : d))}
                  />
                </div>
              </div>

              <div>
                <label className="field-label" htmlFor="title">
                  Role / title
                </label>
                <input
                  id="title"
                  className="text-input focus-ring"
                  disabled={!editing}
                  placeholder="e.g. VP Sales"
                  value={displayDraft.title ?? ''}
                  onChange={(e) => editing && setDraft((d) => (d ? { ...d, title: e.target.value } : d))}
                />
              </div>

              <div className="form-row-2">
                <div>
                  <label className="field-label" htmlFor="li">
                    LinkedIn
                  </label>
                  <input
                    id="li"
                    className="text-input focus-ring"
                    disabled={!editing}
                    placeholder="https://linkedin.com/in/…"
                    value={displayDraft.linkedinUrl ?? ''}
                    onChange={(e) => editing && setDraft((d) => (d ? { ...d, linkedinUrl: e.target.value } : d))}
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="web">
                    Website
                  </label>
                  <input
                    id="web"
                    className="text-input focus-ring"
                    disabled={!editing}
                    placeholder="https://"
                    value={displayDraft.website ?? ''}
                    onChange={(e) => editing && setDraft((d) => (d ? { ...d, website: e.target.value } : d))}
                  />
                </div>
              </div>

              <AddressFields<Contact> draft={displayDraft} editing={editing} setDraft={setDraft} />

              <EmailsBlock draft={displayDraft as Contact} editing={editing} setDraft={setDraft} />
              <PhonesBlock draft={displayDraft as Contact} editing={editing} setDraft={setDraft} />

              <MultiPick
                label="Companies"
                empty="Add companies in the Companies tab first."
                options={companies}
                selectedIds={displayDraft.companyIds ?? []}
                disabled={!editing}
                onToggle={(id, on) => {
                  if (!editing) return
                  setDraft((d) => {
                    if (!d) return d
                    const cur = new Set(d.companyIds ?? [])
                    if (on) cur.add(id)
                    else cur.delete(id)
                    return { ...d, companyIds: [...cur] }
                  })
                }}
              />

              <IndustrySearchPick
                label="Industries"
                emptyLibrary="Add industries in the Industries tab first."
                industries={industries}
                industryMap={industryMap}
                selectedIds={displayDraft.industryIds ?? []}
                disabled={!editing}
                onAdd={(id) => {
                  if (!editing) return
                  setDraft((d) => {
                    if (!d) return d
                    const cur = new Set(d.industryIds ?? [])
                    cur.add(id)
                    return { ...d, industryIds: [...cur] }
                  })
                }}
                onRemove={(id) => {
                  if (!editing) return
                  setDraft((d) => {
                    if (!d) return d
                    const cur = new Set(d.industryIds ?? [])
                    cur.delete(id)
                    return { ...d, industryIds: [...cur] }
                  })
                }}
              />

              <div>
                <label className="field-label" htmlFor="notes">
                  Notes
                </label>
                <textarea
                  id="notes"
                  className="textarea-input focus-ring"
                  disabled={!editing}
                  placeholder="Context, how you met, follow-ups…"
                  value={displayDraft.notes ?? ''}
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

function EmailsBlock({
  draft,
  editing,
  setDraft
}: {
  draft: Contact
  editing: boolean
  setDraft: React.Dispatch<React.SetStateAction<Partial<Contact> | null>>
}): React.ReactElement {
  const filled = (draft.emails ?? []).filter((e) => e.trim())
  if (!editing && filled.length === 0) {
    return (
      <div>
        <span className="field-label">Email addresses</span>
        <div className="muted small">No emails on file.</div>
      </div>
    )
  }
  const list = editing ? (draft.emails?.length ? draft.emails : ['']) : filled
  return (
    <div>
      <span className="field-label">Email addresses</span>
      <div className="stack-8">
        {list.map((em, idx) => (
          <div key={idx} className="stack-8-row">
            <input
              className="text-input focus-ring flex-1"
              disabled={!editing}
              placeholder="name@company.com"
              value={em}
              onChange={(e) => {
                if (!editing) return
                setDraft((d) => {
                  if (!d) return d
                  const next = [...(d.emails ?? [])]
                  while (next.length <= idx) next.push('')
                  next[idx] = e.target.value
                  return { ...d, emails: next }
                })
              }}
            />
            {editing && (
              <button
                type="button"
                className="btn btn-ghost focus-ring shrink-0"
                onClick={() =>
                  setDraft((d) => {
                    if (!d) return d
                    const next = [...(d.emails ?? [])]
                    next.splice(idx, 1)
                    return { ...d, emails: next.length ? next : [''] }
                  })
                }
              >
                Remove
              </button>
            )}
          </div>
        ))}
        {editing && (
          <button
            type="button"
            className="btn btn-ghost focus-ring align-start"
            onClick={() => setDraft((d) => (d ? { ...d, emails: [...(d.emails ?? []), ''] } : d))}
          >
            Add email
          </button>
        )}
      </div>
    </div>
  )
}

function PhonesBlock({
  draft,
  editing,
  setDraft
}: {
  draft: Contact
  editing: boolean
  setDraft: React.Dispatch<React.SetStateAction<Partial<Contact> | null>>
}): React.ReactElement {
  const filled = (draft.phones ?? []).filter((p) => p.value?.trim())
  if (!editing && filled.length === 0) {
    return (
      <div>
        <span className="field-label">Phone numbers</span>
        <div className="muted small">No phone numbers on file.</div>
      </div>
    )
  }
  const list = editing ? (draft.phones?.length ? draft.phones : [{ label: 'Cell', value: '' }]) : filled
  return (
    <div>
      <span className="field-label">Phone numbers</span>
      <div className="stack-8">
        {list.map((p, idx) => (
          <div key={idx} className="stack-8-row">
            <input
              className="text-input focus-ring input-narrow"
              disabled={!editing}
              placeholder="Label"
              value={p.label}
              onChange={(e) => {
                if (!editing) return
                setDraft((d) => {
                  if (!d) return d
                  const next = [...(d.phones ?? [])]
                  next[idx] = { ...next[idx], label: e.target.value }
                  return { ...d, phones: next }
                })
              }}
            />
            <input
              className="text-input focus-ring flex-1"
              disabled={!editing}
              placeholder="+1 …"
              value={p.value}
              onChange={(e) => {
                if (!editing) return
                setDraft((d) => {
                  if (!d) return d
                  const next = [...(d.phones ?? [])]
                  next[idx] = { ...next[idx], value: e.target.value }
                  return { ...d, phones: next }
                })
              }}
            />
            {editing && (
              <button
                type="button"
                className="btn btn-ghost focus-ring shrink-0"
                onClick={() =>
                  setDraft((d) => {
                    if (!d) return d
                    const next = [...(d.phones ?? [])]
                    next.splice(idx, 1)
                    return { ...d, phones: next.length ? next : [{ label: 'Cell', value: '' }] }
                  })
                }
              >
                Remove
              </button>
            )}
          </div>
        ))}
        {editing && (
          <button
            type="button"
            className="btn btn-ghost focus-ring align-start"
            onClick={() =>
              setDraft((d) =>
                d ? { ...d, phones: [...(d.phones ?? []), { label: 'Work', value: '' }] } : d
              )
            }
          >
            Add phone
          </button>
        )}
      </div>
    </div>
  )
}

function MultiPick({
  label,
  empty,
  options,
  getOptionLabel,
  selectedIds,
  disabled,
  onToggle
}: {
  label: string
  empty: string
  options: Company[] | Industry[]
  getOptionLabel?: (o: Company | Industry) => string
  selectedIds: string[]
  disabled: boolean
  onToggle: (id: string, on: boolean) => void
}): React.ReactElement {
  const set = useMemo(() => new Set(selectedIds), [selectedIds])
  return (
    <div>
      <span className="field-label">{label}</span>
      {options.length === 0 ? (
        <div className="muted small">{empty}</div>
      ) : (
        <div className="scroll-y pick-scroll">
          {options.map((o) => {
            const on = set.has(o.id)
            const text = getOptionLabel ? getOptionLabel(o) : o.name
            return (
              <label
                key={o.id}
                className="pick-row"
                style={{ cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.65 : 1 }}
              >
                <input
                  type="checkbox"
                  disabled={disabled}
                  checked={on}
                  onChange={(e) => onToggle(o.id, e.target.checked)}
                />
                <span>{text}</span>
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}
