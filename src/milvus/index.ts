import { MilvusNote, NoteWithEmbedding } from "../types/note";

const key =
  "3c5a301c6328ee8485a733671e54b44c07aabf5dda23759cf6ca96524572da67c008a26dd17838beede6d4190fbc3aba16432818";
const milvus_url =
  "https://in03-387f90c67a5a035.serverless.gcp-us-west1.cloud.zilliz.com";
const milvus_insert = "v2/vectordb/entities/insert";
const collectionName = "notes_new";

export async function runFetch(notes: NoteWithEmbedding[]) {
  const url = `${milvus_url}/${milvus_insert}`;
  const headers = {
    Accept: "application/json",
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };

  const batch: MilvusNote[] = notes.map((note) => ({
    id: note.id,
    vector: note.embedding,
    date: note.date ? new Date(note.date).getTime() : 0,
    reaction_count: note.reaction_count || 0,
    comment_count: note.children_count || 0,
    restack_count: note.restacks || 0,
    comment_id: note.comment_id,
    author_id: note.user_id,
  }));

  const batchBody = JSON.stringify({
    collectionName,
    data: batch,
  });

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: batchBody,
  });

  const idsInserted: string[] = [];
  const idsFailed: string[] = [];
  const result = await response.json();
  if (result.code === 0) {
    idsInserted.push(...(result?.data?.insertIds || []));
  } else {
    idsFailed.push(...(result?.data?.failedIds || []));
  }

  return {
    idsInserted,
    idsFailed,
  };
}

export async function insertNotes(notes: NoteWithEmbedding[]) {
  const batchSize = 1000;
  const maxParallel = 5;
  const idsInserted: string[] = [];
  const idsFailed: string[] = [];
  console.log(`About to insert ${notes.length} notes`);
  for (let i = 0; i < notes.length; i += batchSize * maxParallel) {
    const batchPromises = [];
    for (let j = 0; j < maxParallel; j++) {
      const batch = notes.slice(i + j * batchSize, i + (j + 1) * batchSize);
      if (batch.length === 0) {
        continue;
      }
      batchPromises.push(runFetch(batch));
    }
    const results = await Promise.all(batchPromises);
    for (const result of results) {
      idsInserted.push(...result.idsInserted);
      idsFailed.push(...result.idsFailed);
    }
    const totalLength = idsInserted.length + idsFailed.length;
    if (totalLength % 1000 === 0) {
      console.log(`Inserted a batch of ${totalLength} notes `);
    }
  }
  return {
    idsInserted,
    idsFailed,
  };
}
