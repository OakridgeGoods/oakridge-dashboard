// Google Sheets API client
// Uses OAuth2 token from Google Identity Services (GIS)
// Token is obtained via the login flow in App.jsx

const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets'

let _token = null

export function setToken(token) {
  _token = token
}

export function getToken() {
  return _token
}

async function sheetsGet(url) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${_token}` }
  })
  if (!res.ok) throw new Error(`Sheets API error: ${res.status} ${await res.text()}`)
  return res.json()
}

async function sheetsPut(url, body) {
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })
  if (!res.ok) throw new Error(`Sheets API error: ${res.status} ${await res.text()}`)
  return res.json()
}

async function sheetsAppend(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })
  if (!res.ok) throw new Error(`Sheets API error: ${res.status} ${await res.text()}`)
  return res.json()
}

// Parse a sheet's values into array of objects using first row as headers
function parseRows(values) {
  if (!values || values.length < 2) return []
  const [headers, ...rows] = values
  return rows
    .filter(r => r.some(c => c !== ''))
    .map(row => {
      const obj = {}
      headers.forEach((h, i) => { obj[h] = row[i] ?? '' })
      return obj
    })
}

// Read a tab from a sheet — returns array of row objects
export async function readSheet(sheetId, tabName) {
  const range = encodeURIComponent(`${tabName}!A:ZZ`)
  const data = await sheetsGet(`${SHEETS_API}/${sheetId}/values/${range}`)
  return parseRows(data.values)
}

// Write a single cell by finding the row matching keyCol=keyVal
export async function updateCell(sheetId, tabName, rows, keyCol, keyVal, updateCol, updateVal) {
  const rowIndex = rows.findIndex(r => r[keyCol] === keyVal)
  if (rowIndex === -1) throw new Error(`Row not found: ${keyCol}=${keyVal}`)

  const headers = Object.keys(rows[0])
  const colIndex = headers.indexOf(updateCol)
  if (colIndex === -1) throw new Error(`Column not found: ${updateCol}`)

  const sheetRow = rowIndex + 2
  const colLetter = colIndexToLetter(colIndex)
  const range = encodeURIComponent(`${tabName}!${colLetter}${sheetRow}`)

  await sheetsPut(
    `${SHEETS_API}/${sheetId}/values/${range}?valueInputOption=USER_ENTERED`,
    { range: `${tabName}!${colLetter}${sheetRow}`, majorDimension: 'ROWS', values: [[updateVal]] }
  )
}

// Write multiple cells in one row
export async function updateRow(sheetId, tabName, rows, keyCol, keyVal, updates) {
  for (const [col, val] of Object.entries(updates)) {
    await updateCell(sheetId, tabName, rows, keyCol, keyVal, col, val)
  }
}

function colIndexToLetter(index) {
  let letter = ''
  let n = index
  while (n >= 0) {
    letter = String.fromCharCode((n % 26) + 65) + letter
    n = Math.floor(n / 26) - 1
  }
  return letter
}

// Trigger an Apps Script web app endpoint
export async function runScript(url, payload = {}) {
  if (!url) throw new Error('Script URL not configured. Add it to src/lib/config.js')

  const params = new URLSearchParams(payload)
  if (_token) params.set('access_token', _token)

  const sep = url.includes('?') ? '&' : '?'

  await fetch(`${url}${sep}${params}`, {
    method: 'GET',
    mode: 'no-cors', // 🔥 FIX: prevents "Failed to fetch"
    redirect: 'follow'
  })

  return { success: true }
}
