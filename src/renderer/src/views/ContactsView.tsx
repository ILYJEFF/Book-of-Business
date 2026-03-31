import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Company, Contact, ContactCategory, Industry, Tag } from '../../../shared/types'
import LabeledContactChannelRow from '../components/LabeledContactChannelRow'
import { useApp } from '../context/AppContext'
import AddressFields from '../components/AddressFields'
import CategoryPills from '../components/CategoryPills'
import ContactAvatar from '../components/ContactAvatar'
import ContactFilterPanel, { ContactRefineSheet } from '../components/ContactFilterPanel'
import DepartmentMenu from '../components/DepartmentMenu'
import IndustrySearchPick from '../components/IndustrySearchPick'
import LinkedInGlyph from '../components/LinkedInGlyph'
import { useWorkspacePhotoUrl } from '../hooks/useWorkspacePhotoUrl'
import { contactDisplayName, companyById, contactLinkedInOpenUrl, industryPathLabel } from '../lib/format'
import {
  CONTACT_CATEGORIES,
  CONTACT_CATEGORY_ORDER,
  contactPassesFilters,
  createDefaultContactFilters
} from '../lib/recordFilters'

function emptyContact(): Omit<Contact, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    firstName: '',
    lastName: '',
    favorite: false,
    title: '',
    categories: ['work'],
    emails: [],
    phones: [{ label: 'Mobile', value: '' }],
    linkedinUrl: '',
    website: '',
    companyIds: [],
    industryIds: [],
    tagIds: [],
    notes: '',
    address: '',
    attachments: []
  }
}

/** Write contact with new tag ids (used when applying a tag from profile view without opening Edit). */
async function saveContactWithTagIds(base: Contact, tagIds: string[]): Promise<Contact> {
  const first = (base.firstName ?? '').trim()
  const last = (base.lastName ?? '').trim()
  const emails = (base.emails ?? [])
    .map((e) => ({
      label: (e.label ?? 'Other').trim() || 'Other',
      value: (e.value ?? '').trim()
    }))
    .filter((e) => e.value)
  const deptRaw = base.department
  const departmentField: string | null =
    deptRaw != null && String(deptRaw).trim() ? String(deptRaw).trim() : null
  const {
    department: _omitDept,
    photoUrl: headshotData,
    linkedinUrl: liDraft,
    website: webDraft,
    ...draftRest
  } = base
  return window.book.saveContact(
    {
      ...draftRest,
      firstName: first || 'Unknown',
      lastName: last || '',
      categories: base.categories?.length ? base.categories : ['work'],
      emails,
      phones: (base.phones ?? []).filter((p) => p.value?.trim()),
      companyIds: base.companyIds ?? [],
      industryIds: base.industryIds ?? [],
      tagIds
    },
    departmentField,
    {
      photoUrl: typeof headshotData === 'string' ? headshotData : '',
      linkedinUrl: (liDraft ?? '').trim(),
      website: (webDraft ?? '').trim()
    }
  )
}

export default function ContactsView(): React.ReactElement {
  const { contacts, companies, industries, tags, refresh, openRecordRequest, clearOpenRecordRequest } = useApp()
  const [filters, setFilters] = useState(createDefaultContactFilters)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Partial<Contact> | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [favBusyId, setFavBusyId] = useState<string | null>(null)
  const [newTagName, setNewTagName] = useState('')
  const [tagCreateBusy, setTagCreateBusy] = useState(false)
  const [contactRefineOpen, setContactRefineOpen] = useState(false)

  const selected = useMemo(
    () => contacts.find((c) => c.id === selectedId) ?? null,
    [contacts, selectedId]
  )

  const {
    photoDndError,
    photoDragOver,
    setPhotoDragOver,
    photoFileInputRef,
    photoFieldRef,
    resetPhotoFieldUi,
    applyPhotoFile,
    onPhotoFileInputChange,
    setPhotoDndError,
    onPhotoFieldPasteCapture
  } = useWorkspacePhotoUrl<Contact>(editing, draft, setDraft, editing ? selected : null)

  const companyMap = useMemo(
    () => new Map(companies.map((c) => [c.id, c] as const)),
    [companies]
  )
  const industryMap = useMemo(
    () => new Map(industries.map((i) => [i.id, i] as const)),
    [industries]
  )
  const tagMap = useMemo(() => new Map(tags.map((t) => [t.id, t] as const)), [tags])

  const filtered = useMemo(
    () => contacts.filter((c) => contactPassesFilters(c, filters, companyMap, industryMap, tagMap)),
    [contacts, filters, companyMap, industryMap, tagMap]
  )

  const startCreate = useCallback(() => {
    setSelectedId(null)
    setCreating(true)
    setEditing(true)
    setConfirmDelete(false)
    resetPhotoFieldUi()
    setNewTagName('')
    setDraft({ ...emptyContact(), id: undefined })
  }, [resetPhotoFieldUi])

  const startCreateAtSharedPin = useCallback(
    (p: { latitude: number; longitude: number; address?: string }) => {
      setSelectedId(null)
      setCreating(true)
      setEditing(true)
      setConfirmDelete(false)
      resetPhotoFieldUi()
      setNewTagName('')
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
    setNewTagName('')
    setDraft({ ...c })
  }, [resetPhotoFieldUi])

  const cancelEdit = useCallback(() => {
    resetPhotoFieldUi()
    setNewTagName('')
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
          categories: draft.categories?.length ? draft.categories : ['work'],
          emails,
          phones: (draft.phones ?? []).filter((p) => p.value?.trim()),
          companyIds: draft.companyIds ?? [],
          industryIds: draft.industryIds ?? [],
          tagIds: draft.tagIds ?? []
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
      setNewTagName('')
    } finally {
      setSaving(false)
    }
  }, [draft, refresh])

  const createTagFromProfile = useCallback(async () => {
    const name = newTagName.trim()
    if (!name || tagCreateBusy) return
    setTagCreateBusy(true)
    try {
      const savedTag = await window.book.saveTag({ name })
      await refresh({ background: true })

      const persistOnDiskImmediately = !creating && selected != null && !editing

      if (persistOnDiskImmediately) {
        const nextTagIds = [...new Set([...(selected.tagIds ?? []), savedTag.id])]
        const updated = await saveContactWithTagIds(selected, nextTagIds)
        await refresh({ background: true })
        setDraft({ ...updated })
      } else if (draft) {
        setDraft((d) => {
          if (!d) return d
          const cur = new Set(d.tagIds ?? [])
          cur.add(savedTag.id)
          return { ...d, tagIds: [...cur] }
        })
      }

      setNewTagName('')
    } finally {
      setTagCreateBusy(false)
    }
  }, [newTagName, tagCreateBusy, refresh, creating, selected, editing, draft])

  const remove = useCallback(async () => {
    if (!selected) return
    await window.book.deleteContact(selected.id)
    await refresh({ background: true })
    setSelectedId(null)
    setDraft(null)
    setEditing(false)
    setConfirmDelete(false)
    setNewTagName('')
  }, [selected, refresh])

  const openDetail = useCallback(
    (c: Contact) => {
      setSelectedId(c.id)
      setCreating(false)
      setEditing(false)
      resetPhotoFieldUi()
      setNewTagName('')
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

  const displayDraft = editing ? (draft ?? selected) : selected

  const showInlineTagCreate =
    Boolean(displayDraft && !creating && (displayDraft as Contact).id) || (creating && editing)

  const linkedInOpenUrl = useMemo(() => {
    if (!displayDraft) return null
    return contactLinkedInOpenUrl(displayDraft as Contact)
  }, [displayDraft])

  const openLinkedInProfile = useCallback(() => {
    if (!linkedInOpenUrl) return
    void window.book.openExternal(linkedInOpenUrl)
  }, [linkedInOpenUrl])

  const toggleFavoriteForContact = useCallback(
    async (c: Contact, e?: React.MouseEvent | React.KeyboardEvent) => {
      e?.stopPropagation()
      const next = !(c.favorite === true)
      setFavBusyId(c.id)
      try {
        await window.book.setContactFavorite(c.id, next)
        await refresh({ background: true })
        setDraft((d) => (d && d.id === c.id ? { ...d, favorite: next } : d))
      } finally {
        setFavBusyId(null)
      }
    },
    [refresh]
  )

  const toggleFavoriteInDetail = useCallback(async () => {
    const c = displayDraft as Contact | null
    if (!c?.id || creating) return
    await toggleFavoriteForContact(c)
  }, [displayDraft, creating, toggleFavoriteForContact])

  return (
    <div className="split-view">
      <div className="list-column">
        <div className="list-column-stack">
          <div className="list-toolbar list-toolbar--filters">
            <ContactFilterPanel
              filters={filters}
              setFilters={setFilters}
              total={contacts.length}
              shown={filtered.length}
              onNew={startCreate}
              onOpenRefine={() => setContactRefineOpen(true)}
            />
          </div>
          <div className="list-main">
            <ContactRefineSheet
              open={contactRefineOpen}
              onClose={() => setContactRefineOpen(false)}
              filters={filters}
              setFilters={setFilters}
              companies={companies}
              industries={industries}
              industryMap={industryMap}
              tags={tags}
            />
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
                        <button
                          type="button"
                          className={`list-row-favorite-btn focus-ring${c.favorite === true ? ' list-row-favorite-btn--on' : ''}`}
                          aria-label={c.favorite === true ? 'Remove from favorites' : 'Add to favorites'}
                          aria-pressed={c.favorite === true}
                          disabled={favBusyId === c.id}
                          onClick={(e) => void toggleFavoriteForContact(c, e)}
                          onKeyDown={(e) => e.stopPropagation()}
                        >
                          ★
                        </button>
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
                {!creating && (displayDraft as Contact).id ? (
                  <button
                    type="button"
                    className={`btn-favorite focus-ring${(displayDraft as Contact).favorite === true ? ' btn-favorite--on' : ''}`}
                    aria-pressed={(displayDraft as Contact).favorite === true}
                    aria-label={
                      (displayDraft as Contact).favorite === true ? 'Remove from favorites' : 'Add to favorites'
                    }
                    disabled={favBusyId === (displayDraft as Contact).id || saving}
                    onClick={() => void toggleFavoriteInDetail()}
                  >
                    ★
                  </button>
                ) : null}
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
                  The JSON file and any documents in <code className="inline-code">contact-attachments</code> for this
                  person will be removed from your library folder.
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
                    onPasteCapture={onPhotoFieldPasteCapture}
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
                {!editing ? (
                  <p className="muted small" style={{ marginTop: 6, marginBottom: 0 }}>
                    {((displayDraft as Contact).categories ?? ['work'])
                      .map(
                        (cat) => CONTACT_CATEGORIES.find((c) => c.id === cat)?.label ?? cat
                      )
                      .join(' · ')}
                  </p>
                ) : (
                  <>
                    <CategoryPills
                      value={
                        (displayDraft as Contact).categories?.length
                          ? CONTACT_CATEGORY_ORDER.filter((c) =>
                              (displayDraft as Contact).categories!.includes(c)
                            )
                          : ['work']
                      }
                      disabled={!editing}
                      onToggle={(cat) => {
                        if (!editing) return
                        setDraft((d) => {
                          if (!d) return d
                          const cur = new Set(
                            d.categories?.length ? d.categories : (['work'] as ContactCategory[])
                          )
                          if (cur.has(cat)) {
                            cur.delete(cat)
                            if (cur.size === 0) cur.add('work')
                          } else {
                            cur.add(cat)
                          }
                          return {
                            ...d,
                            categories: CONTACT_CATEGORY_ORDER.filter((c) => cur.has(c))
                          }
                        })
                      }}
                    />
                    <p className="muted small" style={{ marginTop: 6, marginBottom: 0 }}>
                      Select every relationship that fits. At least one stays on.
                    </p>
                  </>
                )}
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
                <span className="field-label">Tags</span>
                {showInlineTagCreate ? (
                  <>
                    <div className="contact-tag-create">
                      <input
                        type="text"
                        className="text-input focus-ring contact-tag-create-input"
                        placeholder="e.g. Open to relocation, Speaks Spanish"
                        value={newTagName}
                        disabled={tagCreateBusy || saving}
                        aria-label="New tag name"
                        onChange={(e) => setNewTagName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            void createTagFromProfile()
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="btn btn-ghost focus-ring contact-tag-create-btn"
                        disabled={!newTagName.trim() || tagCreateBusy || saving}
                        onClick={() => void createTagFromProfile()}
                      >
                        {tagCreateBusy ? 'Creating…' : 'Create tag'}
                      </button>
                    </div>
                    <p className="muted small contact-tag-create-hint">
                      {editing
                        ? 'Adds the tag to your library (same list as Tags in the sidebar) and checks it for this person. If you are editing other fields, press Save when done.'
                        : 'Adds the tag to your library and applies it to this person right away. Use Edit to turn other tags on or off.'}
                    </p>
                  </>
                ) : null}
                <MultiPick
                  empty="No tags in the library yet. Create one above (open a saved profile or edit a new contact) or use Tags in the sidebar."
                  options={tags}
                  selectedIds={(displayDraft as Contact).tagIds ?? []}
                  disabled={!editing}
                  onToggle={(id, on) => {
                    if (!editing) return
                    setDraft((d) => {
                      if (!d) return d
                      const cur = new Set(d.tagIds ?? [])
                      if (on) cur.add(id)
                      else cur.delete(id)
                      return { ...d, tagIds: [...cur] }
                    })
                  }}
                />
              </div>

              <ContactDocumentsSection
                contactId={creating ? undefined : (displayDraft as Contact).id}
                creating={creating}
                attachments={(displayDraft as Contact).attachments}
                refresh={refresh}
                setDraft={setDraft}
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

function formatAttachmentSize(n: number | undefined): string {
  if (n == null || !Number.isFinite(n)) return ''
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${n < 10 * 1024 ? (n / 1024).toFixed(1) : Math.round(n / 1024)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

function ContactDocumentsSection({
  contactId,
  creating,
  attachments,
  refresh,
  setDraft
}: {
  contactId: string | undefined
  creating: boolean
  attachments: Contact['attachments']
  refresh: (opts?: { background?: boolean }) => Promise<void>
  setDraft: React.Dispatch<React.SetStateAction<Partial<Contact> | null>>
}): React.ReactElement {
  const [adding, setAdding] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const list = attachments ?? []

  if (creating || !contactId) {
    return (
      <div>
        <span className="field-label">Documents</span>
        <p className="muted small" style={{ marginTop: 4, marginBottom: 0 }}>
          Save this contact first to attach résumés, personality profiles, references, cover letters, and other files.
        </p>
      </div>
    )
  }

  const onAdd = async (): Promise<void> => {
    setAdding(true)
    try {
      const r = await window.book.addContactAttachments(contactId)
      if (!r.canceled) {
        await refresh({ background: true })
        setDraft((d) => (d && d.id === contactId ? { ...d, attachments: r.contact.attachments } : d))
      }
    } finally {
      setAdding(false)
    }
  }

  const onRemove = async (attachmentId: string): Promise<void> => {
    setRemovingId(attachmentId)
    try {
      const updated = await window.book.removeContactAttachment(contactId, attachmentId)
      await refresh({ background: true })
      setDraft((d) => (d && d.id === contactId ? { ...d, attachments: updated.attachments } : d))
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <div>
      <div className="contact-docs-head">
        <span className="field-label">Documents</span>
        <button
          type="button"
          className="btn btn-ghost focus-ring contact-docs-add"
          disabled={adding}
          onClick={() => void onAdd()}
        >
          {adding ? 'Adding…' : 'Add files…'}
        </button>
      </div>
      <p className="muted small contact-docs-hint">
        Stored in your library under <code className="inline-code">contact-attachments</code>. Open in your default app
        or reveal in the folder.
      </p>
      {list.length === 0 ? (
        <p className="muted small" style={{ marginTop: 8, marginBottom: 0 }}>
          No files yet.
        </p>
      ) : (
        <ul className="contact-docs-list" aria-label="Attached documents">
          {list.map((a) => (
            <li key={a.id} className="contact-docs-row">
              <div className="contact-docs-row-main">
                <span className="contact-docs-name">{a.fileName}</span>
                {a.sizeBytes != null ? (
                  <span className="contact-docs-meta muted small">{formatAttachmentSize(a.sizeBytes)}</span>
                ) : null}
              </div>
              <div className="contact-docs-actions">
                <button
                  type="button"
                  className="btn-link focus-ring"
                  onClick={() => void window.book.openContactAttachment(a.relativePath)}
                >
                  Open
                </button>
                <button
                  type="button"
                  className="btn-link focus-ring"
                  onClick={() => void window.book.revealContactAttachment(a.relativePath)}
                >
                  Show in folder
                </button>
                <button
                  type="button"
                  className="btn-link contact-docs-remove focus-ring"
                  disabled={removingId === a.id}
                  onClick={() => void onRemove(a.id)}
                >
                  {removingId === a.id ? 'Removing…' : 'Remove'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
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
  label?: string
  empty: string
  options: Company[] | Industry[] | Tag[]
  getOptionLabel?: (o: Company | Industry | Tag) => string
  selectedIds: string[]
  disabled: boolean
  onToggle: (id: string, on: boolean) => void
}): React.ReactElement {
  const set = useMemo(() => new Set(selectedIds), [selectedIds])
  return (
    <div>
      {label ? <span className="field-label">{label}</span> : null}
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
