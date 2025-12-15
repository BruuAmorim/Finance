# Configuração do NocoDB para EvaCloudd Finance

Este guia explica como configurar a tabela no NocoDB para armazenar os dados financeiros da aplicação.

## 📋 Estrutura da Tabela

A tabela deve conter os seguintes campos:

### Campos Necessários

| Nome do Campo | Tipo | Descrição | Obrigatório | Observação |
|--------------|------|-----------|-------------|------------|
| `Email` | Email ou Text | Email do usuário (usado para identificar registros) | ✅ Sim | Deve ser único |
| `UserId` | Text | ID único do usuário | ✅ Sim | Deve ser único |
| `Password` | Text | Senha do usuário (para autenticação entre dispositivos) | ✅ Sim | **IMPORTANTE:** Em produção, isso deve ser criptografado! |
| `Nome` | Text | Nome do usuário | ❌ Não | Nome completo ou apelido |
| `FinanceData` | Long Text ou JSON | **Todos os dados financeiros em um único campo JSON** | ❌ Não | Contém: transactions, faturasParceladas, despesasRecorrentes, receitasRecorrentes |
| `UpdatedAt` | DateTime | Data e hora da última atualização | ❌ Não | **Auto-gerado pelo NocoDB** - não enviar no payload |

## 🚀 Passo a Passo para Criar a Tabela

### 1. Acessar o NocoDB
1. Acesse https://app.nocodb.com
2. Faça login na sua conta
3. Selecione ou crie um projeto

### 2. Criar Nova Tabela
1. Clique em **"+ New"** ou **"Add Table"**
2. Escolha **"Create from scratch"**
3. Nomeie a tabela como: `user_finance_data` ou `finance_data`

### 3. Adicionar Campos

Adicione os campos na seguinte ordem:

#### Campo 1: Email
- **Nome**: `Email`
- **Tipo**: `Email` (ou `Single Line Text` se Email não estiver disponível)
- **Obrigatório**: ✅ Sim
- **Único**: ✅ Sim (para evitar duplicatas)

#### Campo 2: UserId
- **Nome**: `UserId`
- **Tipo**: `Single Line Text`
- **Obrigatório**: ✅ Sim
- **Único**: ✅ Sim

#### Campo 3: Password
- **Nome**: `Password`
- **Tipo**: `Single Line Text` ou `Password`
- **Obrigatório**: ✅ Sim
- **⚠️ IMPORTANTE:** Este campo armazena a senha do usuário para permitir login em qualquer dispositivo. Em produção, considere usar criptografia.

#### Campo 4: Nome
- **Nome**: `Nome`
- **Tipo**: `Single Line Text`
- **Obrigatório**: ❌ Não
- **Descrição**: Nome completo ou apelido do usuário

#### Campo 5: FinanceData
- **Nome**: `FinanceData`
- **Tipo**: `Long Text` ou `JSON`
- **Obrigatório**: ❌ Não
- **Valor padrão**: `{}` (objeto JSON vazio)
- **Descrição**: Este campo contém **TODOS** os dados financeiros em um único objeto JSON com a seguinte estrutura:
  ```json
  {
    "transactions": [...],
    "faturasParceladas": [...],
    "despesasRecorrentes": [...],
    "receitasRecorrentes": [...],
    "updated_at": "2025-12-15T16:55:24.714Z"
  }
  ```

#### Campo 6: UpdatedAt
- **Nome**: `UpdatedAt`
- **Tipo**: `DateTime`
- **Obrigatório**: ❌ Não
- **Auto-gerado**: ✅ **SIM** - Configure este campo como auto-gerado no NocoDB
- **⚠️ IMPORTANTE**: Este campo é gerenciado automaticamente pelo NocoDB. **NÃO envie este campo no payload** das requisições POST/PATCH, ou você receberá erro 400.

### 4. Configurar View (Opcional mas Recomendado)
1. Após criar a tabela, você verá uma view padrão
2. Anote o **View ID** (aparece na URL ou nas configurações da view)
3. O View ID já está configurado no código: `vwp00extw4gab91s`
4. Se criar uma nova view, atualize o `NOCODB_VIEW_ID` no arquivo `app.js`

### 5. Obter Token da API
1. Vá em **Settings** → **API Tokens** (ou **Team & Settings** → **API Tokens**)
2. Clique em **"Generate New Token"**
3. Dê um nome ao token (ex: "Finance App Token")
4. Copie o token gerado
5. O token já está configurado no código: `YXvXeKm4xqldUZIZxtwt8tslZxStu08SqXr2mOs_`

### 6. Obter URL da Tabela
1. Na tabela criada, vá em **Settings** → **API** (ou clique com botão direito na tabela)
2. Copie a **Base URL** da API
3. A URL deve ser algo como: `https://app.nocodb.com/api/v2/tables/[TABLE_ID]/records`
4. A URL já está configurada no código: `https://app.nocodb.com/api/v2/tables/mht7b7fomr6g2it/records`

## 🔧 Verificação da Configuração

### Verificar se a Tabela está Correta

Execute este teste no console do navegador (F12) após fazer login:

```javascript
// Teste de conexão com NocoDB
const testNocoDB = async () => {
    const NOCODB_API_TOKEN = 'YXvXeKm4xqldUZIZxtwt8tslZxStu08SqXr2mOs_';
    const NOCODB_BASE_URL = 'https://app.nocodb.com/api/v2/tables/mht7b7fomr6g2it/records';
    const NOCODB_VIEW_ID = 'vwp00extw4gab91s';
    
    try {
        const response = await fetch(`${NOCODB_BASE_URL}?viewId=${NOCODB_VIEW_ID}&limit=1`, {
            method: 'GET',
            headers: {
                'xc-token': NOCODB_API_TOKEN,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Conexão com NocoDB OK!', data);
        } else {
            console.error('❌ Erro na conexão:', await response.text());
        }
    } catch (error) {
        console.error('❌ Erro:', error);
    }
};

testNocoDB();
```

## 📝 Estrutura dos Dados JSON

### Estrutura do Campo FinanceData

O campo `FinanceData` contém um objeto JSON com todos os dados financeiros:

```json
{
  "transactions": [...],
  "faturasParceladas": [...],
  "despesasRecorrentes": [...],
  "receitasRecorrentes": [...],
  "updated_at": "2025-12-15T16:55:24.714Z"
}
```

### Exemplo de Transactions (dentro de FinanceData)
```json
[
  {
    "id": 1234567890,
    "date": "2025-01-15",
    "type": "Despesa",
    "amount": 150.50,
    "descricao": "Supermercado",
    "obs": "Compra do mês"
  }
]
```

### Exemplo de FaturasParceladas (dentro de FinanceData)
```json
[
  {
    "id": 1234567891,
    "cartao": "Visa",
    "banco": "Banco do Brasil",
    "valorTotal": 1200.00,
    "parcelas": 12,
    "parcelasPagas": 3,
    "dataInicio": "2025-01-10",
    "diaPagamento": 15,
    "taxaJuros": 2.5,
    "descricao": "Compra de eletrodoméstico",
    "ativa": true
  }
]
```

### Exemplo de DespesasRecorrentes (dentro de FinanceData)
```json
[
  {
    "id": 1234567892,
    "descricao": "Aluguel",
    "valor": 1500.00,
    "dia": 5,
    "inicio": "2025-01-01",
    "termino": null,
    "obs": "Aluguel do apartamento",
    "ativa": true
  }
]
```

### Exemplo de ReceitasRecorrentes (dentro de FinanceData)
```json
[
  {
    "id": 1234567893,
    "descricao": "Salário",
    "valor": 5000.00,
    "dia": 1,
    "inicio": "2025-01-01",
    "termino": null,
    "obs": "Salário CLT",
    "ativa": true
  }
]
```

## ⚠️ Importante

1. **Nomes dos Campos**: Os nomes dos campos devem ser **exatamente** como especificado (case-sensitive):
   - `Email` (com E maiúsculo)
   - `UserId` (com U e I maiúsculos)
   - `FinanceData` (com F e D maiúsculos) - **Campo principal com todos os dados**
   - `UpdatedAt` (com U e A maiúsculos) - **Auto-gerado, não enviar no payload**

2. **Campo UpdatedAt**: 
   - ⚠️ **NÃO envie o campo `UpdatedAt` nas requisições POST ou PATCH**
   - O NocoDB gerencia este campo automaticamente
   - Se você tentar enviar, receberá erro: `"Column \"UpdatedAt\" is auto generated and cannot be updated"`

2. **Permissões**: Certifique-se de que o token da API tem permissão para:
   - Ler registros (GET)
   - Criar registros (POST)
   - Atualizar registros (PATCH)

3. **RLS (Row Level Security)**: Se você quiser adicionar segurança adicional, pode configurar filtros na view do NocoDB para que cada usuário veja apenas seus próprios dados.

## 🔄 Atualizar Configuração no Código

Se você criou uma nova tabela ou alterou algum ID, atualize as constantes no arquivo `app.js`:

```javascript
const NOCODB_API_TOKEN = 'SEU_TOKEN_AQUI';
const NOCODB_BASE_URL = 'https://app.nocodb.com/api/v2/tables/SEU_TABLE_ID/records';
const NOCODB_VIEW_ID = 'SEU_VIEW_ID';
```

## ✅ Checklist de Configuração

- [ ] Tabela criada no NocoDB
- [ ] Todos os 7 campos adicionados com os nomes corretos
- [ ] Campo `Email` marcado como único
- [ ] Campo `UserId` marcado como único
- [ ] Token da API gerado e copiado
- [ ] URL da tabela copiada
- [ ] View ID anotado (se criou nova view)
- [ ] Teste de conexão executado com sucesso
- [ ] Dados sendo salvos corretamente após login

## 🆘 Troubleshooting

### Erro: "Could not find the function"
- Verifique se o nome da tabela e campos estão corretos
- Confirme que o token tem as permissões necessárias

### Erro: "Invalid token"
- Gere um novo token da API
- Atualize o `NOCODB_API_TOKEN` no código

### Dados não estão sendo salvos
- Verifique o console do navegador (F12) para erros
- Confirme que está logado (`isLoggedIn = true`)
- Verifique se `USE_NOCODB = true` no código

### Campos não encontrados
- Verifique se os nomes dos campos estão exatamente como especificado
- Confirme que os campos existem na tabela do NocoDB

