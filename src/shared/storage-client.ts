import type {
  ApiSettings,
  AdvancedSettings,
  FieldConfig,
  ScoringTemplate,
  MessageResponse,
} from './types'
import { sendMessage } from './messaging'

export const storageClient = {
  getApiSettings(): Promise<MessageResponse<ApiSettings>> {
    return sendMessage('GET_SETTINGS', { key: 'apiSettings' })
  },

  saveApiSettings(settings: ApiSettings): Promise<MessageResponse<void>> {
    return sendMessage('SAVE_SETTINGS', { key: 'apiSettings', value: settings })
  },

  getTemplates(): Promise<MessageResponse<ScoringTemplate[]>> {
    return sendMessage('GET_TEMPLATES')
  },

  saveTemplate(template: ScoringTemplate): Promise<MessageResponse<void>> {
    return sendMessage('SAVE_TEMPLATE', { template })
  },

  deleteTemplate(id: string): Promise<MessageResponse<void>> {
    return sendMessage('DELETE_TEMPLATE', { id })
  },

  getFieldConfig(): Promise<MessageResponse<FieldConfig>> {
    return sendMessage('GET_SETTINGS', { key: 'fieldConfig' })
  },

  saveFieldConfig(config: FieldConfig): Promise<MessageResponse<void>> {
    return sendMessage('SAVE_SETTINGS', { key: 'fieldConfig', value: config })
  },

  getAdvancedSettings(): Promise<MessageResponse<AdvancedSettings>> {
    return sendMessage('GET_SETTINGS', { key: 'advancedSettings' })
  },

  saveAdvancedSettings(settings: AdvancedSettings): Promise<MessageResponse<void>> {
    return sendMessage('SAVE_SETTINGS', { key: 'advancedSettings', value: settings })
  },

  testConnection(): Promise<MessageResponse<{ ok: boolean; message: string }>> {
    return sendMessage('TEST_CONNECTION')
  },

  clearCache(): Promise<MessageResponse<void>> {
    return sendMessage('CLEAR_CACHE')
  },
}
