import { OpenAI } from 'openai';
import { configurations } from './configurations';
import { ChatOpenAI } from '@langchain/openai';

export const openaiConfigurations = {
	model: 'gpt-3.5-turbo',
	temperature: 0.2,
	apiGateway: 'https://gateway.ai.cloudflare.com/v1/0c3eee58953174451139be1ea94076a8/stock-predictions/openai',
};

export function createOpenAIClient(env: Cloudflare.Env) {
	return new OpenAI({
		apiKey: env.OPENAI_API_KEY,
		baseURL: openaiConfigurations.apiGateway,
	});
}

export function createOpenAIChatModel(apiKey: string) {
	return new ChatOpenAI({
		apiKey,
		model: openaiConfigurations.model,
		temperature: openaiConfigurations.temperature,
		configuration: {
			baseURL: openaiConfigurations.apiGateway,
		},
	});
}

export async function createEmbedding(text: string, env: Cloudflare.Env): Promise<number[]> {
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