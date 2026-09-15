# Dairy Manager — Complete App Report

**Platform:** React Native (Expo SDK ~54) · iOS / Android / Web  
**Navigation:** Expo Router (file-based Stack + custom BottomNav)  
**State:** Zustand with AsyncStorage persistence  
**UI system:** NativeWind (Tailwind) + inline StyleSheet + lucide-react-native icons  
**Theming:** 8 built-in accent colors, fully dynamic, persisted across restarts  

---

## Table of Contents

1. [App Architecture](#1-app-architecture)
2. [Data Models](#2-data-models)
3. [State & Actions](#3-state--actions)
4. [Navigation Flow](#4-navigation-flow)
5. [Screens — Detailed Breakdown](#5-screens--detailed-breakdown)
   - 5.1 Home Dashboard
   - 5.2 Delivery
   - 5.3 Customers List
   - 5.4 Customer Detail
   - 5.5 Billing
   - 5.6 Reports
   - 5.7 Settings
6. [Shared Components](#6-shared-components)
7. [Theme System](#7-theme-system)
8. [Computed Helpers](#8-computed-helpers)
9. [Missing / Planned Screens](#9-missing--planned-screens)
10. [Feature Gaps & Improvement Opportunities](#10-feature-gaps--improvement-opportunities)

---

## 1. App Architecture

```
src/
├── app/                        ← Expo Router screens
│   ├── _layout.tsx             ← Root layout — ThemeProvider + Stack
│   ├── index.tsx               ← Home dashboard (/)
│   ├── delivery.tsx            ← Delivery tracking (/delivery)
│   ├── billing.tsx             ← Billing overview (/billing)
│   ├── reports.tsx             ← Analytics (/reports)
│   ├── settings.tsx            ← App settings (/settings)
│   └── customers/
│       ├── index.tsx           ← Customer list (/customers)
│       └── [id].tsx            ← Customer detail (/customers/:id)
│
├── components/
│   └── ui.tsx                  ← Avatar · TopBar · BottomNav
│
├── constants/
│   └── theme.ts                ← Colors · cardShadow · softShadow · Spacing · Fonts
│
├── context/
│   └── theme-context.tsx       ← AccentColor · ACCENT_COLORS · ThemeProvider · useAppTheme
│
├── lib/
│   └── dairy-store.ts          ← Zustand store: all state, actions, helpers
│
└── hooks/
    ├── use-color-scheme.ts
    └── use-theme.ts
```

**Data flow:**
```
AsyncStorage (persisted JSON)
       ↕  zustand/persist
  useDairyStore
  ├── customers[]
  ├── deliveries[]
  ├── payments[]
  ├── settings
  └── themeAccentId
         ↕
  ThemeContext  →  accent.value / soft / dark / header
         ↕
  Screens (reactive via useDairyStore() + snapshot via .getState())
         ↕
  BottomNav / TopBar (shared chrome)
```

Every screen reads reactive state via `useDairyStore()` for UI re-renders, and calls `useDairyStore.getState()` for snapshot-based computed helpers (e.g. `outstanding`, `milkOn`) to avoid unnecessary re-renders.

---

## 2. Data Models

### Customer
| Field | Type | Description |
|---|---|---|
| `id` | `string` | Unique identifier (uid) |
| `name` | `string` | Full name |
| `phone` | `string` | Contact number |
| `address` | `string` | Delivery address |
| `morningQty` | `number` | Litres per morning delivery |
| `eveningQty` | `number` | Litres per evening delivery |
| `rate` | `number` | ₹ per litre |
| `paused` | `boolean` | Whether deliveries are paused |
| `openingBalance` | `number` | Pre-existing balance carried forward |

### DeliveryRecord
| Field | Type | Description |
|---|---|---|
| `id` | `string` | Unique identifier |
| `customerId` | `string` | FK → Customer.id |
| `date` | `string` | `yyyy-mm-dd` ISO date |
| `slot` | `'morning' \| 'evening'` | Delivery slot |
| `qty` | `number` | Litres delivered |
| `rate` | `number` | ₹/L at time of delivery (snapshot) |
| `status` | `'delivered' \| 'pending' \| 'not_delivered'` | Delivery outcome |

### Payment
| Field | Type | Description |
|---|---|---|
| `id` | `string` | Unique identifier |
| `customerId` | `string` | FK → Customer.id |
| `date` | `string` | `yyyy-mm-dd` |
| `amount` | `number` | ₹ amount paid |
| `method` | `'cash' \| 'upi' \| 'bank'` | Payment method |
| `notes` | `string?` | Optional note (e.g. "NEFT", "Part payment") |

### Settings
| Field | Type | Description |
|---|---|---|
| `dairyName` | `string` | Business name (shown in header) |
| `ownerName` | `string` | Owner name (shown in avatar) |
| `defaultRate` | `number` | Default ₹/L for new customers |
| `deliveryCharge` | `number` | Fixed delivery surcharge |

### Enums
```
Slot            = "morning" | "evening"
DeliveryStatus  = "delivered" | "pending" | "not_delivered"
PaymentMethod   = "cash" | "upi" | "bank"
Lang            = "en" | "hi"
```

---

## 3. State & Actions

### State Fields
| Field | Type | Default |
|---|---|---|
| `customers` | `Customer[]` | 5 seeded sample customers |
| `deliveries` | `DeliveryRecord[]` | 21 days of seeded records |
| `payments` | `Payment[]` | 5 seeded payments |
| `settings` | `Settings` | dairyName: "Vishal Dairy", defaultRate: ₹60, deliveryCharge: ₹100 |
| `lang` | `Lang \| null` | `"en"` |
| `themeAccentId` | `string` | `"mono"` |

### Actions
| Action | Signature | What it does |
|---|---|---|
| `saveCustomer` | `(c: Customer)` | Upsert — updates if `id` exists, appends otherwise |
| `deleteCustomer` | `(id: string)` | Cascades: removes customer + all their deliveries + all their payments |
| `togglePause` | `(id: string)` | Flips `paused` boolean for the customer |
| `setStatus` | `(customerId, date, slot, status, qty, rate)` | Upserts a single delivery record — updates status if exists, creates if not |
| `markAll` | `(date, slot, status, customers)` | Bulk-upserts all eligible (non-paused, qty > 0) customers for a date/slot |
| `addPayment` | `(p: Omit<Payment, 'id'>)` | Appends a new payment with auto-generated ID |
| `saveSettings` | `(s: Settings)` | Replaces settings entirely |
| `resetAll` | `()` | Resets all data to seeded defaults |
| `setLang` | `(lang: Lang)` | Sets UI language |
| `setThemeAccentId` | `(id: string)` | Persists accent selection |

---

## 4. Navigation Flow

### Tab Structure (BottomNav — 5 tabs)
```
/           Home Dashboard
/customers  Customer List
/billing    Billing Overview
/reports    Analytics
/settings   App Settings
```

### Stack Flows
```
/ (Home)
 └── /delivery               ← via "Start Delivery" CTA or Quick Access tile

/customers (List)
 ├── /customers/new          ← via + button in header (NOT YET BUILT)
 └── /customers/:id          ← tap any customer row
      ├── /customers/:id/ledger     ← "View Ledger"    (NOT YET BUILT)
      ├── /customers/:id/payments   ← "Payment History" (NOT YET BUILT)
      ├── /customers/:id/bill       ← "Generate Bill"  (NOT YET BUILT)
      └── /customers/:id/payment    ← "Add Payment" CTA (NOT YET BUILT)

/billing (Overview)
 ├── /customers/:id          ← tap customer name row
 ├── /customers/:id/bill     ← "Bill" button          (NOT YET BUILT)
 └── /customers/:id/payment  ← "Pay" button           (NOT YET BUILT)
```

All screens with "NOT YET BUILT" are referenced via `router.push(... as any)` but have no corresponding screen file.

---

## 5. Screens — Detailed Breakdown

---

### 5.1 Home Dashboard — `/`

**File:** `src/app/index.tsx`  
**Purpose:** The command center. Shows today's delivery progress, a real-time snapshot of milk volumes and financials, quick navigation to all major features, and a live activity feed.

#### Sections

**Top Bar**
- Owner avatar circle (accent color, first initial of ownerName)
- Dairy name + "Pro" badge (accent soft background)
- Bell icon — badge shows `pendingCount` when > 0 (no-op tap currently)

**Search Bar**
- TextInput with placeholder "Search deliveries, customers..."
- Filter icon (Settings2) — not wired to any action yet

**Hero Card** — the focal point
- Full-width LinearGradient card using `accent.dark → accent.value → accent.value + 'CC'`
- Date chip showing today's day/date
- "Pending Deliveries" label
- Giant number: `pendingCount / totalSlots`
- Progress bar: `deliveredCount / totalSlots` as a percentage
- Sub-text: `X delivered · Y% done`
- "Start Delivery" CTA button → `/delivery`
- Decorative milk bottle illustration (right side)

**3-Stat Strip**
| Stat | Icon | Color |
|---|---|---|
| Today's Milk (L) | Milk | accent |
| Collected (₹) | IndianRupee | info blue |
| Active Customers | UserPlus | orange |

**Quick Access Grid**  
4 icon tiles in a horizontal row:
| Tile | Route |
|---|---|
| Delivery | `/delivery` |
| Customers | `/customers` |
| Billing | `/billing` |
| Reports | `/reports` |

**Today's Overview — 2 Side-by-Side Cards**
- Today's Milk card: label (accent color), big number, 7-day sparkline (accent)
- Today's Collection card: label (info blue), big number, 7-day sparkline (blue)
- Decorative watermark image behind each card

**Financial Info Strip**
- Est. dues this month (billed – paid for current month)
- Total outstanding (all-time billed – all-time paid + opening balances)
- "Customers with due >₹500" row — only shown when `highBalanceCount > 0`
- Colors: green = 0, red = positive balance

**Recent Activity**
- Last 5 delivery records from today, reversed (newest first)
- Each row: slot + customer name, date + qty + ₹ value, status pill (Completed / Skipped / Pending)
- "View All" → `/delivery`

#### Computed values
- `pendingCount`, `deliveredCount`, `notDeliveredCount`, `totalSlots`, `progressPct` — from `statusFor` for every active customer/slot
- `totalMilk`, `totalCollection` — from `milkOn` / `collectionOn` for today
- `monthBilled`, `monthPaid`, `monthPending` — from `customerBilled` / `customerPaid` with month date range
- `totalOut` — from `totalOutstanding`
- `highBalanceCount` — customers with `outstanding > 500`
- `milkData`, `collData` — last 7 days of milk/collection for sparklines

---

### 5.2 Delivery — `/delivery`

**File:** `src/app/delivery.tsx`  
**Purpose:** The day-to-day operational screen. A milkman opens this and marks each customer as delivered, skipped, or pending, for a given date and slot.

#### Sections

**Date Selector**
- Left/right chevron arrows for ±1 day navigation
- Formatted date display (`DD Mon YYYY`)
- Calendar icon (tap not wired)
- Default: today's date

**Slot Toggle**
- "Morning" / "Evening" pill buttons
- Active slot highlighted with `accent.value` background + white text

**Progress Pill**
- `deliveredCount / list.length` delivered
- Inline progress bar (accent color, 30% opacity track)
- Percentage complete

**Search Bar**
- Filters the customer list by name in real-time

**Customer Delivery Cards**
Each card shows:
- Avatar (initial, accent soft)
- Customer name
- Quantity (L) in accent color · ₹ value in muted text
- Status toggle button (circular, right side):
  - `pending` → gray `CircleDashed` icon
  - `delivered` → green (accent) `Check` icon
  - `not_delivered` → red `X` icon
  - **Tap cycles:** `pending → delivered → not_delivered → pending`

**Bottom CTA**
- "Mark All Delivered" button — calls `markAll(date, slot, 'delivered', customers)`

#### Status Cycle
```
pending ──tap──→ delivered ──tap──→ not_delivered ──tap──→ pending
```

Each tap calls `setStatus(c.id, date, slot, nextStatus, qty, c.rate)`.

#### Filtering Logic
Customers are shown only if:
1. `!c.paused`
2. The quantity for the selected slot (`morningQty` or `eveningQty`) is `> 0`
3. Name matches the search query

---

### 5.3 Customers List — `/customers`

**File:** `src/app/customers/index.tsx`  
**Purpose:** Browse all customers, check their outstanding balance at a glance, and drill into individual profiles.

#### Sections

**Header** (accent gradient)
- "Customers" title
- `activeCount active · X total` subtitle
- `+` UserPlus button → `/customers/new` (NOT YET BUILT)

**Search Bar**
- Filters by name (real-time `toLowerCase` match)
- SlidersHorizontal filter icon (not wired)

**Customer List Cards**
Each card shows:
- Avatar (initial)
- Name + "PAUSED" badge (orange) if paused
- Phone number (Phone icon)
- Outstanding balance (red if > 0, green if 0)
- "Balance" label
- ChevronRight
- **Tap** → `/customers/:id`

**Empty State**  
"No customers found." card when search returns nothing.

---

### 5.4 Customer Detail — `/customers/:id`

**File:** `src/app/customers/[id].tsx`  
**Purpose:** Full customer profile — stats, delivery rate, and actions (ledger, billing, payment, pause/resume).

#### Sections

**TopBar**
- "Customer Details" title
- Back arrow → `router.back()`

**Profile Card**
- Large avatar (76px)
- Full name
- "PAUSED" badge (orange) if paused
- Phone number + address

**Stats Grid** — 3 equal cards
| Stat | Value |
|---|---|
| Morning | `morningQty` L |
| Evening | `eveningQty` L |
| Balance | `outstanding` (red/green) |

**Rate Card**
- Accent soft background
- `₹{rate}` per litre with Milk icon

**Actions List**
| Action | Icon | Destination |
|---|---|---|
| View Ledger | BookOpen (accent) | `/customers/:id/ledger` (NOT YET BUILT) |
| Payment History | ReceiptText (warning) | `/customers/:id/payments` (NOT YET BUILT) |
| Generate Bill | FileText (accent) | `/customers/:id/bill` (NOT YET BUILT) |
| Pause / Resume Delivery | Pause / Play (danger) | `togglePause(c.id)` |

**Bottom CTA**
- "Add Payment" full-width accent button → `/customers/:id/payment` (NOT YET BUILT)

**Not Found State**  
Shown if the `id` param doesn't match any customer.

---

### 5.5 Billing — `/billing`

**File:** `src/app/billing.tsx`  
**Purpose:** Financial hub — view every customer's outstanding balance, generate bills, and record payments — all from one list.

#### Sections

**Header** (accent gradient)
- "Billing" title + "Manage payments & receipts" subtitle
- ReceiptText icon
- "Total Outstanding" pill — sum of all customer balances

**Search Bar**
- Filters customer list by name in real-time

**Customer Billing Cards**  
Each card has two parts:

*Top row (tap → customer detail):*
- Avatar
- Customer name + "Outstanding Balance" label
- Balance amount (red/green)
- ChevronRight

*Action row:*
| Button | Style | Action |
|---|---|---|
| Bill | accent soft bg | → `/customers/:id/bill` (NOT YET BUILT) |
| Pay | accent solid | → `/customers/:id/payment` (NOT YET BUILT) |

**Empty State**  
"No customers found."

---

### 5.6 Reports — `/reports`

**File:** `src/app/reports.tsx`  
**Purpose:** Analytics snapshot — outstanding balance, 7-day delivery and collection summaries, a daily milk bar chart, and a ledger export entry point.

#### Sections

**Header** (accent gradient)
- "Reports" title + "Analytics & trends" subtitle
- Activity icon

**Total Outstanding Card**
- Large number in red (> 0) or green (= 0)
- "Live Sync" badge chip with TrendingUp icon (accent)

**Last 7 Days Section**

Two side-by-side stat cards:
| Card | Icon | Value |
|---|---|---|
| Collection | IndianRupee (accent) | Sum of all payments in last 7 days |
| Delivered | Milk (accent) | Sum of all delivered milk in last 7 days |

**Daily Milk Bar Chart**  
Custom inline bar chart (no external chart library):
- 7 bars, one per day (Mon–Sun short labels)
- Heights proportional to `milkOn(state, date)` against the 7-day max
- Today's bar: full `accent.value`
- Past bars: `accent.value` at 40% opacity (`${accent.value}40`)
- Fixed chart height: 80px

**Detailed Ledger Row**
- FileText icon (accent soft circle) + "Detailed Ledger" + "Export customer data"
- Download icon (accent)
- **Tap not wired** — no export logic implemented

---

### 5.7 Settings — `/settings`

**File:** `src/app/settings.tsx`  
**Purpose:** Personalize the app — choose a theme color, configure business details, view app info, and reset all data.

#### Sections

**Header** (accent gradient)
- "Settings" title
- Palette icon

**Theme Color Section**

Color swatch grid (8 themes, 2-row wrap):
| id | Label | Hex |
|---|---|---|
| mono | Monochrome | #1A1A1A |
| green | Forest | #00A350 |
| blue | Ocean | #2563EB |
| purple | Violet | #7C3AED |
| rose | Rose | #E11D48 |
| amber | Amber | #D97706 |
| teal | Teal | #0D9488 |
| slate | Slate | #475569 |

- Each swatch: 48px circle, colored background
- Active state: checkmark (white), glow shadow, accent-colored border ring
- Label below swatch (accent color if active, muted otherwise)
- **Tap** → `setAccentId(color.id)` → theme updates app-wide instantly

**Preview Strip**
- 3 live-preview buttons: "Primary" (solid fill), "Soft" (light tint), "Outline" (border only)
- Reacts immediately to swatch taps

**Dairy Info Section**

| Field | Input | Icon |
|---|---|---|
| Dairy Name | Text | Store |
| Owner Name | Text | User |
| Default Rate (₹/L) | Decimal | IndianRupee |
| Delivery Charge (₹) | Decimal | IndianRupee |

- "Save Changes" button → `saveSettings(...)` + `Alert.alert('Saved', ...)`
- Inputs are controlled components initialized from persisted settings

**About Section**
- App Version: 1.0.0
- Dairy Manager: Free

**Danger Zone**
- "Reset All Data" button (red, full width)
- Triggers `Alert.alert` with "This will delete all customers, deliveries, and payments. This cannot be undone."
- On confirm: `resetAll()` + `router.replace('/')`

---

## 6. Shared Components

### `Avatar({ name, size })`
Circular view with `accent.soft` fill. Shows the first uppercase letter of `name` in `accent.value`. Size defaults to 40. Used in customer cards, delivery list, billing list, and detail screen.

### `TopBar({ title, right? })`
Standard back-navigation header. Card white background, `cardShadow`. Left: circular back button with `Colors.surface` fill. Center: title text. Right: optional slot (currently unused by any screen). Used by Delivery and Customer Detail.

### `BottomNav()`
Persistent absolute-positioned tab bar at screen bottom. 5 tabs: Home, Customers, Billing, Reports, Settings. Active tab uses `accent.value` for both the icon and the label, with `accent.soft` container background. Inactive = `#AAAAAA`. Uses `usePathname()` for active state detection. `paddingBottom: 24` accommodates home indicator on iOS.

---

## 7. Theme System

### `AccentColor` Interface
```typescript
interface AccentColor {
  id: string;      // e.g. 'green'
  label: string;   // e.g. 'Forest'
  value: string;   // Primary hex — icons, text, active states
  dark: string;    // Darker variant — shadows, gradient start
  soft: string;    // Very light tint — chip/badge backgrounds
  header: string;  // Header gradient color (= value in all current themes)
}
```

### Usage Pattern Across Screens
| Usage | Property |
|---|---|
| Avatar background | `accent.soft` |
| Avatar text | `accent.value` |
| Pro badge bg | `accent.soft` |
| Pro badge text/dot | `accent.value` |
| Hero card gradient | `[accent.dark, accent.value, accent.value + 'CC']` |
| Today's Milk icon bg | `accent.soft` |
| Today's Milk icon | `accent.value` |
| Sparkline (milk) | `accent.value` |
| Bar chart (today) | `accent.value` |
| Bar chart (past) | `accent.value + '40'` |
| BottomNav active icon | `accent.value` |
| BottomNav active bg | `accent.soft` |
| Screen headers | `accent.header` |
| "Pay" CTA buttons | `accent.value` |
| Soft action buttons | `accent.soft` + `accent.value` text |
| Search filter icon | `accent.value` |
| All "primary" accent text | `accent.value` |

### Static `Colors` Palette
```
background:      #F7F7F7   foreground:    #111111
card:            #FFFFFF   surface:       #EBEBEB
border:          #E0E0E0   muted:         #F2F2F2
mutedForeground: #888888

danger:          #E11D48   dangerSoft:    #FFF1F2
warning:         #D97706   warningSoft:   #FFFBEB
info:            #2563EB   infoSoft:      #EFF6FF
success:         #059669   successSoft:   #ECFDF5
```

---

## 8. Computed Helpers

All defined in `src/lib/dairy-store.ts` as pure functions — callable from anywhere using `useDairyStore.getState()`.

| Helper | Returns | Formula |
|---|---|---|
| `todayISO()` | `string` | `new Date().toISOString().slice(0, 10)` |
| `uid()` | `string` | `Math.random().toString(36).slice(2, 10)` |
| `statusFor(state, customerId, date, slot)` | `DeliveryStatus` | Find matching delivery record → return `.status`, default `"pending"` |
| `milkOn(state, date)` | `number` | Sum `qty` of all `status === 'delivered'` records on that date |
| `collectionOn(state, date)` | `number` | Sum `amount` of all payments on that date |
| `money0(n)` | `string` | `"₹" + Math.round(n).toLocaleString("en-IN")` |
| `customerBilled(state, id, from?, to?)` | `number` | Sum `qty * rate` for delivered records of a customer (optional date range) |
| `customerPaid(state, id, from?, to?)` | `number` | Sum payment amounts for a customer (optional date range) |
| `outstanding(state, id)` | `number` | `openingBalance + customerBilled(all time) - customerPaid(all time)` |
| `totalOutstanding(state)` | `number` | Sum of `outstanding()` across all customers |

---

## 9. Missing / Planned Screens

These routes are referenced in the code via `router.push(... as any)` but have no screen file implemented yet:

| Route | Entry points | Feature needed |
|---|---|---|
| `/customers/new` | Customers list header `+` | Form to create a new customer (name, phone, address, morning qty, evening qty, rate, opening balance) |
| `/customers/:id/ledger` | Customer Detail → "View Ledger" | Day-by-day delivery history table for a customer |
| `/customers/:id/payments` | Customer Detail → "Payment History" | List of all payment records for a customer |
| `/customers/:id/bill` | Customer Detail, Billing screen "Bill" button | Bill generation — delivery charges for a date range with a summary |
| `/customers/:id/payment` | Customer Detail "Add Payment" CTA, Billing screen "Pay" button | Form to record a cash/UPI/bank payment with optional notes |

---

## 10. Feature Gaps & Improvement Opportunities

### Critical (blocking common workflows)
1. **Add Customer screen** — the entire customer creation flow is missing. Without it, users can't add real customers beyond the seeded 5.
2. **Add Payment screen** — recording payments is one of the two core daily workflows. The route is referenced everywhere but not built.
3. **Bill generation screen** — the other primary billing action is missing.
4. **Search bar on Home** — the search bar is rendered but not wired to any filter logic.

### High Value
5. **Customer Ledger** — chronological view of deliveries + payments + running balance. Essential for dispute resolution and month-end reconciliation.
6. **Payment History** — per-customer list of all payments made.
7. **Edit Customer** — no way to update a customer's rate, address, or quantities after creation.
8. **Delete Customer** — the store has `deleteCustomer()` action but no UI to trigger it.
9. **Month-range selector on Reports** — the Reports screen is always fixed to last 7 days / all-time. Adding a date picker or month toggle would be much more useful.

### UX Polish
10. **Bell notification — functional** — the bell icon shows a badge but taps do nothing. Should navigate to pending deliveries or show a notification list.
11. **Delivery calendar icon** — the calendar icon next to the date arrows doesn't open a date picker.
12. **Search/filter on Customers** — the SlidersHorizontal icon is rendered but not wired. Filters by paused/active status would be useful.
13. **Quick Access "Customize"** — the Customize button is rendered with a pencil icon but has no action.
14. **Ledger export** — the "Detailed Ledger" row in Reports has a Download icon but no export logic. PDF or CSV export would complete the feature.
15. **Language switching** — `lang: "en" | "hi"` is stored and `setLang` action exists, but no UI is present to switch languages, and no i18n strings are wired up.

### Architectural
16. **Opening balance per customer** — `openingBalance` is in the data model but there's no UI to set it when creating/editing a customer. It's hardcoded in the seed data.
17. **Delivery charge** — `deliveryCharge` is in Settings but it's never applied to any billing calculation in the current code.
18. **Rate snapshot** — `DeliveryRecord.rate` correctly snapshots the rate at time of delivery, which is good. But there's no UI feedback to the user when a customer's rate changes mid-month.
19. **Offline-first** — the app is already offline-first by design (Zustand + AsyncStorage). Cloud sync or backup is a natural next step.
20. **No loading/error states** — the store never enters a loading or error state, which is fine for local-only. Would need handling if a backend is added.
