/** Strip to digits only (for NANP detection and formatting). */
export function stripPhoneDigits(input: string): string {
  return input.replace(/\D/g, '')
}

/**
 * US/Canada NANP: 10 digits, or 11 with leading country code 1, become `(XXX) XXX-XXXX`.
 * Anything else is returned trimmed, unchanged.
 */
export function formatNanpPhone(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) return ''
  const d = stripPhoneDigits(trimmed)
  if (d.length === 11 && d[0] === '1') {
    const n = d.slice(1)
    return `(${n.slice(0, 3)}) ${n.slice(3, 6)}-${n.slice(6)}`
  }
  if (d.length === 10) {
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
  }
  return trimmed
}
