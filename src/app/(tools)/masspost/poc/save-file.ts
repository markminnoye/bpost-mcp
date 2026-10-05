// Saving a file the browser made itself: nothing comes from a server, so the button says "Opslaan".
// Always through a link with `download`: it works in every browser, also in hosts that show the
// "Save as" dialog of the File System Access API but refuse to write the file (the Claude desktop
// app's browser left an empty file that way, 06/10/2026). Where the file lands is the browser's choice.

/** What to save: the file name and its type. */
export interface SaveFile {
  name: string
  mime: string
}

/**
 * Saves bytes as a file through the browser's own download handling.
 *
 * @param bytes File contents.
 * @param file Name and type.
 */
export function saveFile(bytes: Uint8Array, file: SaveFile): void {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: file.mime }))
  const link = document.createElement('a')
  link.href = url
  link.download = file.name
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
