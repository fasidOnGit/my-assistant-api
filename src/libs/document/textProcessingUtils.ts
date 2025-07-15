import { MarkdownTextSplitter, RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { PineconeDocumentMetadata } from '../vectorstore/pinecone';

export interface TextChunkMetadata extends PineconeDocumentMetadata {
	email: string;
	heading?: string;
}

/**
 * Extracts the first line as heading and returns the remaining text
 * @param text - The text to process
 * @returns Object containing heading and remaining text
 */
function extractHeading(text: string): { heading: string; remainingText: string } {
	const lines = text.split('\n');
	const heading = lines[0].trim();
	const remainingText = lines.slice(1).join('\n').trim();
	return { heading, remainingText };
}

/**
 * Creates chunks from text with metadata including headings
 * @param args - Arguments containing text and metadata
 * @returns Array of document chunks with metadata
 */
export async function createDocumentChunks(args: { text: string; metadata: TextChunkMetadata; chunkSize?: number; chunkOverlap?: number }) {
	const { text, metadata, chunkSize = 512, chunkOverlap = 80 } = args;

	// First split by Markdown headers
	const headerSplitter = new MarkdownTextSplitter();
	const headerDocs = await headerSplitter.createDocuments([text], [metadata]);

	// Process each header section
	const textSplitter = new RecursiveCharacterTextSplitter({
		chunkSize,
		chunkOverlap,
	});

	const allChunks = [];
	for (const headerDoc of headerDocs) {
		// Extract heading from the first line of each section
		const { heading, remainingText } = extractHeading(headerDoc.pageContent);

		// Create chunks for this section
		const sectionChunks = await textSplitter.createDocuments(
			[remainingText],
			[
				{
					...headerDoc.metadata,
					heading,
				},
			]
		);
		allChunks.push(...sectionChunks);
	}

	// Format chunks with consistent structure and required Pinecone metadata
	return allChunks.map((doc, i) => ({
		id: `${metadata.userId}-chunk-${i}`,
		chunk_text: doc.pageContent,
		text: doc.pageContent.slice(0, 100),
		chunk: i,
		loc: [String(doc.metadata.loc.lines.from), String(doc.metadata.loc.lines.to)],
		// Include required Pinecone metadata
		userId: metadata.userId,
		fileName: metadata.fileName,
		// Additional metadata
		email: metadata.email,
		heading: doc.metadata.heading,
	}));
}
