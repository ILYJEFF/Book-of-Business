import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Company } from '../../../shared/types'
import AddressFields from '../components/AddressFields'
import CompanyAvatar from '../components/CompanyAvatar'
import CompanyFilterPanel from '../components/CompanyFilterPanel'
import IndustrySearchPick from '../components/IndustrySearchPick'
import LinkedInGlyph from '../components/LinkedInGlyph'
import WebsiteGlyph from '../components/WebsiteGlyph'
import { useApp } from '../context/AppContext'
import { useWorkspacePhotoUrl } from '../hooks/useWorkspacePhotoUrl'
import { companyLinkedInOpenUrl, industryPathLabel, safeWebsiteOpenUrl } from '../lib/format'
import { companyPassesFilters, createDefaultCompanyFilters } from '../lib/recordFilters'

export default function CompaniesView(): React.ReactElement {
  const { companies, industries, refresh, openRecordRequest, clearOpenRecordRequest } = useApp()
  const [filters, setFilters] = useState(createDefaultCompanyFilters)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Partial<Company> | null>(null)
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
  } = useWorkspacePhotoUrl<Company>(editing, draft, setDraft)

  const industryMap = useMemo(
    () => new Map(industries.map((i) => [i.id, i] as const)),
    [industries]
  )

  const selected = useMemo(
    () => companies.find((c) => c.id === selectedId) ?? null,
    [companies, selectedId]
  )

  const filtered = useMemo(
    () => companies.filter((c) => companyPassesFilters(c, filters, industryMap)),
    [companies, filters, industryMap]
  )

  const open = useCallback((c: Company) => {
    setSelectedId(c.id)
    setCreating(false)
    setEditing(false)
    resetPhotoFieldUi()
    setDraft({ ...c })
    setConfirmDelete(false)
  }, [resetPhotoFieldUi])

  const startCreate = useCallback(() => {
    setSelectedId(null)
    setCreating(true)
    setEditing(true)
    resetPhotoFieldUi()
    setDraft({ name: '', website: '', linkedinUrl: '', industryId: '', notes: '', address: '' })
    setConfirmDelete(false)
  }, [resetPhotoFieldUi])

  const startCreateAtSharedPin = useCallback(
    (p: { latitude: number; longitude: number; address?: string }) => {
      setSelectedId(null)
      setCreating(true)
      setEditing(true)
      setConfirmDelete(false)
      resetPhotoFieldUi()
      setDraft({
        name: '',
        website: '',
        linkedinUrl: '',
        industryId: '',
        notes: '',
        address: (p.address ?? '').trim() || '',
        latitude: p.latitude,
        longitude: p.longitude
      })
    },
    [resetPhotoFieldUi]
  )

  const startEdit = useCallback((c: Company) => {
    setCreating(false)
    setSelectedId(c.id)
    setEditing(true)
    resetPhotoFieldUi()
    setDraft({ ...c })
    setConfirmDelete(false)
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
    if (!draft?.name?.trim()) return
    setSaving(true)
    try {
      const { photoUrl: logoData, linkedinUrl: liDraft, website: webDraft, ...draftBody } = draft
      const saved = await window.book.saveCompany(
        {
          ...draftBody,
          name: draft.name.trim(),
          industryId: draft.industryId || undefined,
          notes: draft.notes?.trim() || undefined,
          address: draft.address?.trim() || undefined
        },
        {
          photoUrl: typeof logoData === 'string' ? logoData : '',
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
    await window.book.deleteCompany(selected.id)
    await refresh({ background: true })
    setSelectedId(null)
    setDraft(null)
    setEditing(false)
    setConfirmDelete(false)
  }, [selected, refresh])

  const display = editing && draft ? draft : selected

  const companyLiOpenUrl = useMemo(() => {
    if (!display) return null
    return companyLinkedInOpenUrl(display as Company)
  }, [display])

  const companyWebOpenUrl = useMemo(() => {
    if (!display) return null
    return safeWebsiteOpenUrl((display as Company).website)
  }, [display])

  const openCompanyLinkedIn = useCallback(() => {
    if (!companyLiOpenUrl) return
    void window.book.openExternal(companyLiOpenUrl)
  }, [companyLiOpenUrl])

  const openCompanyWebsite = useCallback(() => {
    if (!companyWebOpenUrl) return
    void window.book.openExternal(companyWebOpenUrl)
  }, [companyWebOpenUrl])

  useEffect(() => {
    if (!openRecordRequest) return
    if (openRecordRequest.kind !== 'company') {
      clearOpenRecordRequest()
      return
    }
    const c = companies.find((x) => x.id === openRecordRequest.id)
    clearOpenRecordRequest()
    if (c) open(c)
  }, [openRecordRequest, companies, clearOpenRecordRequest, open])

  return (
    <div className="split-view">
      <div className="list-column">
        <div className="list-toolbar list-toolbar--filters">
          <CompanyFilterPanel
            filters={filters}
            setFilters={setFilters}
            industries={industries}
            industryMap={industryMap}
            total={companies.length}
            shown={filtered.length}
            onNew={startCreate}
          />
        </div>
        <div className="scroll-y list-rows">
          {filtered.map((c) => {
            const on = c.id === selectedId && !creating
            const rowLi = companyLinkedInOpenUrl(c)
            const rowWeb = safeWebsiteOpenUrl(c.website)
            return (
              <div
                key={c.id}
                role="button"
                tabIndex={0}
                className={`list-row focus-ring${on ? ' list-row--active' : ''}`}
                onClick={() => open(c)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    open(c)
                  }
                }}
              >
                <CompanyAvatar company={c} size="sm" />
                <div className="list-row-main">
                  <div className="list-row-title-line">
                    <span className="list-row-title">{c.name}</span>
                    {rowLi || rowWeb ? (
                      <span className="list-row-link-cluster">
                        {rowLi ? (
                          <button
                            type="button"
                            className="list-row-linkedin-emblem focus-ring"
                            aria-label={`Open ${c.name} on LinkedIn`}
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
                        {rowWeb ? (
                          <button
                            type="button"
                            className="list-row-website-emblem focus-ring"
                            aria-label={`Open website for ${c.name}`}
                            onClick={(e) => {
                              e.stopPropagation()
                              void window.book.openExternal(rowWeb)
                            }}
                            onKeyDown={(e) => {
                              e.stopPropagation()
                            }}
                          >
                            <WebsiteGlyph className="list-row-website-emblem-icon" />
                          </button>
                        ) : null}
                      </span>
                    ) : null}
                  </div>
                  <div className="list-row-sub">
                    {c.industryId ? industryPathLabel(industryMap, c.industryId) : 'No industry linked'}
                  </div>
                </div>
              </div>
            )
          })}
          {filtered.length === 0 &&
            (companies.length === 0 ? (
              <div className="list-empty">
                <p className="list-empty-title">No companies yet</p>
                <p className="list-empty-text">Add orgs you work with, then tie them to people and sectors.</p>
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
        {!display && (
          <div className="empty-canvas">
            <p className="folio-kicker">Companies</p>
            <div className="empty-canvas-rule" aria-hidden />
            <h2 className="empty-canvas-title">No company selected</h2>
            <p className="empty-canvas-text">Choose a company from the list or add one. One JSON file per organization.</p>
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
                <CompanyAvatar company={display as Company} size="xl" />
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
                    {companyLiOpenUrl ? (
                      <button
                        type="button"
                        className="btn-profile-linkedin btn-profile-linkedin--icon-only focus-ring"
                        aria-label="Open LinkedIn in browser"
                        onClick={() => void openCompanyLinkedIn()}
                      >
                        <LinkedInGlyph className="btn-profile-linkedin-icon" />
                      </button>
                    ) : null}
                    {companyWebOpenUrl ? (
                      <button
                        type="button"
                        className="btn-profile-website focus-ring"
                        aria-label="Open website in browser"
                        onClick={() => void openCompanyWebsite()}
                      >
                        <WebsiteGlyph className="btn-profile-website-icon" />
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
                    {companyLiOpenUrl ? (
                      <button
                        type="button"
                        className="btn-profile-linkedin btn-profile-linkedin--icon-only focus-ring"
                        aria-label="Open LinkedIn in browser"
                        onClick={() => void openCompanyLinkedIn()}
                        disabled={saving}
                      >
                        <LinkedInGlyph className="btn-profile-linkedin-icon" />
                      </button>
                    ) : null}
                    {companyWebOpenUrl ? (
                      <button
                        type="button"
                        className="btn-profile-website focus-ring"
                        aria-label="Open website in browser"
                        onClick={() => void openCompanyWebsite()}
                        disabled={saving}
                      >
                        <WebsiteGlyph className="btn-profile-website-icon" />
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
              {editing && (
                <div>
                  <label
                    className="field-label field-label--interactive"
                    id="company-photo-label"
                    onClick={() => photoFieldRef.current?.focus()}
                  >
                    Logo or photo
                  </label>
                  <div
                    ref={photoFieldRef}
                    id="company-photo-field"
                    className={`contact-photo-field focus-ring${photoDragOver ? ' contact-photo-field--drag' : ''}`}
                    tabIndex={0}
                    role="group"
                    aria-labelledby="company-photo-label"
                    aria-describedby="company-photo-field-desc"
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
                      <CompanyAvatar
                        company={{
                          id: (display as Company).id ?? 'new',
                          name: (display as Company).name ?? '',
                          photoUrl: (display as Company).photoUrl
                        }}
                        size="sm"
                      />
                      <div className="contact-photo-field-copy">
                        <p className="contact-photo-field-lead" id="company-photo-field-desc">
                          Drop a logo or image here, or click and paste with ⌘V or Ctrl+V.
                        </p>
                        <p className="muted small contact-photo-field-actions">
                          <button
                            type="button"
                            className="btn-link"
                            onClick={() => photoFileInputRef.current?.click()}
                          >
                            Browse files
                          </button>
                          {(display as Company).photoUrl?.trim() ? (
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
                                Remove image
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
              <div className="form-row-2">
                <div>
                  <label className="field-label" htmlFor="co-li">
                    LinkedIn
                  </label>
                  <input
                    id="co-li"
                    className="text-input focus-ring"
                    disabled={!editing}
                    placeholder="https://linkedin.com/company/…"
                    value={display.linkedinUrl ?? ''}
                    onChange={(e) => editing && setDraft((d) => (d ? { ...d, linkedinUrl: e.target.value } : d))}
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
              </div>
              <IndustrySearchPick
                label="Industry"
                emptyLibrary="Add industries in the Industries tab first."
                industries={industries}
                industryMap={industryMap}
                selectedIds={display.industryId ? [display.industryId] : []}
                disabled={!editing}
                maxSelected={1}
                onAdd={(id) => {
                  if (!editing) return
                  setDraft((d) => (d ? { ...d, industryId: id } : d))
                }}
                onRemove={(id) => {
                  if (!editing) return
                  setDraft((d) => {
                    if (!d) return d
                    if (d.industryId !== id) return d
                    return { ...d, industryId: undefined }
                  })
                }}
              />
              <AddressFields<Company>
                draft={display}
                editing={editing}
                setDraft={setDraft}
                mapVariant="company"
                sharePinAction={{
                  label: 'New company at this pin',
                  title:
                    'Start another company with these map coordinates and the same address line. Save or cancel open edits first if you need them.',
                  onClick: startCreateAtSharedPin
                }}
              />
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
