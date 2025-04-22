import { NextRequest, NextResponse } from 'next/server';
import { UserSettings, getDB } from '../../../lib/userSettings';

// Initialize user settings table if it doesn't exist
function initializeUserSettingsTable() {
  const db = getDB();
  
  try {
    // Check if the table exists
    const tableExists = db.prepare(`
      SELECT name 
      FROM sqlite_master 
      WHERE type='table' AND name='user_settings'
    `).get();

    if (!tableExists) {
      // Create the table if it doesn't exist
      db.prepare(`
        CREATE TABLE user_settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT,
          email TEXT,
          theme TEXT DEFAULT 'light',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `).run();

      // Insert default settings
      db.prepare(`
        INSERT INTO user_settings (name, email, theme)
        VALUES (?, ?, ?)
      `).run('User', '', 'light');
    }
  } catch (error) {
    console.error('Error initializing user settings table:', error);
  } finally {
    db.close();
  }
}

// Initialize the table when the API is first called
initializeUserSettingsTable();

export async function GET() {
  const db = getDB();
  
  try {
    // Get the user settings (we only have one user for now)
    const settings = db.prepare(`
      SELECT * FROM user_settings
      LIMIT 1
    `).get() as UserSettings | undefined;

    // Convert to a plain object before serializing to JSON
    const plainSettings = settings ? {
      id: settings.id as number,
      name: settings.name as string,
      email: settings.email as string,
      theme: settings.theme as string,
      created_at: settings.created_at as string,
      updated_at: settings.updated_at as string
    } : { name: 'User', email: '', theme: 'light' };

    return NextResponse.json(plainSettings);
  } catch (error) {
    console.error('Error fetching user settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user settings' },
      { status: 500 }
    );
  } finally {
    db.close();
  }
}

export async function PUT(request: NextRequest) {
  const db = getDB();
  
  try {
    const data = await request.json();
    const { name, email, theme } = data;

    // Update user settings (we only have one user for now)
    const result = db.prepare(`
      UPDATE user_settings
      SET name = ?, email = ?, theme = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `).run(name || 'User', email || '', theme || 'light');

    if (result.changes === 0) {
      // If no rows were updated, insert a new row
      db.prepare(`
        INSERT INTO user_settings (name, email, theme)
        VALUES (?, ?, ?)
      `).run(name || 'User', email || '', theme || 'light');
    }

    // Get the updated settings
    const settings = db.prepare(`
      SELECT * FROM user_settings
      WHERE id = 1
    `).get() as UserSettings | undefined;

    // Convert to a plain object before serializing to JSON
    const plainSettings = settings ? {
      id: settings.id as number,
      name: settings.name as string,
      email: settings.email as string,
      theme: settings.theme as string,
      created_at: settings.created_at as string,
      updated_at: settings.updated_at as string
    } : { name: 'User', email: '', theme: 'light' };

    return NextResponse.json(plainSettings);
  } catch (error) {
    console.error('Error updating user settings:', error);
    return NextResponse.json(
      { error: 'Failed to update user settings' },
      { status: 500 }
    );
  } finally {
    db.close();
  }
} 