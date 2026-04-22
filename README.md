# ReciBox (Desktop)

Aplicação desktop local para gestão de pagamentos e recibos de fornecedores com Supabase.

## Stack
- Electron + React + TypeScript + Vite
- Tailwind CSS
- Supabase (Auth, Postgres, Storage)
- Zod
- Geração de PDF via HTML -> Puppeteer

## 1) Pré-requisitos
- Node.js 20+
- Projeto Supabase criado

## 2) Configuração
1. Copie `.env.example` para `.env`
2. Preencha:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_CONFIRMATION_BASE_URL` (recomendado público, ex.: `https://app.seudominio.com/#/confirm`)

## 3) Banco e políticas
No Supabase SQL Editor, execute:

```sql
-- arquivo completo
supabase/schema.sql
```

Isso cria tabelas, RLS mínima, função de confirmação por token e bucket `receipts`.
Se já tinha versão anterior, execute novamente o arquivo para aplicar as alterações de funções/policies.

## 4) Rodar local
```bash
npm install
npm run dev
```

## 5) Build
```bash
npm run build
```

## Funcionalidades entregues
- Login (Supabase Auth)
- CRUD de fornecedores
- Registro/listagem de pagamentos com status pendente/confirmado
- Geração de PDF estilizado com template HTML
- Upload do PDF no Supabase Storage + persistência de URL/path
- Compartilhamento de confirmação por e-mail (abre cliente padrão com assunto/corpo formal) e WhatsApp
- Página de confirmação por token (`/confirm/:token`) e atualização de status
- Pré-visualização de dados do pagamento na tela de confirmação antes de confirmar
- Assinatura eletrônica de recebimento com nome/documento, metadados web e código de assinatura
- Registro de confirmação (data/hora e IP quando informado)
- Dashboard com KPIs
- Configurações da empresa (nome, CNPJ, endereço, tema, rodapé, logo)
- Histórico com filtros (fornecedor, data, status)

## Observações de produção
- Não há segredo hardcoded.
- O app usa apenas `anon key` no cliente e JWT da sessão para ações autenticadas.
- O envio por e-mail abre o cliente padrão do sistema (mailto) já com assunto/corpo formal e link.
- Para confirmação por fornecedor fora do desktop, `VITE_CONFIRMATION_BASE_URL` deve apontar para uma URL pública com a rota `#/confirm/:token`.
