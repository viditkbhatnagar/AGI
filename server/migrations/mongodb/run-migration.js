#!/usr/bin/env node

/**
 * MongoDB Migration Runner
 * 
 * Usage:
 *   node server/migrations/mongodb/run-migration.js <migration-file>
 *   
 * Example:
 *   node server/migrations/mongodb/run-migration.js 001_add_hybrid_document_support.js
 */

const path = require('path');
const fs = require('fs');

async function runMigration() {
  const migrationFile = process.argv[2];
  
  if (!migrationFile) {
    console.error('Usage: node run-migration.js <migration-file>');
    console.error('Example: node run-migration.js 001_add_hybrid_document_support.js');
    process.exit(1);
  }

  const migrationPath = path.join(__dirname, migrationFile);
  
  if (!fs.existsSync(migrationPath)) {
    console.error(`Migration file not found: ${migrationPath}`);
    process.exit(1);
  }

  console.log(`Running migration: ${migrationFile}`);
  
  try {
    const migration = require(migrationPath);
    
    if (typeof migration.runMigration === 'function') {
      await migration.runMigration();
    } else {
      console.error('Migration file must export a runMigration function');
      process.exit(1);
    }
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();