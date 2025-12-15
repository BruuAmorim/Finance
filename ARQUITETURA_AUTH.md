# 🔐 Arquitetura de Autenticação e Dados Financeiros

## 📋 Visão Geral

Este sistema utiliza uma arquitetura separada e segura:

- **Supabase Auth**: Gerencia EXCLUSIVAMENTE autenticação (senhas, tokens, sessões)
- **NocoDB**: Armazena APENAS dados financeiros e perfil (SEM senhas)

## 🏗️ Estrutura

```
┌─────────────────┐
│  Supabase Auth  │  ← Autenticação (senhas, tokens)
└────────┬────────┘
         │
         │ user.id (UUID)
         ↓
┌─────────────────┐
│     NocoDB      │  ← Dados financeiros (SEM senhas)
└─────────────────┘
```

## 🔑 Fluxo de Autenticação

### 1. Cadastro (Sign Up)

```javascript
// 1. Registrar no Supabase Auth
const authResult = await authService.signUp(email, password, nome);
// Retorna: { success: true, user: { id: UUID, email, nome } }

// 2. Criar perfil financeiro no NocoDB (SEM senha)
const financeResult = await financeService.createFinanceProfile({
    userId: authResult.user.id,  // UUID do Supabase
    email: authResult.user.email,
    nome: authResult.user.nome
});
```

### 2. Login (Sign In)

```javascript
// 1. Autenticar via Supabase Auth
const authResult = await authService.signIn(email, password);
// Retorna: { success: true, user: { id: UUID, email, nome } }

// 2. Carregar dados financeiros do NocoDB usando UserId
const financeResult = await financeService.getFinanceByUserId(authResult.user.id);
```

### 3. Verificação de Sessão

```javascript
// Verificar se há sessão ativa no Supabase
const sessionResult = await authService.getSession();
if (sessionResult.success) {
    // Usuário está logado
    // Carregar dados financeiros
}
```

## 📊 Estrutura da Tabela NocoDB

### Campos Obrigatórios

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `Email` | Text/Email | Email do usuário (único) |
| `UserId` | Text | UUID do Supabase Auth (único) |
| `nome` | Text | Nome do usuário |
| `FaturasParceladas` | JSON/Long Text | Array de faturas parceladas |
| `DespesasRecorrentes` | JSON/Long Text | Array de despesas recorrentes |
| `ReceitasRecorrentes` | JSON/Long Text | Array de receitas recorrentes |
| `created_at` | DateTime | Data de criação (auto-gerado) |

### ⚠️ IMPORTANTE: Campos NÃO Permitidos

- ❌ **Password** - NUNCA armazenar senhas no NocoDB
- ❌ **authToken** - Tokens são gerenciados pelo Supabase

## 🔧 Services Disponíveis

### SupabaseAuthService

```javascript
// Inicializar
await authService.initialize();

// Registrar usuário
const result = await authService.signUp(email, password, nome);

// Fazer login
const result = await authService.signIn(email, password);

// Verificar sessão
const result = await authService.getSession();

// Fazer logout
const result = await authService.signOut();
```

### NocoDBFinanceService

```javascript
// Criar perfil financeiro inicial
const result = await financeService.createFinanceProfile({
    userId: 'uuid-do-supabase',
    email: 'usuario@email.com',
    nome: 'Nome do Usuário'
});

// Buscar dados financeiros
const result = await financeService.getFinanceByUserId('uuid-do-supabase');

// Atualizar dados financeiros (PATCH - atualização parcial)
const result = await financeService.updateFinanceByUserId('uuid-do-supabase', {
    faturasParceladas: [...],
    despesasRecorrentes: [...],
    receitasRecorrentes: [...]
});
```

## 🔒 Regras de Segurança

### ✅ O QUE FAZER

1. **Sempre usar Supabase Auth para autenticação**
   - Senhas são criptografadas e gerenciadas pelo Supabase
   - Tokens de sessão são seguros

2. **Usar UUID do Supabase como UserId no NocoDB**
   - Garante unicidade
   - Facilita busca de dados

3. **Usar PATCH para atualizações no NocoDB**
   - Atualização parcial
   - Evita sobrescrever dados indevidamente

4. **Manter backup local no localStorage**
   - Backup por usuário: `userData_${email}`
   - Comparar timestamps para usar o mais recente

### ❌ O QUE NÃO FAZER

1. **NUNCA salvar senhas no NocoDB**
   - Senhas devem ser gerenciadas APENAS pelo Supabase Auth

2. **NUNCA usar PUT no NocoDB**
   - Usar sempre PATCH para atualizações parciais

3. **NUNCA autenticar usando dados do NocoDB**
   - Autenticação deve ser EXCLUSIVAMENTE via Supabase Auth

4. **NUNCA expor tokens ou senhas no código**
   - Usar variáveis de ambiente em produção

## 📝 Exemplo de Fluxo Completo

```javascript
// ===== CADASTRO =====
async function cadastrarUsuario(email, password, nome) {
    // 1. Registrar no Supabase Auth
    const authResult = await authService.signUp(email, password, nome);
    if (!authResult.success) {
        throw new Error(authResult.error);
    }
    
    // 2. Criar perfil financeiro no NocoDB
    const financeResult = await financeService.createFinanceProfile({
        userId: authResult.user.id,
        email: authResult.user.email,
        nome: authResult.user.nome
    });
    
    if (!financeResult.success) {
        console.warn('Perfil financeiro não criado:', financeResult.error);
    }
    
    return authResult.user;
}

// ===== LOGIN =====
async function fazerLogin(email, password) {
    // 1. Autenticar via Supabase Auth
    const authResult = await authService.signIn(email, password);
    if (!authResult.success) {
        throw new Error(authResult.error);
    }
    
    // 2. Carregar dados financeiros
    const financeResult = await financeService.getFinanceByUserId(authResult.user.id);
    
    return {
        user: authResult.user,
        financeData: financeResult.data
    };
}

// ===== SALVAR DADOS FINANCEIROS =====
async function salvarDadosFinanceiros(userId, dados) {
    // Usar PATCH para atualização parcial
    const result = await financeService.updateFinanceByUserId(userId, {
        faturasParceladas: dados.faturasParceladas,
        despesasRecorrentes: dados.despesasRecorrentes,
        receitasRecorrentes: dados.receitasRecorrentes
    });
    
    return result.success;
}
```

## 🐛 Troubleshooting

### Erro: "Supabase não inicializado"
- Verificar se o script do Supabase está carregado no HTML
- Verificar se `SUPABASE_URL` e `SUPABASE_ANON_KEY` estão corretos

### Erro: "Registro não encontrado" no NocoDB
- Verificar se o perfil financeiro foi criado após o cadastro
- Verificar se o `UserId` no NocoDB corresponde ao UUID do Supabase

### Erro: "Column 'Password' does not exist"
- **CORRETO!** O campo Password não deve existir no NocoDB
- Senhas são gerenciadas apenas pelo Supabase Auth

### Dados não aparecem após login
- Verificar se `carregarDadosUsuario()` está sendo chamado após login
- Verificar se o `UserId` está correto (UUID do Supabase)

## 📚 Arquivos Relacionados

- `services.js` - Services centralizados (Supabase Auth + NocoDB)
- `app.js` - Lógica principal da aplicação
- `Index.html` - Interface do usuário

## 🔄 Migração de Dados Antigos

Se você tinha dados antigos salvos com senhas no NocoDB:

1. **NÃO** migrar senhas para o Supabase
2. Solicitar que usuários façam novo cadastro
3. Migrar apenas dados financeiros (sem senhas)
4. Associar dados financeiros ao novo UUID do Supabase

---

**Última atualização**: Sistema refatorado para usar Supabase Auth exclusivamente para autenticação e NocoDB apenas para dados financeiros.

