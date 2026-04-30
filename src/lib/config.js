// Oakridge Goods — Google Sheets config
// Sheet IDs sourced from Google Drive

export const SHEETS = {
  compiledOrders: '1Du92zYghW6T5rgtsFpQTC4WnBi_zAwkK_xkYOUaTCGk',
  amazonOrders:   '1wIEHl3KHWTTezAuBhrUhIWlNSiVIEVoDr9_fbuQr--E',
  datafeeds:      '1V9JKJdjZ4EGwz927_aEagKKTNpzy-cHLvqFJnJj3aws',
  amazonDatafeed: '1L79NQ37VJegctJsZVW1OJb-pW7A1h2OH9kDbP01A1e4',
}

export const SHEET_TABS = {
  allOrders:    'allorders',
  openOrders:   'openorders',
  log:          'log',
  masterfeed:   'Masterfeed',
  ebayRevise:   'eBay Revise',
}

// Apps Script web app deployment URLs
// Add these after deploying each script as a web app in Apps Script
export const SCRIPTS = {
  // Download
  pullEbayOrders:       '', // syncEbayOrdersToSheet
  pullAmazonOrders:     '', // spSyncOrdersFlat
  // Compile
  compileOrders:        '', // pullEbayIntoAllOrders
  compileAmazonOrders:  '', // pullAmazonIntoAllOrders
  // Tracking
  pushTrackingEbay:     '', // pushTrackingToEbayFromSheet
  pushTrackingAmazon:   '', // pushTrackingToAmazonFromSheet
  // Catalogue
  ebayUpdatePrice:      '', // ebayUpdatePriceOnly
  ebayUpdateStock:      '', // ebayUpdateStockByItemID
  // Suppliers
  rubiesSync:           '', // syncRubiesStock (not built yet)
}

// eBay/Amazon fee rates for margin calc
export const FEES = {
  ebay:   0.1275,
  amazon: 0.15,
  gst:    0.10,
}

// Cloudflare R2 public base URL
export const R2_BASE = 'https://pub-74797056b6a6455ca794187c0ab9a1dc.r2.dev'
