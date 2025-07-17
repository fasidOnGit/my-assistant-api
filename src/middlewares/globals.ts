import { createOpenAIChatModel } from '@/libs/ai/openai';
import { KVCheckpointSaver } from '@/libs/kv/kvCheckpointSaver';
import { createPineconeClient } from '@/libs/vectorstore/pinecone';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { BaseCheckpointSaver } from '@langchain/langgraph/web';
import { Pinecone } from '@pinecone-database/pinecone';
import type { MiddlewareHandler } from 'hono';

let chatModel: BaseChatModel | null = null;
let kvCheckpointSaver: BaseCheckpointSaver | null = null;
let pinecone: Pinecone | null = null;

export const attachGlobalMiddlewares: MiddlewareHandler = async (c, next) => {
	if (!chatModel) {
		chatModel = createOpenAIChatModel(c.env.OPENAI_API_KEY);
		kvCheckpointSaver = new KVCheckpointSaver(c.env.checkpoints);
		pinecone = createPineconeClient(c.env);
	}

	c.set('chatModel', chatModel);
	c.set('kvCheckpointSaver', kvCheckpointSaver);
	c.set('pinecone', pinecone);
	await next();
};

export { chatModel, kvCheckpointSaver, pinecone };
