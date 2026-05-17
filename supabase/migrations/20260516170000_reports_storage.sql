-- ============================================================================
-- Storage bucket pra PDFs de relatórios
-- Layout do path: {user_id}/{report_id}.pdf
-- RLS garante que cada usuário só acessa seus próprios arquivos.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'reports',
  'reports',
  false, -- privado: precisa URL assinada pra acessar
  10 * 1024 * 1024, -- 10 MB máx
  array['application/pdf']
)
on conflict (id) do nothing;

-- ============================================================================
-- Policies: usuário só acessa arquivos cujo path começa com seu auth.uid()
-- ============================================================================

create policy "Users can upload own reports"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'reports'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can read own reports"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'reports'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can update own reports"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'reports'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete own reports"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'reports'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
