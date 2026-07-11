// Deploy this bound to a Google Sheet as an Apps Script Web App. It
// receives full-document snapshots from src/utils/trash.js every time an
// admin saves or soft-deletes a record in one of the TRASH_COLLECTIONS,
// and writes one row per event to a tab named after the collection — so
// even if a document is hard-purged from Firestore, its last known
// contents are still sitting here, readable as real columns (not a JSON
// blob) since each tab only ever holds one collection's shape.
//
// Setup:
//   1. sheets.google.com → Blank spreadsheet → name it e.g.
//      "Rotaract BTM - Data Backup"
//   2. Extensions → Apps Script → delete the placeholder code → paste this
//      whole file → save (Ctrl+S / Cmd+S)
//   3. Deploy → New deployment → type: Web app
//        - Execute as: Me
//        - Who has access: Anyone
//      → Deploy → copy the "Web app URL" (ends in /exec)
//   4. Put that URL in .env as VITE_BACKUP_SHEET_URL, then redeploy the site.
//   5. Re-authorize if Google shows a warning screen — it's your own script.
//
// Updating this script later (e.g. re-pasting a newer version): Deploy →
// Manage deployments → pencil icon on the existing deployment → Deploy.
// That keeps the same /exec URL, so you don't need to touch .env again.

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents)
    const { collection, docId, action, admin, data } = payload
    const record = data ? JSON.parse(data) : {}

    const ss = SpreadsheetApp.getActiveSpreadsheet()
    const tabName = String(collection || 'unknown').slice(0, 90)
    let sheet = ss.getSheetByName(tabName)

    const fixedHeaders = ['Timestamp', 'Action', 'Doc ID', 'Admin']
    // "id" is redundant with Doc ID; everything else becomes its own column.
    const fieldKeys = Object.keys(record).filter(k => k !== 'id')

    if (!sheet) {
      sheet = ss.insertSheet(tabName)
      sheet.appendRow(fixedHeaders.concat(fieldKeys))
      sheet.setFrozenRows(1)
    } else {
      // A record shape can grow over time (e.g. a new form field) — add any
      // new keys as new trailing columns instead of dropping the data.
      const lastCol = sheet.getLastColumn()
      const existingHeaders = lastCol > 0 ? sheet.getRange(1, 1, 1, lastCol).getValues()[0] : []
      const missing = fieldKeys.filter(k => existingHeaders.indexOf(k) === -1)
      if (missing.length) {
        sheet.getRange(1, existingHeaders.length + 1, 1, missing.length).setValues([missing])
      }
    }

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    const row = headers.map(function (h) {
      if (h === 'Timestamp') return new Date()
      if (h === 'Action') return action || ''
      if (h === 'Doc ID') return docId || ''
      if (h === 'Admin') return admin || ''
      const v = record[h]
      if (v === undefined || v === null) return ''
      // Nested objects/arrays (e.g. MoM action items, permission maps) don't
      // flatten sensibly into a cell — keep those as JSON text.
      if (typeof v === 'object') return JSON.stringify(v)
      return v
    })
    sheet.appendRow(row)

    return ContentService.createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON)
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON)
  }
}
