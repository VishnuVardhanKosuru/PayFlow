// PayFlow — Shared TypeScript types matching the Supabase schema

export type TransactionType = 'income' | 'expense';
export type TransactionSource = 'WEB' | 'SHORTCUT' | 'VOICE' | 'WIDGET' | 'IMPORT';
export type CategoryType = 'income' | 'expense';

// ─── Database Row Types ───────────────────────────────────────────────────────

export interface Profile {
  id: string;
  display_name: string | null;
  currency: string;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface UserSettings {
  user_id: string;
  default_category: string | null;
  monthly_budget: number | null;
  widget_preference: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Trip {
  id: string;
  user_id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MonthlyIncome {
  id: string;
  user_id: string;
  month: string; // YYYY-MM
  amount: number;
  source: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: TransactionType;
  amount: number;
  description: string | null;
  category_id: string | null;
  trip_id: string | null;
  merchant: string | null;
  occurred_at: string;
  source: TransactionSource;
  idempotency_key: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  category?: Category;
  trip?: Trip;
}

// ─── Computed / API Response Types ───────────────────────────────────────────

export interface MonthlySummary {
  month: string;
  total_income: number;
  total_expenses: number;
  carried_over: number;
  total_available: number;
  remaining: number;
  month_net: number;
  savings_rate: number;
  transaction_count: number;
}

export interface CategoryBreakdown {
  category_id: string;
  category_name: string;
  category_icon: string;
  category_color: string;
  total: number;
  percentage: number;
  transaction_count: number;
}

export interface MonthOverMonthChange {
  category_id: string;
  category_name: string;
  category_icon: string;
  category_color: string;
  current_month_total: number;
  previous_month_total: number;
  change_percentage: number | null;
  change_direction: 'up' | 'down' | 'new' | 'same';
}

export interface InsightsData {
  month: string;
  summary: MonthlySummary;
  category_breakdown: CategoryBreakdown[];
  month_over_month: MonthOverMonthChange[];
  top_category: CategoryBreakdown | null;
  alerts: SpendingAlert[];
}

export interface SpendingAlert {
  type: 'savings_low' | 'category_high' | 'over_budget';
  message: string;
  severity: 'info' | 'warning' | 'danger';
}

export interface TripSummary {
  trip: Trip;
  total_expenses: number;
  transaction_count: number;
  category_breakdown: CategoryBreakdown[];
}

// ─── API Request/Response Types ───────────────────────────────────────────────

export interface CreateTransactionPayload {
  type: TransactionType;
  amount: number;
  description?: string;
  category_id?: string;
  trip_id?: string;
  merchant?: string;
  occurred_at?: string;
  source?: TransactionSource;
  idempotency_key?: string;
}

export interface UpdateTransactionPayload {
  amount?: number;
  description?: string;
  category_id?: string | null;
  trip_id?: string | null;
  merchant?: string | null;
  occurred_at?: string;
}

export interface CreateIncomePayload {
  month: string; // YYYY-MM
  amount: number;
  source?: string;
  notes?: string;
}

export interface VoiceParseResult {
  success: boolean;
  amount?: number;
  description?: string;
  category_name?: string;
  category_id?: string;
  trip_name?: string;
  trip_id?: string;
  confidence: number;
  raw_input: string;
  error?: string;
}

// ─── UI State Types ───────────────────────────────────────────────────────────

export interface FilterOptions {
  month?: string;
  category_id?: string;
  trip_id?: string;
  type?: TransactionType;
  search?: string;
}
