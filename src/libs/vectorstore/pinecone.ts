import { Index, Pinecone } from '@pinecone-database/pinecone';

export function createPineconeClient(env: Cloudflare.Env) {
	return new Pinecone({
		apiKey: env.PINECONE_API_KEY,
		// controllerHostUrl: CLOUDFLARE_AI_GATEWAY_PINCEONE,
	});
}

export type PineconeDocumentMetadata = { userId: string; fileName: string };

export type PineconeDocumentIndex = Index<PineconeDocumentMetadata>;

export function initializePineconeIndex(pinecone: Pinecone, indexName: string = "documents"): PineconeDocumentIndex {
	console.log('Initializing Pinecone index');

	return pinecone.index<PineconeDocumentMetadata>(indexName);
}
