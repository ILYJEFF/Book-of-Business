import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
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
  setDraft: Dispatch<SetStateAction<Partial<T> | null>>
) {
  const [photoDndError, setPhotoDndError] = useState<string | null>(null)
  const [photoDragOver, setPhotoDragOver] = useState(false)
  const photoFileInputRef = useRef<HTMLInputElement>(null)
  const photoFieldRef = useRef<HTMLDivElement>(null)
  const editingRef = useRef(editing)
  const draftRef = useRef(draft)
  editingRef.current = editing
  draftRef.current = draft

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

  const onPhotoFieldPasteCapture = useCallback(
    (e: ClipboardEvent): void => {
      if (!editingRef.current || !draftRef.current) return

      const cd = e.clipboardData

      const applyUrl = (url: string): void => {
        setPhotoDndError(null)
        setDraft((d) => (d ? { ...d, photoUrl: url } : d))
      }

      const fail = (err: unknown): void => {
        setPhotoDndError(err instanceof Error ? err.message : 'Could not paste that image.')
      }

      if (cd) {
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
      }

      let native: string | null = null
      try {
        native = window.book.readClipboardImageDataUrlSync()
      } catch {
        native = null
      }
      if (native) {
        e.preventDefault()
        void normalizeEmbeddedPhotoDataUrl(native).then(applyUrl).catch(fail)
        return
      }

      if (cd) {
        void clipboardDataToPhotoDataUrl(cd).then((url) => {
          if (url) applyUrl(url)
        })
      }
    },
    [setDraft]
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
