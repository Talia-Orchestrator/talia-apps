(function (root) {
  'use strict';
  const MAX_BYTES = 2 * 1024 * 1024;
  const MAX_ROWS = 5000;
  const MAX_COLUMNS = 100;

  function parseDocument(text) {
    if (new TextEncoder().encode(text).length > MAX_BYTES) throw new Error('CSV exceeds the 2 MB limit');
    text = text.replace(/^\uFEFF/, '');
    const records = [];
    let row = [];
    let field = '';
    let quoted = false;
    let closedQuote = false;
    function finishField() {
      row.push(field);
      if (row.length > MAX_COLUMNS) throw new Error('CSV exceeds the 100 column limit');
      field = '';
      closedQuote = false;
    }
    function finishRow() {
      finishField();
      if (row.some(value => value !== '')) records.push(row);
      if (records.length > MAX_ROWS + 1) throw new Error('CSV exceeds the 5000 row limit');
      row = [];
    }
    for (let index = 0; index < text.length; index += 1) {
      const char = text[index];
      if (quoted) {
        if (char === '"' && text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else if (char === '"') {
          quoted = false;
          closedQuote = true;
        } else field += char;
      } else if (char === ',') finishField();
      else if (char === '\n' || char === '\r') {
        if (char === '\r' && text[index + 1] === '\n') index += 1;
        finishRow();
      } else if (char === '"' && field === '' && !closedQuote) quoted = true;
      else {
        if (char === '"' || closedQuote) throw new Error('Unexpected content around a quoted field');
        field += char;
      }
    }
    if (quoted) throw new Error('Unclosed quoted field');
    if (field !== '' || row.length || closedQuote) finishRow();
    if (!records.length) return { headers: [], rows: [] };
    const headers = records.shift();
    if (new Set(headers).size !== headers.length || headers.some(header => !header.trim())) {
      throw new Error('CSV headers must be present and unique');
    }
    const rows = records.map(values => {
      if (values.length !== headers.length) throw new Error('CSV row has a different number of fields than its header');
      return Object.fromEntries(headers.map((header, index) => [header, values[index]]));
    });
    return { headers, rows };
  }
  function parseCsv(text) { return parseDocument(text).rows; }
  const api = { parseCsv, parseDocument, MAX_BYTES, MAX_ROWS, MAX_COLUMNS };
  root.TaliaCsvViewer = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(globalThis);
