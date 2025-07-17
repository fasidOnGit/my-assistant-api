import { BaseCheckpointSaver, type Checkpoint, type CheckpointMetadata, type CheckpointTuple } from '@langchain/langgraph-checkpoint';
import type { RunnableConfig } from '@langchain/core/runnables';

interface CheckpointValue {
    data: {
        checkpoint: Checkpoint;
        metadata: CheckpointMetadata;
    };
    sequence: number;
}

export class KVCheckpointSaver extends BaseCheckpointSaver<number> {
    constructor(private kv: KVNamespace, private prefix = 'checkpoint:') {
        super();
    }

    private getKey(threadId: string, timestamp?: string): string {
        const key = `${this.prefix}${threadId}`;
        return timestamp ? `${key}:${timestamp}` : key;
    }

    private getThreadId(config: RunnableConfig): string {
        return config.configurable?.thread_id as string;
    }

    private getThreadTs(config: RunnableConfig): string | undefined {
        return config.configurable?.thread_ts as string | undefined;
    }

    async put(
        config: RunnableConfig,
        checkpoint: Checkpoint,
        metadata: CheckpointMetadata
    ): Promise<RunnableConfig> {
        const threadId = this.getThreadId(config);
        if (!threadId) return config;

        const data: CheckpointValue = {
            data: {
                checkpoint,
                metadata
            },
            sequence: Date.now()
        };

        // Store the checkpoint with timestamp as part of the key for ordering
        const key = this.getKey(threadId, checkpoint.ts);
        await this.kv.put(key, JSON.stringify(data));

        // Also update the latest pointer
        const latestKey = this.getKey(threadId, 'latest');
        await this.kv.put(latestKey, key);

        return {
            ...config,
            configurable: {
                ...config.configurable,
                thread_ts: checkpoint.ts
            }
        };
    }

    async getTuple(config: RunnableConfig): Promise<CheckpointTuple | undefined> {
        const threadId = this.getThreadId(config);
        const threadTs = this.getThreadTs(config);
        if (!threadId) return undefined;

        let checkpointKey: string | null = null;

        if (threadTs) {
            // Get specific checkpoint
            checkpointKey = this.getKey(threadId, threadTs);
        } else {
            // Get latest checkpoint key
            const latestKey = this.getKey(threadId, 'latest');
            checkpointKey = await this.kv.get(latestKey);
        }

        if (!checkpointKey) return undefined;

        const raw = await this.kv.get(checkpointKey);
        if (!raw) return undefined;

        const parsed: CheckpointValue = JSON.parse(raw);
        return {
            config,
            checkpoint: parsed.data.checkpoint,
            metadata: parsed.data.metadata
        };
    }

    async *list(
        config: RunnableConfig
    ): AsyncGenerator<CheckpointTuple> {
        const threadId = this.getThreadId(config);
        if (!threadId) return;

        const list = await this.kv.list({ prefix: this.getKey(threadId) });
        const checkpoints = await Promise.all(
            list.keys
                .filter(key => !key.name.endsWith(':latest')) // Skip latest pointers
                .map(async (key) => {
                    const raw = await this.kv.get(key.name);
                    if (!raw) return null;
                    const parsed: CheckpointValue = JSON.parse(raw);
                    return {
                        config: {
                            ...config,
                            configurable: {
                                ...config.configurable,
                                thread_ts: parsed.data.checkpoint.ts
                            }
                        },
                        checkpoint: parsed.data.checkpoint,
                        metadata: parsed.data.metadata
                    };
                })
        );

        // Sort by sequence number
        const sortedCheckpoints = checkpoints
            .filter((c): c is NonNullable<typeof c> => c !== null)
            .sort((a, b) => {
                const seqA = (a.metadata as any).sequence || 0;
                const seqB = (b.metadata as any).sequence || 0;
                return seqA - seqB;
            });

        for (const checkpoint of sortedCheckpoints) {
            yield checkpoint;
        }
    }

    async putWrites(): Promise<void> {
        // Cloudflare KV doesn't require batching writes
        return;
    }
}
