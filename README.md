# LeadFlowz ⚡

Painel web pessoal para gerenciar outreach em grupos de WhatsApp usando a **Evolution API**.

## Funcionalidades

- 📥 **Importar contatos** de um grupo do WhatsApp
- 🚀 **Abordagem automatizada** com delay aleatório e limite diário
- 🔄 **Templates rotativos** para variar as mensagens
- 📩 **Webhook automático** — responde com link do grupo quando o contato responder
- 📊 **Dashboard** com métricas em tempo real e tabela de contatos filtrável
- ⚙️ **Configurações** editáveis pela UI (grupo de origem, link destino, delays, templates)
- 🔒 **Proteção por senha** simples

## Stack

- **Backend**: Node.js + TypeScript + Express
- **Frontend**: React + Vite
- **Banco**: SQLite (via Prisma ORM) — leve, sem serviço externo
- **WhatsApp**: Evolution API v2

## Rodar Localmente

### 1. Pré-requisitos

- Node.js 18+
- Instância da Evolution API configurada

### 2. Configurar variáveis de ambiente

```bash
cp .env.example .env
# Edite o .env com seus valores
```

| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | Caminho do arquivo SQLite (default: `file:./data/leadflowz.db`) |
| `EVOLUTION_API_URL` | URL da sua Evolution API |
| `EVOLUTION_API_KEY` | API key global da Evolution API |
| `INSTANCE_NAME` | Nome da instância (ex: `leadflow`) |
| `ACCESS_PASSWORD` | Senha para acessar a UI |
| `WEBHOOK_BASE_URL` | URL pública onde o app está acessível |
| `PORT` | Porta do servidor (default: 3000) |

### 3. Instalar dependências

```bash
npm install
cd frontend && npm install && cd ..
```

### 4. Configurar o banco

```bash
npx prisma db push
```

### 5. Rodar em desenvolvimento

Em dois terminais:

```bash
# Terminal 1 - Backend
npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

O frontend roda em `http://localhost:5173` com proxy para o backend em `http://localhost:3000`.

## Deploy na Railway

### 1. Criar o projeto

1. Crie um novo projeto na [Railway](https://railway.app)
2. Adicione um serviço a partir do seu repositório Git
3. Configure um **volume persistente** montado em `/app/data` para o SQLite não perder dados entre redeploys

### 2. Configurar variáveis de ambiente

No serviço do app, adicione as variáveis:

```
DATABASE_URL=file:./data/leadflowz.db
EVOLUTION_API_URL=https://evolution-api-production-5662.up.railway.app
EVOLUTION_API_KEY=sua-api-key
INSTANCE_NAME=leadflow
ACCESS_PASSWORD=sua-senha-segura
WEBHOOK_BASE_URL=https://seu-app.up.railway.app
PORT=3000
```

> ⚠️ **Importante**: Configure um volume persistente na Railway montado em `/app/data` para que o banco SQLite persista entre redeploys.

### 3. Deploy

A Railway detecta automaticamente o `Dockerfile` e faz o build. O container:
1. Compila o frontend (Vite build)
2. Compila o backend (TypeScript)
3. Roda as migrations do Prisma
4. Inicia o servidor Express que serve tudo

### 4. Configurar o Webhook

Após o deploy, acesse a UI e clique em **"🔗 Configurar Webhook"**. Isso vai registrar a URL `https://seu-app.up.railway.app/webhook/evolution` na sua instância da Evolution API.

Alternativamente, configure manualmente:

```bash
curl -X POST https://evolution-api-production-5662.up.railway.app/webhook/set/leadflow \
  -H "apikey: sua-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "webhook": {
      "enabled": true,
      "url": "https://seu-app.up.railway.app/webhook/evolution",
      "byEvents": false,
      "events": ["MESSAGES_UPSERT"]
    }
  }'
```

## Estrutura do Projeto

```
LeadFlowz/
├── src/
│   ├── index.ts              # Servidor Express
│   ├── config.ts             # Variáveis de ambiente
│   ├── db.ts                 # Prisma client
│   ├── auth.ts               # Autenticação por senha
│   ├── evolutionClient.ts    # Client da Evolution API
│   ├── types.ts              # Tipos TypeScript
│   ├── services/
│   │   └── outreach.ts       # Serviço de abordagem
│   └── routes/
│       ├── api.ts            # Rotas REST
│       └── webhook.ts        # Webhook da Evolution API
├── frontend/
│   └── src/
│       ├── App.tsx           # App principal
│       └── components/       # Componentes React
├── prisma/
│   └── schema.prisma         # Schema do banco (SQLite)
├── data/                     # Banco SQLite (criado automaticamente)
├── Dockerfile                # Build multi-stage
└── .env.example              # Template de variáveis
```
