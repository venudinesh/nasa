let manifestCache: Map<string, string> | null = null;

export async function loadModelManifest(): Promise<Map<string, string>> {
  if (manifestCache) return manifestCache;
  try {
    const res = await fetch('/models/manifest.json');
    if (!res.ok) return new Map();
    const json = await res.json();
    const models = json.models || {};
    manifestCache = new Map(Object.entries(models) as [string, string][]);
    return manifestCache;
  } catch {
    manifestCache = new Map();
    return manifestCache;
  }
}

export function getModelUrl(slug: string): string | undefined {
  if (!manifestCache) return undefined;
  return manifestCache.get(slug);
}
