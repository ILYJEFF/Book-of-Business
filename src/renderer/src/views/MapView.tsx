import { useEffect, useRef } from 'react'
import L from 'leaflet'
import { useApp } from '../context/AppContext'
import { contactDisplayName } from '../lib/format'

const PIN_CONTACT = '#9a6b3c'
const PIN_COMPANY = '#5f735f'

function pinIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: 'map-marker-wrap',
    html: `<div class="map-marker-dot" style="background:${color}"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -10]
  })
}

export default function MapView(): React.ReactElement {
  const { contacts, companies, requestOpenRecord, clearOpenRecordRequest } = useApp()
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

    for (const c of plottedContacts) {
      const lat = c.latitude!
      const lon = c.longitude!
      const m = L.marker([lat, lon], { icon: pinIcon(PIN_CONTACT) })
      m.bindPopup(
        `<div class="map-popup"><strong>${escapeHtml(contactDisplayName(c))}</strong><br/><span>Person</span></div>`
      )
      m.on('click', () => requestOpenRecord('contact', c.id))
      group.addLayer(m)
      corners.push([lat, lon])
    }

    for (const c of plottedCompanies) {
      const lat = c.latitude!
      const lon = c.longitude!
      const m = L.marker([lat, lon], { icon: pinIcon(PIN_COMPANY) })
      m.bindPopup(`<div class="map-popup"><strong>${escapeHtml(c.name)}</strong><br/><span>Company</span></div>`)
      m.on('click', () => requestOpenRecord('company', c.id))
      group.addLayer(m)
      corners.push([lat, lon])
    }

    if (corners.length > 0) {
      map.fitBounds(L.latLngBounds(corners), { padding: [40, 40], maxZoom: 14 })
    } else {
      map.setView([39.8283, -98.5795], 4)
    }

    map.invalidateSize()
  }, [contacts, companies, plottedContacts, plottedCompanies, requestOpenRecord])

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
          Tiles and search use OpenStreetMap. Click a pin to open that record.
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
