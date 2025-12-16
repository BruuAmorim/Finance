# ⚙️ Configuração do Vercel para o Projeto

## 📋 Tipo de Projeto

Seu projeto é uma **aplicação web estática** (HTML, CSS, JavaScript vanilla), sem framework específico.

## 🔧 Configuração Padrão do Vercel

### Framework Detectado
- **Framework**: `null` (site estático)
- **Build Command**: `null` (não requer build)
- **Output Directory**: `.` (raiz do projeto)

### Arquivo `vercel.json` Criado

O arquivo `vercel.json` foi criado com as seguintes configurações:

#### 1. **Rewrites (Rotas)**
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/Index.html"
    }
  ]
}
```
- Todas as rotas redirecionam para `Index.html`
- Útil para SPAs (Single Page Applications)
- Permite que rotas como `/login` funcionem corretamente

#### 2. **Headers de Segurança**
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```
- Proteção contra XSS
- Previne clickjacking
- Segurança adicional

#### 3. **Cache Control**
- **HTML**: Sem cache (sempre atualizado)
- **JS/CSS**: Cache longo (1 ano) para performance

## 🚀 Como Fazer Deploy no Vercel

### Opção 1: Via CLI (Recomendado)

1. **Instalar Vercel CLI**:
```bash
npm i -g vercel
```

2. **Fazer login**:
```bash
vercel login
```

3. **Deploy**:
```bash
vercel
```

4. **Deploy em produção**:
```bash
vercel --prod
```

### Opção 2: Via Dashboard (Interface Web)

1. Acesse [vercel.com](https://vercel.com)
2. Faça login com GitHub/GitLab/Bitbucket
3. Clique em **"Add New Project"**
4. Conecte seu repositório
5. Configure:
   - **Framework Preset**: `Other` ou `Static Site`
   - **Build Command**: (deixe vazio)
   - **Output Directory**: `.` (raiz)
6. Clique em **"Deploy"**

## 📁 Estrutura de Arquivos

```
Finance/
├── Index.html          # Página principal
├── app.js              # Lógica da aplicação
├── services.js         # Services (Supabase + NocoDB)
├── styles.css          # Estilos
├── vercel.json         # Configuração do Vercel
└── ...                 # Outros arquivos
```

## ⚙️ Configurações Adicionais Recomendadas

### Variáveis de Ambiente

No painel do Vercel, adicione as variáveis de ambiente (se necessário):

1. Vá em **Settings** > **Environment Variables**
2. Adicione (se quiser usar variáveis de ambiente):
   - `SUPABASE_URL` (opcional - já está no código)
   - `SUPABASE_ANON_KEY` (opcional - já está no código)
   - `NOCODB_API_TOKEN` (opcional - já está no código)

**Nota**: Como as credenciais já estão no código (`services.js`), isso é opcional.

### Domínio Personalizado

1. Vá em **Settings** > **Domains**
2. Adicione seu domínio personalizado
3. Configure os registros DNS conforme instruções

## 🔍 Verificações Pós-Deploy

Após o deploy, verifique:

1. ✅ Site carrega corretamente
2. ✅ JavaScript funciona (console sem erros)
3. ✅ Supabase Auth funciona
4. ✅ NocoDB API funciona
5. ✅ Rotas funcionam (se houver)

## 🐛 Troubleshooting

### Erro: "Build Failed"
**Solução**: Verifique se não há erros de sintaxe no JavaScript. O Vercel não faz build, mas valida os arquivos.

### Erro: "404 Not Found"
**Solução**: Verifique se o `vercel.json` está configurado corretamente com os rewrites.

### Erro: "CORS Error"
**Solução**: Verifique se as URLs do Supabase e NocoDB estão corretas e permitem requisições do seu domínio.

### Assets não carregam
**Solução**: Verifique se os caminhos dos arquivos estão corretos (case-sensitive no Linux).

## 📚 Recursos

- [Documentação Vercel](https://vercel.com/docs)
- [Configuração de Sites Estáticos](https://vercel.com/docs/configuration#static-sites)
- [Headers e Segurança](https://vercel.com/docs/configuration#headers)

---

**Última atualização**: Configuração criada para site estático HTML/CSS/JS vanilla.

