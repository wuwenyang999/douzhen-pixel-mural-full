import { getDb } from './db.js';

function toPattern(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    type: row.type,
    description: row.description,
    price: row.price / 100,
    boardCount: row.board_count,
    finishedSize: row.finished_size,
    colorCount: row.color_count,
    beadCount: row.bead_count,
    difficulty: row.difficulty,
    heroImage: row.hero_image,
    sections: JSON.parse(row.sections_json),
  };
}

export function listPatterns(type) {
  const db = getDb();
  const rows = type
    ? db.prepare('SELECT * FROM patterns WHERE type = ? ORDER BY title').all(type)
    : db.prepare('SELECT * FROM patterns ORDER BY type, title').all();
  return rows.map(toPattern);
}

export function getPatternBySlug(slug) {
  return toPattern(getDb().prepare('SELECT * FROM patterns WHERE slug = ?').get(slug));
}

export function getPatternById(id) {
  return toPattern(getDb().prepare('SELECT * FROM patterns WHERE id = ?').get(id));
}

export function getOwnedPatterns(userId) {
  return getDb()
    .prepare(`
      SELECT patterns.* FROM patterns
      INNER JOIN user_patterns ON user_patterns.pattern_id = patterns.id
      WHERE user_patterns.user_id = ?
      ORDER BY user_patterns.unlocked_at DESC
    `)
    .all(userId)
    .map(toPattern);
}

export function ownsPattern(userId, patternId) {
  return Boolean(
    getDb()
      .prepare('SELECT 1 FROM user_patterns WHERE user_id = ? AND pattern_id = ?')
      .get(userId, patternId),
  );
}

export function getCompletedSectionIds(userId, patternId) {
  return getDb()
    .prepare('SELECT section_id FROM user_progress WHERE user_id = ? AND pattern_id = ? AND complete = 1')
    .all(userId, patternId)
    .map((row) => row.section_id);
}
