'use strict';

// Password-protected export/import of the clipboard history.
//
// Deliberately free of electron and electron-store imports: everything here is
// a pure transform over plain objects, so the crypto and the merge rules can be
// exercised without booting the app. main.js owns the file dialogs, the store
// and the window broadcasts.

const crypto = require('crypto');

const FORMAT = 'clipmer-backup';
const FORMAT_VERSION = 1;
const CIPHER = 'aes-256-gcm';

// scrypt rather than PBKDF2: the threat here is an offline guessing run against
// a file the user may well leave sitting in cloud storage for years, and
// scrypt's memory cost is what stops a GPU rig being a shortcut. N=2^17 with
// r=8 costs ~134 MB and a few hundred milliseconds per attempt.
const KDF = { name: 'scrypt', N: 131072, r: 8, p: 1 };
const KEY_LEN = 32;
const SALT_LEN = 16;
// GCM's native nonce size. Any other length makes the cipher derive one, which
// is slower and buys nothing.
const IV_LEN = 12;
const TAG_LEN = 16;

const MIN_PASSWORD_CHARS = 8;

// A backup is read whole into memory before any of it can be validated, so the
// caller has to enforce this before the read, not after. 200 entries at the
// 256 KB per-entry ceiling is ~51 MB of plaintext and base64 adds a third.
const MAX_FILE_BYTES = 128 * 1024 * 1024;

// Refuse a file whose KDF parameters would have us allocate the machine's
// memory on its behalf. The numbers in a header are attacker-controlled in
// exactly the same way the ciphertext is.
const MAX_KDF_BYTES = 256 * 1024 * 1024;

// Mirrors of main.js's ceilings. Everything read out of a file is re-clamped
// against them: the file may have been written by a future version, by a
// different build, or by hand.
const MAX_ENTRY_CHARS = 262144;
const MAX_PREVIEW_CHARS = 200;
const MAX_NOTE_CHARS = 500; // matches the note input's maxLength in the renderer
const MAX_GROUP_NAME_CHARS = 120;
// Read-side guard only; the real cap is applied after merging. A 128 MB file of
// one-character entries is otherwise a few million sanitize() calls.
const MAX_IMPORT_ENTRIES = 5000;

class BackupError extends Error {
  constructor(code, message) {
    super(message || code);
    this.name = 'BackupError';
    this.code = code;
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function isPositiveInt(value) {
  return Number.isInteger(value) && value > 0;
}

function isPowerOfTwo(value) {
  return isPositiveInt(value) && (value & (value - 1)) === 0;
}

// Ids end up as map keys and as dataset values in the renderer, so an id out of
// a file gets a charset, not just a type check.
function isUsableId(value) {
  return typeof value === 'string' && /^[A-Za-z0-9._:-]{1,64}$/.test(value);
}

function decodeBase64(value, expectedLen) {
  if (typeof value !== 'string' || value.length === 0) throw new BackupError('bad_params');
  const stripped = value.replace(/\s+/g, '');
  const buf = Buffer.from(stripped, 'base64');
  // Buffer.from silently discards anything that is not base64 instead of
  // failing, so compare the round trip rather than trusting the decode.
  if (buf.toString('base64') !== stripped) throw new BackupError('bad_params');
  if (expectedLen !== undefined && buf.length !== expectedLen) {
    throw new BackupError('bad_params');
  }
  return buf;
}

// Key order has to be irrelevant: the header doubles as the AAD, and a backup
// that survives a trip through a JSON formatter must still authenticate. Sorting
// recursively means only the values matter.
function canonicalJson(value) {
  if (value === undefined) return 'null';
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const parts = Object.keys(value)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonicalJson(value[k])}`);
    return `{${parts.join(',')}}`;
  }
  return JSON.stringify(value);
}

// Binding the header into the tag is what stops the KDF parameters, the salt or
// the advertised entry count being swapped out underneath a ciphertext that
// still decrypts.
function aadFor(header) {
  return Buffer.from(
    canonicalJson({ format: FORMAT, version: FORMAT_VERSION, header }),
    'utf8'
  );
}

function deriveKey(password, { N, r, p, salt }) {
  return new Promise((resolve, reject) => {
    const secret = Buffer.from(password, 'utf8');
    // Async on purpose. scryptSync would hold the main process for the whole
    // derivation — a few hundred ms with the tray and the global hotkey frozen,
    // which is the same stall persistHistory() already debounces to avoid. The
    // callback form runs on the libuv threadpool instead.
    crypto.scrypt(
      secret,
      salt,
      KEY_LEN,
      { N, r, p, maxmem: 128 * N * r * 2 },
      (err, key) => {
        secret.fill(0);
        if (err) reject(new BackupError('kdf_failed', err.message));
        else resolve(key);
      }
    );
  });
}

// ─── Encrypt ────────────────────────────────────────────────────────────────────

async function encrypt({ payload, password, appVersion }) {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_CHARS) {
    throw new BackupError('weak_password');
  }

  const salt = crypto.randomBytes(SALT_LEN);
  const iv = crypto.randomBytes(IV_LEN);

  // Counts live in the header so the import flow can tell the user what is in a
  // file before asking for its password. They are inside the AAD, so they
  // cannot be edited to misdescribe the contents.
  const header = {
    app: typeof appVersion === 'string' ? appVersion : '',
    exportedAt: new Date().toISOString(),
    entries: Array.isArray(payload.history) ? payload.history.length : 0,
    folders: Array.isArray(payload.groups) ? payload.groups.length : 0,
    cipher: CIPHER,
    kdf: { name: KDF.name, N: KDF.N, r: KDF.r, p: KDF.p, salt: salt.toString('base64') },
    iv: iv.toString('base64'),
  };

  const key = await deriveKey(password, { ...KDF, salt });
  let ciphertext;
  let tag;
  try {
    const cipher = crypto.createCipheriv(CIPHER, key, iv, { authTagLength: TAG_LEN });
    cipher.setAAD(aadFor(header));
    ciphertext = Buffer.concat([
      cipher.update(Buffer.from(JSON.stringify(payload), 'utf8')),
      cipher.final(),
    ]);
    tag = cipher.getAuthTag();
  } finally {
    key.fill(0);
  }

  return {
    format: FORMAT,
    version: FORMAT_VERSION,
    header,
    tag: tag.toString('base64'),
    ciphertext: ciphertext.toString('base64'),
  };
}

// ─── Parse + decrypt ────────────────────────────────────────────────────────────

// Split from decrypt() so the UI can describe a file — and reject an unreadable
// one — before it has any reason to ask for a password.
function parseEnvelope(text) {
  let raw;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new BackupError('not_a_backup');
  }
  if (!raw || typeof raw !== 'object' || raw.format !== FORMAT) {
    throw new BackupError('not_a_backup');
  }
  if (raw.version !== FORMAT_VERSION) throw new BackupError('unsupported_version');

  const header = raw.header;
  if (!header || typeof header !== 'object') throw new BackupError('bad_params');
  if (header.cipher !== CIPHER) throw new BackupError('bad_params');

  const kdf = header.kdf;
  if (!kdf || typeof kdf !== 'object' || kdf.name !== KDF.name) {
    throw new BackupError('bad_params');
  }
  const { N, r, p } = kdf;
  if (!isPowerOfTwo(N) || N < 2 || !isPositiveInt(r) || !isPositiveInt(p)) {
    throw new BackupError('bad_params');
  }
  if (r > 32 || p > 16 || 128 * N * r > MAX_KDF_BYTES) throw new BackupError('bad_params');

  const params = {
    N,
    r,
    p,
    salt: decodeBase64(kdf.salt, SALT_LEN),
    iv: decodeBase64(header.iv, IV_LEN),
    tag: decodeBase64(raw.tag, TAG_LEN),
    ciphertext: decodeBase64(raw.ciphertext),
  };
  if (params.ciphertext.length === 0) throw new BackupError('bad_params');

  return {
    // Kept verbatim rather than rebuilt, because this object *is* the AAD.
    header,
    params,
    meta: {
      app: typeof header.app === 'string' ? header.app.slice(0, 32) : '',
      exportedAt: typeof header.exportedAt === 'string' ? header.exportedAt.slice(0, 40) : '',
      entries: Number.isInteger(header.entries) && header.entries >= 0 ? header.entries : null,
      folders: Number.isInteger(header.folders) && header.folders >= 0 ? header.folders : null,
    },
  };
}

async function decrypt({ header, params, password }) {
  if (typeof password !== 'string' || password.length === 0) {
    throw new BackupError('bad_password');
  }

  const key = await deriveKey(password, params);
  let plaintext;
  try {
    const decipher = crypto.createDecipheriv(CIPHER, key, params.iv, { authTagLength: TAG_LEN });
    decipher.setAAD(aadFor(header));
    decipher.setAuthTag(params.tag);
    plaintext = Buffer.concat([decipher.update(params.ciphertext), decipher.final()]);
  } catch {
    // GCM cannot distinguish a wrong key from edited bytes — both land as a
    // failed tag check — so whatever the caller says has to name both.
    throw new BackupError('bad_password');
  } finally {
    key.fill(0);
  }

  let payload;
  try {
    payload = JSON.parse(plaintext.toString('utf8'));
  } catch {
    throw new BackupError('corrupt');
  } finally {
    plaintext.fill(0);
  }

  if (
    !payload ||
    typeof payload !== 'object' ||
    !Array.isArray(payload.history) ||
    !Array.isArray(payload.groups)
  ) {
    throw new BackupError('corrupt');
  }
  return payload;
}

// ─── Sanitize ───────────────────────────────────────────────────────────────────

function sanitizeEntry(raw, now) {
  if (!raw || typeof raw !== 'object') return null;
  // Image entries were removed in an earlier version and the loader in main.js
  // filters leftovers out of the store. An old backup must not put them back.
  if (raw.type !== undefined && raw.type !== 'text') return null;
  if (typeof raw.content !== 'string' || raw.content.length === 0) return null;

  let content = raw.content;
  let truncated = raw.truncated === true;
  if (content.length > MAX_ENTRY_CHARS) {
    content = content.slice(0, MAX_ENTRY_CHARS);
    truncated = true;
  }

  let timestamp = Number.isFinite(raw.timestamp) ? Math.floor(raw.timestamp) : now;
  // A timestamp in the future would pin the entry to the top of the list for as
  // long as it sat there and survive every eviction pass.
  if (timestamp <= 0 || timestamp > now) timestamp = now;

  return {
    id: isUsableId(raw.id) ? raw.id : crypto.randomUUID(),
    type: 'text',
    content,
    // Always recomputed, never read from the file. The list renders `preview`
    // while `content` is what gets pasted, so a file carrying a mismatched pair
    // is a way to show one thing and paste another.
    preview: content.slice(0, MAX_PREVIEW_CHARS),
    truncated,
    timestamp,
    note: typeof raw.note === 'string' ? raw.note.slice(0, MAX_NOTE_CHARS) : '',
    hidden: raw.hidden === true,
  };
}

function sanitizeGroup(raw, now) {
  if (!raw || typeof raw !== 'object' || typeof raw.name !== 'string') return null;
  const name = raw.name.trim().slice(0, MAX_GROUP_NAME_CHARS);
  if (!name) return null;

  let createdAt = Number.isFinite(raw.createdAt) ? Math.floor(raw.createdAt) : now;
  if (createdAt <= 0) createdAt = now;

  return {
    id: isUsableId(raw.id) ? raw.id : crypto.randomUUID(),
    name,
    memberIds: Array.isArray(raw.memberIds) ? raw.memberIds.filter(isUsableId) : [],
    createdAt,
  };
}

// ─── Merge ──────────────────────────────────────────────────────────────────────

// Returns fresh arrays and never touches the ones passed in, so a throw part way
// through leaves live state exactly as it was. The caller assigns only on success.
function applyImport({ current, incoming, mode = 'merge', limit }) {
  const now = Date.now();
  const replace = mode === 'replace';
  const cap = isPositiveInt(limit) ? limit : 200;

  const history = replace ? [] : (current.history || []).map((e) => ({ ...e }));
  const groups = replace
    ? []
    : (current.groups || []).map((g) => ({ ...g, memberIds: [...(g.memberIds || [])] }));

  const usedIds = new Set(history.map((e) => e.id));
  // Content is the identity the rest of the app already uses: addEntry() bubbles
  // an existing record to the top instead of adding a second one with the same
  // text, so an import has to answer "is this the same clip?" the same way, or
  // importing the same file twice would double every entry.
  const byContent = new Map(history.map((e) => [e.content, e]));

  // File id -> id in the resulting history. Folder membership in the file is
  // expressed in the file's ids, and some of those get rewritten below (a
  // collision with a live entry, or being folded into a duplicate), so every
  // membership list is translated through this map rather than copied across.
  const idMap = new Map();

  let added = 0;
  let duplicates = 0;
  let skipped = 0;

  const rawEntries = Array.isArray(incoming.history) ? incoming.history : [];
  const considered = rawEntries.slice(0, MAX_IMPORT_ENTRIES);
  skipped += rawEntries.length - considered.length;

  for (const raw of considered) {
    const entry = sanitizeEntry(raw, now);
    if (!entry) {
      skipped++;
      continue;
    }
    const fileId = isUsableId(raw.id) ? raw.id : null;

    const existing = byContent.get(entry.content);
    if (existing) {
      // The same clip on both sides. Keep the live record — it owns its id and
      // whatever folders already reference it — and take the better half of each
      // field the user cares about: the most recent sighting, a note if the live
      // copy has none, and `hidden` if either side says so. Hidden is a
      // statement that the text must not be on screen, so an import is not
      // allowed to revoke it.
      if (entry.timestamp > existing.timestamp) existing.timestamp = entry.timestamp;
      if (!existing.note && entry.note) existing.note = entry.note;
      if (entry.hidden) existing.hidden = true;
      if (fileId) idMap.set(fileId, existing.id);
      duplicates++;
      continue;
    }

    // An id that already belongs to a different live entry has to be rewritten,
    // or a folder ends up pointing at the wrong text.
    if (usedIds.has(entry.id)) entry.id = crypto.randomUUID();
    usedIds.add(entry.id);
    history.push(entry);
    byContent.set(entry.content, entry);
    if (fileId) idMap.set(fileId, entry.id);
    added++;
  }

  const historyIds = new Set(history.map((e) => e.id));
  const usedGroupIds = new Set(groups.map((g) => g.id));
  const byName = new Map(groups.map((g) => [g.name.toLowerCase(), g]));

  let foldersAdded = 0;
  let foldersMerged = 0;

  for (const rawGroup of Array.isArray(incoming.groups) ? incoming.groups : []) {
    const group = sanitizeGroup(rawGroup, now);
    if (!group) continue;

    const members = [];
    const seen = new Set();
    for (const fileId of group.memberIds) {
      const mapped = idMap.get(fileId);
      // Unmapped means the entry was dropped or never arrived. A folder that
      // quietly keeps a dangling id is how the cap's "filed entries are exempt"
      // rule starts protecting entries that do not exist.
      if (!mapped || !historyIds.has(mapped) || seen.has(mapped)) continue;
      seen.add(mapped);
      members.push(mapped);
    }

    // Folder names are already unique case-insensitively — create-group and
    // rename-group both enforce it — so a name match is the same folder rather
    // than a second one wearing a confusing label.
    const existing = byName.get(group.name.toLowerCase());
    if (existing) {
      for (const id of members) {
        if (!existing.memberIds.includes(id)) existing.memberIds.push(id);
      }
      foldersMerged++;
      continue;
    }

    if (usedGroupIds.has(group.id)) group.id = crypto.randomUUID();
    usedGroupIds.add(group.id);
    group.memberIds = members;
    groups.push(group);
    byName.set(group.name.toLowerCase(), group);
    foldersAdded++;
  }

  // Newest first, which is both the order the list renders in and the order the
  // cap has to evict from.
  history.sort((a, b) => b.timestamp - a.timestamp);

  // Same eviction rule as addEntry(): filed entries are exempt from the cap.
  const memberIds = new Set(groups.flatMap((g) => g.memberIds));
  const kept = [];
  for (const entry of history) {
    if (kept.length < cap || memberIds.has(entry.id)) kept.push(entry);
  }
  const dropped = history.length - kept.length;

  // Eviction cannot orphan a membership given that exemption, but prune anyway
  // so a later change to that rule cannot leave a dangling reference behind.
  const keptIds = new Set(kept.map((e) => e.id));
  for (const group of groups) {
    group.memberIds = group.memberIds.filter((id) => keptIds.has(id));
  }

  return {
    history: kept,
    groups,
    stats: { added, duplicates, skipped, dropped, foldersAdded, foldersMerged },
  };
}

module.exports = {
  BackupError,
  FORMAT,
  FORMAT_VERSION,
  MIN_PASSWORD_CHARS,
  MAX_FILE_BYTES,
  encrypt,
  parseEnvelope,
  decrypt,
  applyImport,
};
