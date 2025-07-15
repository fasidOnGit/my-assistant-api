import type { Context } from 'hono';
import { embedFiles } from '@/libs/document/documentProcessor';
import type { PersonalInfo } from '@/types';
import { saveUser } from '@/libs/kv/users';

export async function handleProfileIngestion(c: Context<{ Bindings: Cloudflare.Env }>) {
  try {
    const formData = await c.req.formData();
    const files = formData.getAll('files') as File[];
    const personalInfo = JSON.parse(formData.get('personalInfo') as string) as PersonalInfo;

    if (!files || files.length === 0) {
      return c.json({ error: 'No files provided' }, 400);
    }

    console.log('personalInfo', personalInfo);
    console.log('files', files);

    // Save user data to KV
    const kvResult = await saveUser(personalInfo, c.env);
    
    if (!kvResult.success) {
      return c.json({ 
        error: 'Failed to save user data',
        details: kvResult.error
      }, 500);
    }

    // Initialize Pinecone and process files
    const results = await embedFiles({ files, personalInfo, env: c.env });

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
} 