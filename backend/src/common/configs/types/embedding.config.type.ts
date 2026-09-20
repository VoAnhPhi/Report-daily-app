export type EmbeddingConfigType = {
  /** acta-net DNS of the sidecar, e.g. http://acta-embeddings:3006 (not public). */
  serviceUrl: string;
  /** Shared-secret X-header value; empty when not yet provisioned (call-time fail-closed). */
  sharedSecret: string;
  /** Model id served by the sidecar, e.g. Qwen/Qwen3-Embedding-4B. */
  modelId: string;
  /** Output dimension (MRL-truncated), e.g. 1024. */
  dim: number;
  /**
   * Optional TEI `dimensions` request value. null/0 → omit it (native-1024
   * models like e5). Set to 1024 for a Matryoshka model that must be truncated
   * (Qwen3-4B native 2560 → 1024). Env `EMBEDDING_REQUEST_DIMENSIONS`.
   */
  requestDimensions: number | null;
  /** Per-request timeout in ms for the /embed call. */
  timeoutMs: number;
  /** D-03 reranker feature flag (consumed in Plan 06); default false. */
  rerankerEnabled: boolean;
  /**
   * acta-net DNS of the OPTIONAL reranker engine (decoder model on vLLM/llama.cpp,
   * or bge-reranker-v2-m3 on TEI). Empty until the deploy team provisions it; the
   * reranker stays a no-op pass-through while empty even if the flag is on.
   */
  rerankerServiceUrl: string;
};
