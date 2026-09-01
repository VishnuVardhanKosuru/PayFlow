// Deterministic smart voice/text parser for PayFlow
// Handles spoken patterns like: "₹450 protein", "Paid 250 for uber to airport", "salary 100k", "bought 1.5k groceries at dmart", "Rs. 350 for zomato"

import { VoiceParseResult, Category, Trip, TransactionType } from './types';

// ─── Currency / Amount Helpers ────────────────────────────────────────────────

const AMOUNT_REGEX = /(?:(?:rs\.?|inr|rupees?|[₹$€£¥])\s*)?(\d+(?:,\d+)*(?:\.\d+)?)\s*(k|thousand|lakh|rs\.?|rupees?|\/-)?/i;

function extractAmountAndRemainder(input: string): { amount: number | null; remainder: string } {
  // Normalize commas in numbers (e.g. 1,00,000 or 1,200)
  const normalized = input.replace(/(\d),(\d)/g, '$1$2').trim();

  // Pattern 1: Look for explicit amount with currency or unit
  // e.g. "450 protein", "rs 500", "₹1200", "1.5k", "spent 350"
  const tokens = normalized.split(/\s+/);
  
  // Try each token or token combination
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i].toLowerCase();
    
    // Check if token is "rs", "inr", "rupees", "₹" followed by a number
    if (['rs', 'rs.', 'inr', 'rupees', 'rupee', '₹', '$', '€', '£'].includes(token) && i + 1 < tokens.length) {
      const nextToken = tokens[i + 1].toLowerCase().replace(/[^\d.]/g, '');
      const val = parseFloat(nextToken);
      if (isFinite(val) && val > 0) {
        const remainder = tokens.filter((_, idx) => idx !== i && idx !== i + 1).join(' ');
        return { amount: Math.round(val * 100) / 100, remainder };
      }
    }

    // Check if token itself has amount
    // e.g. "₹450", "450rs", "1.5k", "500/-", "450"
    const cleanToken = token.replace(/[₹$€£¥]/g, '').replace(/\/[-=]$/, '').trim();
    
    // Handle 'k' (e.g. 1.5k -> 1500)
    if (/^(\d+(?:\.\d+)?)k$/i.test(cleanToken)) {
      const match = cleanToken.match(/^(\d+(?:\.\d+)?)k$/i);
      if (match) {
        const val = parseFloat(match[1]) * 1000;
        const remainder = tokens.filter((_, idx) => idx !== i).join(' ');
        return { amount: Math.round(val * 100) / 100, remainder };
      }
    }

    // Handle 'rs' or 'rupees' suffix (e.g. "450rs", "450rupees")
    const rsMatch = cleanToken.match(/^(?:rs\.?)?(\d+(?:\.\d+)?)(?:rs\.?|rupees?)?$/i);
    if (rsMatch && rsMatch[1]) {
      const val = parseFloat(rsMatch[1]);
      if (isFinite(val) && val > 0) {
        const remainder = tokens.filter((_, idx) => idx !== i).join(' ');
        return { amount: Math.round(val * 100) / 100, remainder };
      }
    }
  }

  // Fallback: general regex search in string
  const generalMatch = normalized.match(AMOUNT_REGEX);
  if (generalMatch && generalMatch[1]) {
    let val = parseFloat(generalMatch[1]);
    if (generalMatch[2] && generalMatch[2].toLowerCase() === 'k') {
      val = val * 1000;
    } else if (generalMatch[2] && generalMatch[2].toLowerCase() === 'lakh') {
      val = val * 100000;
    }
    if (isFinite(val) && val > 0) {
      const remainder = normalized.replace(generalMatch[0], ' ').replace(/\s+/g, ' ').trim();
      return { amount: Math.round(val * 100) / 100, remainder };
    }
  }

  return { amount: null, remainder: input };
}

// ─── Keyword Category Map ─────────────────────────────────────────────────────

const KEYWORD_CATEGORY_MAP: Record<string, { category: string; type: TransactionType }> = {
  // Food & Dining
  zomato: { category: 'Food & Dining', type: 'expense' },
  swiggy: { category: 'Food & Dining', type: 'expense' },
  restaurant: { category: 'Food & Dining', type: 'expense' },
  food: { category: 'Food & Dining', type: 'expense' },
  lunch: { category: 'Food & Dining', type: 'expense' },
  dinner: { category: 'Food & Dining', type: 'expense' },
  breakfast: { category: 'Food & Dining', type: 'expense' },
  coffee: { category: 'Food & Dining', type: 'expense' },
  tea: { category: 'Food & Dining', type: 'expense' },
  chai: { category: 'Food & Dining', type: 'expense' },
  cafe: { category: 'Food & Dining', type: 'expense' },
  starbucks: { category: 'Food & Dining', type: 'expense' },
  pizza: { category: 'Food & Dining', type: 'expense' },
  dominos: { category: 'Food & Dining', type: 'expense' },
  biryani: { category: 'Food & Dining', type: 'expense' },
  burger: { category: 'Food & Dining', type: 'expense' },
  mcdonalds: { category: 'Food & Dining', type: 'expense' },
  kfc: { category: 'Food & Dining', type: 'expense' },
  snacks: { category: 'Food & Dining', type: 'expense' },
  canteen: { category: 'Food & Dining', type: 'expense' },
  mess: { category: 'Food & Dining', type: 'expense' },
  dosa: { category: 'Food & Dining', type: 'expense' },
  idli: { category: 'Food & Dining', type: 'expense' },
  subway: { category: 'Food & Dining', type: 'expense' },

  // Groceries
  grocery: { category: 'Groceries', type: 'expense' },
  groceries: { category: 'Groceries', type: 'expense' },
  vegetables: { category: 'Groceries', type: 'expense' },
  fruits: { category: 'Groceries', type: 'expense' },
  milk: { category: 'Groceries', type: 'expense' },
  dmart: { category: 'Groceries', type: 'expense' },
  bigbasket: { category: 'Groceries', type: 'expense' },
  blinkit: { category: 'Groceries', type: 'expense' },
  zepto: { category: 'Groceries', type: 'expense' },
  instamart: { category: 'Groceries', type: 'expense' },
  supermarket: { category: 'Groceries', type: 'expense' },
  provisions: { category: 'Groceries', type: 'expense' },

  // Transport
  uber: { category: 'Transport', type: 'expense' },
  ola: { category: 'Transport', type: 'expense' },
  rapido: { category: 'Transport', type: 'expense' },
  auto: { category: 'Transport', type: 'expense' },
  cab: { category: 'Transport', type: 'expense' },
  taxi: { category: 'Transport', type: 'expense' },
  rickshaw: { category: 'Transport', type: 'expense' },
  metro: { category: 'Transport', type: 'expense' },
  bus: { category: 'Transport', type: 'expense' },
  train: { category: 'Transport', type: 'expense' },
  petrol: { category: 'Transport', type: 'expense' },
  fuel: { category: 'Transport', type: 'expense' },
  diesel: { category: 'Transport', type: 'expense' },
  toll: { category: 'Transport', type: 'expense' },
  fastag: { category: 'Transport', type: 'expense' },
  parking: { category: 'Transport', type: 'expense' },

  // Health / Fitness
  gym: { category: 'Health & Fitness', type: 'expense' },
  cult: { category: 'Health & Fitness', type: 'expense' },
  medicine: { category: 'Health & Fitness', type: 'expense' },
  pharmacy: { category: 'Health & Fitness', type: 'expense' },
  doctor: { category: 'Health & Fitness', type: 'expense' },
  medical: { category: 'Health & Fitness', type: 'expense' },
  hospital: { category: 'Health & Fitness', type: 'expense' },
  clinic: { category: 'Health & Fitness', type: 'expense' },
  apollo: { category: 'Health & Fitness', type: 'expense' },
  pharmeasy: { category: 'Health & Fitness', type: 'expense' },

  // Protein / Fitness
  protein: { category: 'Protein', type: 'expense' },
  whey: { category: 'Protein', type: 'expense' },
  creatine: { category: 'Protein', type: 'expense' },
  supplement: { category: 'Protein', type: 'expense' },
  isolate: { category: 'Protein', type: 'expense' },

  // Shopping
  shopping: { category: 'Shopping', type: 'expense' },
  amazon: { category: 'Shopping', type: 'expense' },
  flipkart: { category: 'Shopping', type: 'expense' },
  myntra: { category: 'Shopping', type: 'expense' },
  ajio: { category: 'Shopping', type: 'expense' },
  clothes: { category: 'Shopping', type: 'expense' },
  shirt: { category: 'Shopping', type: 'expense' },
  shoes: { category: 'Shopping', type: 'expense' },
  electronics: { category: 'Shopping', type: 'expense' },

  // Entertainment
  movie: { category: 'Entertainment', type: 'expense' },
  cinema: { category: 'Entertainment', type: 'expense' },
  netflix: { category: 'Entertainment', type: 'expense' },
  spotify: { category: 'Entertainment', type: 'expense' },
  prime: { category: 'Entertainment', type: 'expense' },
  hotstar: { category: 'Entertainment', type: 'expense' },
  game: { category: 'Entertainment', type: 'expense' },
  bookmyshow: { category: 'Entertainment', type: 'expense' },

  // Utilities & Bills
  electricity: { category: 'Utilities', type: 'expense' },
  current: { category: 'Utilities', type: 'expense' },
  water: { category: 'Utilities', type: 'expense' },
  wifi: { category: 'Utilities', type: 'expense' },
  internet: { category: 'Utilities', type: 'expense' },
  airtel: { category: 'Utilities', type: 'expense' },
  jio: { category: 'Utilities', type: 'expense' },
  recharge: { category: 'Utilities', type: 'expense' },
  bill: { category: 'Utilities', type: 'expense' },
  gas: { category: 'Utilities', type: 'expense' },
  cylinder: { category: 'Utilities', type: 'expense' },
  maintenance: { category: 'Utilities', type: 'expense' },

  // Travel
  flight: { category: 'Travel', type: 'expense' },
  hotel: { category: 'Travel', type: 'expense' },
  stay: { category: 'Travel', type: 'expense' },
  airbnb: { category: 'Travel', type: 'expense' },
  trip: { category: 'Travel', type: 'expense' },
  vacation: { category: 'Travel', type: 'expense' },
  makemytrip: { category: 'Travel', type: 'expense' },

  // Home & Living
  rent: { category: 'Home', type: 'expense' },
  home: { category: 'Home', type: 'expense' },
  furniture: { category: 'Home', type: 'expense' },
  maid: { category: 'Home', type: 'expense' },
  cook: { category: 'Home', type: 'expense' },

  // Family
  mom: { category: 'Family', type: 'expense' },
  dad: { category: 'Family', type: 'expense' },
  family: { category: 'Family', type: 'expense' },
  parents: { category: 'Family', type: 'expense' },

  // Income sources
  salary: { category: 'Salary', type: 'income' },
  stipend: { category: 'Salary', type: 'income' },
  freelance: { category: 'Freelance', type: 'income' },
  upwork: { category: 'Freelance', type: 'income' },
  client: { category: 'Freelance', type: 'income' },
  bonus: { category: 'Bonus', type: 'income' },
  dividend: { category: 'Investment', type: 'income' },
  interest: { category: 'Investment', type: 'income' },
  cashback: { category: 'Other', type: 'income' },
  refund: { category: 'Other', type: 'income' },
};

// Conversational stop words to clean from description
const STOP_WORDS = new Set([
  'i', 'a', 'an', 'the', 'spent', 'spend', 'paid', 'pay', 'bought', 'buy',
  'gave', 'give', 'sent', 'send', 'for', 'on', 'at', 'to', 'in', 'of',
  'with', 'and', 'rs', 'rs.', 'rupees', 'rupee', 'inr', 'bucks', 'please',
  'record', 'add', 'my', 'worth', 'from'
]);

function cleanDescription(text: string): string {
  const words = text
    .trim()
    .split(/\s+/)
    .filter(w => !STOP_WORDS.has(w.toLowerCase()) && !/^\d+$/.test(w));

  if (words.length === 0) return text.trim();

  // Capitalize words nicely
  return words
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// ─── Main Parser ──────────────────────────────────────────────────────────────

export function parseVoiceInput(
  rawInput: string,
  userCategories: Category[] = [],
  activeTrips: Trip[] = []
): VoiceParseResult {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return { success: false, confidence: 0, raw_input: rawInput, error: 'Empty voice input' };
  }

  // Step 1: Extract Amount & Remainder Text
  const { amount, remainder } = extractAmountAndRemainder(trimmed);

  if (amount === null || isNaN(amount) || amount <= 0) {
    return {
      success: false,
      confidence: 0,
      raw_input: rawInput,
      error: 'Could not detect an amount. Say something like "₹450 for coffee" or "Uber 250".'
    };
  }

  const remainderTokens = remainder.toLowerCase().split(/\s+/).filter(Boolean);

  // Step 2: Detect Type (income vs expense)
  let detectedType: TransactionType = 'expense';
  const incomeKeywords = ['salary', 'stipend', 'bonus', 'freelance', 'dividend', 'cashback', 'refund', 'received', 'credited', 'income'];
  if (remainderTokens.some(t => incomeKeywords.includes(t))) {
    detectedType = 'income';
  }

  // Step 3: Match Active Trip (if expense)
  let matchedTrip: Trip | null = null;
  if (detectedType === 'expense' && activeTrips.length > 0) {
    for (const trip of activeTrips) {
      const tripTokens = trip.name.toLowerCase().split(/\s+/);
      if (tripTokens.some(t => remainderTokens.includes(t))) {
        matchedTrip = trip;
        break;
      }
    }
  }

  // Step 4: Match Category
  let matchedCategoryName: string | null = null;
  let matchedCategoryId: string | null = null;
  let confidence = 0.6;

  // 4a: Exact/partial match against user's categories for the detected type
  const activeUserCats = userCategories.filter(c => c.is_active && c.type === detectedType);
  for (const cat of activeUserCats) {
    const catWords = cat.name.toLowerCase().split(/\s+/);
    if (catWords.some(w => remainderTokens.includes(w)) || remainderTokens.some(r => cat.name.toLowerCase().includes(r))) {
      matchedCategoryName = cat.name;
      matchedCategoryId = cat.id;
      confidence = 0.95;
      break;
    }
  }

  // 4b: Keyword dictionary map match
  if (!matchedCategoryName) {
    for (const token of remainderTokens) {
      const entry = KEYWORD_CATEGORY_MAP[token];
      if (entry) {
        matchedCategoryName = entry.category;
        detectedType = entry.type;
        // Check if user has this category
        const userCat = userCategories.find(c => c.is_active && c.name.toLowerCase() === entry.category.toLowerCase());
        if (userCat) {
          matchedCategoryId = userCat.id;
          confidence = 0.9;
        } else {
          confidence = 0.75;
        }
        break;
      }
    }
  }

  // Step 5: Format Clean Description
  const description = cleanDescription(remainder) || (matchedCategoryName ? `${matchedCategoryName}` : undefined);

  return {
    success: true,
    type: detectedType,
    amount,
    description: description || undefined,
    category_name: matchedCategoryName || undefined,
    category_id: matchedCategoryId || undefined,
    trip_name: matchedTrip?.name,
    trip_id: matchedTrip?.id,
    confidence,
    raw_input: rawInput,
  };
}
