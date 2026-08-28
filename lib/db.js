import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { seedDatabase } from './redemption.js';

let database;

export function getDb() {
  if (database) return database;

  const databasePath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'pixel-mural.sqlite');
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  database = new Database(databasePath);
  database.pragma('journal_mode = WAL');
  seedDatabase(database);
  return database;
}
