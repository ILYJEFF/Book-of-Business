import { useEffect, useRef } from 'react'
import L from 'leaflet'
import type { Company, Contact } from '../../../shared/types'
import { useApp } from '../context/AppContext'
import { contactDisplayName } from '../lib/format'

function googleMapsSearchUrl(company: Company, lat: number, lon: number): string {
  const byName = `${company.name} ${(company.address ?? '').trim()}`.trim()
  const query = byName || `${lat},${lon}`
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

const PIN_CONTACT = '#9a6b3c'
const PIN_COMPANY = '#5f735f'

/** Same key = same screen dot when no mailing line is stored (coordinate stack). */
function coordKey(lat: number, lon: number): string {
  return `${lat.toFixed(6)},${lon.toFixed(6)}`
}

/** Normalize free-text address so minor spacing or case differences still match. */
function normalizeAddressLine(addr: string | undefined): string | null {
  const t = addr?.trim().replace(/\s+/g, ' ').toLowerCase()
  return t || null
}

/**
 * Stack key: same normalized address string shares one pin (coordinates are averaged).
 * Records with no address line still stack only by matching coordinates.
 */
function stackKeyForPlotted(entity: { address?: string; latitude: number; longitude: number }): string {
  const line = normalizeAddressLine(entity.address)
  if (line) return `addr:${line}`
  return `coord:${coordKey(entity.latitude, entity.longitude)}`
}

interface PinStack {
  lat: number
  lon: number
  contacts: Contact[]
  companies: Company[]
}

interface StackAcc {
  contacts: Contact[]
  companies: Company[]
  lats: number[]
  lons: number[]
}

function buildPinStacks(plottedContacts: Contact[], plottedCompanies: Company[]): PinStack[] {
  const byKey = new Map<string, StackAcc>()
  const touch = (key: string, lat: number, lon: number): StackAcc => {
    let s = byKey.get(key)
    if (!s) {
      s = { contacts: [], companies: [], lats: [], lons: [] }
      byKey.set(key, s)
    }
    s.lats.push(lat)
    s.lons.push(lon)
    return s
  }
  for (const c of plottedContacts) {
    const lat = c.latitude!
    const lon = c.longitude!
    touch(stackKeyForPlotted({ address: c.address, latitude: lat, longitude: lon }), lat, lon).contacts.push(c)
  }
  for (const c of plottedCompanies) {
    const lat = c.latitude!
    const lon = c.longitude!
    touch(stackKeyForPlotted({ address: c.address, latitude: lat, longitude: lon }), lat, lon).companies.push(c)
  }
  return [...byKey.values()].map((acc) => {
    const n = acc.lats.length
    const lat = acc.lats.reduce((a, b) => a + b, 0) / n
    const lon = acc.lons.reduce((a, b) => a + b, 0) / n
    return { lat, lon, contacts: acc.contacts, companies: acc.companies }
  })
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
    rows.push(
      `<li class="map-stack-tooltip-row"><span class="map-stack-swatch" style="background:${PIN_CONTACT}" aria-hidden="true"></span><span class="map-stack-name">${escapeHtml(contactDisplayName(c))}</span></li>`
    )
  }
  for (const c of stack.companies) {
    rows.push(
      `<li class="map-stack-tooltip-row"><span class="map-stack-swatch" style="background:${PIN_COMPANY}" aria-hidden="true"></span><span class="map-stack-name">${escapeHtml(c.name)}</span></li>`
    )
  }
  const title =
    rows.length === 1 ? 'At this pin' : `${rows.length} at this pin`
  return `<div class="map-stack-tooltip"><div class="map-stack-tooltip-title">${title}</div><ul>${rows.join('')}</ul></div>`
}

function stackPopupHtml(stack: PinStack): string {
  const { lat, lon } = stack
  const blocks: string[] = []
  for (const c of stack.contacts) {
    blocks.push(
      `<button type="button" class="map-popup-stack-row focus-ring" data-map-open="contact" data-map-id="${escapeHtml(c.id)}">${escapeHtml(contactDisplayName(c))} <span class="map-stack-kind">Person</span></button>`
    )
  }
  for (const c of stack.companies) {
    const mapsUrl = googleMapsSearchUrl(c, lat, lon)
    blocks.push(
      `<div class="map-popup-co-block">` +
        `<button type="button" class="map-popup-stack-row focus-ring" data-map-open="company" data-map-id="${escapeHtml(c.id)}">${escapeHtml(c.name)} <span class="map-stack-kind">Company</span></button>` +
        `<button type="button" class="map-popup-maps-btn focus-ring" data-map-external="${encodeURIComponent(mapsUrl)}">Google Maps (photos &amp; hours)</button>` +
        `</div>`
    )
  }
  return `<div class="map-popup map-popup-stack"><p class="map-popup-stack-lead">Open one:</p>${blocks.join('')}</div>`
}

function singleCompanyPopupHtml(c: Company, lat: number, lon: number): string {
  const mapsUrl = googleMapsSearchUrl(c, lat, lon)
  return (
    `<div class="map-popup map-popup-stack map-popup--single-co">` +
      `<button type="button" class="map-popup-stack-row focus-ring" data-map-open="company" data-map-id="${escapeHtml(c.id)}">Open ${escapeHtml(c.name)}</button>` +
      `<button type="button" class="map-popup-maps-btn map-popup-maps-btn--solo focus-ring" data-map-external="${encodeURIComponent(mapsUrl)}">Google Maps (photos, hours, reviews)</button>` +
      `</div>`
  )
}

function wireMapPopup(el: HTMLElement, marker: L.Marker, openRecord: (kind: 'contact' | 'company', id: string) => void): void {
  el.querySelectorAll<HTMLButtonElement>('.map-popup-stack-row').forEach((btn) => {
    const handler = (ev: Event) => {
      ev.preventDefault()
      const kind = btn.getAttribute('data-map-open')
      const id = btn.getAttribute('data-map-id')
      if (kind === 'contact' && id) openRecord('contact', id)
      else if (kind === 'company' && id) openRecord('company', id)
      marker.closePopup()
    }
    btn.addEventListener('click', handler, { once: true })
  })
  el.querySelectorAll<HTMLButtonElement>('.map-popup-maps-btn').forEach((btn) => {
    const enc = btn.getAttribute('data-map-external')
    if (!enc) return
    let url: string
    try {
      url = decodeURIComponent(enc)
    } catch {
      return
    }
    const handler = (ev: Event) => {
      ev.preventDefault()
      void window.book.openExternal(url)
    }
    btn.addEventListener('click', handler, { once: true })
  })
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
      const singleContactOnly = total === 1 && sc.length === 1
      const singleCompanyOnly = total === 1 && sco.length === 1

      if (singleContactOnly) {
        m.on('click', () => {
          requestOpenRecord('contact', sc[0].id)
        })
      } else {
        const popupHtml = singleCompanyOnly ? singleCompanyPopupHtml(sco[0], lat, lon) : stackPopupHtml(stack)
        m.bindPopup(popupHtml)
        m.on('popupopen', () => {
          const pel = m.getPopup()?.getElement()
          if (!pel) return
          wireMapPopup(pel, m, requestOpenRecord)
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
