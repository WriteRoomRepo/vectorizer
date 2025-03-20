export interface Note {
  id: string;
  comment_id: string;
  type: string;
  user_id: string;
  body: string;
  body_json: any;
  date: string | null;
  handle: string;
  name: string;
  photo_url: string;
  reaction_count: number;
  restacks: number;
  restacked: boolean;
  timestamp: string;
  context_type: string;
  entity_key: string;
  note_is_restacked: boolean;
  reactions: any;
  children_count: number;
  vectorized_at: string;
  vectorized_error: string;
}

export interface MilvusNote {
  id: string;
  vector: number[][];
  reaction_count: number;
  restack_count: number;
  comment_count: number;
  date: number;
  body: string;
}

export type NoteWithEmbedding = Note & { embedding: number[][] };
