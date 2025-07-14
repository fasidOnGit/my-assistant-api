import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { PineconeDocumentIndex } from '../vectorstore/pinecone';

const CHUNK_SIZE = 500;
const CHUNK_OVERLAP = 80;

export async function processTextFile(
	pineconeIndex: PineconeDocumentIndex,
	args: {
		userId: string;
		fileName: string;
		content: string;
	}
) {
	const { userId, fileName, content } = args;

	// Create text splitter
	const textSplitter = new RecursiveCharacterTextSplitter({
		chunkSize: CHUNK_SIZE,
		chunkOverlap: CHUNK_OVERLAP,
	});

	// Split text into chunks
	const docs = await textSplitter.createDocuments(
		[content],
		[
			{
				fileName,
				userId,
			},
		]
	);

	// Prepare documents for Pinecone
	const vectors = docs.map((doc, i) => ({
		id: `${fileName}-chunk-${i}`,
		chunk_text: doc.pageContent,
        ...doc.metadata,
		chunk: i,
		content: doc.pageContent.slice(0, 100), // Content preview for better debugging
		fileName,
		userId,
	}));

	// Upsert vectors in batches
	const BATCH_SIZE = 100;
	for (let i = 0; i < vectors.length; i += BATCH_SIZE) {
		const batch = vectors.slice(i, i + BATCH_SIZE);
		await pineconeIndex.upsertRecords(batch);
	}

	return vectors.length;
}
