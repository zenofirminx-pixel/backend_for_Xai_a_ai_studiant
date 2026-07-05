import { indexSchoolSite } from "./indexer.js";
import { saveSchoolIndex } from "./saveIndex.js";

export async function runIndexer(url) {
  const data = await indexSchoolSite(url);

  if (!data?.error) {
    await saveSchoolIndex(data);
  }

  return data;
}