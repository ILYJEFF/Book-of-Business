import { useEffect, useMemo, useRef, useState } from 'react'

type QueryPreset = {
  label: string
  value: string
}

const SITE_PRESETS: QueryPreset[] = [
  { label: 'LinkedIn profiles', value: 'site:linkedin.com/in' },
  { label: 'LinkedIn company pages', value: 'site:linkedin.com/company' },
  { label: 'Industry forums and blogs', value: '(site:reddit.com OR site:avsforum.com OR site:cedia.net)' },
  { label: 'Job boards (signals)', value: '(site:indeed.com OR site:ziprecruiter.com OR site:glassdoor.com)' }
]

const TITLE_KEYWORDS = [
  '"Director of Field Operations"',
  '"Field Operations Director"',
  '"Director of Operations"',
  '"Operations Manager"',
  '"Service Operations Manager"'
]

const INDUSTRY_TERMS = [
  '"low voltage"',
  '"residential prewire"',
  '"home automation"',
  '"security installation"',
  '"audio visual installation"',
  '"smart home"'
]

function toSearchUrl(query: string): string {
  return `https://www.bing.com/search?q=${encodeURIComponent(query)}`
}

function buildQueries(role: string, market: string, notes: string): { name: string; query: string }[] {
  const roleBits = role.trim() ? [`"${role.trim()}"`] : TITLE_KEYWORDS
  const location = market.trim() ? `"${market.trim()}"` : '"Dallas Fort Worth"'
  const noteBits = notes
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 5)
    .map((x) => `"${x}"`)

  const industryBlock = `(${INDUSTRY_TERMS.join(' OR ')})`
  const titleBlock = `(${roleBits.join(' OR ')})`
  const noteBlock = noteBits.length ? ` (${noteBits.join(' OR ')})` : ''

  return [
    {
      name: 'Core LinkedIn x-ray',
      query: `${SITE_PRESETS[0]!.value} ${titleBlock} ${industryBlock} ${location}${noteBlock}`
    },
    {
      name: 'Service leadership bench',
      query: `${SITE_PRESETS[0]!.value} ("field service" OR "in-home installation" OR "service delivery") ${titleBlock} ${location}${noteBlock}`
    },
    {
      name: 'Integrator competitors',
      query: `${SITE_PRESETS[1]!.value} ("home automation" OR "security integration" OR "AV integration") (${market} OR "DFW" OR "Dallas")`
    },
    {
      name: 'Operational depth',
      query: `${SITE_PRESETS[0]!.value} ("P&L" OR "dispatch" OR "technician utilization" OR "install crews") ${industryBlock} ${location}`
    }
  ]
}

export default function RecruitingView(): React.ReactElement {
  const [role, setRole] = useState('Director of Field Operations')
  const [market, setMarket] = useState('Dallas Fort Worth')
  const [company, setCompany] = useState('HomePro')
  const [notes, setNotes] = useState(
    'residential new construction\nlow and high voltage prewire\nsecurity, audio visual, and automation'
  )
  const [selectedSite, setSelectedSite] = useState(SITE_PRESETS[0]!.value)
  const [queryText, setQueryText] = useState('')
  const [browserUrl, setBrowserUrl] = useState('https://www.bing.com')
  const [addressBar, setAddressBar] = useState('https://www.bing.com')
  const webviewRef = useRef<HTMLElement | null>(null)

  const suggestions = useMemo(() => buildQueries(role, market, notes), [role, market, notes])

  useEffect(() => {
    const wv = webviewRef.current as unknown as {
      addEventListener: (name: string, cb: () => void) => void
      removeEventListener: (name: string, cb: () => void) => void
      getURL: () => string
    } | null
    if (!wv) return
    const onNav = () => {
      const next = wv.getURL()
      if (next) setAddressBar(next)
    }
    wv.addEventListener('did-navigate', onNav)
    wv.addEventListener('did-navigate-in-page', onNav)
    return () => {
      wv.removeEventListener('did-navigate', onNav)
      wv.removeEventListener('did-navigate-in-page', onNav)
    }
  }, [browserUrl])

  const launchQuery = (q: string) => {
    const merged = `${selectedSite} ${q}`.trim()
    const url = toSearchUrl(merged)
    setQueryText(merged)
    setBrowserUrl(url)
    setAddressBar(url)
  }

  const nav = (action: 'back' | 'forward' | 'reload') => {
    const wv = webviewRef.current as unknown as
      | { goBack: () => void; goForward: () => void; reload: () => void }
      | null
    if (!wv) return
    if (action === 'back') wv.goBack()
    else if (action === 'forward') wv.goForward()
    else wv.reload()
  }

  const openAddressBar = () => {
    const trimmed = addressBar.trim()
    if (!trimmed) return
    const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
    setBrowserUrl(normalized)
  }

  return (
    <div className="recruiting-view">
      <section className="recruiting-left scroll-y">
        <p className="folio-kicker">Hiring Workspace</p>
        <h1 className="recruiting-title">Talent scout for HomePro</h1>
        <p className="muted small recruiting-lead">
          Builds focused x-ray strings for low-voltage field leadership in DFW, then runs them in the in-app browser.
        </p>

        <div className="form-row-2">
          <div>
            <label className="field-label" htmlFor="rs-role">
              Target role
            </label>
            <input
              id="rs-role"
              className="text-input focus-ring"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="rs-market">
              Market
            </label>
            <input
              id="rs-market"
              className="text-input focus-ring"
              value={market}
              onChange={(e) => setMarket(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="field-label" htmlFor="rs-company">
            Company context
          </label>
          <input
            id="rs-company"
            className="text-input focus-ring"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          />
        </div>

        <div>
          <label className="field-label" htmlFor="rs-notes">
            Must-have language
          </label>
          <textarea
            id="rs-notes"
            className="text-input focus-ring recruiting-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div>
          <p className="field-label" style={{ marginBottom: 8 }}>
            Source focus
          </p>
          <div className="recruiting-chip-row">
            {SITE_PRESETS.map((p) => {
              const on = selectedSite === p.value
              return (
                <button
                  key={p.label}
                  type="button"
                  className={`filter-chip focus-ring${on ? ' filter-chip--on' : ''}`}
                  onClick={() => setSelectedSite(p.value)}
                >
                  {p.label}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <p className="field-label" style={{ marginBottom: 8 }}>
            Suggested x-ray plays
          </p>
          <div className="recruiting-query-list">
            {suggestions.map((s) => (
              <button
                key={s.name}
                type="button"
                className="recruiting-query-hit focus-ring"
                onClick={() => launchQuery(`${s.query} "${company}"`)}
              >
                <span className="recruiting-query-name">{s.name}</span>
                <span className="recruiting-query-text">{s.query}</span>
              </button>
            ))}
          </div>
          <p className="muted small" style={{ marginTop: 10 }}>
            Tip: start broad, then add terms like <code className="inline-code">"P&L"</code>,{' '}
            <code className="inline-code">"dispatch"</code>, or specific competitor names.
          </p>
        </div>

        {queryText ? (
          <div className="recruiting-live-query">
            <p className="field-label">Current query</p>
            <p className="muted small">{queryText}</p>
          </div>
        ) : null}
      </section>

      <section className="recruiting-browser">
        <div className="recruiting-browser-toolbar">
          <button type="button" className="btn btn-ghost focus-ring" onClick={() => nav('back')}>
            Back
          </button>
          <button type="button" className="btn btn-ghost focus-ring" onClick={() => nav('forward')}>
            Forward
          </button>
          <button type="button" className="btn btn-ghost focus-ring" onClick={() => nav('reload')}>
            Reload
          </button>
          <input
            className="text-input focus-ring recruiting-url-input"
            value={addressBar}
            onChange={(e) => setAddressBar(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') openAddressBar()
            }}
            placeholder="https://"
            aria-label="Browser URL"
          />
          <button type="button" className="btn btn-primary focus-ring" onClick={openAddressBar}>
            Go
          </button>
          <button
            type="button"
            className="btn btn-ghost focus-ring"
            onClick={() => void window.book.openExternal(browserUrl)}
          >
            Open externally
          </button>
        </div>

        <div className="recruiting-webview-wrap">
          <webview ref={webviewRef} src={browserUrl} className="recruiting-webview" />
        </div>
      </section>
    </div>
  )
}
