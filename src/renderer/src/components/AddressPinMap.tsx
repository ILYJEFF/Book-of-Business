import { useEffect, useRef, type ReactElement } from 'react'
import L from 'leaflet'

const PIN: Record<'contact' | 'company', string> = {
  contact: '#9a6b3c',
  company: '#5f735f'
}

export default function AddressPinMap({
  latitude,
  longitude,
  draggable,
  onDragEnd,
  variant = 'contact'
}: {
  latitude: number
  longitude: number
  draggable: boolean
  onDragEnd?: (lat: number, lon: number) => void
  variant?: 'contact' | 'company'
}): ReactElement {
  const wrapRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const dragActiveRef = useRef(false)
  const onDragEndRef = useRef(onDragEnd)
  onDragEndRef.current = onDragEnd

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return

    const color = PIN[variant]
    const icon = L.divIcon({
      className: 'map-marker-wrap',
      html: `<div class="map-marker-dot" style="background:${color}"></div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9]
    })

    const map = L.map(el, { zoomControl: true, attributionControl: true })
    const marker = L.marker([latitude, longitude], { draggable: true, icon })
    marker.addTo(map)
    if (!draggable) marker.dragging?.disable()

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19
    }).addTo(map)
    map.setView([latitude, longitude], 15)

    marker.on('dragstart', () => {
      dragActiveRef.current = true
    })
    marker.on('dragend', () => {
      dragActiveRef.current = false
      const ll = marker.getLatLng()
      onDragEndRef.current?.(ll.lat, ll.lng)
    })

    mapRef.current = map
    markerRef.current = marker

    const ro = new ResizeObserver(() => map.invalidateSize())
    ro.observe(el)
    const t = window.setTimeout(() => map.invalidateSize(), 120)

    return () => {
      window.clearTimeout(t)
      ro.disconnect()
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
  }, [variant])

  useEffect(() => {
    const m = markerRef.current
    if (!m) return
    if (dragActiveRef.current) return
    const ll = m.getLatLng()
    if (Math.abs(ll.lat - latitude) < 1e-7 && Math.abs(ll.lng - longitude) < 1e-7) return
    m.setLatLng([latitude, longitude])
    mapRef.current?.panTo([latitude, longitude], { animate: false })
  }, [latitude, longitude])

  useEffect(() => {
    const m = markerRef.current
    if (!m) return
    if (draggable) m.dragging?.enable()
    else m.dragging?.disable()
  }, [draggable])

  return (
    <div className="address-pin-map-host">
      <p className="field-label address-pin-map-label">Map preview</p>
      <p className="muted small address-pin-map-hint">
        {draggable ? 'Drag the pin to fine-tune the location.' : 'Pin location for this address.'}
      </p>
      <div ref={wrapRef} className="address-pin-map" role="application" aria-label="Address location map" />
    </div>
  )
}
