/**
 * Endpoint MCP (Model Context Protocol) — Streamable HTTP transport.
 *
 * Aceita JSON-RPC 2.0 via POST. Métodos suportados:
 *   - initialize
 *   - tools/list
 *   - tools/call
 *   - ping
 *   - notifications/initialized (no-op)
 *
 * Autenticação: Bearer (env MCP_BEARER_TOKEN).
 *
 * Config Claude Desktop:
 * {
 *   "mcpServers": {
 *     "studio-baires": {
 *       "url": "https://studio-baires-metricas.vercel.app/api/mcp",
 *       "headers": { "Authorization": "Bearer <seu-token>" }
 *     }
 *   }
 * }
 */
import { NextResponse, type NextRequest } from "next/server";
import { checkBearer } from "@/lib/mcp/auth";
import { TOOLS, findTool } from "@/lib/mcp/tools";

const PROTOCOL_VERSION = "2025-06-18";
const SERVER_INFO = {
  name: "studio-baires-metricas",
  version: "1.0.0",
};

type JsonRpcRequest = {
  jsonrpc: "2.0";
  id?: number | string | null;
  method: string;
  params?: Record<string, unknown>;
};

type JsonRpcResponse = {
  jsonrpc: "2.0";
  id: number | string | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
};

function error(
  id: number | string | null,
  code: number,
  message: string,
  data?: unknown,
): JsonRpcResponse {
  return { jsonrpc: "2.0", id, error: { code, message, data } };
}

function success(id: number | string | null, result: unknown): JsonRpcResponse {
  return { jsonrpc: "2.0", id, result };
}

async function handleMessage(msg: JsonRpcRequest): Promise<JsonRpcResponse | null> {
  const id = msg.id ?? null;

  switch (msg.method) {
    case "initialize":
      return success(id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
      });

    case "notifications/initialized":
      // Notificação — não responde.
      return null;

    case "ping":
      return success(id, {});

    case "tools/list":
      return success(id, {
        tools: TOOLS.map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema,
        })),
      });

    case "tools/call": {
      const params = msg.params ?? {};
      const name = String(params.name ?? "");
      const args = (params.arguments as Record<string, unknown>) ?? {};
      const tool = findTool(name);
      if (!tool) {
        return error(id, -32602, `Tool desconhecida: ${name}`);
      }
      try {
        const result = await tool.handler(args);
        return success(id, {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        // Erro de tool é retornado como result.isError = true (não como
        // JSON-RPC error), pra Claude conseguir ler e reagir.
        return success(id, {
          isError: true,
          content: [{ type: "text", text: `Erro: ${msg}` }],
        });
      }
    }

    default:
      return error(id, -32601, `Método não suportado: ${msg.method}`);
  }
}

export async function POST(request: NextRequest) {
  const auth = checkBearer(request.headers.get("authorization"));
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.reason },
      {
        status: auth.status,
        headers: { "WWW-Authenticate": 'Bearer realm="mcp"' },
      },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(error(null, -32700, "JSON inválido"), {
      status: 400,
    });
  }

  // Suporta single request OU batch (array).
  const isBatch = Array.isArray(body);
  const messages = (isBatch ? body : [body]) as JsonRpcRequest[];

  const responses: JsonRpcResponse[] = [];
  for (const msg of messages) {
    if (!msg || typeof msg !== "object" || msg.jsonrpc !== "2.0") {
      responses.push(error(null, -32600, "JSON-RPC inválido"));
      continue;
    }
    const res = await handleMessage(msg);
    if (res !== null) responses.push(res);
  }

  // Notificações puras (sem id) e sem resposta → 204.
  if (responses.length === 0) {
    return new NextResponse(null, { status: 204 });
  }

  return NextResponse.json(isBatch ? responses : responses[0]);
}

export async function GET() {
  // Healthcheck simples + ajuda pra quem abrir no browser.
  return NextResponse.json({
    server: SERVER_INFO,
    protocol_version: PROTOCOL_VERSION,
    transport: "streamable-http",
    tools_count: TOOLS.length,
    docs: "POST JSON-RPC 2.0 com Authorization: Bearer <token>",
  });
}
