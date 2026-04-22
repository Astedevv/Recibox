# ReciBox IPC Contracts

## `receipt:generate-and-upload`
Entrada:
- `accessToken` (string): JWT da sessão Supabase.
- `userId` (uuid)
- `supplier` snapshot
- `company` snapshot
- `payment` snapshot

Saída:
- `pdfUrl` (string)
- `pdfPath` (string)
- `message` (string)

## `share:build-message`
Entrada:
- `fornecedorNome` (string)
- `valor` (number)
- `descricao` (string)
- `confirmationToken` (string)

Saída:
- `link`
- `whatsappMessage`
- `emailMessage`
- `emailSubject`

## `share:open-email-client`
Entrada:
- `to` (email)
- `subject` (string)
- `body` (string)

Saída:
- `mailto`

## `app:get-env`
Saída:
- `confirmationBaseUrl`
