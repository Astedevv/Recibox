-- ReciBox schema + minimal RLS (execute in Supabase SQL Editor)

create extension if not exists "pgcrypto";

create table if not exists public.fornecedores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  cpf_cnpj text,
  whatsapp text,
  email text,
  pix text,
  created_at timestamptz not null default now()
);

create table if not exists public.configuracoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  empresa_nome text not null,
  cnpj text,
  endereco text,
  logo_url text,
  rodape text,
  tema text default 'blue-orange',
  confirmation_base_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.pagamentos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fornecedor_id uuid not null references public.fornecedores(id) on delete restrict,
  valor numeric(12,2) not null check (valor > 0),
  descricao text not null,
  obra text,
  forma_pagamento text not null,
  data_pagamento date not null,
  status text not null default 'pendente' check (status in ('pendente', 'confirmado')),
  confirmation_token text not null unique,
  share_link text,
  pdf_url text,
  pdf_path text,
  confirmation_date timestamptz,
  confirmation_signature text,
  confirmation_signer_name text,
  confirmation_signer_document text,
  created_at timestamptz not null default now()
);

create table if not exists public.confirmacoes (
  id uuid primary key default gen_random_uuid(),
  pagamento_id uuid not null references public.pagamentos(id) on delete cascade,
  confirmed_at timestamptz not null default now(),
  ip text,
  user_agent text,
  signer_name text,
  signer_document text,
  signer_email text,
  signer_phone text,
  signer_metadata jsonb,
  signature_code text,
  unique (pagamento_id)
);

alter table public.pagamentos add column if not exists confirmation_signature text;
alter table public.pagamentos add column if not exists confirmation_signer_name text;
alter table public.pagamentos add column if not exists confirmation_signer_document text;
alter table public.configuracoes add column if not exists confirmation_base_url text;

alter table public.confirmacoes add column if not exists signer_name text;
alter table public.confirmacoes add column if not exists signer_document text;
alter table public.confirmacoes add column if not exists signer_email text;
alter table public.confirmacoes add column if not exists signer_phone text;
alter table public.confirmacoes add column if not exists signer_metadata jsonb;
alter table public.confirmacoes add column if not exists signature_code text;

alter table public.fornecedores enable row level security;
alter table public.configuracoes enable row level security;
alter table public.pagamentos enable row level security;
alter table public.confirmacoes enable row level security;

drop policy if exists fornecedores_owner on public.fornecedores;
create policy fornecedores_owner on public.fornecedores for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists configuracoes_owner on public.configuracoes;
create policy configuracoes_owner on public.configuracoes for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists pagamentos_owner on public.pagamentos;
create policy pagamentos_owner on public.pagamentos for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists confirmacoes_owner on public.confirmacoes;
create policy confirmacoes_owner on public.confirmacoes for select
using (exists (
  select 1 from public.pagamentos p where p.id = confirmacoes.pagamento_id and p.user_id = auth.uid()
));

drop policy if exists confirmacoes_insert_auth on public.confirmacoes;
create policy confirmacoes_insert_auth on public.confirmacoes for insert
with check (exists (
  select 1 from public.pagamentos p where p.id = confirmacoes.pagamento_id and p.user_id = auth.uid()
));

create or replace function public.set_user_id_default()
returns trigger
language plpgsql
as $$
begin
  if new.user_id is null then
    new.user_id := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_fornecedores_user on public.fornecedores;
create trigger trg_fornecedores_user before insert on public.fornecedores
for each row execute function public.set_user_id_default();

drop trigger if exists trg_pagamentos_user on public.pagamentos;
create trigger trg_pagamentos_user before insert on public.pagamentos
for each row execute function public.set_user_id_default();

drop trigger if exists trg_configuracoes_user on public.configuracoes;
create trigger trg_configuracoes_user before insert on public.configuracoes
for each row execute function public.set_user_id_default();

drop function if exists public.confirm_payment_receipt(text, text);
create or replace function public.confirm_payment_receipt(
  p_token text,
  p_ip text default null,
  p_user_agent text default null,
  p_signer_name text default null,
  p_signer_document text default null,
  p_signer_email text default null,
  p_signer_phone text default null,
  p_signer_metadata jsonb default '{}'::jsonb,
  p_consent boolean default false
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment_id uuid;
  v_payment_date date;
  v_signature_code text;
  v_existing_signature text;
  v_existing_payment_date date;
begin
  if coalesce(trim(p_signer_name), '') = '' then
    return 'Informe o nome de quem está confirmando o recebimento.';
  end if;

  if coalesce(trim(p_signer_document), '') = '' then
    return 'Informe o documento de quem está confirmando o recebimento.';
  end if;

  if not coalesce(p_consent, false) then
    return 'É necessário aceitar a declaração de confirmação.';
  end if;

  v_signature_code := upper(substring(encode(extensions.digest(p_token || '|' || now()::text || '|' || coalesce(p_signer_document, ''), 'sha256'), 'hex') from 1 for 16));

  update public.pagamentos
  set status = 'confirmado',
      confirmation_date = now(),
      confirmation_signature = v_signature_code,
      confirmation_signer_name = p_signer_name,
      confirmation_signer_document = p_signer_document
  where confirmation_token = p_token
    and status <> 'confirmado'
  returning id, data_pagamento into v_payment_id, v_payment_date;

  if v_payment_id is not null then
    insert into public.confirmacoes(
      pagamento_id,
      ip,
      user_agent,
      signer_name,
      signer_document,
      signer_email,
      signer_phone,
      signer_metadata,
      signature_code
    )
    values (
      v_payment_id,
      p_ip,
      p_user_agent,
      p_signer_name,
      p_signer_document,
      p_signer_email,
      p_signer_phone,
      p_signer_metadata,
      v_signature_code
    )
    on conflict (pagamento_id) do update
    set ip = excluded.ip,
        user_agent = excluded.user_agent,
        signer_name = excluded.signer_name,
        signer_document = excluded.signer_document,
        signer_email = excluded.signer_email,
        signer_phone = excluded.signer_phone,
        signer_metadata = excluded.signer_metadata,
        signature_code = excluded.signature_code;
    if v_payment_date > current_date then
      return 'Operação faturada com ciência registrada com sucesso. O pagamento será realizado na data prevista no recibo. Assinatura: ' || v_signature_code;
    end if;

    return 'Recebimento confirmado com sucesso. Assinatura: ' || v_signature_code;
  end if;

  if not exists (select 1 from public.pagamentos where confirmation_token = p_token) then
    return 'Token inválido.';
  end if;

  select confirmation_signature, data_pagamento into v_existing_signature, v_existing_payment_date
  from public.pagamentos
  where confirmation_token = p_token
  limit 1;

  if v_existing_signature is not null then
    if v_existing_payment_date > current_date then
      return 'Operação faturada já estava com ciência confirmada. Assinatura: ' || v_existing_signature;
    end if;
    return 'Pagamento já estava confirmado. Assinatura: ' || v_existing_signature;
  end if;

  return 'Pagamento já estava confirmado.';
end;
$$;

revoke all on function public.confirm_payment_receipt(text, text, text, text, text, text, text, jsonb, boolean) from public;
grant execute on function public.confirm_payment_receipt(text, text, text, text, text, text, text, jsonb, boolean) to anon, authenticated;

create or replace function public.get_payment_confirmation_preview(p_token text)
returns table (
  fornecedor_nome text,
  empresa_nome text,
  valor numeric,
  descricao text,
  data_pagamento date,
  status text,
  confirmation_date timestamptz,
  confirmation_signature text,
  confirmation_signer_name text,
  confirmation_signer_document text
)
language sql
security definer
set search_path = public
as $$
  select
    f.nome as fornecedor_nome,
    c.empresa_nome,
    p.valor,
    p.descricao,
    p.data_pagamento,
    p.status,
    p.confirmation_date,
    p.confirmation_signature,
    p.confirmation_signer_name,
    p.confirmation_signer_document
  from public.pagamentos p
  join public.fornecedores f on f.id = p.fornecedor_id
  left join public.configuracoes c on c.user_id = p.user_id
  where p.confirmation_token = p_token
  order by c.created_at desc
  limit 1;
$$;

revoke all on function public.get_payment_confirmation_preview(text) from public;
grant execute on function public.get_payment_confirmation_preview(text) to anon, authenticated;

insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', true)
on conflict (id) do nothing;

drop policy if exists receipts_upload_auth on storage.objects;
create policy receipts_upload_auth on storage.objects for insert to authenticated
with check (bucket_id = 'receipts' and split_part(name, '/', 1) = auth.uid()::text);

drop policy if exists receipts_read_public on storage.objects;
create policy receipts_read_public on storage.objects for select to public
using (bucket_id = 'receipts');
