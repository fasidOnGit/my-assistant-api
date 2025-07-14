export const configurations = {
	baseUrl: 'https://gateway.ai.cloudflare.com/v1/0c3eee58953174451139be1ea94076a8/stock-predictions/openai',
    embeddings: {
        model: 'text-embedding-3-large',
        embedding_dimensions: 3072,
    }
} as const;