"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isConfigured = isConfigured;
exports.getWalletBalance = getWalletBalance;
exports.createPaymentRequest = createPaymentRequest;
exports.getPaymentStatus = getPaymentStatus;
exports.createCollection = createCollection;
exports.getCollectionStatus = getCollectionStatus;
exports.normalizeCollectionMsisdn = normalizeCollectionMsisdn;
exports.normalizeLocalMsisdn = normalizeLocalMsisdn;
exports.mapProviderStatus = mapProviderStatus;
exports.mapCollectionStatus = mapCollectionStatus;
const BASE_URL = process.env.XENTRI_PAY_BASE_URL || 'https://xentripay.com/api';
const API_KEY = process.env.XENTRI_PAY_KEY || '';
// An explicit placeholder means the gateway has not been configured yet,
// so provider calls are skipped gracefully.
function isConfigured() {
    return Boolean(BASE_URL && BASE_URL !== '__PENDING__' && baseUrlLooksValid(BASE_URL));
}
function baseUrlLooksValid(url) {
    return /^https?:\/\//i.test(url);
}
async function xentriFetch(path, options = {}) {
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
    }
    finally {
        clearTimeout(timer);
    }
    const text = await res.text();
    let data;
    try {
        data = text ? JSON.parse(text) : {};
    }
    catch {
        data = { raw: text };
    }
    if (!res.ok) {
        throw new Error(data?.message || data?.error || `XENTRI PAY request failed (${res.status})`);
    }
    return data;
}
async function getWalletBalance() {
    return xentriFetch('/wallets/my-business', { method: 'GET' });
}
async function createPaymentRequest(body) {
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
async function getPaymentStatus(customerRef) {
    const qs = new URLSearchParams({ customerRef });
    return xentriFetch(`/payment-requests/check-status?${qs.toString()}`, { method: 'GET' });
}
async function createCollection(body) {
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
async function getCollectionStatus(refid) {
    const encoded = encodeURIComponent(refid);
    return xentriFetch(`/collections/status/${encoded}`, { method: 'GET' });
}
/**
 * Collections use the international dial format (2507XXXXXXXX) while
 * payouts use the 10-digit local format (07XXXXXXXX).
 * Accept either and normalise to international for the collections API.
 */
function normalizeCollectionMsisdn(input) {
    const digits = String(input || '').replace(/[^\d]/g, '');
    if (/^250\d{9}$/.test(digits))
        return digits; // already international
    if (/^07\d{8}$/.test(digits))
        return `250${digits.slice(1)}`; // local, drop leading 0: 078.. -> 2507...
    if (/^7\d{8}$/.test(digits))
        return `250${digits}`; // no leading zero
    throw new Error('Phone number must be 10 digits (e.g. 0788302208) or international (2507XXXXXXXX)');
}
function normalizeLocalMsisdn(input) {
    const digits = String(input || '').replace(/[^\d]/g, '');
    if (/^07\d{8}$/.test(digits))
        return digits; // already local
    if (/^2507\d{8}$/.test(digits))
        return `0${digits.slice(3)}`; // strip international prefix
    if (/^7\d{8}$/.test(digits))
        return `0${digits}`; // no leading zero
    throw new Error('Phone number must be 10 digits (e.g. 0788302208)');
}
// Map a XentriPay provider status string to our internal status.
function mapProviderStatus(providerStatus) {
    const s = String(providerStatus || '').toUpperCase();
    if (s === 'COMPLETED' || s === 'SUCCESSFUL' || s === 'SUCCESS')
        return 'SUCCESSFUL';
    if (s === 'FAILED' || s === 'REVERSED' || s === 'CANCELLED')
        return 'FAILED';
    return 'PROCESSING';
}
// Collections only report PENDING / SUCCESS / FAILED.
function mapCollectionStatus(providerStatus) {
    const s = String(providerStatus || '').toUpperCase();
    if (s === 'SUCCESS' || s === 'SUCCESSFUL' || s === 'COMPLETED')
        return 'SUCCESSFUL';
    if (s === 'FAILED' || s === 'CANCELLED')
        return 'FAILED';
    return 'PENDING';
}
