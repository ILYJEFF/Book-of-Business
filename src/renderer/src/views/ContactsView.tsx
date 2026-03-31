import { useCallback, useMemo, useState } from 'react'
import type { Company, Contact, Industry } from '../../../shared/types'
import { useApp } from '../context/AppContext'
import CategoryPills from '../components/CategoryPills'
import { contactDisplayName, companyById, industryById, initials } from '../lib/format'

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
    notes: ''
  }
}

export default function ContactsView(): React.ReactElement {
  const { contacts, companies, industries, refresh } = useApp()
  const [query, setQuery] = useState('')
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return contacts
    return contacts.filter((c) => {
      const blob = [
        c.firstName,
        c.lastName,
        c.title,
        ...(c.emails ?? []),
        ...(c.phones?.map((p) => p.value) ?? []),
        ...c.companyIds.map((id) => companyById(companyMap, id)),
        ...c.industryIds.map((id) => industryById(industryMap, id))
      ]
        .join(' ')
        .toLowerCase()
      return blob.includes(q)
    })
  }, [contacts, query, companyMap, industryMap])

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
    await window.book.deleteContact(selected.id)
    await refresh()
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

  const displayDraft = editing && draft ? draft : selected

  return (
    <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
      <div
        style={{
          width: 340,
          minWidth: 280,
          borderRight: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-raised)'
        }}
      >
        <div style={{ padding: '16px 14px 12px', display: 'flex', gap: 8 }}>
          <input
            className="text-input focus-ring"
            placeholder="Search people, companies, tags…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ flex: 1 }}
          />
        </div>
        <div style={{ padding: '0 14px 12px' }}>
          <button type="button" className="btn btn-primary focus-ring" style={{ width: '100%' }} onClick={startCreate}>
            New contact
          </button>
        </div>
        <div className="scroll-y" style={{ flex: 1 }}>
          {filtered.map((c) => {
            const on = c.id === selectedId && !creating
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => openDetail(c)}
                className="focus-ring"
                style={{
                  width: '100%',
                  border: 'none',
                  borderBottom: '1px solid var(--border-subtle)',
                  background: on ? 'var(--bg-panel)' : 'transparent',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  textAlign: 'left',
                  color: 'var(--text-primary)'
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: 'var(--accent-dim)',
                    border: '1px solid rgba(138,180,212,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 13,
                    fontWeight: 700,
                    color: 'var(--accent)',
                    flexShrink: 0
                  }}
                >
                  {initials(c)}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {contactDisplayName(c)}
                  </div>
                  <div className="muted small" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {c.title ||
                      c.companyIds.map((id) => companyById(companyMap, id)).join(', ') ||
                      'No title yet'}
                  </div>
                </div>
              </button>
            )
          })}
          {filtered.length === 0 && (
            <div className="muted small" style={{ padding: 24 }}>
              No matches. Try another search or add someone new.
            </div>
          )}
        </div>
      </div>

      <div className="scroll-y" style={{ flex: 1, background: 'var(--bg-base)' }}>
        {!displayDraft && !creating && (
          <div className="muted" style={{ padding: 48, maxWidth: 420 }}>
            Select a person on the left, or create a new contact.
          </div>
        )}
        {displayDraft && (
          <div style={{ padding: '28px 36px 48px', maxWidth: 720 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 14,
                    background: 'var(--accent-dim)',
                    border: '1px solid rgba(138,180,212,0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 18,
                    fontWeight: 700,
                    color: 'var(--accent)'
                  }}
                >
                  {initials(displayDraft as Contact)}
                </div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 600 }}>{contactDisplayName(displayDraft as Contact)}</div>
                  <div className="muted small" style={{ marginTop: 4 }}>
                    {creating ? 'New entry' : 'Saved on device as JSON'}
                  </div>
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
                <div style={{ fontWeight: 600 }}>Delete this contact?</div>
                <div className="muted small" style={{ marginTop: 6 }}>
                  The JSON file will be removed from your library folder.
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

            <div style={{ marginTop: 28, display: 'grid', gap: 20 }}>
              <div>
                <span className="field-label">Relationship</span>
                <CategoryPills
                  value={(displayDraft.category ?? 'work') as Contact['category']}
                  disabled={!editing}
                  onChange={(cat) => editing && setDraft((d) => (d ? { ...d, category: cat } : d))}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
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

              <MultiPick
                label="Industries"
                empty="Add industries in the Industries tab first."
                options={industries}
                selectedIds={displayDraft.industryIds ?? []}
                disabled={!editing}
                onToggle={(id, on) => {
                  if (!editing) return
                  setDraft((d) => {
                    if (!d) return d
                    const cur = new Set(d.industryIds ?? [])
                    if (on) cur.add(id)
                    else cur.delete(id)
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {list.map((em, idx) => (
          <div key={idx} style={{ display: 'flex', gap: 8 }}>
            <input
              className="text-input focus-ring"
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
                className="btn btn-ghost focus-ring"
                style={{ flexShrink: 0 }}
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
            className="btn btn-ghost focus-ring"
            style={{ alignSelf: 'flex-start' }}
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {list.map((p, idx) => (
          <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              className="text-input focus-ring"
              style={{ maxWidth: 120 }}
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
              className="text-input focus-ring"
              style={{ flex: 1 }}
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
                className="btn btn-ghost focus-ring"
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
            className="btn btn-ghost focus-ring"
            style={{ alignSelf: 'flex-start' }}
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
  selectedIds,
  disabled,
  onToggle
}: {
  label: string
  empty: string
  options: Company[] | Industry[]
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
        <div
          className="scroll-y"
          style={{
            maxHeight: 180,
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            background: 'var(--bg-raised)',
            padding: 8
          }}
        >
          {options.map((o) => {
            const on = set.has(o.id)
            return (
              <label
                key={o.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 10px',
                  borderRadius: 8,
                  cursor: disabled ? 'default' : 'pointer',
                  opacity: disabled ? 0.7 : 1
                }}
              >
                <input
                  type="checkbox"
                  disabled={disabled}
                  checked={on}
                  onChange={(e) => onToggle(o.id, e.target.checked)}
                  style={{ accentColor: 'var(--accent)' }}
                />
                <span style={{ fontSize: 14 }}>{'name' in o ? o.name : (o as Industry).name}</span>
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}
