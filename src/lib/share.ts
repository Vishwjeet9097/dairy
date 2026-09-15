/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Share service
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Uses React Native's built-in `Share` API (no extra package needed — it works
 * on top of `expo-sharing` for file-based sharing).
 *
 * The `Share.share()` API opens the native share sheet, which:
 *   • On iOS: shows AirDrop, Messages, WhatsApp, Mail, etc.
 *   • On Android: shows WhatsApp, Telegram, Gmail, etc.
 *
 * The caller decides what to put in the message — this file provides
 * formatters that produce well-structured, emoji-decorated messages ready
 * for WhatsApp or SMS.
 *
 * File exports are handled separately via expo-file-system + expo-sharing
 * (see export.ts).
 */

import { Share } from 'react-native';
import type { Bill, Customer, Settings } from './dairy-store';
import { money0 } from './dairy-store';

// ─── Core share function ─────────────────────────────────────────────────────

/**
 * Opens the native share sheet with a plain-text message.
 * Returns true if the user completed the share action, false if they dismissed.
 */
export async function shareText(message: string): Promise<boolean> {
  try {
    const result = await Share.share({ message }, { dialogTitle: 'Share' });
    return result.action === Share.sharedAction;
  } catch {
    return false;
  }
}

// ─── Bill formatter ───────────────────────────────────────────────────────────

/**
 * Formats a bill as a WhatsApp-friendly message string.
 *
 * Example output (English):
 * ─────────────────────────
 * 🧾 *VISHAL DAIRY*
 * 📅 Period: May 2025
 * 👤 Customer: Rohan Sharma
 * ─────────────────────────
 * 🐄 Regular milk: ₹3,600 (60.0 L)
 * ➕ Extra milk:   ₹300  (5.0 L)
 * 🚚 Delivery charge: ₹100
 * 📂 Previous balance: ₹500
 * ✅ Paid this period: ₹2,000
 * ─────────────────────────
 * 💰 *Amount Due: ₹2,500*
 * ─────────────────────────
 * 📱 Sent via Dairy Manager App
 */
export function formatBillMessage(bill: Bill, customer: Customer, settings: Settings): string {
  const period = new Date(`${bill.periodFrom}T00:00:00`).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });

  const sep = '─────────────────────────';
  const lines: string[] = [
    `🧾 *${settings.dairyName.toUpperCase()}*`,
    `📅 Period: ${period}`,
    `👤 Customer: ${customer.name}`,
    sep,
  ];

  lines.push(`🐄 Regular milk: ${money0(bill.totalAmount)} (${bill.totalQty.toFixed(1)} L)`);

  if ((bill.extraQty ?? 0) > 0) {
    lines.push(`➕ Extra milk:   ${money0(bill.extraAmount ?? 0)} (${(bill.extraQty ?? 0).toFixed(1)} L)`);
  }

  if (bill.deliveryCharge > 0) {
    lines.push(`🚚 Delivery charge: ${money0(bill.deliveryCharge)}`);
  }

  if (bill.openingBalanceCarried > 0) {
    lines.push(`📂 Previous balance: ${money0(bill.openingBalanceCarried)}`);
  }

  if (bill.amountPaidDuringPeriod > 0) {
    lines.push(`✅ Paid this period: − ${money0(bill.amountPaidDuringPeriod)}`);
  }

  lines.push(sep);
  lines.push(`💰 *Amount Due: ${money0(bill.finalDue)}*`);
  lines.push(sep);
  lines.push(`Phone: ${customer.phone}`);
  lines.push(`📱 Sent via ${settings.dairyName}`);

  return lines.join('\n');
}

/**
 * Shares a bill message via the native share sheet.
 */
export async function shareBill(bill: Bill, customer: Customer, settings: Settings): Promise<boolean> {
  return shareText(formatBillMessage(bill, customer, settings));
}

// ─── Customer balance formatter ───────────────────────────────────────────────

/**
 * Formats a quick payment due reminder for a customer.
 */
export function formatBalanceMessage(
  customer: Customer,
  balance: number,
  settings: Settings,
): string {
  if (balance <= 0) {
    return [
      `✅ *${settings.dairyName}*`,
      `Hi ${customer.name}, your account is clear. Thank you for the payment! 🙏`,
      `📱 ${settings.dairyName} · ${settings.ownerName}`,
    ].join('\n');
  }

  return [
    `📢 *${settings.dairyName}*`,
    `Hi ${customer.name}, you have an outstanding balance of *${money0(balance)}*.`,
    `Please pay at your earliest convenience. 🙏`,
    `📞 Call: ${settings.ownerName}`,
    `📱 ${settings.dairyName}`,
  ].join('\n');
}

/**
 * Shares a balance reminder for a customer.
 */
export async function shareCustomerBalance(
  customer: Customer,
  balance: number,
  settings: Settings,
): Promise<boolean> {
  return shareText(formatBalanceMessage(customer, balance, settings));
}

// ─── Delivery summary formatter ───────────────────────────────────────────────

/**
 * Formats today's delivery summary as a shareable message.
 */
export function formatDailySummaryMessage(
  date: string,
  deliveredCount: number,
  totalCustomers: number,
  totalMilkLitres: number,
  totalCollectionRs: number,
  settings: Settings,
): string {
  const dateStr = new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return [
    `📊 *${settings.dairyName} — Daily Summary*`,
    `📅 ${dateStr}`,
    ``,
    `🚚 Deliveries: ${deliveredCount} / ${totalCustomers}`,
    `🐄 Milk delivered: ${totalMilkLitres.toFixed(1)} L`,
    `💰 Collection: ${money0(totalCollectionRs)}`,
    ``,
    `— ${settings.ownerName}`,
  ].join('\n');
}
