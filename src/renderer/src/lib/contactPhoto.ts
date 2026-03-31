/** Max raw bytes before we reject (keeps JSON contact files reasonable). */
const MAX_BYTES = 2_500_000

/** Max longest edge after optional downscale (data URL still fits CSP `data:`). */
const MAX_EDGE = 512

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => {
      const s = typeof r.result === 'string' ? r.result : ''
      if (!s.startsWith('data:image/')) {
        reject(new Error('Not an image'))
        return
      }
      resolve(s)
    }
    r.onerror = () => reject(r.error ?? new Error('Read failed'))
    r.readAsDataURL(file)
  })
}

function estimateDataUrlBytes(dataUrl: string): number {
  const i = dataUrl.indexOf(',')
  if (i < 0) return dataUrl.length
  const b64 = dataUrl.slice(i + 1).replace(/\s/g, '')
  return Math.floor((b64.length * 3) / 4)
}

async function downscaleDataUrlIfNeeded(dataUrl: string): Promise<string> {
  if (estimateDataUrlBytes(dataUrl) <= MAX_BYTES) {
    return dataUrl
  }
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      let w = img.naturalWidth
      let h = img.naturalHeight
      if (w <= 0 || h <= 0) {
        reject(new Error('Invalid image'))
        return
      }
      const scale = Math.min(1, MAX_EDGE / Math.max(w, h))
      w = Math.round(w * scale)
      h = Math.round(h * scale)
      const c = document.createElement('canvas')
      c.width = w
      c.height = h
      const ctx = c.getContext('2d')
      if (!ctx) {
        reject(new Error('No canvas'))
        return
      }
      ctx.drawImage(img, 0, 0, w, h)
      let q = 0.85
      let out = c.toDataURL('image/jpeg', q)
      while (estimateDataUrlBytes(out) > MAX_BYTES && q > 0.35) {
        q -= 0.1
        out = c.toDataURL('image/jpeg', q)
      }
      if (estimateDataUrlBytes(out) > MAX_BYTES) {
        reject(new Error('Image still too large after resize'))
        return
      }
      resolve(out)
    }
    img.onerror = () => reject(new Error('Could not decode image'))
    img.src = dataUrl
  })
}

export async function imageFileToPhotoDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Drop an image file (PNG, JPEG, WebP, …).')
  }
  if (file.size > MAX_BYTES * 2) {
    throw new Error('File is too large. Try an image under a few megabytes.')
  }
  const raw = await readFileAsDataUrl(file)
  return downscaleDataUrlIfNeeded(raw)
}

/** Pasted files are often `application/octet-stream` or an empty type; decode via bitmap. */
async function imageFileFromClipboardToPhotoDataUrl(file: File): Promise<string> {
  if (file.size > MAX_BYTES * 2) {
    throw new Error('File is too large. Try an image under a few megabytes.')
  }
  if (file.type.startsWith('image/')) {
    return imageFileToPhotoDataUrl(file)
  }
  const obj = URL.createObjectURL(file)
  try {
    const img = new Image()
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('Not a displayable image'))
      img.src = obj
    })
    let w = img.naturalWidth
    let h = img.naturalHeight
    if (w <= 0 || h <= 0) throw new Error('Invalid image')
    const scale = Math.min(1, MAX_EDGE / Math.max(w, h))
    w = Math.round(w * scale)
    h = Math.round(h * scale)
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    const ctx = c.getContext('2d')
    if (!ctx) throw new Error('No canvas')
    ctx.drawImage(img, 0, 0, w, h)
    let q = 0.85
    let out = c.toDataURL('image/jpeg', q)
    while (estimateDataUrlBytes(out) > MAX_BYTES && q > 0.35) {
      q -= 0.1
      out = c.toDataURL('image/jpeg', q)
    }
    if (estimateDataUrlBytes(out) > MAX_BYTES) {
      throw new Error('Image still too large after resize')
    }
    return out
  } finally {
    URL.revokeObjectURL(obj)
  }
}

export async function normalizeEmbeddedPhotoDataUrl(dataUrl: string): Promise<string> {
  const t = dataUrl.trim()
  if (!t.startsWith('data:image/') || !t.includes(',')) {
    throw new Error('Not an image')
  }
  return downscaleDataUrlIfNeeded(t)
}

/** True when we should `preventDefault` before reading files from the paste event. */
export function dataTransferHasExplicitImageMime(dt: DataTransfer): boolean {
  for (const f of Array.from(dt.files ?? [])) {
    if (f.type.startsWith('image/')) return true
  }
  const items = dt.items
  if (!items?.length) return false
  for (let i = 0; i < items.length; i++) {
    const it = items[i]
    if (it.kind === 'file' && it.type.startsWith('image/')) return true
  }
  return false
}

export async function clipboardDataToPhotoDataUrl(dt: DataTransfer | null): Promise<string | null> {
  if (!dt) return null

  for (const f of Array.from(dt.files ?? [])) {
    if (!f.type.startsWith('image/')) continue
    try {
      return await imageFileToPhotoDataUrl(f)
    } catch {
      /* try other sources */
    }
  }

  const items = dt.items
  if (items?.length) {
    for (let i = 0; i < items.length; i++) {
      const it = items[i]
      if (it.kind !== 'file') continue
      const f = it.getAsFile()
      if (!f || f.size === 0) continue
      try {
        return await imageFileFromClipboardToPhotoDataUrl(f)
      } catch {
        /* next item */
      }
    }
  }

  return null
}
