import type { ReactElement } from 'react'
import { formatNanpPhone } from '../../../shared/phoneFormat'
import {
  CUSTOM_LABEL_OPTION,
  EMAIL_LABEL_PRESETS,
  PHONE_LABEL_PRESETS
} from '../lib/contactChannelLabels'

type Kind = 'email' | 'phone'

export default function LabeledContactChannelRow({
  kind,
  label,
  value,
  disabled,
  valuePlaceholder,
  onLabelChange,
  onValueChange
}: {
  kind: Kind
  label: string
  value: string
  disabled: boolean
  valuePlaceholder: string
  onLabelChange: (next: string) => void
  onValueChange: (next: string) => void
}): ReactElement {
  const presets = kind === 'email' ? EMAIL_LABEL_PRESETS : PHONE_LABEL_PRESETS
  const inPreset = (presets as readonly string[]).includes(label)
  const selectValue = inPreset ? label : CUSTOM_LABEL_OPTION

  if (disabled) {
    return (
      <div className="channel-combo-inner">
        <span className="channel-label-readonly" title={label || 'Label'}>
          {label || '—'}
        </span>
        <input
          className="text-input focus-ring flex-1 min-w-0"
          disabled
          readOnly
          value={kind === 'phone' ? formatNanpPhone(value) : value}
          placeholder={valuePlaceholder}
        />
      </div>
    )
  }

  return (
    <div className="channel-combo-inner">
      <div className="channel-label-controls">
        <select
          className="text-input focus-ring channel-label-select"
          aria-label={kind === 'email' ? 'Email label' : 'Phone label'}
          value={selectValue}
          onChange={(e) => {
            const v = e.target.value
            if (v === CUSTOM_LABEL_OPTION) {
              onLabelChange('')
              return
            }
            onLabelChange(v)
          }}
        >
          {presets.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
          <option value={CUSTOM_LABEL_OPTION}>{CUSTOM_LABEL_OPTION}</option>
        </select>
        {!inPreset && (
          <input
            className="text-input focus-ring channel-custom-label"
            placeholder="Custom label"
            value={label}
            onChange={(e) => onLabelChange(e.target.value)}
          />
        )}
      </div>
      <input
        className="text-input focus-ring flex-1 min-w-0"
        type={kind === 'phone' ? 'tel' : 'text'}
        inputMode={kind === 'phone' ? 'tel' : undefined}
        autoComplete={kind === 'phone' ? 'tel' : undefined}
        placeholder={valuePlaceholder}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        onBlur={
          kind === 'phone'
            ? () => {
                const next = formatNanpPhone(value)
                if (next !== value) onValueChange(next)
              }
            : undefined
        }
      />
    </div>
  )
}
