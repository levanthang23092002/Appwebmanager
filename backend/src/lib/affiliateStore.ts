import { prisma } from './prisma';

function normalizeDomain(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '');
}

export async function findOrCreateAffiliateStore(
  accountId: number,
  storeDomain?: string | null
) {
  const domain = storeDomain?.trim() ? normalizeDomain(storeDomain) : null;
  if (!domain) return { storeId: null as number | null, storeDomain: null as string | null };

  const existing = await prisma.affiliateStore.findUnique({
    where: { accountId_domain: { accountId, domain } },
  });
  if (existing) return { storeId: existing.id, storeDomain: domain };

  const created = await prisma.affiliateStore.create({
    data: { accountId, domain, name: domain },
  });
  return { storeId: created.id, storeDomain: domain };
}
