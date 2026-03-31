/**
 * OpenStreetMap Nominatim. Use sparingly (max ~1 req/s). Policy:
 * https://operations.osmfoundation.org/policies/nominatim/
 */

const UA = 'BookOfBusiness/1.0 (Electron desktop app)'

export interface GeocodeHit {
  lat: number
  lon: number
  displayName: string
}

export async function geocodeSearch(query: string): Promise<GeocodeHit | null> {
  const q = query.trim()
  if (q.length < 3) return null

  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('q', q)
  url.searchParams.set('format', 'json')
  url.searchParams.set('limit', '1')

  const res = await fetch(url.toString(), {
    headers: {
      'User-Agent': UA,
      Accept: 'application/json'
    }
  })

  if (!res.ok) return null

  const data = (await res.json()) as { lat?: string; lon?: string; display_name?: string }[]
  if (!Array.isArray(data) || data.length === 0) return null

  const row = data[0]
  const lat = parseFloat(String(row.lat))
  const lon = parseFloat(String(row.lon))
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null

  return {
    lat,
    lon,
    displayName: row.display_name ?? q
  }
}
