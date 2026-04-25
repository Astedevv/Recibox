import puppeteer from 'puppeteer'
import type { GenerateReceiptPayload, GenerateSignedReceiptPayload } from '@shared/ipc'

const money = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

const longDate = (isoDate: string) =>
  new Date(isoDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
const localIsoDate = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const isFuturePaymentDate = (isoDate: string) => isoDate > localIsoDate()

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')

type SignedPayment = GenerateSignedReceiptPayload['payment']

type ReceiptTemplateInput = {
  company: GenerateReceiptPayload['company']
  supplier: GenerateReceiptPayload['supplier']
  payment: SignedPayment
  signatureHtml?: string
}

const buildReceiptDocument = ({ company, supplier, payment, signatureHtml = '' }: ReceiptTemplateInput): string => {
  const scheduledPayment = isFuturePaymentDate(payment.data_pagamento)
  const operationTypeLabel = scheduledPayment ? 'Pagamento com data prevista' : 'Pagamento imediato'
  const logoMarkup = company.logo_url
    ? `<img src="${escapeHtml(company.logo_url)}" class="logo" alt="Logo empresa"/>`
    : `<div class="logo-fallback">${escapeHtml(company.empresa_nome.slice(0, 2).toUpperCase())}</div>`

  return `<!DOCTYPE html>
<html lang="pt-br">
<head>
<meta charset="UTF-8" />
<title>Recibo de Pagamento</title>
<style>
  body { font-family: "Segoe UI", sans-serif; background: #eef2ff; padding: 16px; color: #0f172a; }
  .recibo { width: 780px; margin: auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(15,23,42,0.12);}
  .brand-bar { height: 10px; background: linear-gradient(90deg, #1E40FF, #2563EB, #F97316); }
  .content { padding: 26px; }
  .header { display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0; padding-bottom:14px; margin-bottom:18px; }
  .logo { height: 58px; object-fit: contain; }
  .logo-fallback { width: 58px; height:58px; border-radius:12px; background: linear-gradient(135deg, #1E40FF, #F97316); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700; }
  .header-right { text-align: right; }
  .titulo { font-size:22px; font-weight:700; color:#111827; letter-spacing: 0.8px; }
  .subtitle { font-size:11px; color:#64748b; margin-top:4px; }
  .grid { display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-top: 10px; }
  .box { background:#f8fafc; padding:12px; border-radius:10px; border: 1px solid #e2e8f0; }
  .label { font-size:10px; color:#64748b; margin-bottom:4px; text-transform: uppercase; letter-spacing: 0.4px; }
  .valor { font-weight:600; color:#0f172a; }
  .valor-destaque { margin-top:16px; background: linear-gradient(180deg, #fffbeb, #fef3c7); border:1px solid #f59e0b; padding:14px; border-radius:10px; font-size:24px; text-align:right; font-weight:700; color:#1f2937; }
  .descricao { margin-top:18px; }
  .descricao-box { background:#f8fafc; padding:15px; border-radius:10px; min-height:80px; border: 1px solid #e2e8f0; }
  .alerta-programado { margin-top:12px; border-radius:10px; border:1px solid #f59e0b; background:#fffbeb; padding:12px; font-size:12px; line-height:1.5; color:#92400e; }
  .assinatura { margin-top:42px; text-align:center; }
  .linha { width:300px; border-top:1px solid #0f172a; margin:0 auto 5px; }
  .footer { margin-top:28px; text-align:center; font-size:12px; color:#475569; line-height: 1.6; }
</style>
</head>
<body>
  <div class="recibo">
    <div class="brand-bar"></div>
    <div class="content">
      <div class="header">
      ${logoMarkup}
      <div class="header-right">
        <div class="titulo">RECIBO DE PAGAMENTO</div>
        <div class="subtitle">Documento financeiro formal</div>
      </div>
    </div>
    <div class="grid">
      <div class="box"><div class="label">FORNECEDOR</div><div class="valor">${escapeHtml(supplier.nome)}</div></div>
      <div class="box"><div class="label">CPF / CNPJ</div><div class="valor">${escapeHtml(supplier.cpf_cnpj ?? '-')}</div></div>
      <div class="box"><div class="label">EMPRESA PAGADORA</div><div class="valor">${escapeHtml(company.empresa_nome)}</div></div>
      <div class="box"><div class="label">CNPJ</div><div class="valor">${escapeHtml(company.cnpj ?? '-')}</div></div>
    </div>
    <div class="valor-destaque">${money(payment.valor)}</div>
    ${scheduledPayment ? `<div class="alerta-programado">Pagamento previsto para <strong>${escapeHtml(longDate(payment.data_pagamento))}</strong>. Este documento registra a confirmação dos dados até a data informada.</div>` : ''}
    <div class="descricao">
      <div class="label">REFERENTE A</div>
      <div class="descricao-box">${escapeHtml(payment.descricao)}</div>
    </div>
    <div class="grid" style="margin-top:18px;">
      <div class="box"><div class="label">FORMA DE PAGAMENTO</div><div class="valor">${escapeHtml(payment.forma_pagamento)}</div></div>
      <div class="box"><div class="label">TIPO DA OPERAÇÃO</div><div class="valor">${operationTypeLabel}</div></div>
      <div class="box"><div class="label">CHAVE PIX</div><div class="valor">${escapeHtml(supplier.pix ?? '-')}</div></div>
      <div class="box"><div class="label">DATA PREVISTA DE PAGAMENTO</div><div class="valor">${escapeHtml(longDate(payment.data_pagamento))}</div></div>
    </div>
    ${signatureHtml}
    <div class="assinatura"><div class="linha"></div><div>${escapeHtml(supplier.nome)}</div></div>
    <div class="footer">${escapeHtml(company.endereco ?? 'Brasil')} - ${escapeHtml(longDate(payment.data_pagamento))}<br/>${escapeHtml(company.empresa_nome)} - ${escapeHtml(company.cnpj ?? '')}<br/>${escapeHtml(company.rodape ?? '')}</div>
    </div>
  </div>
</body>
</html>`
}

export const buildReceiptHtml = ({ company, supplier, payment }: GenerateReceiptPayload): string =>
  buildReceiptDocument({
    company,
    supplier,
    payment: {
      ...payment,
      confirmation_date: null,
      confirmation_signature: null,
      confirmation_signer_name: null,
      confirmation_signer_document: null
    }
  })

export const buildSignedReceiptHtml = ({ company, supplier, payment }: GenerateSignedReceiptPayload): string => {
  const scheduledPayment = isFuturePaymentDate(payment.data_pagamento)
  const signatureDate = payment.confirmation_date
    ? new Date(payment.confirmation_date).toLocaleString('pt-BR')
    : '-'

  return buildReceiptDocument({
    company,
    supplier,
    payment,
    signatureHtml: `
      <div class="descricao" style="margin-top:16px;">
        <div class="label">${scheduledPayment ? 'CONFIRMAÇÃO DE CIÊNCIA (PAGAMENTO PROGRAMADO)' : 'CONFIRMAÇÃO DE RECEBIMENTO (ASSINATURA ELETRÔNICA)'}</div>
        <div class="descricao-box">
          <div><strong>Status:</strong> ${scheduledPayment ? 'PAGAMENTO COM DATA PREVISTA - CONFIRMAÇÃO REGISTRADA' : 'CONFIRMADO'}</div>
          ${scheduledPayment ? `<div><strong>Liquidação prevista:</strong> ${escapeHtml(longDate(payment.data_pagamento))}</div>` : ''}
          <div><strong>Código da assinatura:</strong> ${escapeHtml(payment.confirmation_signature ?? '-')}</div>
          <div><strong>Confirmado por:</strong> ${escapeHtml(payment.confirmation_signer_name ?? supplier.nome)}</div>
          <div><strong>Documento:</strong> ${escapeHtml(payment.confirmation_signer_document ?? supplier.cpf_cnpj ?? '-')}</div>
          <div><strong>Data/Hora da confirmação:</strong> ${escapeHtml(signatureDate)}</div>
        </div>
      </div>
    `
  })
}

export async function htmlToPdfBuffer(html: string): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })
  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const buffer = await page.pdf({
      printBackground: true,
      format: 'A4',
      margin: { top: '16mm', right: '12mm', bottom: '16mm', left: '12mm' }
    })
    return Buffer.from(buffer)
  } finally {
    await browser.close()
  }
}
