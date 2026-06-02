export function slugify(value: string): string {
  const base = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9Ѐ-ӿ]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'item';
}

export function uniqueSlug(value: string): string {
  return `${slugify(value)}-${Date.now().toString(36)}`;
}
