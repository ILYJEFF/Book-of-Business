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
  dataTransferHasExplicitImageMime,
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

  const handlePasteCapture = useCallback(
    (e: ClipboardEvent): void => {
      if (!editingRef.current) return

      const applyUrl = (url: string): void => {
        setPhotoDndError(null)
        setDraft((d) => {
          const base = d ?? pasteBaseRef.current
          if (!base) return d
          return { ...base, photoUrl: url }
        })
      }

      const fail = (err: unknown): void => {
        setPhotoDndError(err instanceof Error ? err.message : 'Could not paste that image.')
      }

      /** Electron: copy-image often fills native clipboard while paste.clipboardData is empty. */
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
          return
        }
      } catch {
        /* ignore */
      }

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

      if (dataTransferHasExplicitImageMime(cd)) {
        e.preventDefault()
        void clipboardDataToPhotoDataUrl(cd)
          .then((url) => {
            if (url) applyUrl(url)
          })
          .catch(fail)
        return
      }

      void clipboardDataToPhotoDataUrl(cd).then((url) => {
        if (url) {
          e.preventDefault()
          applyUrl(url)
        }
      })
    },
    [setDraft]
  )

  const onPhotoFieldPasteCapture = useCallback(
    (ev: ReactClipboardEvent) => {
      handlePasteCapture(ev.nativeEvent)
    },
    [handlePasteCapture]
  )

  useEffect(() => {
    document.addEventListener('paste', handlePasteCapture, true)
    return () => document.removeEventListener('paste', handlePasteCapture, true)
  }, [handlePasteCapture])

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
