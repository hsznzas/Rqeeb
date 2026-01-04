# Rqeeb – Smart Financial Tracker 💰

<div align="center">
  <img src="public/rqeeb.svg" alt="Rqeeb Logo" width="80" height="80">
  <h3>Chat-First Personal Finance</h3>
  <p>Track your finances by simply pasting SMS messages, typing notes, or uploading receipts.</p>
</div>

---

## ✨ Features

- **Chat-First Interface** – No complex forms. Just paste, type, or upload.
- **Smart SMS Parsing** – Automatically extracts transactions from bank SMS messages.
- **Liquid Glass UI** – Beautiful dark-mode interface with glassmorphism design.
- **Real-time Updates** – Optimistic UI for instant feedback.
- **Analytics Dashboard** – Visual breakdown of spending by category.
- **SAR-First** – Built for Saudi Arabia, supports multiple currencies.

## 🛠 Tech Stack

- **Framework:** React (Vite) + TypeScript
- **Styling:** Tailwind CSS + clsx + tailwind-merge
- **Backend:** Supabase (PostgreSQL, Auth, RLS)
- **State:** React Context API with Optimistic Updates
- **Animation:** Framer Motion
- **Icons:** Lucide React
- **Charts:** Recharts
- **Date Handling:** date-fns

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or pnpm
- Supabase account (free tier works)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/rqeeb.git
cd rqeeb

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Supabase credentials

# Start development server
npm run dev
```

### Environment Variables

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Get these from your [Supabase Dashboard](https://app.supabase.com) → Project Settings → API.

### Database Setup

1. Go to your Supabase project → SQL Editor
2. Run the SQL from `supabase/schema.sql`
3. Enable Email Auth in Authentication → Providers

## 📁 Project Structure

```
src/
├── components/
│   ├── ui/           # Reusable UI components (Button, Card, Input)
│   ├── feed/         # Feed-specific components (TransactionItem, InputDock)
│   └── layout/       # Layout components (Header, PageContainer)
├── context/          # React Context (AuthContext, DataContext)
├── lib/              # Utilities (dateUtils, transactionFilter, utils)
├── pages/            # Route pages (Home, Analytics, Settings)
├── services/         # API services (Supabase client)
└── types/            # TypeScript types
```

## 🎨 Design System – "Liquid Glass"

### Colors

| Purpose    | Color                  | Tailwind Class     |
| ---------- | ---------------------- | ------------------ |
| Income     | Emerald (#10b981)      | `text-emerald-400` |
| Expense    | Rose (#f43f5e)         | `text-rose-400`    |
| Accent     | Amber (#f59e0b)        | `text-amber-400`   |
| Background | Slate 950 (#020617)    | `bg-slate-950`     |
| Glass      | White 5% opacity       | `bg-white/[0.05]`  |

### Glass Materials

```css
/* Glass Card */
.glass-card {
  @apply bg-white/[0.05] backdrop-blur-md border border-white/10 rounded-2xl;
}

/* Glass Input */
.glass-input {
  @apply bg-white/[0.05] border border-white/10 rounded-xl;
}
```

## 🧠 Transaction Filter Logic

The "brain" of Rqeeb lives in `src/lib/transactionFilter.ts`:

### Exclude Keywords (Spam/Security)
- OTP, verification code, offer, discount, balance, expiry

### Include Keywords (Transactions)
- purchase, spent, paid, transfer, amount, SAR, USD

### Auto-Detection
- Extracts amounts from text
- Detects currency (SAR, USD, AED, etc.)
- Infers category from merchant/keywords
- Determines income vs expense

## 📱 Usage

### Adding a Transaction

1. **Paste SMS:** Click the clipboard icon and paste a bank SMS
2. **Type manually:** Enter "Coffee 25 SAR" or "Salary received 5000"
3. **Press Enter:** Transaction is parsed and added instantly

### Example Inputs

```
✅ "Purchase of SAR 150.00 at STARBUCKS"
✅ "Transfer of SAR 500 to Ahmed"
✅ "Coffee 25 SAR"
✅ "Salary received 8000 SAR"

❌ "Your OTP is 123456" (blocked - security)
❌ "50% discount offer!" (blocked - promotional)
```

## 🔐 Security

- **Row Level Security (RLS):** Users can only access their own data
- **Supabase Auth:** Secure authentication with email/magic link
- **No sensitive data stored:** SMS content can be deleted after parsing

## 📄 License

MIT License – feel free to use for personal or commercial projects.

## 🙏 Credits

Built with ❤️ in Saudi Arabia.

---

<div align="center">
  <strong>Rqeeb</strong> – رقيب – Your Financial Companion
</div>

