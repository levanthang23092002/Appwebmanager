export interface AffiliateUserBrief {
  id: number;
  name: string;
  email: string;
  role: string;
}

export interface AffiliateNetwork {
  id: number;
  name: string;
  code: string;
  logo?: string | null;
  active: boolean;
  syncType: string;
}

export interface AffiliateAccount {
  id: number;
  networkId: number;
  ownerId: number;
  name: string;
  loginEmail: string;
  note?: string | null;
  dashboardUrl?: string | null;
  active: boolean;
  hasPassword?: boolean;
  password?: string;
  network: AffiliateNetwork;
  owner: AffiliateUserBrief;
}

export interface AffiliateRevenue {
  id: number;
  networkId: number;
  accountId: number;
  storeId?: number | null;
  storeDomain?: string | null;
  amount: number;
  orderCount?: number | null;
  currency: string;
  usdVndRate?: number;
  revenueDate: string;
  source: string;
  status: string;
  note?: string | null;
  network: AffiliateNetwork;
  account: AffiliateAccount;
  createdBy: AffiliateUserBrief;
}
