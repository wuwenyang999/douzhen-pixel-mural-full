import crypto from 'node:crypto';

// 兑换码使用至少 128 位随机熵（16 字节）。明文仅在生成时返回一次，
// 数据库只保存标准化后的 SHA-256 哈希。
const CODE_BYTES = 16;

export function normaliseCode(value) {
  return String(value || '').trim().toUpperCase().replace(/\s+/g, '');
}

function hashOf(value) {
  return crypto.createHash('sha256').update(normaliseCode(value)).digest('hex');
}

export function generateRawCode() {
  return `PB-${crypto.randomBytes(CODE_BYTES).toString('hex').toUpperCase()}`;
}

export function writeAudit(db, { adminId, action, targetType = '', targetId = '', detail = {} }) {
  db.prepare(
    `INSERT INTO admin_audit_logs (admin_id, action, target_type, target_id, detail_json)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(adminId || null, action, targetType, String(targetId), JSON.stringify(detail));
}

// 批量生成一个图纸的兑换码，并记录批次。明文码数组只在本次返回。
export function createRedemptionBatch(db, { patternId, quantity, adminId, note = '' }) {
  const batchId = crypto.randomUUID();
  const codes = [];

  const makeBatch = db.transaction(() => {
    db.prepare(
      'INSERT INTO redemption_batches (id, pattern_id, quantity, created_by, note) VALUES (?, ?, ?, ?, ?)',
    ).run(batchId, patternId, quantity, adminId, note);

    const insert = db.prepare(
      'INSERT INTO redemption_codes (batch_id, pattern_id, code_hash, status) VALUES (?, ?, ?, ?)',
    );
    const seen = new Set();
    for (let i = 0; i < quantity; i += 1) {
      let raw = generateRawCode();
      while (seen.has(hashOf(raw))) raw = generateRawCode();
      seen.add(hashOf(raw));
      insert.run(batchId, patternId, hashOf(raw), 'active');
      codes.push(raw);
    }
    writeAudit(db, {
      adminId,
      action: 'batch.create',
      targetType: 'pattern',
      targetId: patternId,
      detail: { batchId, quantity },
    });
  });
  makeBatch();

  return { batchId, codes };
}

// 作废未使用的码。
export function revokeCode(db, codeId, adminId) {
  const result = db
    .prepare(
      `UPDATE redemption_codes
       SET status = 'revoked', revoked_at = CURRENT_TIMESTAMP
       WHERE id = ? AND status = 'active'`,
    )
   .run(codeId);
  if (result.changes === 1) {
    writeAudit(db, { adminId, action: 'code.revoke', targetType: 'code', targetId: codeId });
  }
  return result.changes === 1;
}

// 人工补发：直接为账户授予图纸（用于退款补码、客服场景），写入审计。
export function manualGrant(db, { patternId, userId, adminId }) {
  const grant = db.transaction(() => {
    db.prepare(
      `INSERT OR IGNORE INTO entitlements (user_id, pattern_id, source) VALUES (?, ?, 'manual')`,
    ).run(userId, patternId);
    writeAudit(db, {
      adminId,
      action: 'entitlement.manual_grant',
      targetType: 'user_pattern',
      targetId: `${userId}:${patternId}`,
    });
  });
  grant();
  return true;
}

// 兑换：单个数据库事务内同时完成“标记码已兑换 + 写入权益”。
// 对已兑换/已作废/无效统一返回 invalid/used，不向前端暴露码是否存在。
export function redeemCode(db, rawCode, userId) {
  const codeHash = hashOf(rawCode);
  return db.transaction(() => {
    const code = db.prepare('SELECT * FROM redemption_codes WHERE code_hash = ?').get(codeHash);
    if (!code) return { ok: false, reason: 'invalid' };
    if (code.status === 'revoked' || code.revoked_at) return { ok: false, reason: 'invalid' };
    if (code.status === 'redeemed' || code.redeemed_at) return { ok: false, reason: 'used' };

    db.prepare(
      `UPDATE redemption_codes
       SET status = 'redeemed', redeemed_by = ?, redeemed_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
    ).run(userId, code.id);
    db.prepare(
      `INSERT OR IGNORE INTO entitlements (user_id, pattern_id, source) VALUES (?, ?, 'redeem')`,
    ).run(userId, code.pattern_id);

    return { ok: true, patternId: code.pattern_id };
  })();
}

// 保存分区进度，先校验权益。
export function saveProgress(db, userId, patternId, sectionId, complete) {
  const owned = db
    .prepare('SELECT 1 FROM entitlements WHERE user_id = ? AND pattern_id = ?')
    .get(userId, patternId);
  if (!owned) throw new Error('not entitled');

  db.prepare(
    `INSERT INTO section_progress (user_id, pattern_id, section_id, complete, updated_at)
     VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(user_id, pattern_id, section_id)
     DO UPDATE SET complete = excluded.complete, updated_at = CURRENT_TIMESTAMP`,
  ).run(userId, patternId, sectionId, complete ? 1 : 0);
  return { complete };
}
