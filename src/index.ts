import { Hono } from 'hono';
import type { Context } from 'hono';
import { cors } from './libs/cors';
import { initializePineconeIndex } from './libs/vectorstore/pinecone';
import { processTextFile } from './libs/document/documentProcessor';
import type { Env } from './types';

const app = new Hono<{ Bindings: Env }>();

app.use('*', cors);

app.post('/ingest-profile', async (c: Context<{ Bindings: Env }>) => {
  try {
    const formData = await c.req.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return c.json({ error: 'No files provided' }, 400);
    }

    // Initialize Pinecone
    const pineconeIndex = await initializePineconeIndex(c.env);
    
    const results = await Promise.all(
      files.map(async (file) => {
        const content = await file.text();
        const chunksCount = await processTextFile(
          pineconeIndex,
		  {
			fileName: file.name,
			content,
			userId: 'me',
		  }
        );
        return {
          fileName: file.name,
          chunksProcessed: chunksCount,
        };
      })
    );

    return c.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error('Error processing files:', error);
    return c.json({ 
      error: 'Failed to process files',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

export default app;
