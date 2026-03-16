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
