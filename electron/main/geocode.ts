/**
 * OpenStreetMap Nominatim. Use sparingly (max ~1 req/s). Policy:
 * https://operations.osmfoundation.org/policies/nominatim/
 */

import type { GeocodeResult } from '../../src/shared/types'

const UA = 'BookOfBusiness/1.0 (Electron desktop app)'

/** Build one mailing-style line from Nominatim `address` when present. */
function formatNominatimAddress(addr: Record<string, string> | undefined): string | undefined {
  if (!addr) return undefined
  const road = addr.road || addr.pedestrian || addr.path || addr.footway || addr.residential
  const line1 = [addr.house_number, road].filter(Boolean).join(' ').trim()
  const place = addr.city || addr.town || addr.village || addr.hamlet || addr.suburb || addr.municipality
  const state = addr.state || addr.region
  const zip = addr.postcode
  const country = addr.country

  const chunks: string[] = []
  if (line1) chunks.push(line1)
  let line2 = ''
  if (place) line2 = place
  if (state) line2 = line2 ? `${line2}, ${state}` : state
  if (zip) line2 = line2 ? `${line2} ${zip}` : zip
  if (line2.trim()) chunks.push(line2.trim())
  if (country && chunks.length > 0) chunks.push(country)

  const out = chunks.join(', ')
  return out.trim() || undefined
}

type NominatimRow = {
  lat?: string
  lon?: string
  display_name?: string
  address?: Record<string, string>
}

export async function geocodeSearch(query: string): Promise<GeocodeResult | null> {
  const q = query.trim()
  if (q.length < 3) return null

  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('q', q)
  url.searchParams.set('format', 'json')
  url.searchParams.set('limit', '1')
  url.searchParams.set('addressdetails', '1')

  const res = await fetch(url.toString(), {
    headers: {
      'User-Agent': UA,
      Accept: 'application/json'
    }
  })

  if (!res.ok) return null

  const data = (await res.json()) as NominatimRow[]
  if (!Array.isArray(data) || data.length === 0) return null

  const row = data[0]
  const lat = parseFloat(String(row.lat))
  const lon = parseFloat(String(row.lon))
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null

  const displayName = (row.display_name ?? q).trim()
  const formattedAddress = formatNominatimAddress(row.address)

  return {
    lat,
    lon,
    displayName,
    formattedAddress
  }
}
