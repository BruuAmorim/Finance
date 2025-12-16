# Instruções para Adicionar o Ícone do Flaticon

## Opção 1: Usar Link Direto (Já Implementado)
O código já está configurado para usar o link direto do Flaticon. Se o ícone não aparecer, use a Opção 2.

## Opção 2: Baixar e Usar Localmente (Recomendado)

### Passo 1: Baixar o Ícone
1. Acesse: https://www.flaticon.com/br/icone-gratis/dinheiro_8183707
2. Clique em **"Download"** ou **"Baixar"**
3. Escolha o formato **PNG** (tamanho 512x512 ou maior)
4. Salve o arquivo na pasta do projeto

### Passo 2: Renomear o Arquivo
- Renomeie o arquivo baixado para: `favicon.png` ou `icon-finance.png`

### Passo 3: Colocar na Pasta do Projeto
- Coloque o arquivo na raiz do projeto (mesma pasta onde está o `Index.html`)

### Passo 4: Atualizar o HTML
Substitua as linhas do favicon no `Index.html` por:

```html
<!-- Favicon - Ícone do Flaticon -->
<link rel="icon" type="image/png" href="favicon.png">
<link rel="shortcut icon" type="image/png" href="favicon.png">
<link rel="apple-touch-icon" href="favicon.png">
```

E no título:

```html
<h1 style="display: flex; align-items: center; gap: 10px;">
    <img src="favicon.png" alt="Ícone Finance" style="width: 32px; height: 32px; object-fit: contain;">
    EvaCloudd Finance
</h1>
```

## Créditos do Flaticon
Se você estiver usando uma conta gratuita do Flaticon, é necessário creditar o autor do ícone. Adicione no rodapé do site:

```html
<p style="text-align: center; font-size: 0.8rem; color: #666;">
    Ícone criado por <a href="https://www.flaticon.com/authors/author-name" target="_blank">Nome do Autor</a> - <a href="https://www.flaticon.com" target="_blank">Flaticon</a>
</p>
```


