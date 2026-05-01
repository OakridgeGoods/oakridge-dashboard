// Oakridge Goods — Google Sheets config

export const SHEETS = {
  compiledOrders: '1Du92zYghW6T5rgtsFpQTC4WnBi_zAwkK_xkYOUaTCGk',
  amazonOrders:   '1wIEHl3KHWTTezAuBhrUhIWlNSiVIEVoDr9_fbuQr--E',
  datafeeds:      '1V9JKJdjZ4EGwz927_aEagKKTNpzy-cHLvqFJnJj3aws',
  amazonDatafeed: '1L79NQ37VJegctJsZVW1OJb-pW7A1h2OH9kDbP01A1e4',
  masterLogs:     '1daSpxstCYHaKnx_-7BtSSzqdia56CoHDVsmEDeeHnPI',
}

// gid for the master log tab (from the URL you shared) — used to resolve tab name at runtime
export const MASTER_LOG_GID = 1081395476

export const SHEET_TABS = {
  allOrders:  'allorders',
  openOrders: 'openorders',
  log:        'log',
  masterfeed: 'Masterfeed',
  ebayRevise: 'eBay Revise',
}

export const SCRIPTS = {
  // Download — dedicated endpoints, no action param needed
  pullEbayOrders:      'https://script.google.com/macros/s/AKfycbyk4kINhsUVMRK-BBbj4jGA7Rt03rvbgyps-B37h6OUySZdtv2DTkXHv4Y1UlCQ7jue/exec',
  pullAmazonOrders:    'https://script.google.com/macros/s/AKfycbz27w0tTmM5RRm-FqYEdxrA6uJ0Q7-d1ndiiBxEPXi6xBOqbDq4sR3lqX3ljS-kamWL5w/exec',

  // Compile — AllOrders ingest endpoint, routed by action param
  compileOrders:       'https://script.google.com/macros/s/AKfycbwnbc5LGqTbWV34hR-YIWAtJhSs6ggj0rIKVHu9rvBDwHRiUl-lbqjRD6Fuoo_6DC4oRg/exec?action=pullEbay',
  compileAmazonOrders: 'https://script.google.com/macros/s/AKfycbwnbc5LGqTbWV34hR-YIWAtJhSs6ggj0rIKVHu9rvBDwHRiUl-lbqjRD6Fuoo_6DC4oRg/exec?action=pullAmazon',

  // Tracking — AllOrders ingest endpoint, routed by action param
  pushTrackingEbay:    'https://script.google.com/macros/s/AKfycbwnbc5LGqTbWV34hR-YIWAtJhSs6ggj0rIKVHu9rvBDwHRiUl-lbqjRD6Fuoo_6DC4oRg/exec?action=pushEbayTracking',
  pushTrackingAmazon:  'https://script.google.com/macros/s/AKfycbwnbc5LGqTbWV34hR-YIWAtJhSs6ggj0rIKVHu9rvBDwHRiUl-lbqjRD6Fuoo_6DC4oRg/exec?action=pushAmazonTracking',

  // Catalogue — Main System endpoint, routed by action param
  ebayUpdatePrice:     'https://script.google.com/macros/s/AKfycbwV-9fept5iITOqZabfug2i2D2lfi810RfwcyHFTLSm1E2xn2iuPxnwj_KK_Q3ljKc/exec?action=price',
  ebayUpdateStock:     'https://script.google.com/macros/s/AKfycbwV-9fept5iITOqZabfug2i2D2lfi810RfwcyHFTLSm1E2xn2iuPxnwj_KK_Q3ljKc/exec?action=stock',

  // Suppliers — Main System endpoint, routed by action param
  rubiesSync:          'https://script.google.com/macros/s/AKfycbwV-9fept5iITOqZabfug2i2D2lfi810RfwcyHFTLSm1E2xn2iuPxnwj_KK_Q3ljKc/exec?action=rubies',
}

// Default fee rates (can be overridden in margin calc UI)
export const FEES = {
  ebay:   0.1275,
  amazon: 0.15,
  gst:    0.10,
}

export const R2_BASE = 'https://pub-74797056b6a6455ca794187c0ab9a1dc.r2.dev'