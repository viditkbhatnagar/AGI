/**
 * Database Client Factory
 * 
 * Provides Drizzle ORM clients for PostgreSQL (production) and SQLite (testing).
 * Uses DATABASE_URL environment variable for connection configuration.
 */

import { drizzle as drizzlePg, PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { drizzle as drizzleSqlite, BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import postgres from "postgres";
import Database from "better-sqlite3";

// =============================================================================
// TYPES
// =============================================================================

export type DbClient = PostgresJsDatabase | BetterSQLite3Database;
export type DbType = "postgres" | "sqlite";

interface DbConnection {
    client: DbClient;
    type: DbType;
    close: () => Promise<void>;
}

// =============================================================================
// SINGLETON STATE
// =============================================================================

let _connection: DbConnection | null = null;

// =============================================================================
// CONNECTION FACTORY
// =============================================================================

/**
 * Get or create the database client.
 * Uses DATABASE_URL from environment.
 */
export function getDbClient(): DbClient {
    if (_connection) {
        return _connection.client;
    }

    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
        throw new Error("DATABASE_URL environment variable is required for DB store");
    }

    _connection = createConnection(databaseUrl);
    return _connection.client;
}

/**
 * Get the database type (postgres or sqlite)
 */
export function getDbType(): DbType {
    if (!_connection) {
        getDbClient(); // Initialize connection
    }
    return _connection!.type;
}

/**
 * Create a database connection for testing with explicit connection string.
 * 
 * @param connectionString - Database URL (postgres://... or sqlite::memory:)
 */
export function createDbForTest(connectionString: string): DbConnection {
    return createConnection(connectionString);
}

/**
 * Close the database connection.
 */
export async function closeDbConnection(): Promise<void> {
    if (_connection) {
        await _connection.close();
        _connection = null;
    }
}

// =============================================================================
// INTERNAL HELPERS
// =============================================================================

function createConnection(databaseUrl: string): DbConnection {
    // SQLite for testing
    if (databaseUrl.startsWith("sqlite:") || databaseUrl === ":memory:") {
        const dbPath = databaseUrl === ":memory:"
            ? ":memory:"
            : databaseUrl.replace("sqlite:", "");

        const sqliteDb = new Database(dbPath);
        const client = drizzleSqlite(sqliteDb);

        return {
            client,
            type: "sqlite",
            close: async () => {
                sqliteDb.close();
            },
        };
    }

    // PostgreSQL for production
    const sql = postgres(databaseUrl, {
        max: 10,
        idle_timeout: 20,
        connect_timeout: 10,
    });

    const client = drizzlePg(sql);

    return {
        client,
        type: "postgres",
        close: async () => {
            await sql.end();
        },
    };
}

/**
 * Execute raw SQL against the database.
 * Useful for migrations and testing.
 */
export async function executeRawSql(sql: string): Promise<void> {
    const databaseUrl = process.env.DATABASE_URL || "";

    if (databaseUrl.startsWith("sqlite:") || databaseUrl === ":memory:") {
        // For SQLite, we need to handle this differently
        // The Drizzle SQLite client doesn't expose raw execute
        throw new Error("Raw SQL execution not supported for SQLite via this helper. Use the Database instance directly.");
    }

    // For Postgres
    const pgClient = postgres(databaseUrl);
    await pgClient.unsafe(sql);
    await pgClient.end();
}

// =============================================================================
// SQL HELPERS (for tests)
// =============================================================================

/**
 * SQLite-compatible table creation SQL (for testing).
 * Postgres migration uses different syntax.
 */
export const SQLITE_CREATE_TABLES_SQL = `
  CREATE TABLE IF NOT EXISTS flashcard_decks (
    deck_id TEXT PRIMARY KEY,
    module_id TEXT NOT NULL,
    course_id TEXT,
    module_title TEXT,
    generated_at TEXT DEFAULT (datetime('now')),
    model_version TEXT,
    raw_model_output_url TEXT,
    verified_rate REAL,
    warnings TEXT DEFAULT '[]',
    metadata TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_flashcard_decks_module_id 
    ON flashcard_decks(module_id);

  CREATE TABLE IF NOT EXISTS flashcards (
    card_id TEXT PRIMARY KEY,
    deck_id TEXT NOT NULL REFERENCES flashcard_decks(deck_id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    bloom_level TEXT NOT NULL,
    evidence_json TEXT DEFAULT '[]',
    sources_json TEXT DEFAULT '[]',
    confidence_score REAL,
    rationale TEXT,
    review_required INTEGER DEFAULT 0,
    verified INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_flashcards_deck_id 
    ON flashcards(deck_id);
`;
