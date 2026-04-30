# Oakridge Goods — Operations Dashboard

React + Vite app deployed on Cloudflare Pages. Reads/writes directly to Google Sheets via the Sheets API. Triggers Apps Script functions via their web app deployment URLs.

---

## Setup

### 1. Google OAuth Client ID

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project named `oakridge-dashboard`
3. Enable the **Google Sheets API**: APIs & Services → Enable APIs → search "Sheets"
4. Create credentials: APIs & Services → Credentials → Create OAuth 2.0 Client ID
   - Application type: **Web application**
   - Authorised JavaScript origins:
     - `http://localhost:5173` (dev)
     - `https://oakridge-dashboard.pages.dev` (prod, or your custom domain)
5. Copy the Client ID

### 2. Local dev

```bash
cp .env.example .env.local
# Paste your Client ID into .env.local

npm install
npm run dev
```

Open http://localhost:5173 — sign in with Google → you're live against your real sheets.

### 3. Apps Script endpoints (for Feeds page)

For each Apps Script function you want to trigger from the dashboard:

1. Open the Google Sheet → Extensions → Apps Script
2. Wrap the function in a `doPost(e)` handler:
   ```js
   function doPost(e) {
     pullEbayOrders() // or whichever function
     return ContentService.createTextOutput(JSON.stringify({ message: 'Done' }))
       .setMimeType(ContentService.MimeType.JSON)
   }
   ```
3. Deploy → New deployment → Web app
   - Execute as: **Me**
   - Who has access: **Anyone** (or Anyone with Google account)
4. Copy the deployment URL
5. Paste it into `src/lib/config.js` in the `SCRIPTS` object

### 4. Deploy to Cloudflare Pages

```bash
# One-time: connect your GitHub repo to Cloudflare Pages
# Or deploy directly:
npm run build

# Upload dist/ folder in Cloudflare Pages dashboard
# Or use Wrangler CLI:
npx wrangler pages deploy dist
```

Set your `VITE_GOOGLE_CLIENT_ID` as an Environment Variable in the Cloudflare Pages dashboard.

---

## Sheet IDs (auto-configured in src/lib/config.js)

| Sheet | ID |
|-------|----|
| compiled-orders | `1Du92zYghW6T5rgtsFpQTC4WnBi_zAwkK_xkYOUaTCGk` |
| amazon-order-download | `1wIEHl3KHWTTezAuBhrUhIWlNSiVIEVoDr9_fbuQr--E` |
| Datafeeds (Masterfeed) | `1V9JKJdjZ4EGwz927_aEagKKTNpzy-cHLvqFJnJj3aws` |
| Amazon Datafeed | `1L79NQ37VJegctJsZVW1OJb-pW7A1h2OH9kDbP01A1e4` |

---

## Project structure

```
src/
  lib/
    config.js     — sheet IDs, script URLs, fee rates
    sheets.js     — Google Sheets API client
  components/
    Sidebar.jsx   — nav sidebar
    UI.jsx        — shared components (Button, Badge, Table, etc.)
  pages/
    Orders.jsx    — orders dashboard
    Catalogue.jsx — product catalogue
    Feeds.jsx     — script runner
    Margins.jsx   — margin calculator
  App.jsx         — layout + Google OAuth
  main.jsx        — entry point
  index.css       — global styles + CSS vars
```

## Coming next

- [ ] Add Product form with AI-generated eBay/Amazon content
- [ ] Bulk price/margin editor
- [ ] Rubies Deerfield stock sync panel
- [ ] Revenue & margin reporting charts
- [ ] Supplier management module
- [ ] AusPost label CSV auto-generator from order dimensions
