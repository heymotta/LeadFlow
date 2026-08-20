# Prompt para Claude Code — Painel Web de Outreach no WhatsApp (Evolution API)

Copie e cole o bloco abaixo inteiro no Claude Code.

---

## CONTEXTO

Quero construir uma aplicação **web** pessoal (uso individual, só eu vou acessar, sem necessidade de multiusuário/autenticação robusta) para gerenciar outreach em um grupo de WhatsApp usando a **Evolution API**. Nada de CLI pura — quero uma telinha simples no navegador pra eu acompanhar visualmente, mas sem exagero de design, só funcional e organizado.

Objetivo do fluxo:

1. Buscar a lista de participantes de um grupo do WhatsApp (via Evolution API).
2. Salvar esses contatos localmente com um status de progresso.
3. Enviar, um contato por vez (com delay entre envios), uma mensagem de abordagem oferecendo entrada em outro grupo meu.
4. Escutar as respostas via webhook da Evolution API.
5. Quando o contato responder, enviar automaticamente o link do grupo de destino.
6. Marcar o contato como "convidado" para nunca reabordá-lo.
7. Ver tudo isso (status de cada contato, métricas gerais) numa página web.

## CONFIGURAÇÃO DA EVOLUTION API (já em produção)

- Server URL: `https://evolution-api-production-5662.up.railway.app`
- API Key (global): `asdsaodsteste1234567`
- Versão da Evolution API: `2.3.7`
- Confirme na documentação da v2.3.7 os endpoints exatos de: listar participantes de grupo, enviar mensagem de texto, e configurar webhook da instância (nomes de endpoint podem variar entre versões).

## HOSPEDAGEM

- Tudo (app web + servidor que recebe o webhook) vai rodar **na Railway**, junto com a instância da Evolution API.
- Estruture o projeto pensando em deploy simples na Railway (um único serviço Node rodando backend + servindo o frontend, ou dois serviços simples se fizer mais sentido — mas prefira o mínimo de serviços possível).
- Variáveis sensíveis (API key, etc) via variáveis de ambiente da Railway, nunca hardcoded no código-fonte — só usei os valores acima aqui no prompt para você configurar o `.env`/variáveis de ambiente.

## STACK

- **Backend**: Node.js + TypeScript, Express (ou Fastify) — expõe API REST para o frontend e recebe o webhook da Evolution API.
- **Frontend**: uma aplicação simples que rode junto (pode ser React com Vite, ou até um frontend server-rendered simples tipo EJS/HTML+HTMX se quiser reduzir complexidade — decida pelo que for mais rápido de entregar funcional). Não precisa de design elaborado, só uma UI limpa e legível.
- **Banco de dados**: SQLite (via `better-sqlite3`, `drizzle` ou `prisma`) — leve, sem precisar de serviço de banco separado na Railway. Se preferir, pode usar o Postgres da Railway caso SQLite complique o deploy (persistência de arquivo em container efêmero) — avalie e me explique a escolha antes de implementar.
- dotenv / variáveis de ambiente para configuração.

## FUNCIONALIDADES OBRIGATÓRIAS

### 1. Importação de contatos
Rota/ação (acionada pela UI, ex: botão "Importar contatos do grupo") que busca os participantes do grupo de origem via Evolution API e grava no banco:
- `phone` (JID do WhatsApp)
- `status`: `pendente` | `abordado` | `respondeu` | `convidado` | `ignorado`
- `abordado_em`, `respondeu_em`, `convidado_em` (timestamps)
- Deduplicar — nunca reimportar quem já está no banco.

### 2. Envio de abordagem (com rate limiting humano)
Ação na UI ("Iniciar abordagem" / rodar em background) que:
- Pega N contatos com status `pendente` (N configurável na UI, ex: 20/dia).
- Envia a mensagem de abordagem (2–3 templates configuráveis via UI ou arquivo, sorteados aleatoriamente para não repetir texto idêntico).
- Espera um delay **aleatório** entre envios (ex: 30–90 segundos, configurável).
- Atualiza status para `abordado`.
- Tem um limite diário rígido configurável (ex: máx 40 mensagens/dia) para reduzir risco de bloqueio do número.
- Se der erro de envio, marca como `ignorado` com o motivo.
- Como isso roda por minutos/horas, rode como processo assíncrono no backend (fila simples em memória ou job) e mostre o progresso ao vivo na UI (polling simples é suficiente, sem precisar de websocket se não quiser).

### 3. Webhook de resposta
Rota HTTP (ex: `POST /webhook/evolution`) que:
- Recebe eventos `messages.upsert` (ou o evento equivalente de mensagem recebida) configurado no webhook da instância Evolution API.
- Verifica se a mensagem recebida é de um número com status `abordado`.
- Se for, envia automaticamente o link do grupo de destino como resposta.
- Atualiza o status para `convidado`.
- Ignora mensagens de quem já está `convidado` ou não está na base.

### 4. Dashboard web
Página inicial mostrando:
- Tabela de contatos com status, filtrável (ex: por status).
- Cards/resumo: total de contatos, pendentes, abordados, responderam, convidados, ignorados, taxa de resposta (%).
- Botões de ação: importar contatos, iniciar/pausar rodada de abordagem, ver logs recentes.
- Uma tela simples de configuração: grupo de origem, link do grupo de destino, delays mín/máx, limite diário, templates de mensagem — editáveis pela UI e persistidos no banco (não só `.env`, já que é web).

## REQUISITOS NÃO FUNCIONAIS

- Código organizado em módulos claros (ex: `src/evolutionClient.ts`, `src/db.ts`, `src/services/abordagem.ts`, `src/routes/webhook.ts`, `src/routes/api.ts`, frontend separado) — sem exagero de camadas, é projeto pessoal.
- README curto explicando: como rodar localmente, como fazer deploy na Railway, quais variáveis de ambiente configurar, e como apontar o webhook da instância Evolution API para a URL pública da Railway.
- Tratar erros de rede/API sem travar o processo de abordagem — se um envio falhar, segue pro próximo.

## O QUE NÃO QUERO

- Sem autenticação multiusuário complexa (no máximo uma senha simples de acesso à UI, se achar necessário por estar exposta publicamente na Railway).
- Sem enviar mensagem em massa simultânea (sempre sequencial com delay).
- Sem reabordar quem já foi abordado ou já é `convidado`.
- Sem over-engineering de frontend (nada de state management complexo, design system, etc).

## PRIMEIRO PASSO

Antes de escrever código, me pergunte:
1. Prefiro SQLite (mais simples, mas exige volume persistente configurado na Railway) ou Postgres da Railway (mais robusto pra ambiente hospedado) — e explique rapidamente o trade-off.
2. Se quero autenticação simples (senha única) na UI, já que ela vai ficar publicamente acessível numa URL da Railway.
3. Confirmar comigo os endpoints exatos da Evolution API v2.3.7 (participantes do grupo, envio de texto, configuração de webhook) antes de implementar o client.

Depois disso, monte a estrutura do projeto (backend + frontend), o schema do banco, e implemente na ordem: (1) client da Evolution API, (2) banco + importação de contatos, (3) rotina de abordagem com rate limit + endpoint pra UI acompanhar progresso, (4) webhook + resposta automática, (5) dashboard web com tabela de contatos, métricas e tela de configuração, (6) instruções de deploy na Railway.

---