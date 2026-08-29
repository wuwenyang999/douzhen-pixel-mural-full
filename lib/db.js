import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { buildCatalog } from './pattern-data.js';

let database;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  password_hash TEXT,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at TEXT,
  deleted_at TEXT
);

-- 发布版本固化的图纸：同一 slug 可有多个 version，已购用户绑定其购买时的版本 id。
CREATE TABLE IF NOT EXISTS patterns (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  copyright TEXT NOT NULL DEFAULT '',
  brand_palette TEXT NOT NULL,
  price INTEGER NOT NULL,
  difficulty TEXT NOT NULL DEFAULT '',
  finished_size TEXT NOT NULL DEFAULT '',
  board_count TEXT NOT NULL DEFAULT '',
  hero_image TEXT NOT NULL DEFAULT '',
  total_beads INTEGER NOT NULL DEFAULT 0,
  total_boards INTEGER NOT NULL DEFAULT 0,
  total_colors INTEGER NOT NULL DEFAULT 0,
  colours_json TEXT NOT NULL DEFAULT '[]',
  published_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (slug, version)
);

CREATE TABLE IF NOT EXISTS pattern_sections (
  id TEXT NOT NULL,
  pattern_id TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  name TEXT NOT NULL,
  grid_rows INTEGER NOT NULL,
  grid_cols INTEGER NOT NULL,
  instruction TEXT NOT NULL DEFAULT '',
  cells_json TEXT NOT NULL,
  colours_json TEXT NOT NULL DEFAULT '[]',
  PRIMARY KEY (pattern_id, id),
  FOREIGN KEY (pattern_id) REFERENCES patterns(id)
);

-- 一次导出给外部发码渠道的批次。
CREATE TABLE IF NOT EXISTS redemption_batches (
  id TEXT PRIMARY KEY,
  pattern_id TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  created_by TEXT,
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pattern_id) REFERENCES patterns(id)
);

CREATE TABLE IF NOT EXISTS redemption_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_id TEXT,
  pattern_id TEXT NOT NULL,
  code_hash TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active',
  redeemed_by TEXT,
  redeemed_at TEXT,
  revoked_at TEXT,
  external_order_ref TEXT,
  FOREIGN KEY (pattern_id) REFERENCES patterns(id),
  FOREIGN KEY (batch_id) REFERENCES redemption_batches(id)
);
CREATE INDEX IF NOT EXISTS idx_codes_pattern ON redemption_codes(pattern_id, status);

-- 用户拥有的图纸版本。
CREATE TABLE IF NOT EXISTS entitlements (
  user_id TEXT NOT NULL,
  pattern_id TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'redeem',
  granted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, pattern_id)
);

CREATE TABLE IF NOT EXISTS section_progress (
  user_id TEXT NOT NULL,
  pattern_id TEXT NOT NULL,
  section_id TEXT NOT NULL,
  complete INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, pattern_id, section_id)
);

-- 管理审计：只记动作，不记密码或明文兑换码。
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id TEXT,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL DEFAULT '',
  target_id TEXT NOT NULL DEFAULT '',
  detail_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`;

function seedPatterns(db) {
  const insertPattern = db.prepare(`
    INSERT OR IGNORE INTO patterns (
      id, slug, version, title, type, description, copyright, brand_palette,
      price, difficulty, finished_size, board_count, hero_image,
      total_beads, total_boards, total_colors, colours_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertSection = db.prepare(`
    INSERT OR IGNORE INTO pattern_sections (
      id, pattern_id, sort_order, name, grid_rows, grid_cols, instruction, cells_json, colours_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const p of buildCatalog()) {
    insertPattern.run(
      p.id, p.slug, p.version, p.title, p.type, p.description, p.copyright, p.brandPalette,
      p.price, p.difficulty, p.finishedSize, p.boardCount, p.heroImage,
      p.totalBeads, p.totalBoards, p.totalColors, JSON.stringify(p.colours),
    );
    p.sections.forEach((sec, index) => {
      insertSection.run(
        sec.id, p.id, index, sec.name, sec.rows, sec.cols, sec.instruction,
        JSON.stringify(sec.cells), JSON.stringify(sec.colours),
      );
    });
  }
}

export function getDb() {
  if (database) return database;

  const databasePath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'pixel-mural.sqlite');
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  database = new Database(databasePath);
  database.pragma('journal_mode = WAL');
  database.pragma('foreign_keys = ON');
  database.exec(SCHEMA);
  seedPatterns(database);
  return database;
}

// 仅供测试：使用内存数据库并完成建表与种子。
export function createTestDb() {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA);
  seedPatterns(db);
  return db;
}
