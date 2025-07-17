import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { PromptTemplate } from '@langchain/core/prompts';
import type { Tool } from '@langchain/core/tools';
import { type BaseCheckpointSaver } from '@langchain/langgraph-checkpoint';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { pull } from 'langchain/hub';
import { prompts } from '../templates/prompts';
import type { Context } from 'hono';
import type { HonoEnv } from '@/types';
import { getUser } from '../kv/users';
import { tools } from './tools';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BuildReActAgentArgs {
	systemPrompt: string;
	tools?: Tool[];
	llm: BaseChatModel;
	checkpointSaver?: BaseCheckpointSaver | boolean;
	staticMemory?: string;
}

export type ReActAgent = ReturnType<typeof createReactAgent>;

export async function buildReActAgent(args: BuildReActAgentArgs): Promise<ReActAgent> {
	const { tools: providedTools = [], llm, checkpointSaver = true, staticMemory } = args;

	const agent = createReactAgent({
		llm,
		tools: providedTools,
		stateModifier: staticMemory ? `Here is the user's personal information: ${staticMemory}\n\n` : undefined,
		checkpointSaver,
	});

	return agent;
}

export async function setupAgent(c: Context<HonoEnv>) {
	const chatModel = c.get('chatModel');
	const kvCheckpointSaver = c.get('kvCheckpointSaver');

	const personalInfo = await getUser('fasidmpm@gmail.com', c.env);

	console.log('Personal Info', personalInfo);

	if (!chatModel || !kvCheckpointSaver) {
		throw new Error('LLM or checkpoint saver not initialized');
	}

	if (!personalInfo.success) {
		throw new Error('Personal info not found');
	}

	return buildReActAgent({
		systemPrompt: prompts.systemPrompt,
		llm: chatModel,
		checkpointSaver: kvCheckpointSaver,
		staticMemory: JSON.stringify(personalInfo.data),
		tools: tools,
	});
}

export type { BuildReActAgentArgs };
