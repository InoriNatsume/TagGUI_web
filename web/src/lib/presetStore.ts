import type { AbstractTagPair } from "@core/core/tagRelations";

export interface TagPresetFile {
  version: 1;
  pairs: AbstractTagPair[];
}

const PRESET_FILE_NAME = "tag-edit-presets.json";

function buildKey(pair: AbstractTagPair): string {
  return `${pair.abstractTag}\u0000${pair.concreteTag}`;
}

function normalizePairs(pairs: AbstractTagPair[]): AbstractTagPair[] {
  const map = new Map<string, AbstractTagPair>();
  for (const pair of pairs) {
    const abstractTag = pair.abstractTag.trim();
    const concreteTag = pair.concreteTag.trim();
    if (!abstractTag || !concreteTag) {
      continue;
    }
    if (abstractTag === concreteTag) {
      continue;
    }
    map.set(buildKey({ abstractTag, concreteTag }), {
      abstractTag,
      concreteTag,
    });
  }
  return Array.from(map.values()).sort((a, b) => {
    const abstractCompare = a.abstractTag.localeCompare(b.abstractTag);
    if (abstractCompare !== 0) {
      return abstractCompare;
    }
    return a.concreteTag.localeCompare(b.concreteTag);
  });
}

export function mergePresetPairs(
  existing: AbstractTagPair[],
  incoming: AbstractTagPair[]
): AbstractTagPair[] {
  return normalizePairs(existing.concat(incoming));
}

export async function loadPresetPairs(
  rootHandle: FileSystemDirectoryHandle
): Promise<AbstractTagPair[]> {
  try {
    const handle = await rootHandle.getFileHandle(PRESET_FILE_NAME);
    const file = await handle.getFile();
    const text = await file.text();
    const data = JSON.parse(text) as TagPresetFile;
    if (!data || data.version !== 1 || !Array.isArray(data.pairs)) {
      return [];
    }
    return normalizePairs(data.pairs);
  } catch {
    return [];
  }
}

export async function savePresetPairs(
  rootHandle: FileSystemDirectoryHandle,
  pairs: AbstractTagPair[]
): Promise<void> {
  const handle = await rootHandle.getFileHandle(PRESET_FILE_NAME, {
    create: true,
  });
  const data: TagPresetFile = {
    version: 1,
    pairs: normalizePairs(pairs),
  };
  const writable = await handle.createWritable();
  await writable.write(JSON.stringify(data, null, 2));
  await writable.close();
}
