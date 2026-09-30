-- ============================================================================
-- IMPORTANTE (Supabase): rode este script UMA VEZ, depois de criar as tabelas.
--
-- O Supabase expõe as tabelas do schema "public" via API REST (chave anon).
-- Este sistema NÃO usa essa API: o backend acessa o banco direto pelo Prisma.
-- Ativar RLS SEM criar nenhuma policy bloqueia todo acesso pela API pública,
-- e o backend continua funcionando (o role "postgres" ignora RLS).
-- Rode também após cada migração que criar tabelas novas.
-- ============================================================================
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
  END LOOP;
END $$;
