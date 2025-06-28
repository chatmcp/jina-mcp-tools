#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fetch from "node-fetch";

// Get Jina API key from environment (optional)
const getJinaApiKey = () => {
  return process.env.JINA_API_KEY || null;
};

// Helper to create headers with or without API key
const createHeaders = (baseHeaders = {}) => {
  const headers = { ...baseHeaders };
  const apiKey = getJinaApiKey();
  
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }
  
  return headers;
};

// Create MCP server for Jina AI tools
const server = new McpServer({
  name: "jina-mcp-tools",
  version: "1.0.4",
  description: "Jina AI tools for web reading, search, and fact-checking"
});

// WEB READER TOOL
server.tool(
  "jina_reader",
  "Read and extract content from web pages using Jina AI's powerful web reader",
  {
    url: z.string().url().describe("URL of the webpage to read and extract content from"),
    format: z.enum(["Default", "Markdown", "HTML", "Text", "Screenshot", "Pageshot"])
      .optional()
      .default("Default")
      .describe(`Output format for the extracted content:
        • Default (RECOMMENDED): The default pipeline optimized for most websites and LLM input
        • Markdown: Returns the markdown directly from the HTML, bypassing the readability filtering
        • HTML: Returns documentElement.outerHTML
        • Text: Returns document.body.innerText
        • Screenshot: Returns the image URL of the first screen
        • Pageshot: Enhanced screenshot with additional metadata`),
    withLinks: z.boolean()
      .optional()
      .default(false)
      .describe("Include links in the extracted content"),
    withImages: z.boolean()
      .optional()
      .default(false)
      .describe("Include images in the extracted content")
  },
  async ({ url, format, withLinks, withImages }) => {
    try {
      const headers = createHeaders({
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-With-Links-Summary": withLinks ? "true" : "false",
        "X-With-Images-Summary": withImages ? "true" : "false",
        "X-Return-Format": format.toLowerCase()
      });

      const response = await fetch("https://r.jina.ai/", {
        method: "POST",
        headers,
        body: JSON.stringify({ url })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Jina Reader API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      return {
        content: [{ 
          type: "text", 
          text: data.data && data.data.content ? data.data.content : JSON.stringify(data, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{ 
          type: "text", 
          text: `Error: ${error.message}`
        }],
        isError: true
      };
    }
  }
);

// SEARCH TOOL
server.tool(
  "jina_search",
  "Search the web for information using Jina AI's semantic search engine",
  {
    query: z.string().nonempty().describe("Search query to find information on the web"),
    count: z.number()
      .optional()
      .default(5)
      .describe("Number of search results to return"),
    returnFormat: z.enum(["markdown", "text", "html"])
      .optional()
      .default("markdown")
      .describe("Format of the returned search results")
  },
  async ({ query, count, returnFormat }) => {
    try {
      const encodedQuery = encodeURIComponent(query);
      const headers = createHeaders({
        "Accept": "application/json",
        "X-Respond-With": "no-content"
      });

      const response = await fetch(`https://s.jina.ai/?q=${encodedQuery}`, {
        method: "GET",
        headers
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Jina Search API error (${response.status}): ${errorText}`);
      }

      const text = await response.text();
      
      // Parse the JSON response
      const data = JSON.parse(text);
      
      // Extract just the search results
      let results = data.data || [];
      
      // Limit to the requested count
      if (count && count > 0 && results.length > count) {
        results = results.slice(0, count);
      }
      
      // Clean up the results to remove unnecessary token information
      results = results.map(result => {
        // Remove the usage information
        if (result.usage) {
          delete result.usage;
        }
        return result;
      });
      
      // Format the output based on returnFormat
      let formattedOutput;
      if (returnFormat === 'markdown') {
        formattedOutput = results.map((result, index) => {
          return `${index + 1}. **${result.title || 'Untitled'}**\n   ${result.url || ''}\n   ${result.description || ''}\n   ${result.date ? `Date: ${result.date}` : ''}\n`;
        }).join('\n');
      } else if (returnFormat === 'html') {
        formattedOutput = `<ol>${results.map(result => 
          `<li><strong>${result.title || 'Untitled'}</strong><br>
           <a href="${result.url || ''}">${result.url || ''}</a><br>
           ${result.description || ''}<br>
           ${result.date ? `Date: ${result.date}` : ''}</li>`
        ).join('')}</ol>`;
      } else {
        // Default to text format
        formattedOutput = results.map((result, index) => {
          return `${index + 1}. ${result.title || 'Untitled'}\n   ${result.url || ''}\n   ${result.description || ''}\n   ${result.date ? `Date: ${result.date}` : ''}`;
        }).join('\n\n');
      }
      
      return {
        content: [{ 
          type: "text", 
          text: formattedOutput
        }]
      };
    } catch (error) {
      return {
        content: [{ 
          type: "text", 
          text: `Error: ${error.message}`
        }],
        isError: true
      };
    }
  }
);

// FACT-CHECK TOOL
server.tool(
  "jina_fact_check",
  "Verify the factuality of statements using Jina AI's fact-checking capability",
  {
    statement: z.string().nonempty().describe("Statement to fact-check for accuracy"),
    deepdive: z.boolean()
      .optional()
      .default(false)
      .describe("Enable deep analysis with more comprehensive research")
  },
  async ({ statement, deepdive }) => {
    try {
      const headers = createHeaders({
        "Content-Type": "application/json",
        "Accept": "application/json"
      });

      const response = await fetch("https://g.jina.ai/", {
        method: "POST",
        headers,
        body: JSON.stringify({ 
          statement,
          deepdive
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Jina Fact-Check API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      return {
        content: [{ 
          type: "text", 
          text: JSON.stringify(data, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{ 
          type: "text", 
          text: `Error: ${error.message}`
        }],
        isError: true
      };
    }
  }
);

// Main function to start the server
async function main() {
  try {
    // Check for API key (now optional)
    const apiKey = getJinaApiKey();
    if (apiKey) {
      console.error(`Jina AI API key found with length ${apiKey.length}`);
      if (apiKey.length < 10) {
        console.warn("Warning: JINA_API_KEY seems too short. Please verify your API key.");
      }
    } else {
      console.error("No Jina AI API key found. Some features may be limited.");
    }

    // Connect the server to stdio transport
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
  } catch (error) {
    console.error("Server error:", error);
    process.exit(1);
  }
}

// Execute the main function
main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
