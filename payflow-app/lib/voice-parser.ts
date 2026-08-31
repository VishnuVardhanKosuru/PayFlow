// Deterministic voice/text parser for PayFlow — no AI required
// Handles patterns like: "₹450 protein", "250 uber blr trip", "1.2k groceries"

import { VoiceParseResult, Category, Trip } from './types';

// ─── Currency / amount normalization ─────────────────────────────────────────

const CURRENCY_SYMBOLS = /[₹$€£¥]/g;
const K_SUFFIX = /^(\d+(?:\.\d+)?)k$/i;

function parseAmount(token: string): number | null {
  // Remove currency symbols
  const cleaned = token.replace(CURRENCY_SYMBOLS, '').trim();

  // Handle "k" suffix (1.2k → 1200)
  const kMatch = cleaned.match(K_SUFFIX);
  if (kMatch) {
    const val = parseFloat(kMatch[1]) * 1000;
    return isFinite(val) && val > 0 ? Math.round(val * 100) / 100 : null;
  }

  const num = parseFloat(cleaned);
  return isFinite(num) && num > 0 ? Math.round(num * 100) / 100 : null;
}

// ─── Merchant / keyword → category mappings ───────────────────────────────────

const KEYWORD_CATEGORY_MAP: Record<string, string> = {
  // Food
  zomato: 'Food & Dining', swiggy: 'Food & Dining', restaurant: 'Food & Dining',
  food: 'Food & Dining', lunch: 'Food & Dining', dinner: 'Food & Dining',
  breakfast: 'Food & Dining', coffee: 'Food & Dining', cafe: 'Food & Dining',
  pizza: 'Food & Dining', biryani: 'Food & Dining', chai: 'Food & Dining',
  // Groceries
  grocery: 'Groceries', groceries: 'Groceries', vegetables: 'Groceries',
  fruits: 'Groceries', dmart: 'Groceries', bigbasket: 'Groceries',
  blinkit: 'Groceries', zepto: 'Groceries', milk: 'Groceries',
  // Transport
  uber: 'Transport', ola: 'Transport', auto: 'Transport', cab: 'Transport',
  taxi: 'Transport', metro: 'Transport', bus: 'Transport', petrol: 'Transport',
  fuel: 'Transport', rapido: 'Transport', rickshaw: 'Transport',
  // Health / Fitness
  gym: 'Health & Fitness', medicine: 'Health & Fitness', doctor: 'Health & Fitness',
  pharmacy: 'Health & Fitness', medical: 'Health & Fitness', hospital: 'Health & Fitness',
  // Protein / supplements
  protein: 'Protein', whey: 'Protein', supplement: 'Protein', creatine: 'Protein',
  // Shopping
  shopping: 'Shopping', amazon: 'Shopping', flipkart: 'Shopping', clothes: 'Shopping',
  shirt: 'Shopping', shoes: 'Shopping', myntra: 'Shopping',
  // Entertainment
  movie: 'Entertainment', netflix: 'Entertainment', spotify: 'Entertainment',
  prime: 'Entertainment', hotstar: 'Entertainment', game: 'Entertainment',
  // Utilities
  electricity: 'Utilities', water: 'Utilities', internet: 'Utilities',
  wifi: 'Utilities', recharge: 'Utilities', mobile: 'Utilities', gas: 'Utilities',
  // Travel
  flight: 'Travel', train: 'Travel', hotel: 'Travel', airbnb: 'Travel',
  // Home
  home: 'Home', furniture: 'Home', rent: 'Home', maintenance: 'Home',
  // Family
  mom: 'Family', dad: 'Family', family: 'Family', parents: 'Family',
};

// ─── Core parser ─────────────────────────────────────────────────────────────

export function parseVoiceInput(
  rawInput: string,
  userCategories: Category[],
  activeTrips: Trip[]
): VoiceParseResult {
  const input = rawInput.trim().toLowerCase();
  const tokens = input.split(/\s+/);

  if (!input || tokens.length === 0) {
    return { success: false, confidence: 0, raw_input: rawInput, error: 'Empty input' };
  }

  // ── Step 1: Find amount ──────────────────────────────────────────────────
  let amount: number | null = null;
  let amountIndex = -1;

  for (let i = 0; i < tokens.length; i++) {
    const parsed = parseAmount(tokens[i]);
    if (parsed !== null) {
      amount = parsed;
      amountIndex = i;
      break;
    }
  }

  if (amount === null) {
    return { success: false, confidence: 0, raw_input: rawInput, error: 'Could not extract a valid amount' };
  }

  // Remaining tokens after removing amount
  const remainingTokens = tokens.filter((_, i) => i !== amountIndex);
  const descriptionText = remainingTokens.join(' ');

  // ── Step 2: Match trip ───────────────────────────────────────────────────
  let matchedTrip: Trip | null = null;

  for (const trip of activeTrips) {
    const tripWords = trip.name.toLowerCase().split(/\s+/);
    // Check if any keyword from trip name appears in remaining tokens
    const matched = tripWords.some(w => remainingTokens.includes(w));
    if (matched) {
      matchedTrip = trip;
      break;
    }
  }

  // ── Step 3: Match category ────────────────────────────────────────────────
  let matchedCategoryName: string | null = null;
  let matchedCategoryId: string | null = null;
  let confidence = 0.5;

  // 3a: Check user category names directly
  for (const cat of userCategories) {
    if (!cat.is_active || cat.type !== 'expense') continue;
    const catWords = cat.name.toLowerCase().split(/\s+/);
    if (catWords.some(w => remainingTokens.includes(w)) || remainingTokens.includes(cat.name.toLowerCase())) {
      matchedCategoryName = cat.name;
      matchedCategoryId = cat.id;
      confidence = 0.9;
      break;
    }
  }

  // 3b: Keyword map fallback
  if (!matchedCategoryName) {
    for (const token of remainingTokens) {
      const mapped = KEYWORD_CATEGORY_MAP[token];
      if (mapped) {
        matchedCategoryName = mapped;
        // Try to find user category matching the mapped name
        const userCat = userCategories.find(
          c => c.is_active && c.name.toLowerCase() === mapped.toLowerCase()
        );
        if (userCat) matchedCategoryId = userCat.id;
        confidence = 0.75;
        break;
      }
    }
  }

  // 3c: Partial match on user categories
  if (!matchedCategoryName) {
    for (const cat of userCategories) {
      if (!cat.is_active || cat.type !== 'expense') continue;
      const catLower = cat.name.toLowerCase();
      if (remainingTokens.some(t => catLower.includes(t) || t.includes(catLower))) {
        matchedCategoryName = cat.name;
        matchedCategoryId = cat.id;
        confidence = 0.6;
        break;
      }
    }
  }

  return {
    success: true,
    amount,
    description: descriptionText || undefined,
    category_name: matchedCategoryName || undefined,
    category_id: matchedCategoryId || undefined,
    trip_name: matchedTrip?.name,
    trip_id: matchedTrip?.id,
    confidence,
    raw_input: rawInput,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function formatCurrency(amount: number, currency = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function monthToLabel(month: string): string {
  const [year, mon] = month.split('-');
  const date = new Date(parseInt(year), parseInt(mon) - 1, 1);
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

export function getPreviousMonth(month: string): string {
  const [year, mon] = month.split('-').map(Number);
  const date = new Date(year, mon - 2, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}
