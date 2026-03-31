import { useState } from 'react'
import type { Contact } from '../../../shared/types'
import { initials } from '../lib/format'

export default function ContactAvatar({
  contact,
  size
}: {
  contact: Contact
  size: 'sm' | 'lg'
}): React.ReactElement {
  const url = contact.photoUrl?.trim()
  const [imgFailed, setImgFailed] = useState(false)
  const showPhoto = Boolean(url) && !imgFailed

  const base = `avatar avatar--${size}`
  if (!showPhoto) {
    return <div className={base}>{initials(contact)}</div>
  }

  return (
    <div className={`${base} avatar--photo`}>
      <img
        src={url}
        alt=""
        referrerPolicy="no-referrer"
        onError={() => setImgFailed(true)}
      />
    </div>
  )
}
