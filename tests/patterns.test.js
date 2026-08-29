import test from 'node:test';
import assert from 'node:assert/strict';
import { createTestDb } from '../lib/db.js';
import {
  listPatterns,
  getPatternBySlug,
  getStudioPattern,
  ownsSlug,
} from '../lib/patterns.js';

test('seeded patterns carry fixed brand palette, version and formal sections', () => {
  const db = createTestDb();
  const dragon = getPatternBySlug('azure-dragon', {}, db);
  assert.equal(dragon.brandPalette, 'MARD 291');
  assert.equal(dragon.version, 1);
  assert.ok(dragon.totalBeads > 0);
  // 公开读取不带逐格网格
  assert.equal(dragon.sections[0].cells, undefined);
});

test('studio grid is gated by ownership', () => {
  const db = createTestDb();
  assert.equal(getStudioPattern('nobody', 'azure-dragon', db), null);

  db.prepare("INSERT INTO entitlements (user_id, pattern_id) VALUES ('u1','azure-dragon-v1')").run();
  assert.equal(ownsSlug('u1', 'azure-dragon', db), true);
  const studio = getStudioPattern('u1', 'azure-dragon', db);
  assert.equal(studio.id, 'azure-dragon-v1');
  assert.equal(studio.sections[0].cells.length, studio.sections[0].rows * studio.sections[0].cols);
  assert.ok(studio.sections[0].cells[0].hex.startsWith('#'));
});

test('a buyer keeps their purchased version after a newer version is published', () => {
  const db = createTestDb();
  db.prepare("INSERT INTO entitlements (user_id, pattern_id) VALUES ('u1','azure-dragon-v1')").run();
  // 发布 v2（改色新版本，不覆盖 v1）
  db.prepare(
    `INSERT INTO patterns (id, slug, version, title, type, brand_palette, price, board_count, hero_image, total_beads, total_boards, total_colors, colours_json)
     VALUES ('azure-dragon-v2','azure-dragon',2,'苍龙镇海','mural','MARD 291',5990,'8 × 12 块板','/x.png',1,1,1,'[]')`,
  ).run();

  // 公开页展示最新版
  assert.equal(getPatternBySlug('azure-dragon', {}, db).version, 2);
  // 已购用户制作台仍读 v1
  assert.equal(getStudioPattern('u1', 'azure-dragon', db).version, 1);
  // 图纸库每个 slug 只出现一次（最新版）
  const murals = listPatterns('mural', db).filter((p) => p.slug === 'azure-dragon');
  assert.equal(murals.length, 1);
  assert.equal(murals[0].version, 2);
});
