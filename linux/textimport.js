'use strict';

// Plain-text history import, for arriving from CopyQ or any other clipboard
// manager that can write its history out as text.
//
// Pure like backup.js, and for the same reason: no electron, no store, so the
// parsing can be exercised without booting the app. The merge itself is not
// reimplemented here — main.js hands the result to backup.applyImport, so a
// text import dedupes, caps and respects folder membership exactly the way a
// backup import does.

const crypto = require('crypto');

// Far past any real history, and small enough to read into memory whole.
const MAX_FILE_BYTES = 64 * 1024 * 1024;

// What Settings shows CopyQ users. Written NUL-separated because a CopyQ item
// can span lines; read(i) is row i's text/plain, so an image-only item prints
// as nothing and parse() drops it. Single-quoted for the shell, which leaves
// the "\0" for CopyQ's script engine to turn into a NUL. Checked against
// CopyQ 13.
const COPYQ_EXPORT_COMMAND =
  "copyq eval -- 'for (var i = 0; i < size(); ++i) print(str(read(i)) + \"\\0\")' > copyq-history.txt";

class TextImportError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

// Two layouts, told apart by whether the file contains a NUL:
//
//   NUL-separated  every entry ends (or is divided from the next) by a \0.
//                  The only form that can carry multi-line entries, because
//                  text copied from anywhere can contain any line break but in
//                  practice never a NUL — the same reason find -print0 uses it.
//   one per line   for lists, and for tools that only write one line per item.
//
// A separator line such as "-----" was the alternative and was rejected: any
// marker printable enough to type is printable enough to have been copied, and
// an entry that contained it would silently split in two.
//
// The first entry in the file is taken to be the most recent, which is the
// order CopyQ's rows and every list-style history tool use.
function parse(buffer) {
  if (buffer.length > MAX_FILE_BYTES) throw new TextImportError('too_large');

  let text;
  try {
    // fatal: a picked image or archive has to be refused, not decoded into
    // replacement characters and imported as several hundred junk entries.
    text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    throw new TextImportError('not_text');
  }
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  if (looksLikeBackup(text)) throw new TextImportError('is_backup');

  const format = text.includes('\0') ? 'nul' : 'lines';
  const pieces = format === 'nul' ? text.split('\0') : text.split(/\r?\n/);

  // Content is otherwise kept exactly. Clipmer recognises an entry it already
  // has by exact text, so trimming here would turn every clip that ends in a
  // newline into a near-duplicate of itself.
  const entries = pieces.filter((piece) => piece.trim() !== '');
  if (entries.length === 0) throw new TextImportError('empty');

  return { format, entries };
}

// An encrypted backup is a .json file the open dialog will happily offer, and
// imported as text it would become a few hundred lines of base64.
function looksLikeBackup(text) {
  if (!text.trimStart().startsWith('{')) return false;
  try {
    const parsed = JSON.parse(text);
    return !!parsed && parsed.format === 'clipmer-backup';
  } catch {
    return false;
  }
}

// Shapes parsed entries as the `incoming` payload backup.applyImport expects.
//
// Timestamps count down from `before`, which main passes as just under the
// oldest entry already in the history. A text file carries no dates, and
// stamping the entries "now" would put the whole file above everything the
// user has — so a 500-line import would push their real history out past the
// cap. Below the oldest existing entry, an import only ever fills the space
// that is left, which is what "keep what is here and add what is missing"
// means everywhere else in the app.
//
// That space can be none at all: a history already at the cap has room for
// nothing older. So when `folder` is given (Pro, where folders exist) every
// entry is also filed into it, and filed entries are exempt from the cap — the
// whole file is kept, and stays findable as one tab. A folder that already has
// the name is merged into rather than duplicated, by applyImport's own rule.
function toPayload(entries, before, { folder } = {}) {
  const history = entries.map((content, i) => ({
    id: crypto.randomUUID(),
    type: 'text',
    content,
    // One millisecond apart keeps the file's order through the newest-first
    // sort without visibly changing any entry's age.
    timestamp: before - i,
    note: '',
  }));
  const groups = folder
    ? [{ name: folder, memberIds: history.map((e) => e.id), createdAt: Date.now() }]
    : [];
  return { history, groups };
}

module.exports = {
  TextImportError,
  MAX_FILE_BYTES,
  COPYQ_EXPORT_COMMAND,
  parse,
  toPayload,
};
