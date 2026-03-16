/**
 * clear-leaderboard.mjs
 *
 * Deletes all leaderboard data from Firestore:
 *   - events/global/scores/{uid}        (individual global scores)
 *   - events/{teamName}/scores/{uid}    (per-team individual scores)
 *   - teams/{teamName}                  (team aggregate documents)
 *
 * Usage:
 *   1. Download a Firebase Admin service account key from the Firebase Console:
 *      Project Settings → Service accounts → Generate new private key
 *      Save as serviceAccountKey.json (do NOT commit this file)
 *
 *   2. Install firebase-admin if needed:
 *      npm install --save-dev firebase-admin
 *
 *   3. Run (dry-run first — shows what will be deleted):
 *      node scripts/clear-leaderboard.mjs --dry-run
 *
 *   4. Run for real:
 *      node scripts/clear-leaderboard.mjs
 */

import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const DRY_RUN = process.argv.includes('--dry-run');

// ── Load service account ──────────────────────────────────────────────────────
const keyPath = resolve(__dirname, '../serviceAccountKey.json');
let serviceAccount;
try {
  serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8'));
} catch {
  console.error(
    '\n❌  serviceAccountKey.json not found.\n' +
    '    Download it from Firebase Console → Project Settings → Service accounts\n' +
    '    and save it as serviceAccountKey.json in the project root.\n'
  );
  process.exit(1);
}

// ── Initialise Admin SDK ──────────────────────────────────────────────────────
const admin = require('firebase-admin');
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}
const db = admin.firestore();

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Delete all documents in a collection reference in batches of 400.
 * Returns the count of documents deleted.
 */
async function deleteCollection(colRef, label) {
  let total = 0;
  let snapshot;

  do {
    snapshot = await colRef.limit(400).get();
    if (snapshot.empty) break;

    if (DRY_RUN) {
      snapshot.docs.forEach(d => console.log(`  [dry-run] would delete ${label}/${d.id}`));
      total += snapshot.docs.length;
      break; // don't loop — just show one page in dry-run
    }

    const batch = db.batch();
    snapshot.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    total += snapshot.docs.length;
    console.log(`  deleted ${total} so far from ${label}...`);
  } while (!snapshot.empty);

  return total;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🗑  Leaderboard clear${DRY_RUN ? ' (DRY RUN — nothing will be written)' : ''}\n`);

  let grandTotal = 0;

  // 1. events/global/scores
  console.log('▸ Clearing events/global/scores ...');
  const globalCount = await deleteCollection(
    db.collection('events').doc('global').collection('scores'),
    'events/global/scores'
  );
  console.log(`  ✓ ${globalCount} document(s)\n`);
  grandTotal += globalCount;

  // 2. All other events/{teamName}/scores sub-collections
  console.log('▸ Finding team event collections under events/ ...');
  const eventsSnap = await db.collection('events').get();
  for (const eventDoc of eventsSnap.docs) {
    if (eventDoc.id === 'global') continue; // already handled above
    const scoresRef = eventDoc.ref.collection('scores');
    const teamCount = await deleteCollection(scoresRef, `events/${eventDoc.id}/scores`);
    if (teamCount > 0) {
      console.log(`  ✓ ${teamCount} document(s) from events/${eventDoc.id}/scores`);
      grandTotal += teamCount;
    }
    // Delete the event parent document itself if it exists
    if (!DRY_RUN) {
      await eventDoc.ref.delete();
      console.log(`  ✓ deleted events/${eventDoc.id} parent doc`);
    } else {
      console.log(`  [dry-run] would delete events/${eventDoc.id} parent doc`);
    }
  }
  console.log();

  // 3. teams/{teamName}
  console.log('▸ Clearing teams/ ...');
  const teamsCount = await deleteCollection(
    db.collection('teams'),
    'teams'
  );
  console.log(`  ✓ ${teamsCount} document(s)\n`);
  grandTotal += teamsCount;

  // 4. Summary
  if (DRY_RUN) {
    console.log(`✅  Dry run complete. Would have deleted ~${grandTotal} document(s).`);
    console.log('    Re-run without --dry-run to execute.\n');
  } else {
    console.log(`✅  Done. Deleted ${grandTotal} document(s) total.\n`);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
