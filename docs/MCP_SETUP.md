# MCP Server — Studio Baires Métricas

Servidor MCP (Model Context Protocol) exposto em `/api/mcp` que permite ao Claude (Desktop, Code, Claude.ai com Connectors) acessar todos os dados da plataforma como ferramentas.

- **Endpoint MCP**: `https://studio-baires-metricas.vercel.app/api/mcp`
- **Transport**: Streamable HTTP (JSON-RPC 2.0)
- **Auth**: OAuth 2.1 + PKCE com Dynamic Client Registration (recomendado) **ou** Bearer fixo (fallback)

## Modo recomendado: OAuth (Claude.ai Connectors)

O Claude.ai descobre tudo automaticamente via discovery endpoints. Você só precisa apontar a URL.

1. No Claude.ai: **Settings → Connectors → + Add custom connector**
2. **Server URL**: `https://studio-baires-metricas.vercel.app/api/mcp`
3. Clica em **Add** — o Claude.ai vai:
   - Buscar `/.well-known/oauth-protected-resource` (descobre o Authorization Server)
   - Buscar `/.well-known/oauth-authorization-server` (descobre os endpoints)
   - POST em `/oauth/register` (Dynamic Client Registration)
   - Redirecionar você pra `/oauth/authorize`
4. Você faz login na plataforma (se não estiver) com seu email da allowlist
5. Aprova na tela de consentimento
6. Pronto — Claude.ai recebe access_token e refresh_token

Pra **revogar acesso**: vá em **Dashboard → Integrações** na própria plataforma. Lista os tokens ativos com botão Revogar.

## Modo alternativo: Bearer fixo (uso interno / CLI / CI)

Pra cenários sem browser (scripts, Claude Desktop sem flow OAuth, etc):

1. Gere um token:
   ```bash
   openssl rand -hex 32
   ```
2. Adicione no Vercel: `MCP_BEARER_TOKEN` (env var, Production + Preview), redeploy
3. Configure o cliente passando o token no header `Authorization: Bearer <token>`

### Claude Desktop

`claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "studio-baires": {
      "url": "https://studio-baires-metricas.vercel.app/api/mcp",
      "headers": {
        "Authorization": "Bearer SEU_MCP_BEARER_TOKEN"
      }
    }
  }
}
```

### Claude Code

```bash
claude mcp add studio-baires \
  --transport http \
  --url https://studio-baires-metricas.vercel.app/api/mcp \
  --header "Authorization: Bearer SEU_TOKEN"
```

## Tools disponíveis

| Tool | O que faz |
|------|-----------|
| `list_accounts` | Todas as contas IG conectadas + last sync + followers/posts |
| `sync_account(handle)` | Força sync completo (~20-60s) |
| `get_account_overview(handle, period?)` | KPIs + paid breakdown + agregados feed/reels/stories |
| `list_top_posts(handle, period?, sort_by?, limit?)` | Posts ranqueados por métrica |
| `list_stories(handle, period?)` | Stories com todas métricas + retenção |
| `get_demographics(handle)` | Audiência (idade/gênero/cidade/país) |
| `get_evolution(handle, metric, period?)` | Série diária + peak |
| `list_recent_syncs(handle?)` | Histórico de jobs |

`period` aceita `"7d"`, `"30d"`, `"90d"`, `"custom"` (com `custom_start` + `custom_end`).

## Como usar (exemplos)

> "Lista as contas conectadas no Studio Baires"
> "Sincroniza a duda.macedogr e me dá o overview dos últimos 30 dias"
> "Quais foram os 5 posts com maior alcance da maqservexpress no último mês?"
> "Analisa a evolução do reach da duda.macedogr nos últimos 90 dias e identifica padrões"
> "Compara stories vs feed dessa conta"

## Endpoints OAuth

| Endpoint | Método | RFC | Função |
|----------|--------|-----|--------|
| `/.well-known/oauth-authorization-server` | GET | 8414 | Metadata do AS |
| `/.well-known/oauth-protected-resource` | GET | 9728 | Metadata do RS (anuncia AS) |
| `/oauth/register` | POST | 7591 | Dynamic Client Registration |
| `/oauth/authorize` | GET | 6749 | Consent screen + emissão de code |
| `/oauth/token` | POST | 6749 | Troca code/refresh por access_token |
| `/oauth/revoke` | POST | 7009 | Revoga token |

## Segurança

- **OAuth tokens** são armazenados como SHA-256 no Supabase (`oauth_access_tokens.token_hash`). Se o DB vazar, ninguém consegue usar o token.
- **PKCE obrigatório** (S256) — protege contra interceptação do code.
- **Refresh token rotation**: cada uso emite par novo e revoga o anterior.
- **Allowlist**: só os emails autorizados (`vancarlosreis@`, `studiobaires.mkt@`) podem completar a consent screen.
- **Bearer fixo** bypassa OAuth + allowlist — use só pra scripts internos.

## Healthcheck

GET `/api/mcp` (sem token) retorna info do servidor.
