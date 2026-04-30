// Oakridge Goods — Google Sheets config

export const SHEETS = {
  compiledOrders: '1Du92zYghW6T5rgtsFpQTC4WnBi_zAwkK_xkYOUaTCGk',
  amazonOrders:   '1wIEHl3KHWTTezAuBhrUhIWlNSiVIEVoDr9_fbuQr--E',
  datafeeds:      '1V9JKJdjZ4EGwz927_aEagKKTNpzy-cHLvqFJnJj3aws',
  amazonDatafeed: '1L79NQ37VJegctJsZVW1OJb-pW7A1h2OH9kDbP01A1e4',
}

export const SHEET_TABS = {
  allOrders:  'allorders',
  openOrders: 'openorders',
  log:        'log',
  masterfeed: 'Masterfeed',
  ebayRevise: 'eBay Revise',
}

export const SCRIPTS = {
  // Download
  pullEbayOrders:      'https://script.google.com/macros/s/AKfycbxLwZjShVErXHJdyX060gbjcZ_fmU2c7GNO_rp1YjdZwYdE4MWA8BbBvkP4l_K0u7d2/exec',
  pullAmazonOrders:    'https://script.google.com/macros/s/AKfycbxEBb39tWG3hMZwU-QM6q4RXZl0wDaiTJNeLCOT6nk0CdxEZjO-bTuhbAq5TPgxy9wJ8w/exec',
  // Compile
  compileOrders:       'https://script.google.com/macros/s/AKfycbyP09Udc50Kplni2d3jT5VObj4xo9GOq2p-w8eikTjNFPcNv62qGCf2SNja5LpJ61DDeg/exec',
  compileAmazonOrders: '',
  // Tracking
  pushTrackingEbay:    '',
  pushTrackingAmazon:  '',
  // Catalogue
  ebayUpdatePrice:     '',
  ebayUpdateStock:     'https://script.google.com/macros/s/AKfycbz2Th5Ygq71vYiPf4trR81mXPRoVPSbLG8SYcoy3u7OKCEt-XFCEcI3oGjRTBYZTdFw/exec',
  // Suppliers
  rubiesSync:          '',
}

// Default fee rates (can be overridden in margin calc UI)
export const FEES = {
  ebay:   0.1275,
  amazon: 0.15,
  gst:    0.10,
}

export const R2_BASE = 'https://pub-74797056b6a6455ca794187c0ab9a1dc.r2.dev'
