import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Company, Contact, Industry } from '../../../shared/types'
import LabeledContactChannelRow from '../components/LabeledContactChannelRow'
import { useApp } from '../context/AppContext'
import AddressFields from '../components/AddressFields'
import CategoryPills from '../components/CategoryPills'
import ContactAvatar from '../components/ContactAvatar'
import ContactFilterPanel from '../components/ContactFilterPanel'
import DepartmentMenu from '../components/DepartmentMenu'
import IndustrySearchPick from '../components/IndustrySearchPick'
import LinkedInGlyph from '../components/LinkedInGlyph'
import { useWorkspacePhotoUrl } from '../hooks/useWorkspacePhotoUrl'
import { contactDisplayName, companyById, contactLinkedInOpenUrl, industryPathLabel } from '../lib/format'
import { contactPassesFilters, createDefaultContactFilters } from '../lib/recordFilters'

function emptyContact(): Omit<Contact, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    firstName: '',
    lastName: '',
    title: '',
    category: 'work',
    emails: [],
    phones: [{ label: 'Mobile', value: '' }],
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

  const {
    photoDndError,
    photoDragOver,
    setPhotoDragOver,
    photoFileInputRef,
    photoFieldRef,
    resetPhotoFieldUi,
    applyPhotoFile,
    onPhotoFileInputChange,
    onPhotoFieldPasteCapture,
    setPhotoDndError
  } = useWorkspacePhotoUrl<Contact>(editing, draft, setDraft)

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
    resetPhotoFieldUi()
    setDraft({ ...emptyContact(), id: undefined })
  }, [resetPhotoFieldUi])

  const startCreateAtSharedPin = useCallback(
    (p: { latitude: number; longitude: number; address?: string }) => {
      setSelectedId(null)
      setCreating(true)
      setEditing(true)
      setConfirmDelete(false)
      resetPhotoFieldUi()
      setDraft({
        ...emptyContact(),
        id: undefined,
        latitude: p.latitude,
        longitude: p.longitude,
        address: (p.address ?? '').trim() || ''
      })
    },
    [resetPhotoFieldUi]
  )

  const startEdit = useCallback((c: Contact) => {
    setCreating(false)
    setSelectedId(c.id)
    setEditing(true)
    setConfirmDelete(false)
    resetPhotoFieldUi()
    setDraft({ ...c })
  }, [resetPhotoFieldUi])

  const cancelEdit = useCallback(() => {
    resetPhotoFieldUi()
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
  }, [creating, selected, resetPhotoFieldUi])

  const save = useCallback(async () => {
    if (!draft) return
    const first = (draft.firstName ?? '').trim()
    const last = (draft.lastName ?? '').trim()
    if (!first && !last) return
    setSaving(true)
    try {
      const emails = (draft.emails ?? [])
        .map((e) => ({
          label: (e.label ?? 'Other').trim() || 'Other',
          value: (e.value ?? '').trim()
        }))
        .filter((e) => e.value)
      const deptRaw = draft.department
      const departmentField: string | null =
        deptRaw != null && String(deptRaw).trim() ? String(deptRaw).trim() : null
      const {
        department: _omitDept,
        photoUrl: headshotData,
        linkedinUrl: liDraft,
        website: webDraft,
        ...draftRest
      } = draft
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
        departmentField,
        {
          photoUrl: typeof headshotData === 'string' ? headshotData : '',
          linkedinUrl: (liDraft ?? '').trim(),
          website: (webDraft ?? '').trim()
        }
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
      resetPhotoFieldUi()
      setDraft({ ...c })
      setConfirmDelete(false)
    },
    [resetPhotoFieldUi]
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

  const linkedInOpenUrl = useMemo(() => {
    if (!displayDraft) return null
    return contactLinkedInOpenUrl(displayDraft as Contact)
  }, [displayDraft])

  const openLinkedInProfile = useCallback(() => {
    if (!linkedInOpenUrl) return
    void window.book.openExternal(linkedInOpenUrl)
  }, [linkedInOpenUrl])

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
            const rowLi = contactLinkedInOpenUrl(c)
            return (
              <div
                key={c.id}
                role="button"
                tabIndex={0}
                className={`list-row focus-ring${on ? ' list-row--active' : ''}`}
                onClick={() => openDetail(c)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    openDetail(c)
                  }
                }}
              >
                <ContactAvatar key={c.id} contact={c} size="sm" />
                <div className="list-row-main">
                  <div className="list-row-title-line">
                    <span className="list-row-title">{contactDisplayName(c)}</span>
                    {rowLi ? (
                      <button
                        type="button"
                        className="list-row-linkedin-emblem focus-ring"
                        aria-label={`Open ${contactDisplayName(c)} on LinkedIn`}
                        onClick={(e) => {
                          e.stopPropagation()
                          void window.book.openExternal(rowLi)
                        }}
                        onKeyDown={(e) => {
                          e.stopPropagation()
                        }}
                      >
                        <LinkedInGlyph className="list-row-linkedin-emblem-icon" />
                      </button>
                    ) : null}
                  </div>
                  <div className="list-row-sub">
                    {c.title ||
                      c.department ||
                      c.companyIds.map((id) => companyById(companyMap, id)).join(', ') ||
                      'No title yet'}
                  </div>
                </div>
              </div>
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
                <ContactAvatar key={(displayDraft as Contact).id} contact={displayDraft as Contact} size="xl" />
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
                    {linkedInOpenUrl ? (
                      <button
                        type="button"
                        className="btn-profile-linkedin btn-profile-linkedin--icon-only focus-ring"
                        aria-label="Open LinkedIn profile in browser"
                        onClick={() => void openLinkedInProfile()}
                      >
                        <LinkedInGlyph className="btn-profile-linkedin-icon" />
                      </button>
                    ) : null}
                    <button type="button" className="btn btn-danger focus-ring" onClick={() => setConfirmDelete(true)}>
                      Delete
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button" className="btn btn-ghost focus-ring" onClick={cancelEdit} disabled={saving}>
                      Cancel
                    </button>
                    {linkedInOpenUrl ? (
                      <button
                        type="button"
                        className="btn-profile-linkedin btn-profile-linkedin--icon-only focus-ring"
                        aria-label="Open LinkedIn profile in browser"
                        onClick={() => void openLinkedInProfile()}
                        disabled={saving}
                      >
                        <LinkedInGlyph className="btn-profile-linkedin-icon" />
                      </button>
                    ) : null}
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
              {editing && (
                <div>
                  <label
                    className="field-label field-label--interactive"
                    id="contact-photo-label"
                    onClick={() => photoFieldRef.current?.focus()}
                  >
                    Profile photo
                  </label>
                  <div
                    ref={photoFieldRef}
                    id="contact-photo-field"
                    className={`contact-photo-field focus-ring${photoDragOver ? ' contact-photo-field--drag' : ''}`}
                    tabIndex={0}
                    role="group"
                    aria-labelledby="contact-photo-label"
                    aria-describedby="contact-photo-field-desc"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        photoFileInputRef.current?.click()
                      }
                    }}
                    onPasteCapture={(e) => onPhotoFieldPasteCapture(e.nativeEvent)}
                    onDragEnter={(ev) => {
                      ev.preventDefault()
                      ev.stopPropagation()
                      setPhotoDragOver(true)
                    }}
                    onDragLeave={(ev) => {
                      ev.preventDefault()
                      ev.stopPropagation()
                      if (!ev.currentTarget.contains(ev.relatedTarget as Node)) setPhotoDragOver(false)
                    }}
                    onDragOver={(ev) => {
                      ev.preventDefault()
                      ev.stopPropagation()
                      ev.dataTransfer.dropEffect = 'copy'
                    }}
                    onDrop={(ev) => {
                      ev.preventDefault()
                      ev.stopPropagation()
                      setPhotoDragOver(false)
                      const f = ev.dataTransfer.files?.[0]
                      if (f) void applyPhotoFile(f)
                    }}
                  >
                    <div className="contact-photo-field-body">
                      <ContactAvatar contact={displayDraft as Contact} size="sm" />
                      <div className="contact-photo-field-copy">
                        <p className="contact-photo-field-lead" id="contact-photo-field-desc">
                          Drop an image on this area, or click here and paste with ⌘V or Ctrl+V.
                        </p>
                        <p className="muted small contact-photo-field-actions">
                          <button
                            type="button"
                            className="btn-link"
                            onClick={() => photoFileInputRef.current?.click()}
                          >
                            Browse files
                          </button>
                          {(displayDraft as Contact).photoUrl?.trim() ? (
                            <>
                              <span aria-hidden className="contact-photo-field-sep">
                                {' · '}
                              </span>
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
                        </p>
                      </div>
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
                      <p className="contact-photo-field-error small" role="alert">
                        {photoDndError}
                      </p>
                    ) : null}
                  </div>
                </div>
              )}
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
  const filled = (draft.emails ?? []).filter((e) => e.value?.trim())
  if (!editing && filled.length === 0) {
    return (
      <div>
        <span className="field-label">Email addresses</span>
        <div className="muted small">No emails on file.</div>
      </div>
    )
  }
  const defaultRow = { label: 'Work', value: '' }
  const list = editing ? (draft.emails?.length ? draft.emails : [defaultRow]) : filled
  return (
    <div>
      <span className="field-label">Email addresses</span>
      <div className="stack-8 stack-8--channel-fields">
        {list.map((em, idx) => (
          <div key={idx} className="channel-field-row">
            <LabeledContactChannelRow
              kind="email"
              menuId={`contact-email-label-${idx}`}
              disabled={!editing}
              label={em.label || 'Other'}
              value={em.value}
              valuePlaceholder="name@company.com"
              onLabelChange={(next) => {
                if (!editing) return
                setDraft((d) => {
                  if (!d) return d
                  const nextList = [...(d.emails ?? [])]
                  while (nextList.length <= idx) nextList.push({ ...defaultRow })
                  nextList[idx] = { ...nextList[idx], label: next }
                  return { ...d, emails: nextList }
                })
              }}
              onValueChange={(next) => {
                if (!editing) return
                setDraft((d) => {
                  if (!d) return d
                  const nextList = [...(d.emails ?? [])]
                  while (nextList.length <= idx) nextList.push({ ...defaultRow })
                  nextList[idx] = { ...nextList[idx], value: next }
                  return { ...d, emails: nextList }
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
                    return { ...d, emails: next.length ? next : [defaultRow] }
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
            className="channel-field-add-link"
            onClick={() =>
              setDraft((d) =>
                d ? { ...d, emails: [...(d.emails ?? []), { label: 'Work', value: '' }] } : d
              )
            }
          >
            Add another email
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
  const defaultRow = { label: 'Mobile', value: '' }
  const list = editing ? (draft.phones?.length ? draft.phones : [defaultRow]) : filled
  return (
    <div>
      <span className="field-label">Phone numbers</span>
      <div className="stack-8 stack-8--channel-fields">
        {list.map((p, idx) => (
          <div key={idx} className="channel-field-row">
            <LabeledContactChannelRow
              kind="phone"
              menuId={`contact-phone-label-${idx}`}
              disabled={!editing}
              label={p.label || 'Other'}
              value={p.value}
              valuePlaceholder="(555) 555-0100"
              onLabelChange={(next) => {
                if (!editing) return
                setDraft((d) => {
                  if (!d) return d
                  const nextList = [...(d.phones ?? [])]
                  while (nextList.length <= idx) nextList.push({ ...defaultRow })
                  nextList[idx] = { ...nextList[idx], label: next }
                  return { ...d, phones: nextList }
                })
              }}
              onValueChange={(next) => {
                if (!editing) return
                setDraft((d) => {
                  if (!d) return d
                  const nextList = [...(d.phones ?? [])]
                  while (nextList.length <= idx) nextList.push({ ...defaultRow })
                  nextList[idx] = { ...nextList[idx], value: next }
                  return { ...d, phones: nextList }
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
                    return { ...d, phones: next.length ? next : [defaultRow] }
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
            className="channel-field-add-link"
            onClick={() =>
              setDraft((d) =>
                d ? { ...d, phones: [...(d.phones ?? []), { label: 'Mobile', value: '' }] } : d
              )
            }
          >
            Add another phone
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
