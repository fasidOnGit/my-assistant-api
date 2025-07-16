import { ChatOpenAI } from '@langchain/openai';
import { BaseMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { RunnableSequence } from '@langchain/core/runnables';
import { PromptTemplate } from '@langchain/core/prompts';
import { configurations } from './configurations';

interface ChatOptions {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
}

interface CreateChatModelArgs {
    env: Cloudflare.Env;
    options?: ChatOptions;
}

/**
 * Creates a LangChain ChatOpenAI instance with custom configuration
 */
export function createChatModel(args: CreateChatModelArgs) {
    const { env, options = {} } = args;
    return new ChatOpenAI({
        openAIApiKey: env.OPENAI_API_KEY,
        modelName: 'gpt-3.5-turbo',
        temperature: options.temperature ?? 0.7,
        maxTokens: options.maxTokens,
        topP: options.topP ?? 1,
        frequencyPenalty: options.frequencyPenalty ?? 0,
        presencePenalty: options.presencePenalty ?? 0,
        configuration: {
            baseURL: configurations.baseUrl,
        },
    });
}

interface CreateChatChainArgs {
    env: Cloudflare.Env;
    systemPrompt: string;
    humanTemplate: string;
    options?: ChatOptions;
}

/**
 * Creates a chat chain with system message and human template
 */
export function createChatChain(args: CreateChatChainArgs) {
    const { env, systemPrompt, humanTemplate, options } = args;
    const chat = createChatModel({ env, options });
    const prompt = PromptTemplate.fromTemplate(humanTemplate);

    return RunnableSequence.from([
        {
            system: () => new SystemMessage(systemPrompt),
            human: (input: any) => prompt.format(input).then(result => new HumanMessage(result)),
        },
        chat,
        new StringOutputParser(),
    ]);
}

interface SendChatMessageArgs {
    env: Cloudflare.Env;
    messages: BaseMessage[];
    options?: ChatOptions;
}

/**
 * Sends a chat message with history
 */
export async function sendChatMessage(args: SendChatMessageArgs) {
    const { env, messages, options } = args;
    const chat = createChatModel({ env, options });
    const response = await chat.invoke(messages);
    return response.content;
}

interface SimpleChatCompletionArgs {
    env: Cloudflare.Env;
    systemPrompt: string;
    userMessage: string;
    options?: ChatOptions;
}

/**
 * Helper to create a simple chat completion
 */
export async function simpleChatCompletion(args: SimpleChatCompletionArgs) {
    const { env, systemPrompt, userMessage, options } = args;
    const messages: BaseMessage[] = [
        new SystemMessage(systemPrompt),
        new HumanMessage(userMessage),
    ];
    return sendChatMessage({ env, messages, options });
} 