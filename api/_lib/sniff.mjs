// What a CV file really is, from its bytes (never from its name or the browser's MIME type): 'pdf', 'docx', 'doc'
// or null. A file is accepted only when this matches the extension it was uploaded with (api/apply.mjs).
// Everything here only reads the bytes in memory; nothing is unpacked, written or run.

const ascii = (s) => Uint8Array.from(s, (c) => c.charCodeAt(0));
const utf16 = (s) => {
  const out = new Uint8Array(s.length * 2);
  for (let i = 0; i < s.length; i++) out[i * 2] = s.charCodeAt(i);
  return out;
};
const startsWith = (b, sig) => b.length >= sig.length && sig.every((x, i) => b[i] === x);

function indexOf(hay, needle, from = 0) {
  const first = needle[0], last = hay.length - needle.length;
  outer: for (let i = hay.indexOf(first, from); i !== -1 && i <= last; i = hay.indexOf(first, i + 1)) {
    for (let j = 1; j < needle.length; j++) if (hay[i + j] !== needle[j]) continue outer;
    return i;
  }
  return -1;
}

// ---------- PDF ----------
// The header must be the very first bytes (no leading junk: that blocks most polyglots). Then a best-effort scan for
// active content in the PDF's plain object syntax. Stream bodies (from the end of line after each `stream` keyword to
// its `endstream`) are skipped: compressed data contains any short byte pattern such as "/JS" by chance, which would
// refuse legitimate large PDFs. So names inside compressed object streams or written with #xx escapes are not found,
// and a stray "stream" word in a comment or string can hide what follows it up to the next `endstream`. The CV is only
// e-mailed, never opened or served here, so this is a filter, not a guarantee. One pass, linear in the file size.
const PDF_SIG = ascii('%PDF-');
const PDF_ACTIVE = ['/JavaScript', '/JS', '/Launch', '/EmbeddedFile', '/RichMedia'].map(ascii);
const STREAM = ascii('stream'), ENDSTREAM = ascii('endstream');
const isNameChar = (c) => (c >= 0x30 && c <= 0x39) || (c >= 0x41 && c <= 0x5a) || (c >= 0x61 && c <= 0x7a);

// true when the bytes (outside any stream body) hold none of the active-content names
function plainOk(part) {
  for (const name of PDF_ACTIVE) {
    for (let i = indexOf(part, name); i !== -1; i = indexOf(part, name, i + 1)) {
      // a whole PDF name: /JS followed by a delimiter, not /JSomething
      if (!isNameChar(part[i + name.length])) return false;
    }
  }
  return true;
}

function pdfOk(b) {
  let pos = 0;
  for (;;) {
    let s = indexOf(b, STREAM, pos);
    // "endstream" contains "stream": it closes a body (already skipped), it does not open one
    while (s !== -1 && s >= 3 && b[s - 3] === 0x65 && b[s - 2] === 0x6e && b[s - 1] === 0x64) s = indexOf(b, STREAM, s + 1);
    if (s === -1) return plainOk(b.subarray(pos));
    if (!plainOk(b.subarray(pos, s))) return false;
    let body = s + STREAM.length;
    if (b[body] === 0x0d) body += b[body + 1] === 0x0a ? 2 : 1; else if (b[body] === 0x0a) body++;
    const end = indexOf(b, ENDSTREAM, body);
    if (end === -1) return false;                                              // a stream that never ends: refuse
    pos = end;
  }
}

// ---------- DOCX (Office Open XML, a ZIP) ----------
// Reads the ZIP's central directory (entry names are stored plainly, so nothing needs unpacking). A Word document
// has [Content_Types].xml and word/document.xml; a macro-enabled one (.docm renamed .docx) carries a VBA project.
// Anything this reader does not handle (ZIP64, split archives, encrypted entries, broken offsets) is refused.
const ZIP_SIG = [0x50, 0x4b, 0x03, 0x04];
const MAX_ENTRIES = 2000;

function docxOk(b) {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  // end of central directory: 22 bytes + a comment of up to 65535 bytes at the very end. It must be the only such record
  // in that stretch and its comment must end exactly at the end of the file: otherwise a second, decoy directory can
  // hide inside the real record's comment (or after it), showing a clean entry list while the real one has a VBA project.
  let eocd = -1;
  const low = Math.max(0, b.length - 22 - 0xffff);
  for (let i = b.length - 22; i >= low; i--) {
    if (dv.getUint32(i, true) === 0x06054b50) {
      if (eocd >= 0) return false;                                             // a second end record: ambiguous
      eocd = i;
    }
  }
  if (eocd < 0) return false;
  if (eocd + 22 + dv.getUint16(eocd + 20, true) !== b.length) return false;
  const disk = dv.getUint16(eocd + 4, true), cdDisk = dv.getUint16(eocd + 6, true);
  const onDisk = dv.getUint16(eocd + 8, true), total = dv.getUint16(eocd + 10, true);
  const cdSize = dv.getUint32(eocd + 12, true), cdOffset = dv.getUint32(eocd + 16, true);
  if (disk !== 0 || cdDisk !== 0 || onDisk !== total) return false;            // split archive
  if (total === 0xffff || cdSize === 0xffffffff || cdOffset === 0xffffffff) return false; // ZIP64
  if (total === 0 || total > MAX_ENTRIES || cdOffset + cdSize > eocd) return false;

  const dec = new TextDecoder('utf-8', { fatal: false });
  let p = cdOffset, types = false, doc = false;
  for (let n = 0; n < total; n++) {
    if (p + 46 > eocd || dv.getUint32(p, true) !== 0x02014b50) return false;
    const flags = dv.getUint16(p + 8, true);
    const nameLen = dv.getUint16(p + 28, true), extraLen = dv.getUint16(p + 30, true), commentLen = dv.getUint16(p + 32, true);
    if (flags & 0x0001) return false;                                         // encrypted entry
    if (p + 46 + nameLen > eocd) return false;
    const name = dec.decode(b.subarray(p + 46, p + 46 + nameLen));
    const low = name.toLowerCase();
    if (name === '[Content_Types].xml') types = true;
    if (name === 'word/document.xml') doc = true;
    if (low.includes('vbaproject') || low.includes('vbadata') || (low.startsWith('word/') && low.endsWith('.bin') && low.includes('vba'))) return false;
    p += 46 + nameLen + extraLen + commentLen;
  }
  return types && doc;
}

// ---------- DOC (Word 97-2003, an OLE2 compound file) ----------
// Stream names are UTF-16LE in 128-byte directory entries (name first, its byte length incl. the closing zero at
// offset 64). Instead of walking the FAT, look at every place a directory entry can start (past the 512-byte header,
// on a 128-byte boundary) for the name with the matching length, so the same word in the document's text doesn't
// count (best effort). A Word file has a WordDocument stream (which tells it apart from .xls,
// .msg and other OLE2 files); a file with a Macros storage or a _VBA_PROJECT stream carries macros and is refused.
const OLE_SIG = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];

// OLE2 directory names compare case-insensitively (MACROS is the same stream as Macros)
function hasEntry(b, name) {
  const want = name.toUpperCase();
  const units = want.length + 1;                                               // name plus the closing zero
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  for (let i = 512; i + 128 <= b.length; i += 128) {
    if (dv.getUint16(i + 64, true) !== units * 2) continue;
    let got = '';
    for (let k = 0; k < units - 1; k++) got += String.fromCharCode(dv.getUint16(i + k * 2, true));
    if (dv.getUint16(i + (units - 1) * 2, true) === 0 && got.toUpperCase() === want) return true;
  }
  return false;
}

function docOk(b) {
  return hasEntry(b, 'WordDocument') && !hasEntry(b, 'Macros') && !hasEntry(b, '_VBA_PROJECT');
}

// Returns 'pdf' | 'docx' | 'doc' when the bytes are an acceptable file of that kind, else null.
export function sniff(b) {
  if (startsWith(b, PDF_SIG)) return pdfOk(b) ? 'pdf' : null;
  if (startsWith(b, ZIP_SIG)) return docxOk(b) ? 'docx' : null;
  if (startsWith(b, OLE_SIG)) return docOk(b) ? 'doc' : null;
  return null;
}
