import {
  useCallback,
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
   * Electron: copied images sometimes only exist on the native clipboard (`clipboardData` empty).
   * Only call when the paste event does not carry plain text, otherwise a stale bitmap on the OS
   * clipboard can win over the text the user actually copied.
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
   * Photo drop zone only. No document-level listener, so normal paste works in inputs everywhere.
   */
  const handlePhotoFieldPasteCapture = useCallback(
    (e: ClipboardEvent): void => {
      if (!editingRef.current) return

      const cd = e.clipboardData
      const textPlain = cd?.getData('text/plain')?.trim() ?? ''
      const pastedTextIsImageDataUrl =
        textPlain.startsWith('data:image/') && textPlain.includes(',') && textPlain.length <= 3_500_000
      const hasOtherPlainText = textPlain.length > 0 && !pastedTextIsImageDataUrl

      if (!hasOtherPlainText && tryConsumeNativeImage(e)) return
      if (!cd) return

      if (pastedTextIsImageDataUrl) {
        e.preventDefault()
        void normalizeEmbeddedPhotoDataUrl(textPlain).then(applyUrl).catch(fail)
        return
      }

      if (hasOtherPlainText) return

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
