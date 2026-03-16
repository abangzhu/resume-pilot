import type { CaptureRequest } from '@/shared/types'

export async function captureAndCrop(
  request: CaptureRequest,
  tabId: number,
): Promise<string> {
  const dataUrl = await chrome.tabs.captureVisibleTab(
    { format: 'png' },
  )

  const { rect } = request
  if (!rect || rect.width === 0 || rect.height === 0) {
    return dataUrl
  }

  const response = await fetch(dataUrl)
  const blob = await response.blob()
  const bitmap = await createImageBitmap(blob, rect.x, rect.y, rect.width, rect.height)

  const canvas = new OffscreenCanvas(rect.width, rect.height)
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Failed to create canvas context')
  }

  ctx.drawImage(bitmap, 0, 0)
  bitmap.close()

  const croppedBlob = await canvas.convertToBlob({ type: 'image/png' })
  return blobToDataUrl(croppedBlob)
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
