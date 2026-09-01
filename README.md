# PayFlow

> **Salary & Expense Intelligence**
> Know where every rupee goes without having to write it down.

PayFlow is a mobile-first, zero-friction personal finance tracker built specifically for speed. Featuring a minimalist, high-contrast monochrome design, it strips away the noise of traditional budgeting apps to focus entirely on capturing expenses as quickly as possible.

## 🚀 The "Two-Tap" iPhone Integration

PayFlow's killer feature isn't just its web UI—it's how it integrates seamlessly into iOS using Progressive Web App (PWA) capabilities and Apple Shortcuts. 

You can log an expense in literally 3 seconds without ever opening a heavy banking app.

### Method 1: The "Two-Tap" Home Screen App
Because PayFlow is built as a PWA, it behaves exactly like a native iOS app.
1. Open your live Vercel deployment URL in **Safari** on your iPhone.
2. Tap the **Share** button (square with an up arrow at the bottom).
3. Scroll down and tap **"Add to Home Screen"**.
4. Now, PayFlow sits on your home screen. When you tap it, it opens in full-screen mode (no Safari address bar), allowing you to jump straight to the "+" button instantly.

### Method 2: The Siri / Apple Shortcut (Fastest)
Want to track an expense while holding a coffee? Use Apple Shortcuts to bypass navigation entirely.
1. Open the **Shortcuts** app on your iPhone and tap **+** to create a new shortcut.
2. Add Action: **"Open URLs"**.
3. Set the URL to your specific "Add Expense" page: `https://your-payflow-app.vercel.app/add`
4. Name the shortcut exactly what you want to say to Siri, for example: **"Add to PayFlow"**.
5. **Boom.** Now just say *"Hey Siri, Add to PayFlow"* and your phone will instantly wake up and drop you directly onto the amount input screen. 

---

## ✨ Features

- **Monochrome Minimalist UI:** Crisp black and white interface focused on readability and speed. No distracting gradients, emojis, or heavy animations.
- **Automatic Balance Carryover:** Unspent savings from prior months automatically roll over into the next month's opening balance. If you receive your salary at the end of the month (e.g. August 31st), it seamlessly powers your next month's budget without resetting your balance to zero.
- **Total Available Funds & Cumulative Savings:** Clearly separates this month's cash flow from your true available balance (`Total Available = Carried Over + Month Income`). Your savings rate intelligently accounts for available funds even before new income is logged for the calendar month.
- **Income Management & History:** Log multiple income streams per month, track rollover balances, and view your full lifetime income history with a single toggle.
- **Instant Load Times:** Bypasses Next.js edge caching in favor of real-time `force-dynamic` rendering and `{ cache: 'no-store' }` for financial data that is *always* up to date.
- **Smart Analytics:** Automatically calculates your true savings rate, tracks Month-over-Month (MoM) spending changes, and alerts you if you're overspending relative to your total available funds.
- **Live Syncing:** Switch away from the app and come back—the UI automatically listens for `visibilitychange` events and refreshes data so you're never looking at stale numbers.

---

### 🧮 Financial Math & Logic

PayFlow uses a continuous rollover model for calculating cash flow and balances:

$$\text{Carried Over} = (\text{Total Lifetime Income before Month } M) - (\text{Total Lifetime Expenses before Month } M)$$

$$\text{Total Available Funds} = \text{Carried Over} + \text{Month's New Income}$$

$$\text{Remaining Balance} = \text{Total Available Funds} - \text{Month's Expenses}$$

$$\text{Savings Rate} = \begin{cases} 
\frac{\text{Month Income} - \text{Month Expenses}}{\text{Month Income}} \times 100 & \text{if Month Income} > 0 \\
\frac{\text{Remaining Balance}}{\text{Total Available Funds}} \times 100 & \text{if Month Income} = 0 \text{ and Total Available} > 0 \\
0\% & \text{otherwise}
\end{cases}$$

## 🛠️ Tech Stack

- **Framework:** Next.js (App Router)
- **Styling:** Pure Vanilla CSS (`globals.css`) with CSS Variables for a custom design system.
- **Icons:** `lucide-react` (SVG, monochrome).
- **Backend / Auth:** Supabase (PostgreSQL + Magic Link / OAuth Authentication).
- **Hosting:** Vercel

---

## ⚙️ Local Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/VishnuVardhanKosuru/PayFlow.git
   cd PayFlow/payflow-app
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up Environment Variables:**
   Create a `.env.local` file in the `payflow-app` directory:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

---

## ☁️ Deployment

PayFlow is fully configured for zero-config deployment on Vercel. 
Simply connect your GitHub repository to Vercel, ensure your Supabase environment variables are securely added in the Vercel dashboard, and deploy.

> **Note:** Vercel heavily caches fetch requests by default. PayFlow uses `{ cache: 'no-store' }` and `export const dynamic = 'force-dynamic'` on API routes to ensure financial data is always real-time.
