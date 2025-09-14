# MongoDB Migrations

This directory contains MongoDB migration scripts for the course management system.

## Running Migrations

### Individual Migration
To run a specific migration:

```bash
node server/migrations/mongodb/run-migration.js <migration-file>
```

Example:
```bash
node server/migrations/mongodb/run-migration.js 001_add_hybrid_document_support.js
```

### Direct Execution
You can also run migrations directly:

```bash
node server/migrations/mongodb/001_add_hybrid_document_support.js
```

## Available Migrations

### 001_add_hybrid_document_support.js
- **Purpose**: Adds hybrid document support to existing courses
- **Changes**: 
  - Adds `type` field to all existing documents with default value 'link'
  - Maintains backward compatibility with existing URL-based documents
  - Prepares schema for new upload-based documents
- **Safe to run**: Yes, this migration is non-destructive and maintains all existing data

## Migration Guidelines

1. **Backup First**: Always backup your MongoDB database before running migrations
2. **Test Environment**: Run migrations in a test environment first
3. **Non-Destructive**: All migrations should be designed to preserve existing data
4. **Rollback Plan**: Consider rollback procedures for each migration

## Environment Variables

Migrations use the same MongoDB connection as the main application:
- `MONGO_URI`: MongoDB connection string (defaults to development database)

## Creating New Migrations

When creating new migrations:

1. Use sequential numbering: `002_migration_name.js`, `003_migration_name.js`, etc.
2. Export a `runMigration` function
3. Include proper error handling and logging
4. Test thoroughly before deployment
5. Document the migration purpose and changes in this README