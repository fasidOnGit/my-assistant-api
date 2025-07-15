import { MarkdownTextSplitter, RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { createPineconeClient, initializePineconeIndex, PineconeDocumentIndex } from '../vectorstore/pinecone';
import { PersonalInfo } from '@/types';
import { Pinecone } from '@pinecone-database/pinecone';
import { uniqBy } from 'lodash-es';

const CHUNK_SIZE = 500;
const CHUNK_OVERLAP = 80;
const BATCH_SIZE = 100;

export async function createChunks(args: { userId: string; fileName: string; content: string; email: string }) {
	const { userId, fileName, content, email } = args;

	// First split by Markdown headers
	const headerSplitter = new MarkdownTextSplitter();
	const headerDocs = await headerSplitter.createDocuments(
		[content],
		[
			{
				fileName,
				userId,
				email,
			},
		]
	);

	// Then split each header section with RecursiveCharacterTextSplitter
	const textSplitter = new RecursiveCharacterTextSplitter({
		chunkSize: CHUNK_SIZE,
		chunkOverlap: CHUNK_OVERLAP,
	});

	const allChunks = [];
	for (const headerDoc of headerDocs) {
		const sectionChunks = await textSplitter.createDocuments(
			[headerDoc.pageContent],
			[
				{
					...headerDoc.metadata,
					fileName,
					userId,
					email,
				},
			]
		);
		allChunks.push(...sectionChunks);
	}

	return allChunks.map((doc, i) => ({
		id: `${userId}-chunk-${i}`,
		chunk_text: doc.pageContent,
		...doc.metadata,
		loc: [String(doc.metadata.loc.lines.from), String(doc.metadata.loc.lines.to)],
		chunk: i,
		content: doc.pageContent.slice(0, 100),
		fileName,
		userId,
		email,
	}));
}

export async function processTextFile(
	pineconeIndex: PineconeDocumentIndex,
	args: {
		userId: string;
		fileName: string;
		content: string;
		email: string;
	}
) {
	const { userId, fileName, content, email } = args;

	// First split by Markdown headers
	const chunked = await createChunks({ userId, fileName, content, email });

	for (let i = 0; i < chunked.length; i += BATCH_SIZE) {
		const batch = chunked.slice(i, i + BATCH_SIZE);
		console.log('Upserting batch', batch);
		await pineconeIndex.upsertRecords(batch);
		console.log('Batch upserted', batch);
	}

	return chunked.length;
}

export async function procesTextHybrid(params: {
	pineconeIndex: PineconeDocumentIndex;
	pinecone: Pinecone;
	userId: string;
	fileName: string;
	content: string;
	email: string;
}) {
	const { pineconeIndex, pinecone, userId, fileName, content, email } = params;

	const chunks = await createChunks({ userId, fileName, content, email });

	const chunkTexts = chunks.map((chunk) => chunk.chunk_text);

	const sparseVectorEmbedding = await pinecone.inference.embed(
		// 'llama-text-embed-v2',
		'pinecone-sparse-english-v0',
		chunkTexts,
		{
			inputType: 'passage',
			truncate: 'END',
		}
	);

	const denseVectorEmbedding = await pinecone.inference.embed('llama-text-embed-v2', chunkTexts, {
		userId,
		fileName,
		email,
	});
	// pinecone.index("documents-sparse").upsert(sparseVectorEmbedding.data.map((data) => ({
	// 	id: data.id,
	// 	values: data.values,
	// 	metadata: {
	// 		userId,
	// 	}
	// })));
}

export async function embedFiles(args: { files: File[]; personalInfo: PersonalInfo; env: Cloudflare.Env }) {
	const { files, personalInfo, env } = args;

	// Initialize Pinecone and process files
	const pinecone = createPineconeClient(env);
	const sparseIndex = initializePineconeIndex(pinecone, 'documents-sparse');
	const denseIndex = initializePineconeIndex(pinecone, 'documents');
	await Promise.all([sparseIndex.deleteAll(), denseIndex.deleteAll()]);

	return await Promise.all(
		files.map(async (file) => {
			console.log('Processing file', file.name);
			const content = await file.text();
			const [chunksCount] = await Promise.all(
				[sparseIndex, denseIndex].map(
					async (index) =>
						await processTextFile(index, {
							fileName: file.name,
							content,
							userId: personalInfo.email,
							email: personalInfo.email,
						})
				)
			);
			return {
				fileName: file.name,
				chunksProcessed: chunksCount,
			};
		})
	);
}

export async function searchQueriesHybrid(params: { pinecone: Pinecone; query: string }) {
	const { pinecone, query } = params;

	const sparseIndex = initializePineconeIndex(pinecone, 'documents-sparse');
	const denseIndex = initializePineconeIndex(pinecone, 'documents');

	const [sparseResults, denseResults] = await Promise.all([
		sparseIndex.searchRecords({
			query: {
				inputs: { content: query },
				topK: 20,
			},
		}),
		denseIndex.searchRecords({
			query: {
				inputs: { content: query },
				topK: 20,
			},
		}),
	]);

	// Deduplicate results based on id using uniqBy
	const merged = uniqBy([...sparseResults.result.hits, ...denseResults.result.hits], 'id');
	pinecone.inference.rerank(
		"bge-reranker-v2-m3",
		query,
		merged.map((hit) => hit.content),
		{
			returnDocuments: true,
			rankFields: ['content'],
			topN: 20,
		}
	);

	return {
		sparseResults,
		denseResults,
	};
}
