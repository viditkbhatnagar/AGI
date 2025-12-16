/**
 * Deck Store - Local File Persistence
 * 
 * Simple persistence implementation that writes deck JSON to local files.
 * For production, replace with database persistence.
 */

import * as fs from "fs";
import * as path from "path";
import type { StageBOutput, StoredFlashcardDeck } from "../types";

// =============================================================================
// CONFIGURATION
// =============================================================================

const DECKS_DIR = path.join(process.cwd(), "server", "tmp", "decks");

// =============================================================================
// ENSURE DIRECTORY EXISTS
// =============================================================================

function ensureDecksDir(): void {
  if (!fs.existsSync(DECKS_DIR)) {
    fs.mkdirSync(DECKS_DIR, { recursive: true });
  }
}

// =============================================================================
// SAVE DECK
// =============================================================================

/**
 * Sanitize module_id for use in filenames (Windows doesn't allow : in filenames)
 */
function sanitizeForFilename(str: string): string {
  return str.replace(/[<>:"/\\|?*]/g, "_");
}

/**
 * Save a deck to local file storage.
 * 
 * @param module_id - Module identifier
 * @param deckObj - The deck object to save (StageBOutput or StoredFlashcardDeck)
 * @returns Promise with the file path
 */
export async function saveDeckToStore(
  module_id: string,
  deckObj: StageBOutput | StoredFlashcardDeck
): Promise<{ path: string; deck_id: string }> {
  ensureDecksDir();
  
  const timestamp = Date.now();
  const deck_id = `deck_${module_id}_${timestamp}`;
  const safeModuleId = sanitizeForFilename(module_id);
  const filename = `${safeModuleId}-${timestamp}.json`;
  const filePath = path.join(DECKS_DIR, filename);
  
  // Add metadata if not present
  const deckWithMeta = {
    ...deckObj,
    id: deck_id,
    saved_at: new Date().toISOString(),
    file_path: filePath,
  };
  
  // Atomic write: write to temp file then rename
  const tempPath = `${filePath}.tmp`;
  
  try {
    fs.writeFileSync(tempPath, JSON.stringify(deckWithMeta, null, 2), "utf-8");
    fs.renameSync(tempPath, filePath);
    
    console.log(`[DeckStore] Saved deck to ${filePath}`);
    
    return { path: filePath, deck_id };
  } catch (error) {
    // Clean up temp file if it exists
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
    throw error;
  }
}

// =============================================================================
// READ LATEST DECK
// =============================================================================

/**
 * Read the most recent deck for a module.
 * 
 * @param module_id - Module identifier
 * @returns The deck object or null if not found
 */
export async function readLatestDeck(
  module_id: string
): Promise<StoredFlashcardDeck | null> {
  ensureDecksDir();
  
  const files = fs.readdirSync(DECKS_DIR);
  const safeModuleId = sanitizeForFilename(module_id);
  
  // Find all files for this module
  const moduleFiles = files
    .filter(f => f.startsWith(`${safeModuleId}-`) && f.endsWith(".json"))
    .sort()
    .reverse(); // Most recent first (timestamp in filename)
  
  if (moduleFiles.length === 0) {
    return null;
  }
  
  const latestFile = path.join(DECKS_DIR, moduleFiles[0]);
  
  try {
    const content = fs.readFileSync(latestFile, "utf-8");
    return JSON.parse(content) as StoredFlashcardDeck;
  } catch (error) {
    console.error(`[DeckStore] Failed to read ${latestFile}:`, error);
    return null;
  }
}

// =============================================================================
// READ DECK BY ID
// =============================================================================

/**
 * Read a specific deck by its ID.
 * 
 * @param deck_id - Deck identifier (format: deck_{module_id}_{timestamp})
 * @returns The deck object or null if not found
 */
export async function readDeckById(
  deck_id: string
): Promise<StoredFlashcardDeck | null> {
  ensureDecksDir();
  
  // Extract module_id and timestamp from deck_id
  const match = deck_id.match(/^deck_(.+)_(\d+)$/);
  if (!match) {
    return null;
  }
  
  const [, module_id, timestamp] = match;
  const safeModuleId = sanitizeForFilename(module_id);
  const filename = `${safeModuleId}-${timestamp}.json`;
  const filePath = path.join(DECKS_DIR, filename);
  
  if (!fs.existsSync(filePath)) {
    return null;
  }
  
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(content) as StoredFlashcardDeck;
  } catch (error) {
    console.error(`[DeckStore] Failed to read ${filePath}:`, error);
    return null;
  }
}

// =============================================================================
// LIST DECKS FOR MODULE
// =============================================================================

/**
 * List all decks for a module.
 * 
 * @param module_id - Module identifier
 * @returns Array of deck metadata
 */
export async function listDecksForModule(
  module_id: string
): Promise<Array<{ deck_id: string; path: string; created_at: string }>> {
  ensureDecksDir();
  
  const files = fs.readdirSync(DECKS_DIR);
  const safeModuleId = sanitizeForFilename(module_id);
  
  const moduleFiles = files
    .filter(f => f.startsWith(`${safeModuleId}-`) && f.endsWith(".json"))
    .sort()
    .reverse();
  
  return moduleFiles.map(filename => {
    const match = filename.match(/^(.+)-(\d+)\.json$/);
    const timestamp = match ? parseInt(match[2], 10) : 0;
    
    return {
      deck_id: `deck_${module_id}_${timestamp}`,
      path: path.join(DECKS_DIR, filename),
      created_at: new Date(timestamp).toISOString(),
    };
  });
}

// =============================================================================
// DELETE DECK
// =============================================================================

/**
 * Delete a deck by ID.
 * 
 * @param deck_id - Deck identifier
 * @returns true if deleted, false if not found
 */
export async function deleteDeck(deck_id: string): Promise<boolean> {
  const deck = await readDeckById(deck_id);
  
  if (!deck) {
    return false;
  }
  
  const match = deck_id.match(/^deck_(.+)_(\d+)$/);
  if (!match) {
    return false;
  }
  
  const [, module_id, timestamp] = match;
  const safeModuleId = sanitizeForFilename(module_id);
  const filename = `${safeModuleId}-${timestamp}.json`;
  const filePath = path.join(DECKS_DIR, filename);
  
  try {
    fs.unlinkSync(filePath);
    console.log(`[DeckStore] Deleted deck ${deck_id}`);
    return true;
  } catch (error) {
    console.error(`[DeckStore] Failed to delete ${filePath}:`, error);
    return false;
  }
}

// =============================================================================
// CLEANUP OLD DECKS
// =============================================================================

/**
 * Delete old decks for a module, keeping only the N most recent.
 * 
 * @param module_id - Module identifier
 * @param keepCount - Number of recent decks to keep (default: 5)
 * @returns Number of decks deleted
 */
export async function cleanupOldDecks(
  module_id: string,
  keepCount: number = 5
): Promise<number> {
  const decks = await listDecksForModule(module_id);
  
  if (decks.length <= keepCount) {
    return 0;
  }
  
  const toDelete = decks.slice(keepCount);
  let deleted = 0;
  
  for (const deck of toDelete) {
    if (await deleteDeck(deck.deck_id)) {
      deleted++;
    }
  }
  
  return deleted;
}

// =============================================================================
// GET DECKS DIRECTORY
// =============================================================================

export function getDecksDirectory(): string {
  return DECKS_DIR;
}
