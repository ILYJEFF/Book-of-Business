const stroke = 'currentColor'
const common = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none' as const }

export function IconContacts(): React.ReactElement {
  return (
    <svg {...common} aria-hidden>
      <path
        stroke={stroke}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
      />
    </svg>
  )
}

export function IconBuilding(): React.ReactElement {
  return (
    <svg {...common} aria-hidden>
      <path
        stroke={stroke}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 21h18M6 21V7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v14M10 11h4M10 15h4M10 7h4"
      />
    </svg>
  )
}

export function IconLayers(): React.ReactElement {
  return (
    <svg {...common} aria-hidden>
      <path
        stroke={stroke}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
      />
    </svg>
  )
}

export function IconLibrary(): React.ReactElement {
  return (
    <svg {...common} aria-hidden>
      <path
        stroke={stroke}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"
      />
    </svg>
  )
}
