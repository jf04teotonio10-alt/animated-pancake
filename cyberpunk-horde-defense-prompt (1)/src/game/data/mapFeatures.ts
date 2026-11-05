import type { MapDef } from '../types';

/** Target counts of the original procedural generator. */
export const FEATURE_TARGETS = { obstacles: 16, nodes: 3, hazards: 3 } as const;
export type FeatureKind = keyof typeof FEATURE_TARGETS;

/** Data-layer normalization: tolerate malformed coordinates without touching map mechanics. */
export function featureList(map: MapDef, kind: FeatureKind): [number, number][] {
  const raw: unknown = map[kind];
  if (!Array.isArray(raw)) return [];
  return raw.filter((pair): pair is [number, number] =>
    Array.isArray(pair) && pair.length === 2 &&
    Number.isInteger(pair[0]) && Number.isInteger(pair[1]));
}
