import type { ReactElement } from 'react'
import { formatNanpPhone } from '../../../shared/phoneFormat'
import { EMAIL_LABEL_PRESETS, PHONE_LABEL_PRESETS } from '../lib/contactChannelLabels'
import ChannelLabelMenu from './ChannelLabelMenu'

type Kind = 'email' | 'phone'

export default function LabeledContactChannelRow({
  kind,
  menuId,
  label,
  value,
  disabled,
  valuePlaceholder,
  onLabelChange,
  onValueChange
}: {
  kind: Kind
  /** Stable id for the label picker (accessibility). */
  menuId: string
  label: string
  value: string
  disabled: boolean
  valuePlaceholder: string
  onLabelChange: (next: string) => void
  onValueChange: (next: string) => void
}): ReactElement {
  const presets = kind === 'email' ? EMAIL_LABEL_PRESETS : PHONE_LABEL_PRESETS
  const inPreset = (presets as readonly string[]).includes(label)

  if (disabled) {
    return (
      <div className="channel-combo-inner">
        <span className="channel-label-readonly" title={label || 'Label'}>
          {label || '—'}
        </span>
        <input
          className="channel-value-input focus-ring flex-1 min-w-0"
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
        <ChannelLabelMenu id={menuId} label={label} presets={presets} onChange={onLabelChange} />
        {!inPreset && (
          <input
            className="channel-custom-label-input focus-ring"
            placeholder="Label"
            value={label}
            onChange={(e) => onLabelChange(e.target.value)}
            aria-label="Custom label"
          />
        )}
      </div>
      <input
        className="channel-value-input focus-ring flex-1 min-w-0"
        type={kind === 'phone' ? 'tel' : 'text'}
        inputMode={kind === 'phone' ? 'tel' : 'email'}
        autoComplete={kind === 'phone' ? 'tel' : 'email'}
        spellCheck={kind === 'email'}
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
