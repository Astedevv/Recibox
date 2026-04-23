import { contextBridge, ipcRenderer } from 'electron'
import {
  type GenerateSignedReceiptPayload,
  type GenerateReceiptPayload,
  type GenerateReceiptResult,
  type OpenEmailPayload,
  type ShareMessagePayload,
  type ShareMessageResult
} from '@shared/ipc'

const IPC_CHANNELS = {
  generateReceipt: 'receipt:generate-and-upload',
  generateSignedReceipt: 'receipt:generate-signed-and-upload',
  buildShareMessage: 'share:build-message',
  getEnv: 'app:get-env',
  openEmailClient: 'share:open-email-client'
} as const

const api = {
  generateReceipt(payload: GenerateReceiptPayload): Promise<GenerateReceiptResult> {
    return ipcRenderer.invoke(IPC_CHANNELS.generateReceipt, payload)
  },
  generateSignedReceipt(payload: GenerateSignedReceiptPayload): Promise<GenerateReceiptResult> {
    return ipcRenderer.invoke(IPC_CHANNELS.generateSignedReceipt, payload)
  },
  buildShareMessage(payload: ShareMessagePayload): Promise<ShareMessageResult> {
    return ipcRenderer.invoke(IPC_CHANNELS.buildShareMessage, payload)
  },
  openEmailClient(payload: OpenEmailPayload): Promise<{ mailto: string }> {
    return ipcRenderer.invoke(IPC_CHANNELS.openEmailClient, payload)
  },
  getEnv(): Promise<{ confirmationBaseUrl: string }> {
    return ipcRenderer.invoke(IPC_CHANNELS.getEnv)
  }
}

contextBridge.exposeInMainWorld('reciboxApi', api)

export type DesktopApi = typeof api
