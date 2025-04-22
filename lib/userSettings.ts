import path from 'path';
import Database from 'better-sqlite3';

export type UserSettings = {
  id: number;
  name: string;
  email: string;
  theme: string;
  created_at: string;
  updated_at: string;
};

// Function to get the database connection
export function getDB() {
  const dbPath = path.join(process.cwd(), 'data', 'finance.db');
  return new Database(dbPath);
}

// Server-side function to fetch user settings
export async function getUserSettings(): Promise<UserSettings | null> {
  const db = getDB();
  
  try {
    const settings = db.prepare(`
      SELECT * FROM user_settings
      LIMIT 1
    `).get();
    
    return settings as UserSettings || null;
  } catch (error) {
    console.error('Error fetching user settings:', error);
    return null;
  } finally {
    db.close();
  }
} 