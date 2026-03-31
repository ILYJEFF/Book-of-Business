import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent as ReactClipboardEvent,
  type Dispatch,
  type SetStateAction
} from 'react'
import {
  clipboardDataToPhotoDataUrl,
  imageFileToPhotoDataUrl,
  normalizeEmbeddedPhotoDataUrl
} from '../lib/contactPhoto'

type DraftWithPhoto = { photoUrl?: string }

export function useWorkspacePhotoUrl<T extends DraftWithPhoto>(
  editing: boolean,
  draft: Partial<T> | null,
  setDraft: Dispatch<SetStateAction<Partial<T> | null>>,
  /** When editing, used to apply a pasted photo if `draft` is still null (same row as `selected`). */
  pasteBaseWhenEditing?: Partial<T> | null
) {
  const [photoDndError, setPhotoDndError] = useState<string | null>(null)
  const [photoDragOver, setPhotoDragOver] = useState(false)
  const photoFileInputRef = useRef<HTMLInputElement>(null)
  const photoFieldRef = useRef<HTMLDivElement>(null)
  const editingRef = useRef(editing)
  const pasteBaseRef = useRef(pasteBaseWhenEditing ?? null)
  editingRef.current = editing
  pasteBaseRef.current = pasteBaseWhenEditing ?? null

  const resetPhotoFieldUi = useCallback(() => {
    setPhotoDndError(null)
    setPhotoDragOver(false)
  }, [])

  const applyPhotoFile = useCallback(
    async (file: File) => {
      setPhotoDndError(null)
      try {
        const url = await imageFileToPhotoDataUrl(file)
        setDraft((d) => (d ? { ...d, photoUrl: url } : d))
      } catch (err) {
        setPhotoDndError(err instanceof Error ? err.message : 'Could not use that image.')
      }
    },
    [setDraft]
  )

  const onPhotoFileInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0]
      e.target.value = ''
      if (f) void applyPhotoFile(f)
    },
    [applyPhotoFile]
  )

  const applyUrl = useCallback(
    (url: string): void => {
      setPhotoDndError(null)
      setDraft((d) => {
        const base = d ?? pasteBaseRef.current
        if (!base) return d
        return { ...base, photoUrl: url }
      })
    },
    [setDraft]
  )

  const fail = useCallback((err: unknown): void => {
    setPhotoDndError(err instanceof Error ? err.message : 'Could not paste that image.')
  }, [])

  /**
   * Electron: copied images often exist only on the native clipboard; `clipboardData` in the
   * renderer is empty. This path is safe to run globally: text clipboard yields null here.
   */
  const tryConsumeNativeImage = useCallback(
    (e: ClipboardEvent): boolean => {
      try {
        const native = window.book.readClipboardImageDataUrlSync()
        if (
          native &&
          typeof native === 'string' &&
          native.startsWith('data:image/') &&
          native.includes(',')
        ) {
          e.preventDefault()
          void normalizeEmbeddedPhotoDataUrl(native).then(applyUrl).catch(fail)
          return true
        }
      } catch {
        /* ignore */
      }
      return false
    },
    [applyUrl, fail]
  )

  /**
   * Full clipboard handling for the photo drop zone only. Never call `preventDefault` before we
   * know the payload is an image: macOS often exposes text pastes with `kind: file` items and an
   * empty MIME type, which would block normal paste app-wide if we used a document listener.
   */
  const handlePhotoFieldPasteCapture = useCallback(
    (e: ClipboardEvent): void => {
      if (!editingRef.current) return
      if (tryConsumeNativeImage(e)) return

      const cd = e.clipboardData
      if (!cd) return

      const plain = cd.getData('text/plain').trim()
      if (
        plain.startsWith('data:image/') &&
        plain.includes(',') &&
        plain.length <= 3_500_000
      ) {
        e.preventDefault()
        void normalizeEmbeddedPhotoDataUrl(plain).then(applyUrl).catch(fail)
        return
      }

      void clipboardDataToPhotoDataUrl(cd)
        .then((url) => {
          if (url) applyUrl(url)
        })
        .catch(fail)
    },
    [tryConsumeNativeImage, applyUrl, fail]
  )

  const onPhotoFieldPasteCapture = useCallback(
    (ev: ReactClipboardEvent) => {
      handlePhotoFieldPasteCapture(ev.nativeEvent)
    },
    [handlePhotoFieldPasteCapture]
  )

  /** Only native bitmap: avoids hijacking text paste when focus is in inputs. */
  const handleDocumentPasteCapture = useCallback(
    (e: ClipboardEvent): void => {
      if (!editingRef.current) return
      tryConsumeNativeImage(e)
    },
    [tryConsumeNativeImage]
  )

  useEffect(() => {
    document.addEventListener('paste', handleDocumentPasteCapture, true)
    return () => document.removeEventListener('paste', handleDocumentPasteCapture, true)
  }, [handleDocumentPasteCapture])

  return useMemo(
    () => ({
      photoDndError,
      setPhotoDndError,
      photoDragOver,
      setPhotoDragOver,
      photoFileInputRef,
      photoFieldRef,
      resetPhotoFieldUi,
      applyPhotoFile,
      onPhotoFileInputChange,
      onPhotoFieldPasteCapture
    }),
    [
      photoDndError,
      photoDragOver,
      setPhotoDragOver,
      resetPhotoFieldUi,
      applyPhotoFile,
      onPhotoFileInputChange,
      onPhotoFieldPasteCapture
    ]
  )
}
