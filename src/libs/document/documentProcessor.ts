import { MarkdownTextSplitter, RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { createPineconeClient, initializePineconeIndex, PineconeDocumentIndex } from '../vectorstore/pinecone';
import { PersonalInfo } from '@/types';
import { Pinecone } from '@pinecone-database/pinecone';
import { uniqBy } from 'lodash-es';

const CHUNK_SIZE = 512;
const CHUNK_OVERLAP = 80;
const BATCH_SIZE = 100;

export async function createChunks(args: { userId: string; fileName: string; text: string; email: string }) {
	const { userId, fileName, text, email } = args;

	// First split by Markdown headers
	const headerSplitter = new MarkdownTextSplitter();
	const headerDocs = await headerSplitter.createDocuments(
		[text],
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
		text: doc.pageContent.slice(0, 100),
		fileName,
		userId,
		email,
	}));
}

export async function processTextFile(
	args: {
		sparseIndex: PineconeDocumentIndex;
		denseIndex: PineconeDocumentIndex;
		userId: string;
		fileName: string;
		text: string;
		email: string;
	}
) {
	const { sparseIndex, denseIndex, userId, fileName, text, email } = args;

	// Create chunks from the text
	const chunks = await createChunks({ userId, fileName, text, email });

	// Upsert chunks to both indexes in batches
	for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
		const batch = chunks.slice(i, i + BATCH_SIZE);
		await Promise.all([
			sparseIndex.upsertRecords(batch),
			denseIndex.upsertRecords(batch)
		]);
	}

	return chunks.length;
}

export async function procesTextHybrid(params: {
	pineconeIndex: PineconeDocumentIndex;
	pinecone: Pinecone;
	userId: string;
	fileName: string;
	text: string;
	email: string;
}) {
	const { pineconeIndex, pinecone, userId, fileName, text, email } = params;

	const chunks = await createChunks({ userId, fileName, text, email });

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

	// Initialize Pinecone client
	const pinecone = createPineconeClient(env);
	
	// Initialize indexes and clear existing data
	const sparseIndex = initializePineconeIndex(pinecone, 'documents-sparse');
	const denseIndex = initializePineconeIndex(pinecone, 'documents');
	await Promise.all([sparseIndex.deleteAll(), denseIndex.deleteAll()]);

	// Process each file
	return await Promise.all(
		files.map(async (file) => {
			console.log('Processing file', file.name);
			const text = await file.text();
			const chunksCount = await processTextFile({
				sparseIndex,
				denseIndex,
				fileName: file.name,
				text,
				userId: personalInfo.email,
				email: personalInfo.email,
			});

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
	console.log("Searching sparse index")

	console.log(
		await denseIndex.searchRecords({
			query: {
				inputs: { text: query },
				topK: 20,
			},
		})
	);

	console.log("Searching dense index")


	const [sparseResults, denseResults] = await Promise.all([
		sparseIndex.searchRecords({
			query: {
				inputs: { text: query },
				topK: 20,
			},
		}),
		denseIndex.searchRecords({
			query: {
				inputs: { text: query },
				topK: 20,
			},
		}),
	]);

	// Deduplicate results based on id using uniqBy
	const merged = uniqBy([...denseResults.result.hits, ...sparseResults.result.hits], '_id');
	const reranked = await pinecone.inference.rerank(
		"bge-reranker-v2-m3",
		query,
		merged.map((hit) => hit.chunk_text),
		{
			returnDocuments: true,
			topN: 20,
		}
	);

	reranked.data
	return {
		results: reranked.data,
		sparseResults,
		denseResults,
	};
}
