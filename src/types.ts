import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { BaseCheckpointSaver } from '@langchain/langgraph/web';
import { Pinecone } from '@pinecone-database/pinecone';

type HonoEnv = {
	Bindings: Cloudflare.Env;
	Variables: {
		chatModel: BaseChatModel;
		kvCheckpointSaver: BaseCheckpointSaver;
		pinecone: Pinecone;
	};
};

export type { HonoEnv };

export interface PersonalInfo {
	name: string;
	title: string[];
	email: string;
	phone: string;
	location: string;
	linkedin?: string;
	github?: string;
	kaggle?: string;
	education: {
		institution: string;
		degree: string;
		years: string;
	};
}

export interface Document {
	id: number;
	created_at: string;
	text: string;
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
