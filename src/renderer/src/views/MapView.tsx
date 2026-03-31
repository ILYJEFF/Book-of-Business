import { useEffect, useRef } from 'react'
import L from 'leaflet'
import type { Company, Contact } from '../../../shared/types'
import { useApp } from '../context/AppContext'
import { contactDisplayName } from '../lib/format'

const PIN_CONTACT = '#9a6b3c'
const PIN_COMPANY = '#5f735f'

/** Same key = same screen dot (stacked pins). */
function coordKey(lat: number, lon: number): string {
  return `${lat.toFixed(6)},${lon.toFixed(6)}`
}

interface PinStack {
  lat: number
  lon: number
  contacts: Contact[]
  companies: Company[]
}

function buildPinStacks(plottedContacts: Contact[], plottedCompanies: Company[]): PinStack[] {
  const byKey = new Map<string, PinStack>()
  const touch = (lat: number, lon: number) => {
    const key = coordKey(lat, lon)
    let s = byKey.get(key)
    if (!s) {
      s = { lat, lon, contacts: [], companies: [] }
      byKey.set(key, s)
    }
    return s
  }
  for (const c of plottedContacts) {
    touch(c.latitude!, c.longitude!).contacts.push(c)
  }
  for (const c of plottedCompanies) {
    touch(c.latitude!, c.longitude!).companies.push(c)
  }
  return [...byKey.values()]
}

function stackIcon(contactCount: number, companyCount: number): L.DivIcon {
  const n = contactCount + companyCount
  let bg: string
  if (contactCount > 0 && companyCount > 0) {
    bg = `linear-gradient(135deg, ${PIN_CONTACT} 48%, ${PIN_COMPANY} 52%)`
  } else if (contactCount > 0) {
    bg = PIN_CONTACT
  } else {
    bg = PIN_COMPANY
  }
  const badge = n > 1 ? `<span class="map-marker-count">${n}</span>` : ''
  const size = n > 1 ? 22 : 18
  const half = size / 2
  return L.divIcon({
    className: 'map-marker-wrap map-marker-wrap--stack',
    html: `<div class="map-marker-dot map-marker-dot--stack" style="background:${bg}">${badge}</div>`,
    iconSize: [size, size],
    iconAnchor: [half, half],
    popupAnchor: [0, -half - 2]
  })
}

function stackTooltipHtml(stack: PinStack): string {
  const rows: string[] = []
  for (const c of stack.contacts) {
    rows.push(`<li><span class="map-stack-name">${escapeHtml(contactDisplayName(c))}</span> <span class="map-stack-kind">Person</span></li>`)
  }
  for (const c of stack.companies) {
    rows.push(`<li><span class="map-stack-name">${escapeHtml(c.name)}</span> <span class="map-stack-kind">Company</span></li>`)
  }
  const title =
    rows.length === 1 ? 'At this pin' : `${rows.length} at this pin`
  return `<div class="map-stack-tooltip"><div class="map-stack-tooltip-title">${title}</div><ul>${rows.join('')}</ul></div>`
}

function stackPopupHtml(stack: PinStack): string {
  const buttons: string[] = []
  for (const c of stack.contacts) {
    buttons.push(
      `<button type="button" class="map-popup-stack-row focus-ring" data-map-open="contact" data-map-id="${escapeHtml(c.id)}">${escapeHtml(contactDisplayName(c))} <span class="map-stack-kind">Person</span></button>`
    )
  }
  for (const c of stack.companies) {
    buttons.push(
      `<button type="button" class="map-popup-stack-row focus-ring" data-map-open="company" data-map-id="${escapeHtml(c.id)}">${escapeHtml(c.name)} <span class="map-stack-kind">Company</span></button>`
    )
  }
  return `<div class="map-popup map-popup-stack"><p class="map-popup-stack-lead">Open one:</p>${buttons.join('')}</div>`
}

export default function MapView(): React.ReactElement {
  const { contacts, companies, requestOpenRecord, clearOpenRecordRequest, refresh } = useApp()
  const wrapRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layerRef = useRef<L.LayerGroup | null>(null)

  const plottedContacts = contacts.filter(
    (c) => c.latitude != null && c.longitude != null && Number.isFinite(c.latitude) && Number.isFinite(c.longitude)
  )
  const plottedCompanies = companies.filter(
    (c) => c.latitude != null && c.longitude != null && Number.isFinite(c.latitude) && Number.isFinite(c.longitude)
  )
  const plotted = plottedContacts.length + plottedCompanies.length

  const unmappedContacts = contacts.length - plottedContacts.length
  const unmappedCompanies = companies.length - plottedCompanies.length

  useEffect(() => {
    clearOpenRecordRequest()
  }, [clearOpenRecordRequest])

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return

    const map = L.map(el, { zoomControl: true, attributionControl: true })
    mapRef.current = map

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19
    }).addTo(map)

    const group = L.layerGroup().addTo(map)
    layerRef.current = group

    const ro = new ResizeObserver(() => map.invalidateSize())
    ro.observe(el)
    setTimeout(() => map.invalidateSize(), 100)

    return () => {
      ro.disconnect()
      map.remove()
      mapRef.current = null
      layerRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const group = layerRef.current
    if (!map || !group) return

    group.clearLayers()
    const corners: L.LatLngTuple[] = []
    const stacks = buildPinStacks(plottedContacts, plottedCompanies)

    for (const stack of stacks) {
      const { lat, lon, contacts: sc, companies: sco } = stack
      const m = L.marker([lat, lon], {
        icon: stackIcon(sc.length, sco.length),
        draggable: true
      })

      m.bindTooltip(stackTooltipHtml(stack), {
        direction: 'top',
        sticky: true,
        opacity: 1,
        className: 'map-stack-tooltip-pane'
      })

      const total = sc.length + sco.length
      if (total === 1) {
        m.on('click', () => {
          if (sc[0]) requestOpenRecord('contact', sc[0].id)
          else if (sco[0]) requestOpenRecord('company', sco[0].id)
        })
      } else {
        m.bindPopup(stackPopupHtml(stack))
        m.on('popupopen', () => {
          const el = m.getPopup()?.getElement()
          if (!el) return
          el.querySelectorAll<HTMLButtonElement>('.map-popup-stack-row').forEach((btn) => {
            const handler = (ev: Event) => {
              ev.preventDefault()
              const kind = btn.getAttribute('data-map-open')
              const id = btn.getAttribute('data-map-id')
              if (kind === 'contact' && id) requestOpenRecord('contact', id)
              else if (kind === 'company' && id) requestOpenRecord('company', id)
              m.closePopup()
            }
            btn.addEventListener('click', handler, { once: true })
          })
        })
      }

      m.on('dragend', () => {
        const ll = m.getLatLng()
        const ops: Promise<unknown>[] = [
          ...sc.map((c) => window.book.updateContactPin(c.id, ll.lat, ll.lng)),
          ...sco.map((c) => window.book.updateCompanyPin(c.id, ll.lat, ll.lng))
        ]
        void Promise.all(ops)
          .then(() => refresh({ background: true }))
          .catch(() => {})
      })

      group.addLayer(m)
      corners.push([lat, lon])
    }

    if (corners.length > 0) {
      map.fitBounds(L.latLngBounds(corners), { padding: [40, 40], maxZoom: 14 })
    } else {
      map.setView([39.8283, -98.5795], 4)
    }

    map.invalidateSize()
  }, [contacts, companies, plottedContacts, plottedCompanies, requestOpenRecord, refresh])

  return (
    <div className="map-view">
      <div className="map-toolbar">
        <div className="map-toolbar-top">
          <div>
            <h2 className="list-section-title map-toolbar-title">Map</h2>
            <p className="map-toolbar-stats">
              <strong>{plotted}</strong> pinned
              {(unmappedContacts > 0 || unmappedCompanies > 0) && (
                <span className="muted">
                  {' '}
                  · {unmappedContacts} people, {unmappedCompanies} companies not pinned
                </span>
              )}
            </p>
          </div>
          <ul className="map-legend" aria-label="Pin colors">
            <li>
              <span className="map-legend-dot map-legend-dot--contact" aria-hidden />
              Person
            </li>
            <li>
              <span className="map-legend-dot map-legend-dot--company" aria-hidden />
              Company
            </li>
          </ul>
        </div>
        <p className="map-toolbar-note muted small">
          Same coordinates share one dot (count badge when stacked). Hover a dot for everyone there. Click opens the record,
          or choose from the list when several share a pin. Drag moves every record at that pin.
        </p>
      </div>
      <div className="map-frame">
        <div ref={wrapRef} className="map-leaflet" role="application" aria-label="Map of contacts and companies" />
      </div>
    </div>
  )
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
