import { getDb } from './db.js';

function basePattern(row) {
  if (!row) return null;
  return {
    id: row.id,
    slug: row.slug,
    version: row.version,
    title: row.title,
    type: row.type,
    description: row.description,
    copyright: row.copyright,
    brandPalette: row.brand_palette,
    price: row.price / 100,
    difficulty: row.difficulty,
    finishedSize: row.finished_size,
    boardCount: row.board_count,
    heroImage: row.hero_image,
    totalBeads: row.total_beads,
    totalBoards: row.total_boards,
    totalColors: row.total_colors,
    colours: JSON.parse(row.colours_json || '[]'),
  };
}

function sectionMeta(row) {
  return {
    id: row.id,
    name: row.name,
    rows: row.grid_rows,
    cols: row.grid_cols,
    instruction: row.instruction,
    colours: JSON.parse(row.colours_json || '[]'),
  };
}

function sectionsFor(db, patternId, { withCells = false } = {}) {
  const rows = db
    .prepare('SELECT * FROM pattern_sections WHERE pattern_id = ? ORDER BY sort_order')
    .all(patternId);
  return rows.map((row) => {
    const meta = sectionMeta(row);
    if (!withCells) return meta;
    const codes = JSON.parse(row.cells_json || '[]');
    const byCode = new Map(meta.colours.map((c) => [c.code, c]));
    return {
      ...meta,
      cells: codes.map((code) => ({
        code,
        name: byCode.get(code)?.name || '',
        hex: byCode.get(code)?.hex || '#cccccc',
      })),
    };
  });
}

export function listPatterns(type, db = getDb()) {
  const rows = type
    ? db.prepare('SELECT * FROM patterns WHERE type = ? ORDER BY version DESC, title').all(type)
    : db.prepare('SELECT * FROM patterns ORDER BY type, title, version DESC').all();
  // 每个 slug 只展示最新版本。
  const latest = new Map();
  for (const row of rows) if (!latest.has(row.slug)) latest.set(row.slug, row);
  return [...latest.values()].map((row) => ({ ...basePattern(row), sections: sectionsFor(db, row.id) }));
}

export function getPatternBySlug(slug, { withCells = false } = {}, db = getDb()) {
  const row = db.prepare('SELECT * FROM patterns WHERE slug = ? ORDER BY version DESC LIMIT 1').get(slug);
  if (!row) return null;
  return { ...basePattern(row), sections: sectionsFor(db, row.id, { withCells }) };
}

export function getPatternById(id, { withCells = false } = {}, db = getDb()) {
  const row = db.prepare('SELECT * FROM patterns WHERE id = ?').get(id);
  if (!row) return null;
  return { ...basePattern(row), sections: sectionsFor(db, row.id, { withCells }) };
}

export function getOwnedPatterns(userId, db = getDb()) {
  const rows = db
    .prepare(
      `SELECT p.* FROM patterns p
       INNER JOIN entitlements e ON e.pattern_id = p.id
       WHERE e.user_id = ?
       ORDER BY e.granted_at DESC`,
    )
    .all(userId);
  return rows.map((row) => ({ ...basePattern(row), sections: sectionsFor(db, row.id) }));
}

export function ownsPattern(userId, patternId, db = getDb()) {
  return Boolean(
    db.prepare('SELECT 1 FROM entitlements WHERE user_id = ? AND pattern_id = ?').get(userId, patternId),
  );
}

// 是否拥有某作品（任意已购版本）。
export function ownsSlug(userId, slug, db = getDb()) {
  return Boolean(
    db
      .prepare(
        `SELECT 1 FROM entitlements e
         INNER JOIN patterns p ON p.id = e.pattern_id
         WHERE e.user_id = ? AND p.slug = ? LIMIT 1`,
      )
      .get(userId, slug),
  );
}

export function getCompletedSectionIds(userId, patternId, db = getDb()) {
  return db
    .prepare('SELECT section_id FROM section_progress WHERE user_id = ? AND pattern_id = ? AND complete = 1')
    .all(userId, patternId)
    .map((row) => row.section_id);
}

// 制作台：必须同时校验用户与权益；返回用户实际购买的那一版，改色出新版后仍读原版本。
export function getStudioPattern(userId, slug, db = getDb()) {
  const family = db.prepare('SELECT id FROM patterns WHERE slug = ? ORDER BY version DESC').all(slug);
  const owned = family.find((p) => ownsPattern(userId, p.id, db));
  if (!owned) return null;
  return getPatternById(owned.id, { withCells: true }, db);
}
