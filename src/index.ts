import { DurableObject } from "cloudflare:workers";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

// MCP Server Durable Object
export class MCPServerObject extends DurableObject<Env> {
  private server: Server;
  private sessions: Set<WebSocket>;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.sessions = new Set();
    this.server = this.createMCPServer();
  }

  private createMCPServer(): Server {
    const server = new Server(
      {
        name: "cloudflare-mcp-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
        },
      }
    );

    // Register sample tools
    server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "echo",
            description: "Echo back the input text",
            inputSchema: {
              type: "object",
              properties: {
                text: {
                  type: "string",
                  description: "Text to echo back",
                },
              },
              required: ["text"],
            },
          },
          {
            name: "get_time",
            description: "Get the current time",
            inputSchema: {
              type: "object",
              properties: {},
            },
          },
          {
            name: "random_number",
            description: "Generate a random number between min and max",
            inputSchema: {
              type: "object",
              properties: {
                min: {
                  type: "number",
                  description: "Minimum value",
                },
                max: {
                  type: "number",
                  description: "Maximum value",
                },
              },
              required: ["min", "max"],
            },
          },
        ],
      };
    });

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case "echo":
          const echoArgs = z.object({ text: z.string() }).parse(args);
          return {
            content: [
              {
                type: "text",
                text: `Echo: ${echoArgs.text}`,
              },
            ],
          };

        case "get_time":
          return {
            content: [
              {
                type: "text",
                text: `Current time: ${new Date().toISOString()}`,
              },
            ],
          };

        case "random_number":
          const randomArgs = z
            .object({ min: z.number(), max: z.number() })
            .parse(args);
          const randomNum =
            Math.floor(Math.random() * (randomArgs.max - randomArgs.min + 1)) +
            randomArgs.min;
          return {
            content: [
              {
                type: "text",
                text: `Random number between ${randomArgs.min} and ${randomArgs.max}: ${randomNum}`,
              },
            ],
          };

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });

    // Register sample resources
    server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: [
          {
            uri: "cloudflare://worker-info",
            name: "Worker Information",
            description: "Information about this Cloudflare Worker",
            mimeType: "application/json",
          },
          {
            uri: "cloudflare://sample-data",
            name: "Sample Data",
            description: "Sample JSON data for testing",
            mimeType: "application/json",
          },
        ],
      };
    });

    server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      switch (uri) {
        case "cloudflare://worker-info":
          return {
            contents: [
              {
                uri: uri,
                mimeType: "application/json",
                text: JSON.stringify(
                  {
                    name: "Cloudflare MCP Server",
                    version: "1.0.0",
                    runtime: "Cloudflare Workers",
                    timestamp: new Date().toISOString(),
                    features: ["tools", "resources", "prompts"],
                  },
                  null,
                  2
                ),
              },
            ],
          };

        case "cloudflare://sample-data":
          return {
            contents: [
              {
                uri: uri,
                mimeType: "application/json",
                text: JSON.stringify(
                  {
                    items: [
                      { id: 1, name: "Item 1", value: "Value 1" },
                      { id: 2, name: "Item 2", value: "Value 2" },
                      { id: 3, name: "Item 3", value: "Value 3" },
                    ],
                    metadata: {
                      total: 3,
                      generated: new Date().toISOString(),
                    },
                  },
                  null,
                  2
                ),
              },
            ],
          };

        default:
          throw new Error(`Unknown resource: ${uri}`);
      }
    });

    // Register sample prompts
    server.setRequestHandler(ListPromptsRequestSchema, async () => {
      return {
        prompts: [
          {
            name: "explain_code",
            description: "Explain how a piece of code works",
            arguments: [
              {
                name: "code",
                description: "The code to explain",
                required: true,
              },
              {
                name: "language",
                description: "The programming language",
                required: false,
              },
            ],
          },
          {
            name: "debug_help",
            description: "Help debug an issue",
            arguments: [
              {
                name: "error",
                description: "The error message or description",
                required: true,
              },
              {
                name: "context",
                description: "Additional context about the problem",
                required: false,
              },
            ],
          },
        ],
      };
    });

    server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case "explain_code":
          const explainArgs = z
            .object({
              code: z.string(),
              language: z.string().optional(),
            })
            .parse(args);
          
          return {
            description: "Explain how this code works",
            messages: [
              {
                role: "user",
                content: {
                  type: "text",
                  text: `Please explain how this ${
                    explainArgs.language || "code"
                  } works:\n\n\`\`\`${explainArgs.language || ""}\n${
                    explainArgs.code
                  }\n\`\`\`\n\nBreak down the logic and explain what each part does.`,
                },
              },
            ],
          };

        case "debug_help":
          const debugArgs = z
            .object({
              error: z.string(),
              context: z.string().optional(),
            })
            .parse(args);
          
          return {
            description: "Help debug this issue",
            messages: [
              {
                role: "user",
                content: {
                  type: "text",
                  text: `I'm encountering this error: ${debugArgs.error}\n\n${
                    debugArgs.context
                      ? `Additional context: ${debugArgs.context}\n\n`
                      : ""
                  }Can you help me understand what's causing this issue and how to fix it?`,
                },
              },
            ],
          };

        default:
          throw new Error(`Unknown prompt: ${name}`);
      }
    });

    return server;
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    try {
      if (typeof message !== "string") {
        throw new Error("Expected string message");
      }

      const jsonrpcMessage = JSON.parse(message);
      const response = await this.server.handleRequest(jsonrpcMessage);
      
      if (response) {
        ws.send(JSON.stringify(response));
      }
    } catch (error) {
      console.error("Error handling WebSocket message:", error);
      
      // Send error response if we can parse the request ID
      try {
        const parsedMessage = JSON.parse(message as string);
        const errorResponse = {
          jsonrpc: "2.0",
          id: parsedMessage.id || null,
          error: {
            code: -32603,
            message: "Internal error",
            data: (error as Error).message,
          },
        };
        ws.send(JSON.stringify(errorResponse));
      } catch {
        // If we can't parse the message, just close the connection
        ws.close(1011, "Internal error");
      }
    }
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string) {
    this.sessions.delete(ws);
    console.log(`WebSocket closed: ${code} ${reason}`);
  }

  async webSocketError(ws: WebSocket, error: unknown) {
    this.sessions.delete(ws);
    console.error("WebSocket error:", error);
  }

  async acceptWebSocket(ws: WebSocket) {
    this.sessions.add(ws);
    ws.accept();
    
    // Send initialization message
    const initMessage = {
      jsonrpc: "2.0",
      method: "notifications/initialized",
      params: {},
    };
    ws.send(JSON.stringify(initMessage));
  }
}

export default {
  async fetch(request, env, ctx): Promise<Response> {
    // Handle CORS
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    }

    const url = new URL(request.url);

    // Handle WebSocket upgrade for MCP connections
    if (request.headers.get("Upgrade") === "websocket") {
      const webSocketPair = new WebSocketPair();
      const [client, server] = Object.values(webSocketPair);

      // Get or create Durable Object instance
      const id = env.MY_DURABLE_OBJECT.idFromName("mcp-server");
      const stub = env.MY_DURABLE_OBJECT.get(id);
      
      // Accept the WebSocket connection in the Durable Object
      await stub.acceptWebSocket(server);

      return new Response(null, {
        status: 101,
        webSocket: client,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // Handle HTTP requests - provide information about the MCP server
    if (url.pathname === "/") {
      const serverInfo = {
        name: "Cloudflare MCP Server",
        version: "1.0.0",
        description: "A Model Context Protocol server running on Cloudflare Workers",
        protocols: ["websocket"],
        capabilities: {
          tools: true,
          resources: true,
          prompts: true,
        },
        endpoints: {
          websocket: `${url.protocol === "https:" ? "wss:" : "ws:"}//${url.host}/ws`,
        },
        documentation: "Connect via WebSocket to use MCP protocol",
      };

      return new Response(JSON.stringify(serverInfo, null, 2), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // Handle WebSocket endpoint info
    if (url.pathname === "/ws") {
      return new Response("WebSocket endpoint - upgrade connection to use MCP protocol", {
        status: 426,
        headers: {
          "Upgrade": "websocket",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    return new Response("Not Found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;