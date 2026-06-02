/**
 * Content localization helpers.
 *
 * English variants live in the same rows as `*_en` columns (nullable). Public
 * reads resolve them in place before serialization: when `lang === 'en'` we use
 * the English value, falling back to the base (Ukrainian) value when it is empty.
 * The raw `*_en` keys are stripped from the response so payloads stay clean.
 */
export type Lang = 'uk' | 'en';

function resolve(
  lang: Lang,
  base: string | null,
  alt: string | null | undefined,
): string | null {
  return lang === 'en' && alt ? alt : base;
}

export function localizeCity<T>(city: T, lang: Lang): T {
  const c = city as Record<string, any> | null;
  if (c && 'nameEn' in c) {
    c.name = resolve(lang, c.name, c.nameEn);
    delete c.nameEn;
  }
  return city;
}

export function localizeCategory<T>(category: T, lang: Lang): T {
  const c = category as Record<string, any> | null;
  if (c && 'nameEn' in c) {
    c.name = resolve(lang, c.name, c.nameEn);
    delete c.nameEn;
  }
  return category;
}

export function localizeOrganizer<T>(organizer: T, lang: Lang): T {
  const o = organizer as Record<string, any> | null;
  if (!o) return organizer;
  if ('bioEn' in o) {
    o.bio = resolve(lang, o.bio, o.bioEn);
    delete o.bioEn;
  }
  if (Array.isArray(o.events)) {
    o.events.forEach((e: Record<string, any>) => localizeEvent(e, lang));
  }
  return organizer;
}

export function localizeEvent<T>(event: T, lang: Lang): T {
  const e = event as Record<string, any> | null;
  if (!e) return event;
  if ('titleEn' in e) {
    e.title = resolve(lang, e.title, e.titleEn);
    delete e.titleEn;
  }
  if ('descriptionEn' in e) {
    e.description = resolve(lang, e.description, e.descriptionEn);
    delete e.descriptionEn;
  }
  if (e.city) localizeCity(e.city, lang);
  if (e.category) localizeCategory(e.category, lang);
  if (e.organizer) localizeOrganizer(e.organizer, lang);
  return event;
}

export function localizeEvents<T>(events: T[], lang: Lang): T[] {
  events.forEach((e) => localizeEvent(e, lang));
  return events;
}
