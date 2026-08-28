import crypto from 'node:crypto';

function sha256(value) {
  return crypto.createHash('sha256').update(value.trim().toUpperCase()).digest('hex');
}

export function seedDatabase(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS patterns (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL,
      description TEXT NOT NULL,
      price INTEGER NOT NULL,
      board_count TEXT NOT NULL,
      finished_size TEXT NOT NULL,
      color_count INTEGER NOT NULL,
      bead_count INTEGER NOT NULL,
      difficulty TEXT NOT NULL,
      purchase_url TEXT NOT NULL,
      hero_image TEXT NOT NULL,
      sections_json TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS redemption_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pattern_id TEXT NOT NULL,
      code_hash TEXT NOT NULL UNIQUE,
      redeemed_at TEXT,
      redeemed_by TEXT,
      revoked_at TEXT
    );
    CREATE TABLE IF NOT EXISTS user_patterns (
      user_id TEXT NOT NULL,
      pattern_id TEXT NOT NULL,
      unlocked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, pattern_id)
    );
    CREATE TABLE IF NOT EXISTS user_progress (
      user_id TEXT NOT NULL,
      pattern_id TEXT NOT NULL,
      section_id TEXT NOT NULL,
      complete INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, pattern_id, section_id)
    );
  `);

  const insertPattern = db.prepare(`
    INSERT OR IGNORE INTO patterns (
      id, title, slug, type, description, price, board_count, finished_size,
      color_count, bead_count, difficulty, purchase_url, hero_image, sections_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const patterns = [
    ['azure-dragon', '苍龙镇海', 'azure-dragon', 'mural', '一条穿云破浪的东方巨龙，专为整面墙设计。', 5990, '8 × 12 块板', '90 × 135 cm', 36, 83472, '进阶', '', '/patterns/azure-dragon.png', [{ id: 'A01', name: '龙首', instruction: '从眼部金色轮廓开始，按坐标完成。' }, { id: 'A02', name: '云层', instruction: '先完成深青色，再叠加浅青色。' }, { id: 'A03', name: '龙身', instruction: '保持鳞片方向一致，完成后再熨烫。' }]],
    ['verdant-peaks', '雨后青嶂', 'verdant-peaks', 'mural', '层层青山与一轮朱日，适合客厅主墙的静景壁画。', 4990, '6 × 8 块板', '68 × 90 cm', 28, 51984, '中阶', '', '/patterns/verdant-peaks.png', [{ id: 'B01', name: '前景松林', instruction: '先完成深绿底色，再补亮绿色树梢。' }, { id: 'B02', name: '远山云雾', instruction: '白色云层与青灰远山交界处按总览对照。' }, { id: 'B03', name: '朱日', instruction: '单独完成圆形太阳，最后和背景拼接。' }]],
    ['tiger-phone-bag', '霓虹白虎手机包', 'tiger-phone-bag', 'bag', '可背出门的立体拼豆手机包，配色来自原创霓虹白虎纹样。', 2990, '6 个组件', '12 × 19 × 4 cm', 8, 2860, '进阶', '', '/patterns/tiger-phone-bag.png', [{ id: 'C01', name: '正面虎纹', instruction: '完成后双面轻熨，保留穿线孔位。' }, { id: 'C02', name: '背面面板', instruction: '先拼粉色底，再补黑色条纹。' }, { id: 'C03', name: '侧片与底片', instruction: '四片组件完成后按顺序用透明线连接。' }, { id: 'C04', name: '背带连接', instruction: '将透明线穿过四角孔位，打双结固定。' }]],
  ];
  for (const pattern of patterns) insertPattern.run(...pattern.slice(0, -1), JSON.stringify(pattern.at(-1)));
}

export function createRedemptionCodes(db, patternId, count) {
  const insert = db.prepare('INSERT INTO redemption_codes (pattern_id, code_hash) VALUES (?, ?)');
  const codes = [];

  for (let index = 0; index < count; index += 1) {
    const rawCode = `PB-${crypto.randomBytes(12).toString('hex').toUpperCase()}`;
    insert.run(patternId, sha256(rawCode));
    codes.push(rawCode);
  }

  return codes;
}

export function revokeCode(db, codeId) {
  const result = db
    .prepare('UPDATE redemption_codes SET revoked_at = CURRENT_TIMESTAMP WHERE id = ? AND redeemed_at IS NULL AND revoked_at IS NULL')
    .run(codeId);
  return result.changes === 1;
}

export function redeemCode(db, rawCode, userId) {
  return db.transaction(() => {
    const code = db
      .prepare('SELECT * FROM redemption_codes WHERE code_hash = ?')
      .get(sha256(rawCode));

    if (!code || code.revoked_at) return { ok: false, reason: 'invalid' };
    if (code.redeemed_at) return { ok: false, reason: 'used' };

    db.prepare(
      'UPDATE redemption_codes SET redeemed_at = CURRENT_TIMESTAMP, redeemed_by = ? WHERE id = ?',
    ).run(userId, code.id);
    db.prepare('INSERT OR IGNORE INTO user_patterns (user_id, pattern_id) VALUES (?, ?)').run(
      userId,
      code.pattern_id,
    );

    return { ok: true, patternId: code.pattern_id };
  })();
}

export function saveProgress(db, userId, patternId, sectionId, complete) {
  const owned = db
    .prepare('SELECT 1 FROM user_patterns WHERE user_id = ? AND pattern_id = ?')
    .get(userId, patternId);

  if (!owned) throw new Error('not entitled');

  db.prepare(`
    INSERT INTO user_progress (user_id, pattern_id, section_id, complete, updated_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id, pattern_id, section_id)
    DO UPDATE SET complete = excluded.complete, updated_at = CURRENT_TIMESTAMP
  `).run(userId, patternId, sectionId, complete ? 1 : 0);

  return { complete };
}
