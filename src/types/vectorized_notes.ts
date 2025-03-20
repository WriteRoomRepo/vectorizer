export interface VectorizedNote {
  id: string;
  note_id: string;
  status: "pending" | "success" | "error";
  message?: string | null;
  created_at: Date;
  updated_at: Date;
}
