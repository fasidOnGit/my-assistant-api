# My Assistant API

A TypeScript-based API service that powers an AI assistant capable of processing documents, handling profile information, and providing intelligent search capabilities.

## Features

- 🤖 AI-powered document processing and analysis
- 📝 Profile ingestion and management
- 🔍 Vector-based semantic search using Pinecone
- 📚 Document chunking and processing utilities
- ⚡ Built with TypeScript and modern cloud technologies

## Tech Stack

- **Language**: TypeScript
- **AI Integration**: LangChain, OpenAI
- **Vector Store**: Pinecone
- **Development**: 
  - Vitest for testing
  - ESLint for code quality
  - Cloudflare Workers for deployment

## Project Structure

```
my-assistant-api/
├── src/                    # Source code
│   ├── handlers/          # Request handlers
│   ├── libs/              # Core libraries
│   │   ├── ai/           # AI/LLM integrations
│   │   ├── document/     # Document processing
│   │   ├── kv/           # Key-value storage
│   │   └── vectorstore/  # Vector database integration
│   └── types.ts          # Type definitions
├── test/                  # Test files
└── assets/               # Static assets and documents
```

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   - Configure your Cloudflare Worker secrets
   - Set up OpenAI API keys
   - Configure Pinecone environment

3. Run tests:
   ```bash
   npm test
   ```

4. Start development:
   ```bash
   npm run dev
   ```

## Key Components

- **Document Processing**: Handles document chunking, summarization, and metadata extraction
- **Profile Ingestion**: Manages user profile data and related information
- **Search**: Implements semantic search capabilities using vector embeddings
- **AI Integration**: Provides LLM-powered features through OpenAI and LangChain

## Development

The project follows TypeScript best practices and includes:
- Strong typing with TypeScript
- Unit tests with Vitest
- ESLint configuration for code quality
- Cloudflare Workers for serverless deployment

## License

MIT 