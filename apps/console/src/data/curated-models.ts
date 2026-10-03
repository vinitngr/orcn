"use client";

export const DEFAULT_VLLM_IMAGE = "docker.io/vllm/vllm-openai:v0.26.0";
export const DEFAULT_OLLAMA_IMAGE = "ollama/ollama:latest";

export type ModelCategory =
  | "llm"
  | "embedding"
  | "reranker"
  | "vision"
  | "decision"
  | "image"
  | "audio"
  | "video";

export interface CategoryInfo {
  id: ModelCategory;
  label: string;
  description: string;
}

export const MODEL_CATEGORIES: CategoryInfo[] = [
  {
    id: "llm",
    label: "LLM",
    description: "Chat, instruct and reasoning models for text generation.",
  },
  {
    id: "embedding",
    label: "Embedding",
    description: "Vector embedding models for search, RAG and recommendations.",
  },
  {
    id: "reranker",
    label: "Reranker",
    description: "Scoring models to rerank search results by relevance.",
  },
  {
    id: "vision",
    label: "Vision",
    description: "Multimodal models that understand images and documents.",
  },
  {
    id: "decision",
    label: "Decision",
    description:
      "Fast classification models with typed, structured answers.",
  },
  {
    id: "image",
    label: "Image",
    description: "Text-to-image generation models.",
  },
  {
    id: "audio",
    label: "Audio",
    description: "Speech recognition and audio-language models.",
  },
  {
    id: "video",
    label: "Video",
    description: "Video understanding and generation models.",
  },
];

export interface CuratedModel {
  displayName: string;
  modelId: string;
  description: string;
  logo: string;
  provider: string;
  category: ModelCategory;
  parameters: number;
  runtime: string;
  modality: string;
  pipeline: string;
  image: string;
  tags: string[];
  contextLength?: string;
  minVramGb?: number;
}

export const CURATED_MODELS: CuratedModel[] = [
  {
    displayName: "Llama 3.1 8B Instruct",
    modelId: "meta-llama/Llama-3.1-8B-Instruct",
    description:
      "Meta's instruction-tuned chat model. Great all-rounder for chat, RAG and tool calling.",
    logo: "meta llama",
    provider: "Meta",
    category: "llm",
    parameters: 8,
    runtime: "vllm",
    modality: "text-generation",
    pipeline: "text-generation",
    image: DEFAULT_VLLM_IMAGE,
    tags: ["chat", "instruct", "tool-calling"],
    contextLength: "128K",
    minVramGb: 16,
  },
  {
    displayName: "Qwen 2.5 7B Instruct",
    modelId: "Qwen/Qwen2.5-7B-Instruct",
    description:
      "Alibaba's fast multilingual instruct model. Strong reasoning at low VRAM cost.",
    logo: "qwen",
    provider: "Alibaba",
    category: "llm",
    parameters: 7,
    runtime: "vllm",
    modality: "text-generation",
    pipeline: "text-generation",
    image: DEFAULT_VLLM_IMAGE,
    tags: ["chat", "multilingual", "instruct"],
    contextLength: "128K",
    minVramGb: 16,
  },
  {
    displayName: "Mistral 7B Instruct v0.3",
    modelId: "mistralai/Mistral-7B-Instruct-v0.3",
    description:
      "Mistral's efficient instruct model. Snappy responses for chat and summarization.",
    logo: "mistral",
    provider: "Mistral",
    category: "llm",
    parameters: 7,
    runtime: "vllm",
    modality: "text-generation",
    pipeline: "text-generation",
    image: DEFAULT_VLLM_IMAGE,
    tags: ["chat", "instruct", "efficient"],
    contextLength: "32K",
    minVramGb: 16,
  },
  {
    displayName: "DeepSeek R1 Distill 8B",
    modelId: "deepseek-ai/DeepSeek-R1-Distill-Llama-8B",
    description:
      "Distilled reasoning model. Exposes chain-of-thought for math and code tasks.",
    logo: "deepseek",
    provider: "DeepSeek",
    category: "llm",
    parameters: 8,
    runtime: "vllm",
    modality: "text-generation",
    pipeline: "text-generation",
    image: DEFAULT_VLLM_IMAGE,
    tags: ["reasoning", "r1", "code"],
    contextLength: "128K",
    minVramGb: 16,
  },
  {
    displayName: "Phi 4 Mini Instruct",
    modelId: "microsoft/Phi-4-mini-instruct",
    description:
      "Microsoft's compact instruct model. Ideal for lightweight chat on small GPUs.",
    logo: "microsoft",
    provider: "Microsoft",
    category: "llm",
    parameters: 3.8,
    runtime: "vllm",
    modality: "text-generation",
    pipeline: "text-generation",
    image: DEFAULT_VLLM_IMAGE,
    tags: ["chat", "compact", "instruct"],
    contextLength: "128K",
    minVramGb: 12,
  },
  {
    displayName: "Qwen 3 14B AWQ",
    modelId: "Qwen/Qwen3-14B-AWQ",
    description:
      "Quantized 14B Qwen3 for higher quality. Needs more VRAM but tops benchmarks.",
    logo: "qwen",
    provider: "Alibaba",
    category: "llm",
    parameters: 14,
    runtime: "vllm",
    modality: "text-generation",
    pipeline: "text-generation",
    image: DEFAULT_VLLM_IMAGE,
    tags: ["chat", "awq", "quantized"],
    contextLength: "128K",
    minVramGb: 24,
  },
  {
    displayName: "Sarvam 30B",
    modelId: "sarvamai/sarvam-30b",
    description:
      "Compact Indic-languages model tuned for Hindi and regional language chat.",
    logo: "sarvam",
    provider: "Sarvam",
    category: "llm",
    parameters: 30,
    runtime: "vllm",
    modality: "text-generation",
    pipeline: "text-generation",
    image: DEFAULT_VLLM_IMAGE,
    tags: ["indic", "hindi", "compact"],
    contextLength: "4K",
    minVramGb: 70,
  },
  {
    displayName: "BGE Large Embeddings",
    modelId: "BAAI/bge-large-en-v1.5",
    description:
      "High-quality English embedding model for search, RAG and recommendations.",
    logo: "huggingface",
    provider: "BAAI",
    category: "embedding",
    parameters: 0.3,
    runtime: "vllm",
    modality: "embedding",
    pipeline: "sentence-similarity",
    image: DEFAULT_VLLM_IMAGE,
    tags: ["embeddings", "retrieval", "rag"],
    contextLength: "512",
    minVramGb: 8,
  },
  {
    displayName: "MiniLM Sentence Embeddings",
    modelId: "sentence-transformers/all-MiniLM-L6-v2",
    description:
      "Tiny, blazing-fast embeddings for prototyping semantic search and clustering.",
    logo: "huggingface",
    provider: "Sentence Transformers",
    category: "embedding",
    parameters: 0.02,
    runtime: "vllm",
    modality: "embedding",
    pipeline: "sentence-similarity",
    image: DEFAULT_VLLM_IMAGE,
    tags: ["embeddings", "fast", "compact"],
    contextLength: "256",
    minVramGb: 4,
  },
  {
    displayName: "BGE Reranker Large",
    modelId: "BAAI/bge-reranker-v2-m3",
    description:
      "Relevance scoring model to rerank retrieved passages before generation.",
    logo: "huggingface",
    provider: "BAAI",
    category: "reranker",
    parameters: 0.6,
    runtime: "vllm",
    modality: "score",
    pipeline: "text-classification",
    image: DEFAULT_VLLM_IMAGE,
    tags: ["rerank", "scoring", "rag"],
    contextLength: "8K",
    minVramGb: 8,
  },
  {
    displayName: "Qwen 2 VL 7B Instruct",
    modelId: "Qwen/Qwen2-VL-7B-Instruct",
    description:
      "Vision-language model. Chat with images, documents and screenshots.",
    logo: "qwen",
    provider: "Alibaba",
    category: "vision",
    parameters: 7,
    runtime: "vllm",
    modality: "multimodal",
    pipeline: "image-text-to-text",
    image: DEFAULT_VLLM_IMAGE,
    tags: ["vision", "multimodal", "chat"],
    contextLength: "32K",
    minVramGb: 20,
  },
  {
    displayName: "TeV 1 4B",
    modelId: "tev1:latest",
    description:
      "A 4B decision model from Together AI for fast classification.",
    logo: "together",
    provider: "Together AI",
    category: "decision",
    parameters: 4,
    runtime: "ollama",
    modality: "decision",
    pipeline: "decision",
    image: DEFAULT_OLLAMA_IMAGE,
    tags: ["decision", "classification", "thinking"],
    contextLength: "4K",
    minVramGb: 8,
  },
  {
    displayName: "Nimble 9B",
    modelId: "nimble:latest",
    description:
      "A 9B decision model from Bespoke Labs for fast, typed classification.",
    logo: "bespoke",
    provider: "Bespoke Labs",
    category: "decision",
    parameters: 9,
    runtime: "ollama",
    modality: "decision",
    pipeline: "decision",
    image: DEFAULT_OLLAMA_IMAGE,
    tags: ["decision", "classification", "thinking"],
    contextLength: "4K",
    minVramGb: 12,
  },
];

/** Unique provider names present in the catalog, for the provider filter. */
export const CURATED_PROVIDERS = Array.from(
  new Set(CURATED_MODELS.map((m) => m.provider)),
).sort();
