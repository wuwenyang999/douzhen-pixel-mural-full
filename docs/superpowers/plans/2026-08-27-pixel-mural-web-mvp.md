# Pixel Mural Web MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a deployable web MVP where visitors browse original large-scale and 3D fuse-bead patterns, redeem a one-time code, and use their unlocked patterns in a guided workspace.

**Architecture:** A Next.js web application provides public catalog pages and a small Node-backed API. SQLite stores users, patterns, redemption-code hashes and per-user completion state; external virtual-goods checkout remains outside the system and supplies the code users redeem here.

**Tech Stack:** Next.js 16, React 19, JavaScript, SQLite via `better-sqlite3`, signed HTTP-only sessions via `jose`, CSS Modules, Node test runner.

## Global Constraints

- Build a website only; do not build a native app or integrate payments.
- Do not add a general image-to-pattern generator, AI tools, a shopping cart, subscriptions, materials logistics, or third-party-IP artwork.
- Keep dependencies to Next.js, React, `better-sqlite3`, `bcryptjs`, and `jose`.
- The payment button opens a configurable external purchase URL; purchase delivery is a one-time code redeemed on this site.
- Codes must be random, stored as SHA-256 hashes, scoped to one pattern, redeemable once, and tied to the redeeming account.
- Keep initial pattern data to three original demo works: two murals and one 3D bag.
- Use responsive layouts and store the database at `data/pixel-mural.sqlite` by default; deployments require persistent disk storage.

---

## File Structure

```
app/
  api/auth/{register,login,logout}/route.js       # Session lifecycle
  api/redeem/route.js                             # Code redemption
  api/progress/route.js                           # Section completion persistence
  api/admin/codes/route.js                        # Admin-only code batches
  admin/page.jsx                                  # Code batch interface
  library/page.jsx                                # Public catalog
  login/page.jsx                                  # Register and login form
  my-patterns/page.jsx                            # Entitled patterns
  patterns/[slug]/page.jsx                        # Pattern overview and purchase link
  studio/[slug]/page.jsx                          # Authenticated section workspace
  redeem/page.jsx                                 # Redeem form
  page.jsx, layout.jsx, globals.css               # Site shell and home
components/
  Header.jsx, PatternCard.jsx, RedeemForm.jsx, StudioWorkspace.jsx
lib/
  auth.js, db.js, patterns.js, redemption.js, session.js
public/patterns/                                  # Generated original preview assets
tests/redemption.test.js                           # Redemption invariants
data/.gitkeep                                     # Persistent-database mount point
README.md                                         # Run, deploy and external-code workflow
```

### Task 1: Bootstrap the web project and persistence layer

**Files:**
- Create: `package.json`, `next.config.mjs`, `app/layout.jsx`, `app/globals.css`, `app/page.jsx`
- Create: `lib/db.js`, `lib/patterns.js`, `lib/redemption.js`, `data/.gitkeep`
- Create: `tests/redemption.test.js`

**Interfaces:**
- Produces `getDb()`, `seedDatabase(db)`, `createRedemptionCodes(db, patternId, count)` and `redeemCode(db, rawCode, userId)`.
- `redeemCode` returns `{ ok: true, patternId }` or `{ ok: false, reason: 'invalid' | 'used' }`.

- [ ] **Step 1: Write the failing redemption tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { seedDatabase, createRedemptionCodes, redeemCode } from '../lib/redemption.js';

test('a valid code grants its pattern once', () => {
  const db = new Database(':memory:');
  seedDatabase(db);
  const [code] = createRedemptionCodes(db, 'azure-dragon', 1);
  assert.deepEqual(redeemCode(db, code, 'user-1'), { ok: true, patternId: 'azure-dragon' });
  assert.deepEqual(redeemCode(db, code, 'user-2'), { ok: false, reason: 'used' });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`

Expected: FAIL because `lib/redemption.js` does not exist.

- [ ] **Step 3: Implement package setup, schema, seed data and redemption functions**

```js
export function createRedemptionCodes(db, patternId, count) {
  const insert = db.prepare('INSERT INTO redemption_codes (pattern_id, code_hash) VALUES (?, ?)');
  return Array.from({ length: count }, () => {
    const raw = `PB-${crypto.randomBytes(12).toString('hex').toUpperCase()}`;
    insert.run(patternId, sha256(raw));
    return raw;
  });
}

export function redeemCode(db, rawCode, userId) {
  return db.transaction(() => {
    const code = db.prepare('SELECT * FROM redemption_codes WHERE code_hash = ?').get(sha256(rawCode));
    if (!code) return { ok: false, reason: 'invalid' };
    if (code.redeemed_at) return { ok: false, reason: 'used' };
    db.prepare('UPDATE redemption_codes SET redeemed_at = CURRENT_TIMESTAMP, redeemed_by = ? WHERE id = ?').run(userId, code.id);
    db.prepare('INSERT OR IGNORE INTO user_patterns (user_id, pattern_id) VALUES (?, ?)').run(userId, code.pattern_id);
    return { ok: true, patternId: code.pattern_id };
  })();
}
```

- [ ] **Step 4: Run tests and production build**

Run: `npm test && npm run build`

Expected: all Node tests pass and Next completes its production build.

- [ ] **Step 5: Commit**

```bash
git add package.json next.config.mjs app lib data tests
git commit -m "feat: bootstrap pattern web and redemption store"
```

### Task 2: Add session authentication and the public catalog

**Files:**
- Create: `lib/session.js`, `lib/auth.js`, `app/api/auth/register/route.js`, `app/api/auth/login/route.js`, `app/api/auth/logout/route.js`
- Create: `components/Header.jsx`, `components/PatternCard.jsx`, `app/library/page.jsx`, `app/patterns/[slug]/page.jsx`, `app/login/page.jsx`
- Modify: `app/page.jsx`, `app/globals.css`, `lib/patterns.js`

**Interfaces:**
- `registerUser({ email, password })` returns `{ id, email }` after bcrypt hashing.
- `getCurrentUser()` returns `{ id, email, role } | null` from the signed session cookie.
- `getPatternBySlug(slug)` returns one seeded pattern and its sections.

- [ ] **Step 1: Write the failing user registration test**

```js
test('registration stores a bcrypt hash instead of the raw password', async () => {
  const user = await registerUser({ email: 'maker@example.com', password: 'safe-password' });
  const row = getDb().prepare('SELECT password_hash FROM users WHERE id = ?').get(user.id);
  assert.notEqual(row.password_hash, 'safe-password');
  assert.equal(await bcrypt.compare('safe-password', row.password_hash), true);
});
```

- [ ] **Step 2: Run the new test to verify it fails**

Run: `npm test`

Expected: FAIL because `registerUser` is not implemented.

- [ ] **Step 3: Implement auth and catalog pages**

```js
export async function registerUser({ email, password }) {
  const id = crypto.randomUUID();
  const passwordHash = await bcrypt.hash(password, 12);
  getDb().prepare('INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, ?)')
    .run(id, email.trim().toLowerCase(), passwordHash, 'member');
  return { id, email: email.trim().toLowerCase() };
}
```

Implement the catalog with three seeded works, each showing type, board count, finished size, difficulty, price, copyright statement and a `purchaseUrl`. Use the generated original preview assets; do not expose code or studio pages without a valid entitlement.

- [ ] **Step 4: Run tests, build and manual catalog check**

Run: `npm test && npm run build && npm run dev`

Expected: tests and build pass; `/`, `/library`, a pattern detail page and `/login` render without console errors.

- [ ] **Step 5: Commit**

```bash
git add app components lib tests public
git commit -m "feat: add catalog and member authentication"
```

### Task 3: Add redeem, personal library and guided workspace

**Files:**
- Create: `app/api/redeem/route.js`, `app/api/progress/route.js`, `components/RedeemForm.jsx`, `components/StudioWorkspace.jsx`, `app/redeem/page.jsx`, `app/my-patterns/page.jsx`, `app/studio/[slug]/page.jsx`
- Modify: `lib/redemption.js`, `lib/patterns.js`, `app/globals.css`
- Modify: `tests/redemption.test.js`

**Interfaces:**
- `POST /api/redeem` accepts `{ code }`, requires a session and returns `{ patternId, slug }` on success.
- `POST /api/progress` accepts `{ patternId, sectionId, complete }`, requires ownership, and returns `{ complete }`.
- `StudioWorkspace({ pattern, completeSectionIds })` renders only the sections of an owned pattern.

- [ ] **Step 1: Write failing ownership and progress tests**

```js
test('an unlocked section stores completion only for its owning user', () => {
  const db = seededMemoryDb();
  grantPattern(db, 'user-1', 'azure-dragon');
  assert.equal(saveProgress(db, 'user-1', 'azure-dragon', 'A01', true).complete, true);
  assert.throws(() => saveProgress(db, 'user-2', 'azure-dragon', 'A01', true), /not entitled/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`

Expected: FAIL because `saveProgress` does not exist.

- [ ] **Step 3: Implement redemption and workspace**

```js
export function saveProgress(db, userId, patternId, sectionId, complete) {
  const owned = db.prepare('SELECT 1 FROM user_patterns WHERE user_id = ? AND pattern_id = ?').get(userId, patternId);
  if (!owned) throw new Error('not entitled');
  db.prepare(`INSERT INTO user_progress (user_id, pattern_id, section_id, complete)
              VALUES (?, ?, ?, ?)
              ON CONFLICT(user_id, pattern_id, section_id) DO UPDATE SET complete = excluded.complete`)
    .run(userId, patternId, sectionId, complete ? 1 : 0);
  return { complete };
}
```

The redeem form must show clear invalid/used/success messages. The studio must display a full overview, section list, active section, specification panel and completion meter. For 3D bag patterns, label each section as a physical component and show assembly order.

- [ ] **Step 4: Run tests, build and end-to-end manual check**

Run: `npm test && npm run build && npm run dev`

Expected: a registered user can redeem one fresh code, see it in `/my-patterns`, toggle progress in `/studio/azure-dragon`, and cannot redeem the code again.

- [ ] **Step 5: Commit**

```bash
git add app components lib tests
git commit -m "feat: add redemption and guided pattern workspace"
```

### Task 4: Add the lightweight admin code tool, assets and handoff documentation

**Files:**
- Create: `app/api/admin/codes/route.js`, `app/admin/page.jsx`, `public/patterns/*.webp`, `README.md`
- Modify: `lib/auth.js`, `lib/patterns.js`, `app/globals.css`

**Interfaces:**
- `POST /api/admin/codes` accepts `{ patternId, count }`, requires `role === 'admin'`, and returns plaintext codes once.
- `GET /api/admin/codes` returns code status without plaintext values.

- [ ] **Step 1: Write the failing admin authorization test**

```js
test('only an admin can generate a code batch', () => {
  assert.throws(() => requireAdmin({ role: 'member' }), /forbidden/);
  assert.doesNotThrow(() => requireAdmin({ role: 'admin' }));
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`

Expected: FAIL because `requireAdmin` does not exist.

- [ ] **Step 3: Implement the admin tool and usage documentation**

```js
export function requireAdmin(user) {
  if (!user || user.role !== 'admin') throw new Error('forbidden');
}
```

Set the first registered account as `admin` only when its email equals `ADMIN_EMAIL`; require `ADMIN_EMAIL`, `SESSION_SECRET` and `DATABASE_PATH` in `.env.local`. Generate original preview assets for the three seeded patterns. In `README.md`, document local start, persistent-disk deployment, first-admin setup, code export to the external virtual-goods channel and code revocation.

- [ ] **Step 4: Run all automated and visual checks**

Run: `npm test && npm run build && npm run dev`

Expected: tests pass, production build succeeds, and desktop/mobile checks show catalog, redeem, owned studio and admin pages in their expected authenticated states.

- [ ] **Step 5: Commit**

```bash
git add app components lib public README.md tests
git commit -m "feat: add admin code delivery workflow"
```

## Self-review

- Spec coverage: Tasks 1–4 cover catalog, two pattern types, accounts, single-use codes, owned patterns, progress, an admin code workflow, responsive views, external payment handoff and deployment instructions.
- Deliberate exclusions: payment APIs, subscriptions, carts, public user uploads, generic conversion and external social-platform operations are not included.
- Data consistency: `Pattern.id` is the stable entitlement key; `Pattern.slug` is used only for public and studio URLs; progress is keyed by `user_id + pattern_id + section_id`.
- Placeholder scan: no deferred implementation items or unspecified interfaces remain.
