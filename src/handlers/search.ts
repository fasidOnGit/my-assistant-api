import type { Context } from 'hono';
import { searchQueriesHybrid } from '@/libs/document/documentProcessor';
import { createPineconeClient } from '@/libs/vectorstore/pinecone';

export async function handleSearch(c: Context<{ Bindings: Cloudflare.Env }>) {
  try {
    const query = c.req.query('q');
    
    if (!query) {
      return c.json({ error: 'Query parameter "q" is required' }, 400);
    }

    const pinecone = createPineconeClient(c.env);
    const results = await searchQueriesHybrid({
      pinecone,
      query,
    });

    return c.json({
      success: true,
      ...results,
    });
  } catch (error) {
    console.error('Error searching:', error);
    return c.json({ 
      error: 'Failed to perform search',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
} 