import { useEffect, useState, type ReactElement } from 'react'
import type { Company } from '../../../shared/types'
import { companyInitials } from '../lib/format'

export default function CompanyAvatar({
  company,
  size
}: {
  company: Pick<Company, 'id' | 'name' | 'photoUrl'>
  size: 'sm' | 'lg' | 'xl'
}): ReactElement {
  const url = company.photoUrl?.trim()
  const [imgFailed, setImgFailed] = useState(false)

  useEffect(() => {
    setImgFailed(false)
  }, [company.id, company.photoUrl])

  const showPhoto = Boolean(url) && !imgFailed
  const base = `avatar avatar--${size}`
  const label = companyInitials(company.name ?? '')

  if (!showPhoto) {
    return <div className={base}>{label}</div>
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
