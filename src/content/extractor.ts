import { sendMessage } from '@/shared/messaging'

interface ResumeData {
  candidateId: string
  candidateName: string
  text: string
  rect: { x: number; y: number; width: number; height: number }
}

const SELECTORS = {
  resumeButton: ['.resume-btn-online'],

  // Bare selectors — for searching inside iframes
  resumeContentBare: [
    '.iframe-resume-detail',
    '.resume-detail',
    '.resume-content-wrap',
    '.resume-content',
  ],

  // Dialog-scoped — for searching main DOM (content directly in dialog, not in iframe)
  resumeContentScoped: [
    '.resume-common-dialog .iframe-resume-detail',
    '.resume-common-dialog .resume-detail',
    '.resume-common-dialog .resume-content-wrap',
    '.resume-common-dialog .resume-content',
    '.dialog-container .detail-figure',
  ],

  candidateName: [
    '.name-box',
    '.geek-item.selected .geek-name',
    '.resume-detail .name',
    '.detail-figure .name',
  ],
  candidateId: null,
} as const

function findElement(selectors: readonly string[]): Element | null {
  for (const sel of selectors) {
    const el = document.querySelector(sel)
    if (el) return el
  }
  return null
}

export function detectResumeButton(): boolean {
  return findElement(SELECTORS.resumeButton) !== null
}

export function detectResumePanel(): boolean {
  const dialog = document.querySelector('.resume-common-dialog')
  if (dialog) {
    const style = getComputedStyle(dialog)
    if (style.display !== 'none' && style.visibility !== 'hidden') return true
  }
  const legacy = document.querySelector('.dialog-container .detail-figure')
  if (legacy) return true
  return false
}

function isGarbageText(text: string): boolean {
  if (/^\s*!?function\s*\(/.test(text)) return true
  if (/\bSystem\.import\b/.test(text)) return true
  if (/\bcreateElement\s*\(\s*["']script["']\s*\)/.test(text)) return true
  return false
}

export function extractResumeText(): string {
  // 1. Main DOM: dialog-scoped selectors (content directly in dialog)
  for (const sel of SELECTORS.resumeContentScoped) {
    const el = document.querySelector(sel)
    const text = (el?.textContent ?? '').replace(/\s+/g, ' ').trim()
    if (text.length > 10 && !isGarbageText(text)) return text
  }

  // 2. Iframes inside dialog: bare selectors (no .resume-common-dialog prefix)
  const dialog = document.querySelector('.resume-common-dialog')
  const iframes = dialog
    ? dialog.querySelectorAll('iframe')
    : document.querySelectorAll('iframe')
  for (const iframe of iframes) {
    try {
      const iframeDoc = iframe.contentDocument
      if (!iframeDoc) continue
      for (const sel of SELECTORS.resumeContentBare) {
        const el = iframeDoc.querySelector(sel)
        const text = (el?.textContent ?? '').replace(/\s+/g, ' ').trim()
        if (text.length > 10 && !isGarbageText(text)) return text
      }
      const bodyText = (iframeDoc.body?.innerText ?? '').replace(/\s+/g, ' ').trim()
      if (bodyText.length > 50 && !isGarbageText(bodyText)) return bodyText
    } catch {
      // Cross-origin iframe — screenshot will be the fallback
    }
  }

  // 3. Fallback: dialog innerText (when content selectors don't match)
  if (dialog) {
    const dialogText = (dialog as HTMLElement).innerText ?? ''
    const cleaned = dialogText.replace(/\s+/g, ' ').trim()
    if (cleaned.length > 50 && !isGarbageText(cleaned)) return cleaned
  }

  return ''
}

function findResumePanel(): Element | null {
  // 1. Main DOM: scoped selectors
  for (const sel of SELECTORS.resumeContentScoped) {
    const el = document.querySelector(sel)
    if (el) return el
  }

  // 2. Same-origin iframes in dialog: bare selectors
  const dialog = document.querySelector('.resume-common-dialog')
  const iframes = dialog
    ? dialog.querySelectorAll('iframe')
    : document.querySelectorAll('iframe')
  for (const iframe of iframes) {
    try {
      const iframeDoc = iframe.contentDocument
      if (!iframeDoc) continue
      for (const sel of SELECTORS.resumeContentBare) {
        const el = iframeDoc.querySelector(sel)
        if (el) return el
      }
    } catch {
      // Cross-origin — skip
    }
  }

  // 3. Cross-origin iframe fallback: use iframe element itself for rect
  if (dialog) {
    const dialogIframes = dialog.querySelectorAll('iframe')
    for (const iframe of dialogIframes) {
      const rect = iframe.getBoundingClientRect()
      if (rect.width > 100 && rect.height > 100) return iframe
    }
  }

  // 4. Ultimate fallback: dialog element itself
  if (dialog) {
    const rect = dialog.getBoundingClientRect()
    if (rect.width > 100 && rect.height > 100) return dialog
  }

  return null
}

export function getResumePanelRect(): { x: number; y: number; width: number; height: number } | null {
  const panel = findResumePanel()
  if (!panel) return null

  const rect = panel.getBoundingClientRect()
  const dpr = window.devicePixelRatio || 1

  return {
    x: Math.round(rect.x * dpr),
    y: Math.round(rect.y * dpr),
    width: Math.round(rect.width * dpr),
    height: Math.round(rect.height * dpr),
  }
}

export function getCandidateId(): string {
  const urlParams = new URLSearchParams(window.location.search)
  const idFromUrl = urlParams.get('id') ?? urlParams.get('uid') ?? urlParams.get('geek')

  if (idFromUrl) return idFromUrl

  const pathMatch = window.location.pathname.match(/\/(\d+)\.html/)
  if (pathMatch) return pathMatch[1]

  const selectedItem = document.querySelector('.geek-item.selected')
  const dataId = selectedItem?.getAttribute('data-id')
  if (dataId) return dataId

  const nameEl = findElement(SELECTORS.candidateName)
  if (nameEl?.textContent?.trim()) {
    return `name_${nameEl.textContent.trim()}`
  }

  return `page_${Date.now()}`
}

export function getCandidateName(): string {
  const el = findElement(SELECTORS.candidateName)
  return el?.textContent?.trim() ?? ''
}

export interface ResumeDetectionState {
  buttonVisible: boolean
  panelOpen: boolean
}

export function observeResumeState(
  callback: (state: ResumeDetectionState) => void,
): MutationObserver {
  const observer = new MutationObserver(() => {
    callback({
      buttonVisible: detectResumeButton(),
      panelOpen: detectResumePanel(),
    })
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style'],
  })

  return observer
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function findScrollableAncestor(el: Element): Element | null {
  let current = el.parentElement
  while (current) {
    const style = getComputedStyle(current)
    const overflowY = style.overflowY
    if (
      (overflowY === 'auto' || overflowY === 'scroll') &&
      current.scrollHeight > current.clientHeight
    ) {
      return current
    }
    current = current.parentElement
  }
  return null
}

const SCROLL_SETTLE_MS = 150
const OVERLAP_PX = 20

export interface ScrollCaptureResult {
  screenshot: string
  text: string
}

export async function scrollCaptureResume(): Promise<ScrollCaptureResult | null> {
  const panel = findResumePanel()
  if (!panel) return null

  const scroller = findScrollableAncestor(panel)
  if (!scroller || scroller.scrollHeight <= scroller.clientHeight) {
    const rect = getResumePanelRect()
    if (!rect) return null
    const captureRes = await sendMessage<{ rect: typeof rect }, { screenshot: string }>(
      'CAPTURE_SCREENSHOT', { rect },
    )
    const panelText = (panel as HTMLElement).innerText ?? ''
    const text = isGarbageText(panelText) ? '' : panelText.replace(/\s+/g, ' ').trim()
    if (captureRes.success && captureRes.data) {
      return { screenshot: captureRes.data.screenshot, text }
    }
    return text ? { screenshot: '', text } : null
  }

  const originalScrollTop = scroller.scrollTop
  const scrollHeight = scroller.scrollHeight
  const clientHeight = scroller.clientHeight
  const dpr = window.devicePixelRatio || 1

  const strips: string[] = []
  const seenLines = new Set<string>()
  const textParts: string[] = []
  let offset = 0

  try {
    while (offset < scrollHeight) {
      scroller.scrollTop = offset
      await delay(SCROLL_SETTLE_MS)

      const rect = getResumePanelRect()
      if (!rect) break

      const remaining = scrollHeight - offset
      if (remaining < clientHeight) {
        const visiblePortion = remaining
        rect.height = Math.round(visiblePortion * dpr)
      }

      const captureRes = await sendMessage<
        { rect: typeof rect },
        { screenshot: string }
      >('CAPTURE_SCREENSHOT', { rect })

      if (!captureRes.success || !captureRes.data) break

      strips.push(captureRes.data.screenshot)

      const panelText = (panel as HTMLElement).innerText ?? ''
      for (const line of panelText.split('\n')) {
        const trimmed = line.trim()
        if (trimmed && !seenLines.has(trimmed)) {
          seenLines.add(trimmed)
          textParts.push(trimmed)
        }
      }

      offset += clientHeight - OVERLAP_PX
    }
  } finally {
    scroller.scrollTop = originalScrollTop
  }

  const rawText = textParts.join('\n')
  const collectedText = isGarbageText(rawText) ? '' : rawText

  if (strips.length === 0) {
    return collectedText ? { screenshot: '', text: collectedText } : null
  }

  if (strips.length === 1) {
    return { screenshot: strips[0], text: collectedText }
  }

  const stripHeight = Math.round(clientHeight * dpr)
  const panelWidth = Math.round(
    (panel?.getBoundingClientRect().width ?? 0) * dpr,
  )
  const totalHeight =
    stripHeight * strips.length - Math.round(OVERLAP_PX * dpr) * (strips.length - 1)

  const stitchRes = await sendMessage<
    { strips: string[]; stripHeight: number; panelWidth: number; totalHeight: number; overlap: number },
    { screenshot: string }
  >('STITCH_SCREENSHOTS', {
    strips,
    stripHeight,
    panelWidth,
    totalHeight,
    overlap: Math.round(OVERLAP_PX * dpr),
  })

  if (!stitchRes.success || !stitchRes.data) return null

  return {
    screenshot: stitchRes.data.screenshot,
    text: collectedText,
  }
}

export function extractResumeData(): ResumeData | null {
  if (!detectResumePanel()) return null

  const text = extractResumeText()
  const rect = getResumePanelRect()
  const candidateId = getCandidateId()

  if (!text && !rect) return null

  return {
    candidateId,
    candidateName: getCandidateName(),
    text,
    rect: rect ?? { x: 0, y: 0, width: 0, height: 0 },
  }
}
