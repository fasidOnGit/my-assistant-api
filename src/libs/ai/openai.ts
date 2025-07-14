import { OpenAI } from 'openai';
import type { Env } from '../../types';
import { configurations } from './configurations';

const OPENAI_BASE_URL = 'https://gateway.ai.cloudflare.com/v1/0c3eee58953174451139be1ea94076a8/stock-predictions/openai';

export function createOpenAIClient(env: Env) {
	return new OpenAI({
		apiKey: env.OPENAI_API_KEY,
		baseURL: OPENAI_BASE_URL,
	});
}

export async function createEmbedding(text: string, env: Env): Promise<number[]> {
	const openai = createOpenAIClient(env);

	const response = await openai.embeddings.create({
		model: configurations.embeddings.model,
		input: text,
		encoding_format: 'float',
	});

	return response.data[0].embedding;
}

// export async function createChatCompletion(messages: OpenAI.Chat.ChatCompletionMessageParam[], env: Env) {
// 	const openai = createOpenAIClient(env);

// 	const response = await openai.chat.completions.create({
// 		model: 'gpt-4o',
// 		messages,
// 		temperature: 0.5,
// 		presence_penalty: 0,
// 		frequency_penalty: 0.5,
// 	});

// 	return response.choices[0].message.content;
// } 