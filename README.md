# Cloudflare Remote MCP Server

A Model Context Protocol (MCP) server implementation running on Cloudflare Workers with Durable Objects.

## Features

- **Remote MCP Server**: WebSocket-based MCP server accessible over the internet
- **Durable Objects**: Stateful connections using Cloudflare Durable Objects
- **Sample Tools**: Demonstration tools for MCP protocol
- **Sample Resources**: Static data resources accessible via MCP
- **Sample Prompts**: Pre-built prompts for AI interactions
- **CORS Support**: Web-friendly with Cross-Origin Resource Sharing

## Architecture

```
┌─────────────────┐    WebSocket     ┌──────────────────┐
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
                                     │ • WebSocket Mgmt │
                                     │ • Session State  │
                                     └──────────────────┘
```

## Available Capabilities

### Tools
- **echo**: Echo back input text
- **get_time**: Get current timestamp
- **random_number**: Generate random number between min and max

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
   
   # WebSocket endpoint (requires WebSocket client)
   # Connect to: ws://localhost:8787/ws
   ```

## Usage

### HTTP API
- `GET /` - Server information and capabilities
- `GET /ws` - WebSocket endpoint info (returns 426 Upgrade Required)

### MCP Connection
Connect MCP clients to the WebSocket endpoint:
- **Local**: `ws://localhost:8787/ws`
- **Production**: `wss://your-worker.your-subdomain.workers.dev/ws`

### Example MCP Messages

#### List Tools
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list"
}
```

#### Call Tool
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "echo",
    "arguments": {
      "text": "Hello, MCP!"
    }
  }
}
```

#### List Resources
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "resources/list"
}
```

## Configuration

The server is configured in `wrangler.jsonc`:
- **Durable Objects**: `MCPServerObject` handles stateful WebSocket connections
- **Compatibility Date**: Set to current date for latest Cloudflare Workers features

## Development Notes

- Uses `@modelcontextprotocol/sdk` for MCP protocol implementation
- WebSocket connections are managed by Durable Objects for state persistence
- CORS is enabled for web client compatibility
- Error handling includes JSON-RPC error responses
- TypeScript with strict mode enabled

## License

This is a sample implementation for educational purposes.