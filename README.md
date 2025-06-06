# Cloudflare Remote MCP Server

A Model Context Protocol (MCP) server implementation running on Cloudflare Workers with Durable Objects.

## Features

- **Remote MCP Server**: HTTP Streamable transport-based MCP server accessible over the internet
- **Durable Objects**: Stateful request processing using Cloudflare Durable Objects
- **Sample Tools**: Demonstration tools for MCP protocol
- **Sample Resources**: Static data resources accessible via MCP
- **Sample Prompts**: Pre-built prompts for AI interactions
- **CORS Support**: Web-friendly with Cross-Origin Resource Sharing

## Architecture

```
┌─────────────────┐  HTTP POST + SSE  ┌──────────────────┐
│   MCP Client    │ ◄──────────────► │ Cloudflare       │
│   (AI/Claude)   │                  │ Worker           │
└─────────────────┘                  └─────────┬────────┘
                                               │
                                               ▼
                                     ┌──────────────────┐
                                     │ MCPServerObject  │
                                     │ (Durable Object) │
                                     │                  │
                                     │ • MCP Protocol   │
                                     │ • HTTP Processing│
                                     │ • Request State  │
                                     └──────────────────┘
```

## Available Capabilities

### Tools
- **echo**: Echo back input text
- **get_time**: Get current timestamp
- **random_number**: Generate random number between min and max
- **roll_dice**: Roll 6-sided dice and get results (supports multiple dice)

### Resources  
- **cloudflare://worker-info**: Information about the Cloudflare Worker
- **cloudflare://sample-data**: Sample JSON data for testing

### Prompts
- **explain_code**: Generate prompts to explain code
- **debug_help**: Generate prompts for debugging assistance

## Deployment

1. Install dependencies:
   ```bash
   npm install
   ```

2. Deploy to Cloudflare:
   ```bash
   npm run deploy
   ```

3. Access your MCP server at the deployed URL

## Development

1. Start local development:
   ```bash
   npm run dev
   ```

2. Test the server:
   ```bash
   # Get server info
   curl http://localhost:8787/
   
   # Test MCP endpoint with a simple request
   curl -X POST http://localhost:8787/mcp \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
   ```

## Usage

### HTTP API
- `GET /` - Server information and capabilities
- `POST /mcp` - MCP HTTP Streamable endpoint

### MCP Connection
Connect MCP clients to the HTTP endpoint:
- **Local**: `http://localhost:8787/mcp`
- **Production**: `https://your-worker.your-subdomain.workers.dev/mcp`

### Protocol Details
The server uses **HTTP Streamable transport**:
- **Request**: HTTP POST with JSON-RPC message in body
- **Response**: Server-Sent Events (SSE) stream with `text/event-stream` content type
- **Format**: Each response is sent as `data: {JSON}\n\n`

### Example MCP Messages

#### List Tools
```bash
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }'
```

#### Call Tool
```bash
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "echo",
      "arguments": {
        "text": "Hello, MCP!"
      }
    }
  }'
```

#### Roll Dice
```bash
# Roll a single 6-sided die
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "roll_dice",
      "arguments": {
        "count": 1
      }
    }
  }'

# Roll two 6-sided dice
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 4,
    "method": "tools/call",
    "params": {
      "name": "roll_dice",
      "arguments": {
        "count": 2
      }
    }
  }'
```

#### List Resources
```bash
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 5,
    "method": "resources/list"
  }'
```

## Configuration

The server is configured in `wrangler.jsonc`:
- **Durable Objects**: `MCPServerObject` handles stateful MCP request processing
- **Compatibility Date**: Set to current date for latest Cloudflare Workers features

## Development Notes

- Uses `@modelcontextprotocol/sdk` for MCP protocol implementation
- HTTP requests are processed by Durable Objects for state management
- Responses are streamed using Server-Sent Events (SSE)
- CORS is enabled for web client compatibility
- Error handling includes JSON-RPC error responses
- TypeScript with strict mode enabled

## Transport Protocol

This implementation uses **HTTP Streamable transport** instead of WebSocket:
- More compatible with proxies and firewalls
- Uses standard HTTP semantics
- Supports Server-Sent Events for real-time responses
- Better suited for stateless cloud environments

## License

This is a sample implementation for educational purposes.