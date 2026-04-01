import tzlookup from 'tz-lookup'

export function timeZoneFromCoordinates(latitude: number, longitude: number): string | undefined {
  try {
    const z = tzlookup(latitude, longitude)
    return typeof z === 'string' && z.trim() ? z.trim() : undefined
  } catch {
    return undefined
  }
}
