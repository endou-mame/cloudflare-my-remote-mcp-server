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

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
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

  async handleMCPRequest(jsonRpcMessage: any): Promise<any> {
    return await this.server.handleRequest(jsonRpcMessage);
  }
}

export default {
  async fetch(request, env, ctx): Promise<Response> {
    // Handle CORS preflight
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

    // Handle MCP HTTP Streamable endpoint
    if (request.method === "POST" && url.pathname === "/mcp") {
      const id = env.MY_DURABLE_OBJECT.idFromName("mcp-server");
      const stub = env.MY_DURABLE_OBJECT.get(id);

      try {
        const jsonRpcMessage = await request.json();
        const response = await stub.handleMCPRequest(jsonRpcMessage);

        // Create SSE response stream
        const { readable, writable } = new TransformStream();
        const writer = writable.getWriter();

        // Send response as SSE data
        if (response) {
          const sseData = `data: ${JSON.stringify(response)}\n\n`;
          await writer.write(new TextEncoder().encode(sseData));
        }

        await writer.close();

        return new Response(readable, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
          },
        });
      } catch (error) {
        console.error("Error handling MCP request:", error);
        
        return new Response(JSON.stringify({
          jsonrpc: "2.0",
          id: null,
          error: {
            code: -32603,
            message: "Internal error",
            data: (error as Error).message,
          },
        }), {
          status: 500,
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        });
      }
    }

    // Handle root endpoint - provide server information
    if (url.pathname === "/") {
      const serverInfo = {
        name: "Cloudflare MCP Server",
        version: "1.0.0",
        description: "A Model Context Protocol server running on Cloudflare Workers",
        protocols: ["http-streamable"],
        capabilities: {
          tools: true,
          resources: true,
          prompts: true,
        },
        endpoints: {
          mcp: `${url.protocol}//${url.host}/mcp`,
        },
        documentation: "Send POST requests with JSON-RPC messages to /mcp endpoint",
        usage: {
          method: "POST",
          url: "/mcp",
          headers: {
            "Content-Type": "application/json",
          },
          body: "JSON-RPC 2.0 message",
          response: "Server-Sent Events (text/event-stream)",
        },
      };

      return new Response(JSON.stringify(serverInfo, null, 2), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    return new Response("Not Found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;