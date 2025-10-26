import { useRef } from 'react'

type Props = {
  onSelect: (file: File) => void | Promise<void>
  accept?: string
  primary?: string
  secondary?: string
  disabled?: boolean
}

export default function FileDrop({ onSelect, accept = 'image/*', primary = 'Click to choose a file', secondary = 'or drag and drop here', disabled = false }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null)

  const pick = () => { if (!disabled) inputRef.current?.click() }

  const handleFiles = async (fileList: FileList | null | undefined) => {
    if (!fileList || !fileList[0]) return
    const f = fileList[0]
    await onSelect(f)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <>
      <input
        ref={inputRef}
        className='file-hidden'
        type='file'
        accept={accept}
        onChange={(e) => handleFiles(e.target.files)}
        tabIndex={-1}
        aria-hidden
      />
      <div
        className='file-drop'
        role='button'
        tabIndex={0}
        aria-disabled={disabled}
        onClick={pick}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') pick() }}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }}
        onDrop={(e) => { e.preventDefault(); e.stopPropagation(); if (!disabled) handleFiles(e.dataTransfer.files) }}
      >
        <div className='file-drop-primary'>{primary}</div>
        <div className='file-drop-secondary'>{secondary}</div>
      </div>
    </>
  )
}

