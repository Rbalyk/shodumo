import { Category } from '../../core/models';

export type IconName =
  | 'search' | 'pin' | 'chevDown' | 'chevRight' | 'back' | 'heart' | 'share'
  | 'calendar' | 'clock' | 'map' | 'users' | 'run' | 'wine' | 'workshop'
  | 'music' | 'market' | 'feed' | 'profile' | 'plus' | 'close' | 'mail'
  | 'check' | 'sun' | 'moon' | 'list' | 'near' | 'ticket' | 'sparkles';

export interface CategoryMeta {
  hue: string;
  glyph: IconName;
  label: string;
}

interface CategoryRule {
  match: string[];
  hue: string;
  glyph: IconName;
}

/** Slug/name fragments → design hue + glyph (ported from the legacy design). */
const RULES: CategoryRule[] = [
  { match: ['run', 'забіг', 'zabig'], hue: 'cat-run', glyph: 'run' },
  { match: ['tasting', 'wine', 'дегуст'], hue: 'cat-tasting', glyph: 'wine' },
  { match: ['workshop', 'воркшоп', 'майстер'], hue: 'cat-workshop', glyph: 'workshop' },
  { match: ['music', 'музик'], hue: 'cat-music', glyph: 'music' },
  { match: ['market', 'маркет', 'ярмар'], hue: 'cat-market', glyph: 'market' },
];

/**
 * Map an API category to its design hue + glyph + display label.
 * `fallbackLabel` is the already-translated "not found" copy.
 */
export function categoryMeta(
  category: Pick<Category, 'slug' | 'name'> | null | undefined,
  fallbackLabel: string,
): CategoryMeta {
  const key = (category?.slug || category?.name || '').toLowerCase();
  for (const rule of RULES) {
    if (rule.match.some((fragment) => key.includes(fragment))) {
      return { hue: rule.hue, glyph: rule.glyph, label: category?.name || fallbackLabel };
    }
  }
  return { hue: 'cat-music', glyph: 'sparkles', label: category?.name || fallbackLabel };
}
