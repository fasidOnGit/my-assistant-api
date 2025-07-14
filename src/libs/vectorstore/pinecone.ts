import { Index, Pinecone } from '@pinecone-database/pinecone';
import type { Env } from '../../types';

export function createPineconeClient(env: Env) {
	return new Pinecone({
		apiKey: env.PINECONE_API_KEY,
		controllerHostUrl: 'https://gateway.ai.cloudflare.com/v1/0c3eee58953174451139be1ea94076a8/my-assistant-pinceone-gateway/',
	});
}

export type PineconeDocumentMetadata = { userId: string; fileName: string };

export type PineconeDocumentIndex = Index<PineconeDocumentMetadata>;

export async function initializePineconeIndex(env: Env): Promise<PineconeDocumentIndex> {
	const pinecone = createPineconeClient(env);
	const indexName = 'documents';

	return pinecone.index<PineconeDocumentMetadata>(indexName);
}
