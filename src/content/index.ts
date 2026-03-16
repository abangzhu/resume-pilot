import { createApp } from 'vue'
import App from './App.vue'
import shadowStyles from './shadow-styles.css?inline'

console.log('[Resume Pilot] Content script loaded on', window.location.href)

function mount(): void {
  const hostId = 'resume-pilot-root'
  if (document.getElementById(hostId)) return

  const host = document.createElement('div')
  host.id = hostId
  document.body.appendChild(host)

  const shadow = host.attachShadow({ mode: 'open' })

  const styleEl = document.createElement('style')
  styleEl.textContent = getOverlayStyles() + shadowStyles
  shadow.appendChild(styleEl)

  const appRoot = document.createElement('div')
  appRoot.id = 'app'
  shadow.appendChild(appRoot)

  createApp(App).mount(appRoot)

  console.log('[Resume Pilot] Floating panel mounted')
}

function getOverlayStyles(): string {
  return `
    #app {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: #1f2937;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
  `
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount)
} else {
  mount()
}
