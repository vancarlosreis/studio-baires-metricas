# MCP Server — Studio Baires Métricas

Servidor MCP (Model Context Protocol) exposto em `/api/mcp` que permite ao Claude (Desktop, Code ou Claude.ai com Connectors) acessar os dados da plataforma como ferramentas.

Endpoint: `https://studio-baires-metricas.vercel.app/api/mcp`
Transport: Streamable HTTP (JSON-RPC 2.0)
Auth: Bearer token fixo

## 1. Gerar o token

Localmente:

```bash
openssl rand -hex 32
# 9f2c8e4a7b1d3f5e6a8c0b9d2e4f7a8c1b3d5e7f9a0c2b4d6e8f0a1c3b5d7e9f
```

## 2. Configurar no servidor (Vercel)

Em **Vercel → Project → Settings → Environment Variables**:

| Nome                       | Valor                              | Ambientes |
| -------------------------- | ---------------------------------- | --------- |
| `MCP_BEARER_TOKEN`         | (o token gerado acima)             | Production + Preview |
| `SUPABASE_SERVICE_ROLE_KEY`| (já existe — service role do Supabase) | Production + Preview |

Após adicionar, **redeploy** pra que as envs sejam aplicadas.

## 3. Configurar no cliente

### Claude Desktop

Edite `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) ou `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "studio-baires": {
      "url": "https://studio-baires-metricas.vercel.app/api/mcp",
      "headers": {
        "Authorization": "Bearer SEU_TOKEN_AQUI"
      }
    }
  }
}
```

Reinicie o Claude Desktop. Você verá um ícone de plug indicando a conexão MCP ativa.

### Claude Code

```bash
claude mcp add studio-baires \
  --transport http \
  --url https://studio-baires-metricas.vercel.app/api/mcp \
  --header "Authorization: Bearer SEU_TOKEN_AQUI"
```

## 4. Como usar

Em qualquer conversa com o Claude:

> "Lista as contas conectadas no Studio Baires"
> "Sincroniza a duda.macedogr e me dá o overview dos últimos 30 dias"
> "Quais foram os 5 posts com maior alcance da maqservexpress no último mês?"
> "Analisa a evolução do reach da duda.macedogr nos últimos 90 dias e identifica padrões"
> "Compara o desempenho de stories vs feed dessa conta"

O Claude vai automaticamente chamar as tools certas.

## Tools disponíveis

| Tool | O que faz |
|------|-----------|
| `list_accounts` | Todas as contas IG conectadas + último sync + followers |
| `sync_account(handle)` | Força sync completo (~20-60s) |
| `get_account_overview(handle, period?)` | KPIs + paid breakdown + agregados feed/reels/stories |
| `list_top_posts(handle, period?, sort_by?, limit?)` | Posts ranqueados por métrica |
| `list_stories(handle, period?)` | Stories com todas as métricas + retenção |
| `get_demographics(handle)` | Audiência por idade/gênero/cidade/país |
| `get_evolution(handle, metric, period?)` | Série diária de uma métrica |
| `list_recent_syncs(handle?)` | Histórico de jobs de sync |

`period` aceita `"7d"`, `"30d"`, `"90d"`, `"custom"` (com `custom_start` + `custom_end` em `YYYY-MM-DD`).

## Healthcheck

GET `/api/mcp` (sem token) retorna info do servidor — útil pra verificar que está no ar.

## Segurança

- O Bearer token tem **acesso total** às contas conectadas (RLS é bypassada via service role).
- Trate o token como senha. Se vazar, gere outro e atualize env var no Vercel.
- Não há revogação — pra "revogar", troque o token.
