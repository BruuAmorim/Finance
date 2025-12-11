# Configuração do Supabase

## Passo 1: Obter a Chave de API

1. Acesse o [Dashboard do Supabase](https://app.supabase.com)
2. Selecione seu projeto
3. Vá em **Settings** > **API**
4. Copie a **anon/public key**

## Passo 2: Configurar a Chave no Código

Abra o arquivo `app.js` e encontre a linha:

```javascript
const SUPABASE_ANON_KEY = 'SUA_CHAVE_ANON_KEY_AQUI';
```

Substitua `'SUA_CHAVE_ANON_KEY_AQUI'` pela sua chave anon do Supabase.

## Passo 3: Criar a Tabela no Supabase

1. No Dashboard do Supabase, vá em **SQL Editor**
2. Execute o seguinte SQL:

```sql
-- Criar tabela para armazenar dados dos usuários
CREATE TABLE IF NOT EXISTS user_data (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    transactions JSONB DEFAULT '[]'::jsonb,
    faturas_parceladas JSONB DEFAULT '[]'::jsonb,
    despesas_recorrentes JSONB DEFAULT '[]'::jsonb,
    receitas_recorrentes JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes (se houver) antes de criar novas
DROP POLICY IF EXISTS "Users can view own data" ON user_data;
DROP POLICY IF EXISTS "Users can insert own data" ON user_data;
DROP POLICY IF EXISTS "Users can update own data" ON user_data;
DROP POLICY IF EXISTS "Users can delete own data" ON user_data;

-- Criar função auxiliar segura para obter o UID do usuário autenticado
-- Esta função garante que não há dependência mutável do search_path
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
CREATE POLICY "Users can view own data" ON user_data
    FOR SELECT 
    USING (public.get_user_id() = user_id);

-- Criar política para usuários só poderem inserir seus próprios dados
CREATE POLICY "Users can insert own data" ON user_data
    FOR INSERT 
    WITH CHECK (public.get_user_id() = user_id);

-- Criar política para usuários só poderem atualizar seus próprios dados
CREATE POLICY "Users can update own data" ON user_data
    FOR UPDATE 
    USING (public.get_user_id() = user_id);

-- Criar política para usuários só poderem deletar seus próprios dados
CREATE POLICY "Users can delete own data" ON user_data
    FOR DELETE 
    USING (public.get_user_id() = user_id);
```

## Passo 4: Configurar Autenticação por Email

1. No Dashboard do Supabase, vá em **Authentication** > **Settings**
2. Em **Email Auth**, certifique-se de que está habilitado
3. Configure as opções de email conforme necessário

## Passo 5: Testar

1. Abra o site
2. Tente fazer cadastro com um email
3. Verifique se recebe o email de confirmação (se configurado)
4. Faça login
5. Adicione algumas transações
6. Verifique se os dados estão sendo salvos no Supabase (em **Table Editor** > **user_data**)

## Notas Importantes

- A URL do Supabase já está configurada: `https://ffpmfqqvxeuvjcgyjsen.supabase.co`
- O sistema usa fallback para localStorage se o Supabase não estiver configurado
- Os dados são sincronizados automaticamente quando o usuário faz login
- Cada usuário só pode ver e modificar seus próprios dados (Row Level Security)

