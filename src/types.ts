export interface Env {
	OPENAI_API_KEY: string;
	SUPABASE_URL: string;
	SUPABASE_ANON_KEY: string;
	PINECONE_API_KEY: string;
}

export interface Document {
	id: number;
	created_at: string;
	content: string;
	embedding: number[];
	similarity?: number;
}

export type CreateDocument = Omit<Document, 'id' | 'created_at'>;

export interface DocumentSearchResult extends Document {
	similarity: number;
}

export type DocumentSearchResults = DocumentSearchResult[];

export interface SearchOptions {
	match_threshold?: number;
	match_count?: number;
}