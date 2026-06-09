export const affiliateUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  avatar: true,
  telegram: true,
} as const;

export const affiliateAccountInclude = {
  network: true,
  owner: { select: affiliateUserSelect },
} as const;

export const affiliateRevenueInclude = {
  network: true,
  account: {
    include: {
      owner: { select: affiliateUserSelect },
    },
  },
  store: true,
  createdBy: { select: affiliateUserSelect },
} as const;
