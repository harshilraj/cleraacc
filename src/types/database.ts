export type SourceKind = 'competitor_link' | 'inspired_link' | 'knowledge_base' | 'voice_sample' | 'instruction';
export type SourcePlatform = 'instagram' | 'linkedin' | 'both' | 'n/a';
export type SourceStatus = 'pending' | 'ready' | 'failed';
export type ExtractionMethod = 'jina' | 'apify' | 'manual';

export interface Source {
  id: string;
  kind: SourceKind;
  platform: SourcePlatform;
  url: string | null;
  raw_text: string | null;
  summary: string | null;
  status: SourceStatus;
  extraction_method: ExtractionMethod | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export type PipelineStatus = 'idea' | 'drafted' | 'review' | 'scheduled' | 'posted';
export type PipelinePlatform = 'instagram' | 'linkedin' | 'both';
export type CreatedVia = 'chat' | 'manual';

export interface PipelineCard {
  id: string;
  platform: PipelinePlatform;
  status: PipelineStatus;
  content: string;
  hashtags: string[] | null;
  notes: string | null;
  source_ids: string[] | null;
  created_via: CreatedVia;
  position: number;
  created_at: string;
  updated_at: string;
}

export type MessageRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  created_at: string;
}

export interface AppSettings {
  id: number;
  secrets: {
    anthropic_api_key?: string;
    apify_api_token?: string;
  };
}

export interface GenerationRun {
  id: string;
  prompt: string;
  sources_used: string[];
  cost_usd: number | null;
  created_at: string;
}

// Draft card returned by generation
export interface DraftCard {
  id: string; // ephemeral, generated client-side
  platform: PipelinePlatform;
  hook?: string;      // Instagram only
  body: string;
  hashtags?: string[]; // Instagram only
  source_ids: string[];
}
