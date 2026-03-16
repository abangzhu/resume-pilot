import type { CaptureRequest, StitchRequest } from '@/shared/types'

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

const MAX_OUTPUT_HEIGHT = 4000

export async function stitchScreenshots(request: StitchRequest): Promise<string> {
  const { strips, panelWidth, totalHeight, overlap } = request

  if (strips.length === 0) {
    throw new Error('No strips to stitch')
  }

  const bitmaps: ImageBitmap[] = []
  for (const dataUrl of strips) {
    const resp = await fetch(dataUrl)
    const blob = await resp.blob()
    bitmaps.push(await createImageBitmap(blob))
  }

  const canvas = new OffscreenCanvas(panelWidth, totalHeight)
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Failed to create canvas context')
  }

  let y = 0
  for (let i = 0; i < bitmaps.length; i++) {
    ctx.drawImage(bitmaps[i], 0, y)
    const stripH = bitmaps[i].height
    y += stripH - (i < bitmaps.length - 1 ? overlap : 0)
    bitmaps[i].close()
  }

  let outputCanvas: OffscreenCanvas = canvas
  if (totalHeight > MAX_OUTPUT_HEIGHT) {
    const scale = MAX_OUTPUT_HEIGHT / totalHeight
    const scaledWidth = Math.round(panelWidth * scale)
    outputCanvas = new OffscreenCanvas(scaledWidth, MAX_OUTPUT_HEIGHT)
    const sctx = outputCanvas.getContext('2d')
    if (!sctx) {
      throw new Error('Failed to create scaled canvas context')
    }
    sctx.drawImage(canvas, 0, 0, scaledWidth, MAX_OUTPUT_HEIGHT)
  }

  const blob = await outputCanvas.convertToBlob({ type: 'image/jpeg', quality: 0.85 })
  return blobToDataUrl(blob)
}
