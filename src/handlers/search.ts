import { setupAgent } from '@/libs/ai/agent';
import { HumanMessage } from '@langchain/core/messages';
import type { HonoEnv } from '@/types';
import type { Context } from 'hono';

export async function handleSearch(c: Context<HonoEnv>) {
	try {
		const query = c.req.query('q');
		const agent = await setupAgent(c);
		const kvCheckpointSaver = c.get('kvCheckpointSaver');

		if (!query) {
			return c.json({ error: 'Query parameter "q" is required' }, 400);
		}

		const threadId = c.req.header('x-conversation-id') || crypto.randomUUID();
		const response = await agent.invoke(
			{
				messages: [new HumanMessage(query)],
			},
			{
				configurable: {
					thread_id: threadId,
				},
			}
		);

		return c.json({
			success: true,
			results: response.messages.at(-1)?.content,
			threadId,
		});
	} catch (error) {
		console.error('Error searching:', error);
		return c.json(
			{
				error: 'Failed to perform search',
				details: error instanceof Error ? error.message : 'Unknown error',
			},
			500
		);
	}
}
