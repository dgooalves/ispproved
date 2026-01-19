# Guia de Deploy na Vercel

Seu projeto está pronto para ser implantado na Vercel! Como sua aplicação usa Vite e Supabase, siga estes passos:

## 1. Preparação no GitHub
1. Crie um novo repositório no GitHub.
2. Envie (push) o código da pasta `ispproved` para este repositório.

## 2. Configuração na Vercel
1. Acesse [vercel.com](https://vercel.com) e faça login.
2. Clique em **"Add New..."** -> **"Project"**.
3. Importe o repositório do GitHub que você acabou de criar.

## 3. Configurações do Projeto
Na tela de configuração de deploy ("Configure Project"):

### Root Directory (Diretório Raiz)
- Se você enviou apenas o conteúdo de `ispproved` para a raiz do repositório, deixe como está (`./`).
- Se você enviou a pasta `ispproved` dentro de outra pasta, clique em "Edit" ao lado de Root Directory e selecione a pasta `ispproved`.

### Environment Variables (Variáveis de Ambiente)
**IMPORTANTE**: Você DEVE adicionar as variáveis do Supabase aqui para que o site funcione em produção.
Abra a seção "Environment Variables" e adicione:

1. **Nome**: `VITE_SUPABASE_URL`
   **Valor**: (Copie o valor de `VITE_SUPABASE_URL` do seu arquivo `.env.local`)

2. **Nome**: `VITE_SUPABASE_ANON_KEY`
   **Valor**: (Copie o valor de `VITE_SUPABASE_ANON_KEY` do seu arquivo `.env.local`)

## 4. Deploy
- Clique em **"Deploy"**.
- A Vercel irá construir o projeto automaticamente usando o comando `vite build` que já configuramos.
- O arquivo `vercel.json` incluído garantirá que a navegação entre páginas funcione corretamente (evitando erros 404 ao atualizar a página).

## Sucesso!
Após o deploy, você receberá uma URL (ex: `seu-projeto.vercel.app`) para acessar o sistema de qualquer lugar.
