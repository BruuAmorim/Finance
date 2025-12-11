-- ============================================
-- SQL CORRIGIDO PARA SUPABASE - VERSÃO 3
-- Solução simplificada sem RPC, usando INSERT direto
-- ============================================

-- Criar tabela para armazenar dados dos usuários
CREATE TABLE IF NOT EXISTS public.user_data (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    transactions JSONB DEFAULT '[]'::jsonb,
    faturas_parceladas JSONB DEFAULT '[]'::jsonb,
    despesas_recorrentes JSONB DEFAULT '[]'::jsonb,
    receitas_recorrentes JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.user_data ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes (se houver) antes de criar novas
DROP POLICY IF EXISTS "Users can view own data" ON public.user_data;
DROP POLICY IF EXISTS "Users can insert own data" ON public.user_data;
DROP POLICY IF EXISTS "Users can update own data" ON public.user_data;
DROP POLICY IF EXISTS "Users can delete own data" ON public.user_data;

-- Remover função auxiliar existente se houver
DROP FUNCTION IF EXISTS public.get_user_id();

-- Criar função auxiliar segura para obter o UID do usuário autenticado
CREATE OR REPLACE FUNCTION public.get_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
    SELECT auth.uid();
$$;

-- Criar política para usuários só poderem ver seus próprios dados
CREATE POLICY "Users can view own data" ON public.user_data
    FOR SELECT 
    USING (auth.uid() = user_id);

-- Criar política para usuários só poderem inserir seus próprios dados
-- IMPORTANTE: Permite inserção quando user_id corresponde ao usuário autenticado
CREATE POLICY "Users can insert own data" ON public.user_data
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Criar política para usuários só poderem atualizar seus próprios dados
CREATE POLICY "Users can update own data" ON public.user_data
    FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Criar política para usuários só poderem deletar seus próprios dados
CREATE POLICY "Users can delete own data" ON public.user_data
    FOR DELETE 
    USING (auth.uid() = user_id);

-- Garantir permissões corretas
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.user_data TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_id() TO authenticated;

-- IMPORTANTE: Após executar este SQL, vá em Settings > API > Refresh Schema
-- Isso atualiza o cache do schema do Supabase

