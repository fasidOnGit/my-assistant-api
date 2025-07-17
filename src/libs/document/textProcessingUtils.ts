import { MarkdownTextSplitter, RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { PineconeDocumentMetadata } from '../vectorstore/pinecone';
import { createChatModel, simpleChatCompletion } from '../ai/langchain';

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
export async function createDocumentChunks(args: {
	text: string;
	metadata: TextChunkMetadata;
	chunkSize?: number;
	chunkOverlap?: number;
	documentSummary?: string;
}) {
	const { text, metadata, chunkSize = 1024, chunkOverlap = 100, documentSummary } = args;

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
					documentSummary,
				},
			]
		);
		allChunks.push(...sectionChunks);
	}

	// Format chunks with consistent structure and required Pinecone metadata
	return allChunks.map((doc, i) => ({
		id: `${metadata.userId}-chunk-${i}`,
		chunk_text: formatChunkWithContext({
			chunk_text: doc.pageContent,
			summary: documentSummary,
			heading: doc.metadata.heading || 'No heading',
		}),
		text: doc.pageContent.slice(0, 100),
		chunk: i,
		loc: [String(doc.metadata.loc.lines.from), String(doc.metadata.loc.lines.to)],
		// Include required Pinecone metadata
		userId: metadata.userId,
		fileName: metadata.fileName,
		// Additional metadata
		email: metadata.email,
		heading: doc.metadata.heading,
		documentSummary: doc.metadata.documentSummary,
	}));
}

interface ChunkFormatOptions {
	chunk_text: string;
	summary?: string;
	heading: string;
}

/**
 * Formats a chunk with summary and heading for better context retrieval
 * @param options - The chunk text, summary and heading
 * @returns Formatted chunk text with summary and heading
 */
export function formatChunkWithContext(options: ChunkFormatOptions): string {
	const { chunk_text, summary, heading } = options;
	const lines = [
		summary ? `Summary: ${summary.trim()}` : null,
		heading ? `Heading: ${heading.trim()}` : null,
		'',
		chunk_text.trim(),
	].filter(Boolean);
	return lines.join('\n');
}

/**
 * Updates a document chunk with formatted context
 * @param chunk - The original chunk with metadata
 * @param summary - Summary of the entire document
 * @returns Updated chunk with formatted pageContent
 */
export function enhanceChunkWithContext(chunk: { chunk_text: string; heading?: string }, summary: string): { chunk_text: string } {
	return {
		...chunk,
		chunk_text: formatChunkWithContext({
			chunk_text: chunk.chunk_text,
			summary,
			heading: chunk.heading || 'No heading',
		}),
	};
}

export async function summarizeDocument(args: { env: Cloudflare.Env; text: string }) {
	const { env, text } = args;
	return simpleChatCompletion({
		env,
		systemPrompt: 'You are a helpful assistant that summarizes documents.',
		userMessage:
			'Summarize this document in 1-2 sentences. Be factual and specific about what kind of document this is (e.g., resume, project description, research notes), and what it generally covers:\n\n' +
			text,
		options: { temperature: 0.3 },
	});
}
