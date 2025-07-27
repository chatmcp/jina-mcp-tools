# Jina AI MCP Tools

A Model Context Protocol (MCP) server that integrates with [Jina AI Search Foundation APIs](https://docs.jina.ai/).

## Features

This MCP server provides access to the following Jina AI APIs:

- **Web Reader** - Extract content from web pages using r.jina.ai
- **Web Search** - Search the web using s.jina.ai

## Prerequisites

1. **Jina AI API Key** (Optional) - Get a free API key from [https://jina.ai/?sui=apikey](https://jina.ai/?sui=apikey) for enhanced features
2. **Node.js** - Version 16 or higher


## MCP Server

```json
{
  "mcpServers": {
    "jina-mcp-tools": {
      "command": "npx",
      "args": ["jina-mcp-tools"],
      "env": {
        "JINA_API_KEY": "your_jina_api_key_here_optional"
      }
    }
  }
}
```

## Available Tools

### jina_reader

Extract content from a webpage in a format optimized for LLMs. Supports GitHub file URLs with direct access.

```json
{
  "name": "jina_reader",
  "arguments": {
    "url": "https://example.com",
    "mode": "standard",
    "format": "default",
    "customTimeout": 10
  }
}
```

**Extraction Modes:**
- `"standard"` - Balanced speed and quality (direct engine, links summary)
- `"comprehensive"` - Maximum data extraction (browser engine, links + images)
- `"clean_content"` - Remove ads, navigation, noise (CSS selectors)

**Output Formats:**
- `"default"` - Jina API's native markdown format
- `"markdown"` - Structured markdown with headers and links
- `"text"` - Plain text only, fastest processing
- `"structured"` - Rich metadata with links and images

**GitHub Support:**
GitHub file URLs (e.g., `github.com/owner/repo/blob/main/file.js`) are automatically detected and converted to raw content URLs for direct access, bypassing Jina reader for optimal performance.

### jina_search

Search the web for information. Returns partial content; use jina_reader for full page content.

```json
{
  "name": "jina_search",
  "arguments": {
    "query": "How does quantum computing work?",
    "count": 5,
    "siteFilter": "github.com"
  }
}
```

**Parameters:**
- `query` - Search query string
- `count` - Number of search results (default: 5)
- `siteFilter` - Limit search to specific domain (e.g., "github.com")


## License

MIT

## Links

- GitHub: [https://github.com/PsychArch/jina-mcp-tools](https://github.com/PsychArch/jina-mcp-tools)
- Issues: [https://github.com/PsychArch/jina-mcp-tools/issues](https://github.com/PsychArch/jina-mcp-tools/issues) 
