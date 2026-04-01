/**
 * US state tile map layout (equal-area grid, geography-inspired).
 * IANA ids follow each state capital for a single clock per state.
 */

export type UsStateTile = {
  abbr: string
  name: string
  /** Primary clock: capital city zone */
  iana: string
  /** 0-based column, 0..11 */
  col: number
  /** 0-based row, 0..8 */
  row: number
}

export const US_STATE_TILES: UsStateTile[] = [
  { abbr: 'AK', name: 'Alaska', iana: 'America/Anchorage', col: 0, row: 0 },
  { abbr: 'ME', name: 'Maine', iana: 'America/New_York', col: 11, row: 0 },
  { abbr: 'WA', name: 'Washington', iana: 'America/Los_Angeles', col: 0, row: 1 },
  { abbr: 'MT', name: 'Montana', iana: 'America/Denver', col: 2, row: 1 },
  { abbr: 'ND', name: 'North Dakota', iana: 'America/Chicago', col: 3, row: 1 },
  { abbr: 'MN', name: 'Minnesota', iana: 'America/Chicago', col: 5, row: 1 },
  { abbr: 'VT', name: 'Vermont', iana: 'America/New_York', col: 10, row: 0 },
  { abbr: 'NH', name: 'New Hampshire', iana: 'America/New_York', col: 10, row: 1 },
  { abbr: 'MA', name: 'Massachusetts', iana: 'America/New_York', col: 11, row: 1 },
  { abbr: 'OR', name: 'Oregon', iana: 'America/Los_Angeles', col: 0, row: 2 },
  { abbr: 'ID', name: 'Idaho', iana: 'America/Boise', col: 1, row: 2 },
  { abbr: 'WY', name: 'Wyoming', iana: 'America/Denver', col: 2, row: 2 },
  { abbr: 'SD', name: 'South Dakota', iana: 'America/Chicago', col: 3, row: 2 },
  { abbr: 'WI', name: 'Wisconsin', iana: 'America/Chicago', col: 5, row: 2 },
  { abbr: 'MI', name: 'Michigan', iana: 'America/Detroit', col: 6, row: 2 },
  { abbr: 'NY', name: 'New York', iana: 'America/New_York', col: 8, row: 2 },
  { abbr: 'RI', name: 'Rhode Island', iana: 'America/New_York', col: 11, row: 2 },
  { abbr: 'CA', name: 'California', iana: 'America/Los_Angeles', col: 0, row: 4 },
  { abbr: 'NV', name: 'Nevada', iana: 'America/Los_Angeles', col: 0, row: 3 },
  { abbr: 'UT', name: 'Utah', iana: 'America/Denver', col: 1, row: 3 },
  { abbr: 'CO', name: 'Colorado', iana: 'America/Denver', col: 2, row: 3 },
  { abbr: 'NE', name: 'Nebraska', iana: 'America/Chicago', col: 3, row: 3 },
  { abbr: 'IA', name: 'Iowa', iana: 'America/Chicago', col: 5, row: 3 },
  { abbr: 'IL', name: 'Illinois', iana: 'America/Chicago', col: 4, row: 3 },
  { abbr: 'IN', name: 'Indiana', iana: 'America/Indiana/Indianapolis', col: 6, row: 3 },
  { abbr: 'OH', name: 'Ohio', iana: 'America/New_York', col: 7, row: 3 },
  { abbr: 'PA', name: 'Pennsylvania', iana: 'America/New_York', col: 8, row: 3 },
  { abbr: 'CT', name: 'Connecticut', iana: 'America/New_York', col: 10, row: 2 },
  { abbr: 'NJ', name: 'New Jersey', iana: 'America/New_York', col: 9, row: 3 },
  { abbr: 'AZ', name: 'Arizona', iana: 'America/Phoenix', col: 3, row: 4 },
  { abbr: 'NM', name: 'New Mexico', iana: 'America/Denver', col: 3, row: 5 },
  { abbr: 'KS', name: 'Kansas', iana: 'America/Chicago', col: 4, row: 4 },
  { abbr: 'MO', name: 'Missouri', iana: 'America/Chicago', col: 5, row: 4 },
  { abbr: 'KY', name: 'Kentucky', iana: 'America/New_York', col: 6, row: 4 },
  { abbr: 'WV', name: 'West Virginia', iana: 'America/New_York', col: 7, row: 4 },
  { abbr: 'DE', name: 'Delaware', iana: 'America/New_York', col: 9, row: 4 },
  { abbr: 'MD', name: 'Maryland', iana: 'America/New_York', col: 8, row: 4 },
  { abbr: 'OK', name: 'Oklahoma', iana: 'America/Chicago', col: 4, row: 5 },
  { abbr: 'AR', name: 'Arkansas', iana: 'America/Chicago', col: 5, row: 5 },
  { abbr: 'TN', name: 'Tennessee', iana: 'America/Chicago', col: 6, row: 5 },
  { abbr: 'VA', name: 'Virginia', iana: 'America/New_York', col: 9, row: 5 },
  { abbr: 'NC', name: 'North Carolina', iana: 'America/New_York', col: 9, row: 6 },
  { abbr: 'SC', name: 'South Carolina', iana: 'America/New_York', col: 9, row: 7 },
  { abbr: 'TX', name: 'Texas', iana: 'America/Chicago', col: 4, row: 6 },
  { abbr: 'LA', name: 'Louisiana', iana: 'America/Chicago', col: 5, row: 6 },
  { abbr: 'MS', name: 'Mississippi', iana: 'America/Chicago', col: 6, row: 6 },
  { abbr: 'AL', name: 'Alabama', iana: 'America/Chicago', col: 7, row: 6 },
  { abbr: 'GA', name: 'Georgia', iana: 'America/New_York', col: 8, row: 7 },
  { abbr: 'HI', name: 'Hawaii', iana: 'Pacific/Honolulu', col: 0, row: 7 },
  { abbr: 'FL', name: 'Florida', iana: 'America/New_York', col: 9, row: 8 }
]

export function tileZoneClass(iana: string): string {
  if (iana.includes('Honolulu')) return 'tz-state-tile--hi'
  if (iana.includes('Anchorage')) return 'tz-state-tile--ak'
  if (iana === 'America/Phoenix') return 'tz-state-tile--az'
  if (iana.includes('Los_Angeles')) return 'tz-state-tile--pt'
  if (iana.includes('Denver') || iana.includes('Boise')) return 'tz-state-tile--mt'
  if (iana.includes('Chicago')) return 'tz-state-tile--ct'
  return 'tz-state-tile--et'
}
