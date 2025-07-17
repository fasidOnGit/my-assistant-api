import { DynamicTool } from '@langchain/core/tools';
import { searchQueriesHybrid } from '../document/documentProcessor';
import { pinecone } from '@/middlewares/globals';

export const tools = [
	new DynamicTool({
		name: 'searchProfessionalDetails',
		description: [
			"Search the user's resume, projects, and background for semantically relevant information.",
			"Example Input: 'challenging project', 'frontend work', or 'healthcare problem' etc..",
		].join('\n'),
		func: async (input: string) => {
			if (!pinecone) {
				throw new Error('Pinecone not initialized');
			}

			const { results } = await searchQueriesHybrid({
				pinecone,
				query: input,
			});

			const contextText = results
				.map((doc) => doc.document?.text)
				.filter(Boolean)
				.join('\n\n');

			return contextText;
		},
	}),
];
