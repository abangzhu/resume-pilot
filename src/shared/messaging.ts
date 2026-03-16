import type { Message, MessageResponse, MessageType } from './types'

export function sendMessage<TPayload = unknown, TResponse = unknown>(
  type: MessageType,
  payload?: TPayload,
): Promise<MessageResponse<TResponse>> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage<Message<TPayload>, MessageResponse<TResponse>>(
      { type, payload },
      (response) => {
        if (chrome.runtime.lastError) {
          resolve({
            success: false,
            error: chrome.runtime.lastError.message ?? 'Unknown error',
          })
          return
        }
        resolve(response ?? { success: false, error: 'No response' })
      },
    )
  })
}

export function onMessage(
  handler: (
    message: Message,
    sender: chrome.runtime.MessageSender,
  ) => Promise<MessageResponse> | MessageResponse | void,
): void {
  chrome.runtime.onMessage.addListener(
    (message: Message, sender, sendResponse) => {
      const result = handler(message, sender)
      if (result instanceof Promise) {
        result.then(sendResponse).catch((err) =>
          sendResponse({
            success: false,
            error: err instanceof Error ? err.message : String(err),
          }),
        )
        return true
      }
      if (result !== undefined) {
        sendResponse(result)
      }
      return false
    },
  )
}
