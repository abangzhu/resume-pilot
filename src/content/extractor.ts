import { sendMessage } from '@/shared/messaging'

interface ResumeData {
  candidateId: string
  candidateName: string
  text: string
  rect: { x: number; y: number; width: number; height: number }
}

const SELECTORS = {
  resumePanel: [
    '.resume-detail',
    '.resume-content',
    '[class*="resume"]',
    '.dialog-container .detail-figure',
  ],
  resumeTextFallback: [
    '.base-info-single-container',
    '.base-info-content',
  ],
  candidateName: [
    '.name-box',
    '.geek-item.selected .geek-name',
    '.resume-detail .name',
    '.detail-figure .name',
    '[class*="resume"] .name',
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

export function detectResumePanel(): boolean {
  return findElement(SELECTORS.resumePanel) !== null
}

export function extractResumeText(): string {
  for (const sel of SELECTORS.resumePanel) {
    const el = document.querySelector(sel)
    const text = (el?.textContent ?? '').replace(/\s+/g, ' ').trim()
    if (text.length > 10) return text
  }

  for (const sel of SELECTORS.resumeTextFallback) {
    const el = document.querySelector(sel)
    const text = (el?.textContent ?? '').replace(/\s+/g, ' ').trim()
    if (text.length > 10) return text
  }

  return ''
}

export function getResumePanelRect(): { x: number; y: number; width: number; height: number } | null {
  const panel = findElement(SELECTORS.resumePanel)
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

export function observeResumePanel(callback: (visible: boolean) => void): MutationObserver {
  const observer = new MutationObserver(() => {
    callback(detectResumePanel())
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
  const panel = findElement(SELECTORS.resumePanel)
  if (!panel) return null

  const scroller = findScrollableAncestor(panel)
  if (!scroller) return null
  if (scroller.scrollHeight <= scroller.clientHeight) return null

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

  const collectedText = textParts.join('\n')

  if (strips.length <= 1) {
    return collectedText ? { screenshot: '', text: collectedText } : null
  }

  const stripHeight = Math.round(clientHeight * dpr)
  const panelWidth = Math.round(
    (findElement(SELECTORS.resumePanel)?.getBoundingClientRect().width ?? 0) * dpr,
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
