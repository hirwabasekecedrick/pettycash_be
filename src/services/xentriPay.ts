interface PaymentRequestBody {
  customerReference: string;
  telecomProviderId?: string;
  msisdn: string;
  name?: string;
  transactionType?: string;
  currency?: string;
  amount: number;
}

interface CollectionRequestBody {
  cname: string;
  amount: number;
  cnumber: string;
  msisdn: string;
  currency?: string;
  pmethod?: string;
  email: string;
  customerRef?: string;
  chargesIncluded?: boolean;
}

interface XentriResponse {
  [key: string]: any;
}

const BASE_URL = process.env.XENTRI_PAY_BASE_URL || 'https://xentripay.com/api';
const API_KEY = process.env.XENTRI_PAY_KEY || '';

// An explicit placeholder means the gateway has not been configured yet,
// so provider calls are skipped gracefully.
export function isConfigured(): boolean {
  return Boolean(BASE_URL && BASE_URL !== '__PENDING__' && baseUrlLooksValid(BASE_URL));
}

function baseUrlLooksValid(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

async function xentriFetch(path: string, options: RequestInit = {}): Promise<XentriResponse> {
  if (!isConfigured()) {
    throw new Error('XENTRI PAY is not configured (set XENTRI_PAY_BASE_URL in be/.env)');
  }

  // Never let a slow gateway block a request forever (default 10s).
  const timeoutMs = Number(process.env.XENTRI_PAY_TIMEOUT_MS) || 10000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'X-XENTRIPAY-KEY': API_KEY,
        Authorization: API_KEY,
        ...(options.headers || {}),
      },
    });
  } finally {
    clearTimeout(timer);
  }

  const text = await res.text();
  let data: XentriResponse;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    throw new Error(data?.message || data?.error || `XENTRI PAY request failed (${res.status})`);
  }

  return data;
}

export async function getWalletBalance(): Promise<XentriResponse> {
  return xentriFetch('/wallets/my-business', { method: 'GET' });
}

export async function createPaymentRequest(body: PaymentRequestBody): Promise<XentriResponse> {
  const payload = {
    customerReference: body.customerReference,
    telecomProviderId: body.telecomProviderId || process.env.XENTRI_PAY_TELECOM_PROVIDER_ID || '63510',
    msisdn: body.msisdn,
    name: body.name || 'PettyCash payment',
    transactionType: body.transactionType || 'PAYOUT',
    currency: body.currency || 'RWF',
    amount: body.amount,
  };

  return xentriFetch('/payment-requests', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getPaymentStatus(customerRef: string): Promise<XentriResponse> {
  const qs = new URLSearchParams({ customerRef });
  return xentriFetch(`/payment-requests/check-status?${qs.toString()}`, { method: 'GET' });
}

export async function createCollection(body: CollectionRequestBody): Promise<XentriResponse> {
  const payload = {
    email: body.email,
    cname: body.cname,
    amount: Math.floor(body.amount), // RWF requires whole numbers only
    cnumber: body.cnumber,
    msisdn: body.msisdn,
    currency: body.currency || 'RWF',
    pmethod: body.pmethod || 'momo',
    chargesIncluded: body.chargesIncluded ?? true,
    ...(body.customerRef ? { customerRef: body.customerRef } : {}),
  };

  return xentriFetch('/collections/initiate', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getCollectionStatus(refid: string): Promise<XentriResponse> {
  const encoded = encodeURIComponent(refid);
  return xentriFetch(`/collections/status/${encoded}`, { method: 'GET' });
}

/**
 * Collections use the international dial format (2507XXXXXXXX) while
 * payouts use the 10-digit local format (07XXXXXXXX).
 * Accept either and normalise to international for the collections API.
 */
export function normalizeCollectionMsisdn(input: string): string {
  const digits = String(input || '').replace(/[^\d]/g, '');
  if (/^250\d{9}$/.test(digits)) return digits;          // already international
  if (/^07\d{8}$/.test(digits)) return `250${digits.slice(1)}`; // local, drop leading 0: 078.. -> 2507...
  if (/^7\d{8}$/.test(digits)) return `250${digits}`;    // no leading zero
  throw new Error('Phone number must be 10 digits (e.g. 0788302208) or international (2507XXXXXXXX)');
}

export function normalizeLocalMsisdn(input: string): string {
  const digits = String(input || '').replace(/[^\d]/g, '');
  if (/^07\d{8}$/.test(digits)) return digits;                    // already local
  if (/^2507\d{8}$/.test(digits)) return `0${digits.slice(3)}`;   // strip international prefix
  if (/^7\d{8}$/.test(digits)) return `0${digits}`;               // no leading zero
  throw new Error('Phone number must be 10 digits (e.g. 0788302208)');
}

// Map a XentriPay provider status string to our internal status.
export function mapProviderStatus(providerStatus: string): 'PROCESSING' | 'SUCCESSFUL' | 'FAILED' {
  const s = String(providerStatus || '').toUpperCase();
  if (s === 'COMPLETED' || s === 'SUCCESSFUL' || s === 'SUCCESS') return 'SUCCESSFUL';
  if (s === 'FAILED' || s === 'REVERSED' || s === 'CANCELLED') return 'FAILED';
  return 'PROCESSING';
}

// Collections only report PENDING / SUCCESS / FAILED.
export function mapCollectionStatus(providerStatus: string): 'PENDING' | 'SUCCESSFUL' | 'FAILED' {
  const s = String(providerStatus || '').toUpperCase();
  if (s === 'SUCCESS' || s === 'SUCCESSFUL' || s === 'COMPLETED') return 'SUCCESSFUL';
  if (s === 'FAILED' || s === 'CANCELLED') return 'FAILED';
  return 'PENDING';
}