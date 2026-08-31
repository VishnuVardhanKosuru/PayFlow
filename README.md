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
- **Instant Load Times:** Bypasses Next.js edge caching in favor of real-time `force-dynamic` rendering for financial data that is *always* up to date.
- **Smart Analytics:** Automatically calculates your savings rate, tracks Month-over-Month (MoM) spending changes, and alerts you if you're overspending in specific categories.
- **Live Syncing:** Switch away from the app and come back—the UI automatically listens for `visibilitychange` events and refreshes the data so you're never looking at stale numbers.

---

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
