# Pixel Mural Full-Stack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the functional web app with versioned MARD colour-grid data, customer accounts, one-time redemption, purchase inventories, free pattern feedback and complete-work commission matching.

**Architecture:** Keep the existing Next.js Node service and SQLite database. The public gallery remains a storefront; authenticated users receive only their entitled pattern version through server-checked APIs. Pattern grids and inventory are immutable data attached to a published pattern version; feedback and commissions are independent of the payment channel.

**Tech Stack:** Next.js 16, React 19, JavaScript, better-sqlite3, bcryptjs, jose, Node test runner.

## Global Constraints

- Do not implement payment, escrow, logistics, live chat, video calls, automatic dispatching or paid remote rescue.
- Collect only email, password hash, pattern entitlements, progress and the minimum feedback/commission fields defined in the backend design.
- Store redemption codes only as SHA-256 hashes; return plaintext only from the batch-generation response.
- Default published inventory uses `MARD 291`; every grid cell has a brand code, hex value and per-pattern/per-section count.
- Full commission work means a maker recreates the full work from the start; never promise handover of unfused partial work.
- Every protected API verifies the current user server-side.

---

## File Structure

```
lib/pattern-data.js                       # Published MARD cells, statistics and version helpers
lib/redemption.js                         # SQLite schema, code flows, progress, feedback and commissions
lib/patterns.js                           # Pattern, inventory, entitlement and commission query helpers
app/api/pattern-feedback/route.js         # Authenticated free feedback submission
app/api/commissions/route.js              # Create/list complete-work commission requests
app/api/commission-applications/route.js  # Maker applications and owner selection
app/feedback/page.jsx                     # User feedback form
app/commissions/page.jsx                  # Commission lobby and user requests
components/StudioWorkspace.jsx            # Directly labelled MARD cell grid and inventory panel
components/PatternInventory.jsx           # Full-pattern and section inventory table
components/FeedbackForm.jsx               # Context-aware free feedback form
components/CommissionRequestForm.jsx      # Complete-work request form
tests/pattern-data.test.js                # Grid and inventory invariants
tests/feedback-commission.test.js         # Feedback and commission ownership invariants
```

### Task 1: Versioned MARD pattern data and inventory

**Files:**
- Create: `lib/pattern-data.js`, `tests/pattern-data.test.js`
- Modify: `lib/redemption.js`, `lib/patterns.js`, `tests/redemption.test.js`

**Interfaces:**
- Produces `getPublishedPatternData(patternId)` returning `{ brand, version, sections, inventory, totalBeads }`.
- Each cell is `{ code, hex }`; `inventory` rows are `{ code, hex, name, total, bySection }`.

- [ ] **Step 1: Write the failing inventory test**

```js
test('published MARD data totals match every section cell', () => {
  const pattern = getPublishedPatternData('azure-dragon');
  const sectionTotal = pattern.sections.flatMap((section) => section.cells).length;
  const inventoryTotal = pattern.inventory.reduce((sum, item) => sum + item.total, 0);
  assert.equal(pattern.brand, 'MARD 291');
  assert.equal(pattern.totalBeads, sectionTotal);
  assert.equal(inventoryTotal, sectionTotal);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/pattern-data.test.js`

Expected: FAIL because `lib/pattern-data.js` does not exist.

- [ ] **Step 3: Implement published grid data and database fields**

```js
export function getPublishedPatternData(patternId) {
  const sections = publishedPatterns[patternId];
  const cells = sections.flatMap((section) => section.cells);
  return {
    brand: 'MARD 291',
    version: 1,
    sections,
    totalBeads: cells.length,
    inventory: countInventory(sections),
  };
}
```

Add `palette_brand`, `pattern_version`, `grid_json` and `inventory_json` to the pattern/section schema. Seed the existing three patterns with version `1`; only `azure-dragon` needs a full MARD demo grid in this task.

- [ ] **Step 4: Run all data tests**

Run: `npm test`

Expected: all existing redemption tests and the new inventory test pass.

- [ ] **Step 5: Commit**

```bash
git add lib tests
git commit -m "feat: add versioned MARD pattern inventory"
```

### Task 2: Real production-facing pattern studio and inventory

**Files:**
- Create: `components/PatternInventory.jsx`
- Modify: `lib/patterns.js`, `app/studio/[slug]/page.jsx`, `components/StudioWorkspace.jsx`, `app/globals.css`

**Interfaces:**
- Consumes `getPublishedPatternData(pattern.id)`.
- `PatternInventory({ patternData, activeSectionId })` displays full-pattern totals and the active-section count for each MARD code.

- [ ] **Step 1: Write the failing grid data assertion**

```js
test('every published cell has a MARD code and hex colour', () => {
  const { sections } = getPublishedPatternData('azure-dragon');
  for (const cell of sections.flatMap((section) => section.cells)) {
    assert.match(cell.code, /^MARD [A-Z]+\d+$/);
    assert.match(cell.hex, /^#[0-9A-F]{6}$/);
  }
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/pattern-data.test.js`

Expected: FAIL until all seeded cells are normalised to `{ code, hex }`.

- [ ] **Step 3: Render the grid and inventory**

```jsx
{activeSection.cells.map((cell, index) => (
  <span key={index} style={{ backgroundColor: cell.hex }} className="bead-cell">
    {cell.code.replace('MARD ', '')}
  </span>
))}
```

Show `MARD 291`, total bead count, section count, all-colour totals and active-section totals. Use the existing entitlement check before sending the data to the browser.

- [ ] **Step 4: Run tests and build**

Run: `npm test && npm run build`

Expected: test suite passes and all routes compile.

- [ ] **Step 5: Commit**

```bash
git add app components lib tests
git commit -m "feat: show MARD grids and pattern inventories"
```

### Task 3: Free pattern feedback

**Files:**
- Create: `app/api/pattern-feedback/route.js`, `app/feedback/page.jsx`, `components/FeedbackForm.jsx`
- Modify: `lib/redemption.js`, `app/my-patterns/page.jsx`, `tests/feedback-commission.test.js`

**Interfaces:**
- `createFeedback(db, userId, { patternId, sectionId, cellRef, category, note })` returns `{ id, status: 'open' }`.
- `POST /api/pattern-feedback` requires ownership of `patternId`.

- [ ] **Step 1: Write the failing ownership test**

```js
test('feedback can only be created for an entitled pattern', () => {
  const db = seededMemoryDb();
  grantPattern(db, 'user-1', 'azure-dragon');
  assert.equal(createFeedback(db, 'user-1', feedbackInput).status, 'open');
  assert.throws(() => createFeedback(db, 'user-2', feedbackInput), /not entitled/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/feedback-commission.test.js`

Expected: FAIL because `createFeedback` is not implemented.

- [ ] **Step 3: Implement feedback schema and route**

Create `pattern_feedback` with owner, pattern, optional section/cell reference, category, note, status, created time and updated time. Allow only: `placement`, `colour`, `material`, `ironing`, `other`. Do not create message threads, quoted rescue prices or real-time support promises.

- [ ] **Step 4: Run tests and build**

Run: `npm test && npm run build`

Expected: only an entitled user can submit feedback and the build passes.

- [ ] **Step 5: Commit**

```bash
git add app components lib tests
git commit -m "feat: add free pattern feedback"
```

### Task 4: Complete-work commission matching

**Files:**
- Create: `app/api/commissions/route.js`, `app/api/commission-applications/route.js`, `app/commissions/page.jsx`, `components/CommissionRequestForm.jsx`
- Modify: `lib/redemption.js`, `lib/patterns.js`, `app/my-patterns/page.jsx`, `tests/feedback-commission.test.js`

**Interfaces:**
- `createCommissionRequest(db, userId, { patternId, city, budgetMin, budgetMax, dueDate, note })` returns `{ id, status: 'open' }`.
- `applyToCommission(db, makerId, { requestId, quote, days, note })` requires an approved `maker_profiles` row.
- `selectCommissionApplication(db, customerId, applicationId)` creates one `commission_matches` row and marks the request `matched`.

- [ ] **Step 1: Write the failing complete-work request test**

```js
test('a commission request needs an owned pattern and stores complete-work status', () => {
  const db = seededMemoryDb();
  grantPattern(db, 'customer-1', 'azure-dragon');
  const request = createCommissionRequest(db, 'customer-1', requestInput);
  assert.equal(request.status, 'open');
  assert.throws(() => createCommissionRequest(db, 'customer-2', requestInput), /not entitled/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/feedback-commission.test.js`

Expected: FAIL because commission helpers do not exist.

- [ ] **Step 3: Implement commission tables and APIs**

Create `maker_profiles`, `commission_requests`, `commission_applications` and `commission_matches`. Set the request `service_mode` to the literal value `full_remake`; reject every other value. Do not add address, payment, shipping, live chat or partial-section handover fields.

- [ ] **Step 4: Implement the two simple views**

Add a `找代拼` action in owned pattern cards, a request form and a commission lobby for approved makers. Before matching, makers receive only public work specifications; after selection, grant a separate read-only, watermarked full-pattern view.

- [ ] **Step 5: Run tests and build**

Run: `npm test && npm run build`

Expected: only entitled customers can request a complete-work commission; only approved makers can quote; build succeeds.

- [ ] **Step 6: Commit**

```bash
git add app components lib tests
git commit -m "feat: add complete-work commission matching"
```

## Self-review

- The plan covers real grids and MARD inventory, customer accounts and code entitlements already present in the service, free feedback, and complete-work commission matching.
- It deliberately excludes payment, shipping, chat, video, address collection, live rescue pricing and partial-work handover.
- All APIs use the existing server-side session and entitlement checks; later tasks depend only on functions named in this plan.
