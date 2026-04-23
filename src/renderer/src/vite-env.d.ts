/// <reference types="vite/client" />

type DesktopApi = {
  generateReceipt(payload: unknown): Promise<{ pdfUrl: string; pdfPath: string; message: string }>
  generateSignedReceipt(payload: unknown): Promise<{ pdfUrl: string; pdfPath: string; message: string }>
  buildShareMessage(payload: unknown): Promise<{ link: string; whatsappMessage: string; emailMessage: string; emailSubject: string }>
  openEmailClient(payload: unknown): Promise<{ mailto: string }>
  getEnv(): Promise<{ confirmationBaseUrl: string }>
}

declare global {
  interface Window {
    reciboxApi?: DesktopApi
  }
}
