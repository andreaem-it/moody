/**
 * Migrations — superseded by Firestore schemaless model.
 * Kept as a no-op to avoid breaking any import that calls runMigrations().
 */
function runMigrations() {
  console.log('✅ Firestore: no migrations needed (schemaless)');
}

module.exports = { runMigrations };
