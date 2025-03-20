import { db } from "../../db";
import embed from "../../embedder";
import { insertNotes } from "../milvus";
import { Note, NoteWithEmbedding } from "../types/note";
import { VectorizedNote } from "../types/vectorized_notes";
import cuid from "cuid";

const { pipeline } = require("@huggingface/transformers");
const MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2";

var extractor: any;

async function getExtractor() {
  if (!extractor) {
    extractor = await pipeline("feature-extraction", MODEL_NAME, {
      device: "cpu", // or "cuda" if running on GPU
    });
  }
  return extractor;
}

const LIMIT = 10000;

async function vectorizeNotesBatch(
  notes: Note[]
): Promise<NoteWithEmbedding[]> {
  const extractor = await getExtractor();
  return Promise.all(
    notes.map(async (note, index) => {
      const result = await embed(note.body, extractor);
      if (index % 1000 === 0) {
        console.log(`Vectorized ${index} notes`);
      }
      if (index === notes.length - 1) {
        console.log(`Done vectorizing notes`);
      }
      return {
        ...note,
        embedding: result.embedding,
      };
    })
  );
}

export async function vectorizeNotes() {
  let notesToVectorize: Note[] = [];
  while (true) {
    notesToVectorize = await db("notes_comments")
      .leftJoin(
        "vectorized_notes",
        "notes_comments.id",
        "vectorized_notes.note_id"
      )
      .whereNull("vectorized_notes.note_id")
      .andWhere("notes_comments.note_is_restacked", "=", "false")
      .select("notes_comments.*")
      .limit(LIMIT);

    if (notesToVectorize.length === 0) {
      break;
    }

    const now = new Date();

    const vectorizedNotes: VectorizedNote[] = notesToVectorize.map((note) => ({
      id: cuid(),
      note_id: note.id,
      status: "pending",
      created_at: now,
      updated_at: now,
    }));

    console.log(`Inserting ${vectorizedNotes.length} vectorized notes`);

    await db("vectorized_notes").insert(vectorizedNotes);

    console.log(`Inserted ${vectorizedNotes.length} vectorized notes`);

    const notesWithEmbedding = await vectorizeNotesBatch(notesToVectorize);

    console.log(`Vectorized ${notesWithEmbedding.length} notes`);

    const { idsInserted, idsFailed } = await insertNotes(notesWithEmbedding);

    console.log(`Inserted ${idsInserted.length} notes`);

    const successVectorizedNotes = vectorizedNotes.filter((vectorized_note) =>
      idsInserted.includes(vectorized_note.note_id)
    );

    const errorVectorizedNotes = vectorizedNotes.filter((vectorized_note) =>
      idsFailed.includes(vectorized_note.note_id)
    );

    await db("vectorized_notes")
      .update({
        status: "success",
        updated_at: new Date(),
      })
      .whereIn(
        "id",
        successVectorizedNotes.map((note) => note.id)
      );

    await db("vectorized_notes")
      .update({
        status: "error",
        updated_at: new Date(),
      })
      .whereIn(
        "id",
        errorVectorizedNotes.map((note) => note.id)
      );
  }
}
