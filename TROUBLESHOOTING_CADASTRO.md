# 🔧 Troubleshooting: Usuário não aparece no NocoDB

## Problema
Ao criar um usuário, ele não aparece na tabela do NocoDB.

## ✅ Solução Passo a Passo

### 1. Verificar os Campos na Tabela do NocoDB

A tabela precisa ter **TODOS** estes campos:

- ✅ `Email` (Text ou Email)
- ✅ `UserId` (Text)
- ✅ `Password` (Text) - **NOVO - Pode estar faltando!**
- ✅ `Nome` (Text) - **NOVO - Pode estar faltando!**
- ✅ `FinanceData` (Long Text ou JSON)
- ✅ `UpdatedAt` (DateTime - auto-gerado)

### 2. Adicionar Campos Faltantes no NocoDB

Se os campos `Password` e `Nome` não existem:

1. Acesse sua tabela no NocoDB
2. Clique no ícone **"+"** ao lado dos nomes das colunas
3. Adicione:
   - **Campo `Password`**:
     - Nome: `Password`
     - Tipo: `Single Line Text`
     - Obrigatório: ✅ Sim
   - **Campo `Nome`**:
     - Nome: `Nome`
     - Tipo: `Single Line Text`
     - Obrigatório: ❌ Não

### 3. Verificar no Console do Navegador

1. Abra o DevTools (F12)
2. Vá na aba **Console**
3. Tente criar um novo usuário
4. Procure por mensagens como:
   - `🔄 Tentando salvar usuário no NocoDB...`
   - `✅ Usuário criado com sucesso no NocoDB` (sucesso)
   - `❌ Erro ao criar usuário no NocoDB` (erro)

### 4. Erros Comuns e Soluções

#### Erro: "Column 'Password' does not exist"
**Solução:** Adicione o campo `Password` na tabela do NocoDB (veja passo 2)

#### Erro: "Column 'Nome' does not exist"
**Solução:** Adicione o campo `Nome` na tabela do NocoDB (veja passo 2)

#### Erro: 400 Bad Request
**Solução:** Verifique se todos os campos obrigatórios estão preenchidos e se os nomes dos campos estão **exatamente** como especificado (case-sensitive)

#### Erro: 401 Unauthorized
**Solução:** Verifique se o token da API (`NOCODB_API_TOKEN`) está correto no código

#### Erro: 429 Too Many Requests
**Solução:** Aguarde alguns segundos e tente novamente. O NocoDB tem limite de requisições.

### 5. Testar a Conexão

Use o arquivo `test_nocodb.html` para testar:

1. Abra `test_nocodb.html` no navegador
2. Preencha:
   - Token da API
   - URL da tabela
   - View ID
   - Email de teste
3. Clique em **"✍️ Testar Escrita"**
4. Verifique se aparece erro ou sucesso

### 6. Verificar Estrutura da Tabela

Na tabela do NocoDB, verifique se os nomes dos campos estão **exatamente** assim:

- `Email` (com E maiúsculo)
- `UserId` (com U e I maiúsculos)
- `Password` (com P maiúsculo)
- `Nome` (com N maiúsculo)
- `FinanceData` (com F e D maiúsculos)
- `UpdatedAt` (com U e A maiúsculos)

⚠️ **IMPORTANTE:** Os nomes são case-sensitive (maiúsculas/minúsculas importam)!

### 7. Checklist Final

- [ ] Campo `Password` existe na tabela
- [ ] Campo `Nome` existe na tabela
- [ ] Nomes dos campos estão corretos (case-sensitive)
- [ ] Token da API está correto
- [ ] View ID está correto
- [ ] Console do navegador mostra mensagens de erro detalhadas
- [ ] Teste de escrita no `test_nocodb.html` funciona

## 📝 Estrutura Completa da Tabela

Sua tabela deve ter esta estrutura:

```
Email (Text, único, obrigatório)
UserId (Text, único, obrigatório)
Password (Text, obrigatório) ← ADICIONAR SE NÃO EXISTIR
Nome (Text, opcional) ← ADICIONAR SE NÃO EXISTIR
FinanceData (Long Text/JSON, opcional)
UpdatedAt (DateTime, auto-gerado)
```

## 🆘 Ainda não funciona?

1. Abra o console do navegador (F12)
2. Tente criar um usuário
3. Copie TODAS as mensagens de erro que aparecerem
4. Verifique se os campos `Password` e `Nome` existem na tabela
5. Verifique se os nomes estão exatamente como especificado acima


