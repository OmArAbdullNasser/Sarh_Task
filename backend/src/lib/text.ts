export const normalizeSearch = (value: string) => value.normalize('NFC').trim().toLowerCase();
export const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
