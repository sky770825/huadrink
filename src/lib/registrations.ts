import { getMemberByContactName } from '@/lib/members';

/** 同一人重複報名：以聯絡人姓名 + 手機正規化後為 key，回傳該 key 對應的報名 id 列表（僅保留有重複的） */
export function getDuplicateGroupIds<T extends { id: string; contact_name: string; phone?: string | null }>(
  registrations: T[]
): Set<string> {
  const keyToIds = new Map<string, string[]>();
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, '');
  registrations.forEach((reg) => {
    const key = `${norm(reg.contact_name)}|${(reg.phone || '').trim()}`;
    if (!keyToIds.has(key)) keyToIds.set(key, []);
    keyToIds.get(key)!.push(reg.id);
  });
  const duplicateIds = new Set<string>();
  keyToIds.forEach((ids) => {
    if (ids.length > 1) ids.forEach((id) => duplicateIds.add(id));
  });
  return duplicateIds;
}

/** 依內部編號排序：內部夥伴依成員編號，其餘依報名編號 */
export function sortByMemberId<T extends { type: string; contact_name: string; ref_code?: string | null }>(
  list: T[]
): T[] {
  return [...list].sort((a, b) => {
    const aInternal = a.type === 'internal';
    const bInternal = b.type === 'internal';
    if (aInternal && bInternal) {
      const memberA = getMemberByContactName(a.contact_name);
      const memberB = getMemberByContactName(b.contact_name);
      const idA = memberA?.id ?? 9999;
      const idB = memberB?.id ?? 9999;
      return idA - idB;
    }
    if (aInternal !== bInternal) return aInternal ? -1 : 1;
    return (a.ref_code || '').localeCompare(b.ref_code || '');
  });
}
