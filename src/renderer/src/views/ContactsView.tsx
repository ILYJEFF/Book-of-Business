import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import type { Company, Contact, Industry } from '../../../shared/types'
import { useApp } from '../context/AppContext'
import AddressFields from '../components/AddressFields'
import CategoryPills from '../components/CategoryPills'
import ContactAvatar from '../components/ContactAvatar'
import ContactFilterPanel from '../components/ContactFilterPanel'
import DepartmentMenu from '../components/DepartmentMenu'
import IndustrySearchPick from '../components/IndustrySearchPick'
import {
  clipboardDataToPhotoDataUrl,
  dataTransferHasExplicitImageMime,
  imageFileToPhotoDataUrl,
  normalizeEmbeddedPhotoDataUrl
} from '../lib/contactPhoto'
import { contactDisplayName, companyById, industryPathLabel } from '../lib/format'
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
  const [photoDndError, setPhotoDndError] = useState<string | null>(null)
  const [photoDragOver, setPhotoDragOver] = useState(false)
  const photoFileInputRef = useRef<HTMLInputElement>(null)
  const editingRef = useRef(editing)
  const draftRef = useRef(draft)
  editingRef.current = editing
  draftRef.current = draft
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
    setPhotoDndError(null)
    setPhotoDragOver(false)
    setDraft({ ...emptyContact(), id: undefined })
  }, [])

  const startCreateAtSharedPin = useCallback(
    (p: { latitude: number; longitude: number; address?: string }) => {
      setSelectedId(null)
      setCreating(true)
      setEditing(true)
      setConfirmDelete(false)
      setPhotoDndError(null)
      setPhotoDragOver(false)
      setDraft({
        ...emptyContact(),
        id: undefined,
        latitude: p.latitude,
        longitude: p.longitude,
        address: (p.address ?? '').trim() || ''
      })
    },
    []
  )

  const startEdit = useCallback((c: Contact) => {
    setCreating(false)
    setSelectedId(c.id)
    setEditing(true)
    setConfirmDelete(false)
    setPhotoDndError(null)
    setPhotoDragOver(false)
    setDraft({ ...c })
  }, [])

  const cancelEdit = useCallback(() => {
    setPhotoDndError(null)
    setPhotoDragOver(false)
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
      const deptRaw = draft.department
      const departmentField: string | null =
        deptRaw != null && String(deptRaw).trim() ? String(deptRaw).trim() : null
      const { department: _omitDept, ...draftRest } = draft
      const saved = await window.book.saveContact(
        {
          ...draftRest,
          firstName: first || 'Unknown',
          lastName: last || '',
          category: draft.category ?? 'work',
          emails,
          phones: (draft.phones ?? []).filter((p) => p.value?.trim()),
          companyIds: draft.companyIds ?? [],
          industryIds: draft.industryIds ?? []
        },
        departmentField
      )
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

  const applyContactPhotoFile = useCallback(async (file: File) => {
    setPhotoDndError(null)
    try {
      const url = await imageFileToPhotoDataUrl(file)
      setDraft((d) => (d ? { ...d, photoUrl: url } : d))
    } catch (err) {
      setPhotoDndError(err instanceof Error ? err.message : 'Could not use that image.')
    }
  }, [])

  const onPhotoFileInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0]
      e.target.value = ''
      if (f) void applyContactPhotoFile(f)
    },
    [applyContactPhotoFile]
  )

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
      setPhotoDndError(null)
      setPhotoDragOver(false)
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

  /** Electron often omits image bytes from `clipboardData`; main `clipboard.readImage()` fixes that. */
  useEffect(() => {
    if (!editing) return

    const onPaste = (e: ClipboardEvent): void => {
      if (!editingRef.current || !draftRef.current) return

      for (const n of e.composedPath()) {
        if (!(n instanceof HTMLElement)) continue
        const t = n.tagName
        if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT' || t === 'OPTION') return
        if (n.isContentEditable) return
      }

      const cd = e.clipboardData

      const applyUrl = (url: string): void => {
        setPhotoDndError(null)
        setDraft((d) => (d ? { ...d, photoUrl: url } : d))
      }

      const fail = (err: unknown): void => {
        setPhotoDndError(err instanceof Error ? err.message : 'Could not paste that image.')
      }

      if (cd) {
        const plain = cd.getData('text/plain').trim()
        if (
          plain.startsWith('data:image/') &&
          plain.includes(',') &&
          plain.length <= 3_500_000
        ) {
          e.preventDefault()
          void normalizeEmbeddedPhotoDataUrl(plain).then(applyUrl).catch(fail)
          return
        }

        if (dataTransferHasExplicitImageMime(cd)) {
          e.preventDefault()
          void clipboardDataToPhotoDataUrl(cd)
            .then((url) => {
              if (url) applyUrl(url)
            })
            .catch(fail)
          return
        }
      }

      let native: string | null = null
      try {
        native = window.book.readClipboardImageDataUrlSync()
      } catch {
        native = null
      }
      if (native) {
        e.preventDefault()
        void normalizeEmbeddedPhotoDataUrl(native).then(applyUrl).catch(fail)
        return
      }

      if (cd) {
        void clipboardDataToPhotoDataUrl(cd).then((url) => {
          if (url) applyUrl(url)
        })
      }
    }

    window.addEventListener('paste', onPaste, true)
    return () => window.removeEventListener('paste', onPaste, true)
  }, [editing])

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
                <ContactAvatar key={c.id} contact={c} size="sm" />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="list-row-title">{contactDisplayName(c)}</div>
                  <div className="list-row-sub">
                    {c.title ||
                      c.department ||
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
            <p className="folio-kicker">Contacts</p>
            <div className="empty-canvas-rule" aria-hidden />
            <h2 className="empty-canvas-title">No row selected</h2>
            <p className="empty-canvas-text">Pick someone from the list or create a contact. One JSON file per person in your library folder.</p>
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
                {editing ? (
                  <div
                    className={`contact-photo-dropzone focus-ring${photoDragOver ? ' contact-photo-dropzone--drag' : ''}`}
                    tabIndex={0}
                    role="button"
                    aria-label="Contact photo: drop an image, paste (works anywhere in the form except text fields), or choose a file"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        photoFileInputRef.current?.click()
                      }
                    }}
                    onDragEnter={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setPhotoDragOver(true)
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      if (!e.currentTarget.contains(e.relatedTarget as Node)) setPhotoDragOver(false)
                    }}
                    onDragOver={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      e.dataTransfer.dropEffect = 'copy'
                    }}
                    onDrop={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setPhotoDragOver(false)
                      const f = e.dataTransfer.files?.[0]
                      if (f) void applyContactPhotoFile(f)
                    }}
                  >
                    <ContactAvatar contact={displayDraft as Contact} size="lg" />
                    <div className="contact-photo-dropzone-hint muted small">
                      Drop a photo, paste while editing (⌘V outside text fields), or{' '}
                      <button
                        type="button"
                        className="btn-link"
                        onClick={() => photoFileInputRef.current?.click()}
                      >
                        choose file
                      </button>
                      .
                      {(displayDraft as Contact).photoUrl?.trim() ? (
                        <>
                          {' '}
                          <button
                            type="button"
                            className="btn-link"
                            onClick={() => {
                              setPhotoDndError(null)
                              setDraft((d) => (d ? { ...d, photoUrl: '' } : d))
                            }}
                          >
                            Remove photo
                          </button>
                        </>
                      ) : null}
                    </div>
                    <input
                      ref={photoFileInputRef}
                      type="file"
                      accept="image/*"
                      className="visually-hidden"
                      tabIndex={-1}
                      onChange={onPhotoFileInputChange}
                    />
                    {photoDndError ? (
                      <p className="contact-photo-dropzone-error small" role="alert">
                        {photoDndError}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <ContactAvatar key={(displayDraft as Contact).id} contact={displayDraft as Contact} size="lg" />
                )}
                <div style={{ minWidth: 0 }}>
                  <h2 className="detail-title">{contactDisplayName(displayDraft as Contact)}</h2>
                  <p className="detail-meta">
                    {creating ? 'New entry' : 'JSON file in your folder'}
                    {!creating && (displayDraft as Contact).birthday && (
                      <> · Birthday {(displayDraft as Contact).birthday}</>
                    )}
                  </p>
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

              <div className="form-row-2">
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
                <div>
                  <label className="field-label" htmlFor="dept">
                    Department
                  </label>
                  {!editing ? (
                    <p className="muted small" style={{ marginTop: 4, marginBottom: 0 }}>
                      {(displayDraft as Contact).department?.trim() || 'No department on file.'}
                    </p>
                  ) : (
                    <DepartmentMenu
                      id="dept"
                      value={(displayDraft as Contact).department}
                      onChange={(next) =>
                        setDraft((d) => (d ? { ...d, department: next } : d))
                      }
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="field-label" htmlFor="birthday">
                  Birthday
                </label>
                {!editing ? (
                  (displayDraft as Contact).birthday ? (
                    <p className="muted small" style={{ marginTop: 4, marginBottom: 0 }}>
                      {(displayDraft as Contact).birthday}
                    </p>
                  ) : (
                    <p className="muted small" style={{ marginTop: 4, marginBottom: 0 }}>
                      No birthday on file.
                    </p>
                  )
                ) : (
                  <input
                    id="birthday"
                    type="date"
                    className="text-input focus-ring"
                    value={(displayDraft as Contact).birthday ?? ''}
                    onChange={(e) =>
                      editing &&
                      setDraft((d) =>
                        d ? { ...d, birthday: e.target.value.trim() || undefined } : d
                      )
                    }
                  />
                )}
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

              <AddressFields<Contact>
                draft={displayDraft}
                editing={editing}
                setDraft={setDraft}
                sharePinAction={{
                  label: 'New contact at this pin',
                  title:
                    'Start another contact with these map coordinates and the same address line. Save or cancel open edits first if you need them.',
                  onClick: startCreateAtSharedPin
                }}
              />

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

            {editing && (
              <footer className="detail-form-footer">
                <div className="detail-form-footer-inner">
                  <button type="button" className="btn btn-ghost focus-ring" onClick={cancelEdit} disabled={saving}>
                    Cancel
                  </button>
                  <button type="button" className="btn btn-primary focus-ring" onClick={() => void save()} disabled={saving}>
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </footer>
            )}
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
