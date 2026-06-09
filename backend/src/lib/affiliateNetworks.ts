import { prisma } from './prisma';

export function slugifyNetworkCode(name: string): string {
  const slug = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48);
  return slug || 'network';
}

export async function generateUniqueNetworkCode(name: string): Promise<string> {
  const base = slugifyNetworkCode(name);
  let code = base;
  let suffix = 2;
  while (await prisma.affiliateNetwork.findUnique({ where: { code } })) {
    code = `${base}_${suffix}`;
    suffix += 1;
  }
  return code;
}

const DEFAULT_NETWORKS = [
  { name: 'Impact', code: 'impact' },
  { name: 'Shopify Collab', code: 'shopify_collab' },
  { name: 'Refersion', code: 'refersion' },
  { name: 'Uppromote', code: 'uppromote' },
  { name: 'Goaff', code: 'goaff' },
] as const;

export async function ensureDefaultAffiliateNetworks() {
  const count = await prisma.affiliateNetwork.count();
  if (count > 0) return;
  await prisma.affiliateNetwork.createMany({
    data: DEFAULT_NETWORKS.map((n) => ({ ...n, syncType: 'manual', active: true })),
    skipDuplicates: true,
  });
}
