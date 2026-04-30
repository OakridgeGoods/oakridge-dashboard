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
  pullEbayOrders:      'https://script.google.com/macros/s/AKfycbwDuDHAu8zM2YwEYphZ8z3MLD6xhKxSHxzeBrfqxVCDG4XXBXctmXDESNx19Pd4cqot/exec',
  pullAmazonOrders:    'https://script.google.com/macros/s/AKfycbwcI9MSH08YVJh0kV05s-Q7rt7SbUmg5vZqRi48u006I2tjbCDF5H9pKbWqfnNPARLHdg/exec',

  // Compile
  compileOrders:       'https://script.google.com/macros/s/AKfycbzxlYTeVsfW0MldG29uc0NWGHwjucmqSDY5JVIUmlGynDtvEVPslwqnxzxlpSLNg_Ja-g/exec',
  compileAmazonOrders: 'https://script.google.com/macros/s/AKfycby5uLlST6ytvhUCjBONLMjJWH0lIKEWQUvfMfjDA3M3t_TCeQekwbUa7gqViPwBPvX95Q/exec',

  // Tracking
  pushTrackingEbay:    'https://script.google.com/macros/s/AKfycbzrd39OfmQ-EmEjlxx8H8RtTzMbJqC9uUf8zmnXQjt5BeAlLUWa7Ayz7ido0RZP8rTKaQ/exec',
  pushTrackingAmazon:  'https://script.google.com/macros/s/AKfycbwFjD4kBkmWO_PttDiIazBW-21ifqlLVLU-XfR8DshhjSoGmIwY-w1CvZNkAljdgmyxTg/exec',

  // Catalogue
  ebayUpdatePrice:     'https://script.google.com/macros/s/AKfycbxjwK_JqZ8b2jAuEh45LqecIEbW3sf-0yh2tAg0KawUnjxCeKsx2IkTpdAOdkT2Sypx/exec',
  ebayUpdateStock:     'https://script.google.com/macros/s/AKfycbxtTmfX02hXKlAnGu_U5YZs3GlPcJqdmdPMc2oW_Cdhs0al1Ze7WlweKKPHBpqMHYiu/exec',

  // Suppliers
  rubiesDeerfieldSync: 'https://script.google.com/macros/s/AKfycbwgZyc4--EUhezKK2tlsBXGBTrx_qhsBHA0nV78q4nA2v_RrAcOPtHoaODPJUwf2J8u/exec',
}

// Default fee rates (can be overridden in margin calc UI)
export const FEES = {
  ebay:   0.1275,
  amazon: 0.15,
  gst:    0.10,
}

export const R2_BASE = 'https://pub-74797056b6a6455ca794187c0ab9a1dc.r2.dev'
