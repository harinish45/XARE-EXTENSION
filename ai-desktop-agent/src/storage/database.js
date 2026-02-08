const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs-extra');

class DatabaseManager {
    constructor(dbPath = null) {
        this.dbPath = dbPath || path.join(process.env.APPDATA || process.env.HOME, 'ai-desktop-agent', 'data.db');
        this.db = null;
    }

    async initialize() {
        // Ensure directory exists
        await fs.ensureDir(path.dirname(this.dbPath));

        // Create database connection
        this.db = new Database(this.dbPath);
        this.db.pragma('journal_mode = WAL');

        // Create tables
        this.createTables();

        console.log('Database initialized:', this.dbPath);
    }

    createTables() {
        // Conversations table
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        metadata TEXT
      )
    `);

        // Workflows table
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS workflows (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        steps TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

        // Action logs table
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS action_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action_type TEXT NOT NULL,
        params TEXT,
        success INTEGER NOT NULL,
        error TEXT,
        timestamp INTEGER NOT NULL,
        duration INTEGER
      )
    `);

        // Settings table
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

        // Create indexes
        this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_conversations_timestamp 
      ON conversations(timestamp)
    `);

        this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_action_logs_timestamp 
      ON action_logs(timestamp)
    `);
    }

    // Conversation methods
    saveConversation(role, content, metadata = {}) {
        const stmt = this.db.prepare(`
      INSERT INTO conversations (role, content, timestamp, metadata)
      VALUES (?, ?, ?, ?)
    `);

        return stmt.run(role, content, Date.now(), JSON.stringify(metadata));
    }

    getConversations(limit = 100) {
        const stmt = this.db.prepare(`
      SELECT * FROM conversations
      ORDER BY timestamp DESC
      LIMIT ?
    `);

        const rows = stmt.all(limit);
        return rows.map(row => ({
            ...row,
            metadata: JSON.parse(row.metadata || '{}')
        }));
    }

    clearConversations() {
        const stmt = this.db.prepare('DELETE FROM conversations');
        return stmt.run();
    }

    // Workflow methods
    saveWorkflow(name, description, steps) {
        const now = Date.now();
        const stmt = this.db.prepare(`
      INSERT INTO workflows (name, description, steps, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(name) DO UPDATE SET
        description = excluded.description,
        steps = excluded.steps,
        updated_at = excluded.updated_at
    `);

        return stmt.run(name, description, JSON.stringify(steps), now, now);
    }

    getWorkflow(name) {
        const stmt = this.db.prepare('SELECT * FROM workflows WHERE name = ?');
        const row = stmt.get(name);

        if (row) {
            return {
                ...row,
                steps: JSON.parse(row.steps)
            };
        }
        return null;
    }

    getAllWorkflows() {
        const stmt = this.db.prepare('SELECT * FROM workflows ORDER BY updated_at DESC');
        const rows = stmt.all();

        return rows.map(row => ({
            ...row,
            steps: JSON.parse(row.steps)
        }));
    }

    deleteWorkflow(name) {
        const stmt = this.db.prepare('DELETE FROM workflows WHERE name = ?');
        return stmt.run(name);
    }

    // Action log methods
    logAction(actionType, params, success, error = null, duration = null) {
        const stmt = this.db.prepare(`
      INSERT INTO action_logs (action_type, params, success, error, timestamp, duration)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

        return stmt.run(
            actionType,
            JSON.stringify(params),
            success ? 1 : 0,
            error,
            Date.now(),
            duration
        );
    }

    getActionLogs(limit = 100) {
        const stmt = this.db.prepare(`
      SELECT * FROM action_logs
      ORDER BY timestamp DESC
      LIMIT ?
    `);

        const rows = stmt.all(limit);
        return rows.map(row => ({
            ...row,
            params: JSON.parse(row.params || '{}'),
            success: row.success === 1
        }));
    }

    clearActionLogs() {
        const stmt = this.db.prepare('DELETE FROM action_logs');
        return stmt.run();
    }

    // Settings methods
    setSetting(key, value) {
        const stmt = this.db.prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at
    `);

        return stmt.run(key, JSON.stringify(value), Date.now());
    }

    getSetting(key, defaultValue = null) {
        const stmt = this.db.prepare('SELECT value FROM settings WHERE key = ?');
        const row = stmt.get(key);

        if (row) {
            try {
                return JSON.parse(row.value);
            } catch {
                return row.value;
            }
        }
        return defaultValue;
    }

    getAllSettings() {
        const stmt = this.db.prepare('SELECT * FROM settings');
        const rows = stmt.all();

        const settings = {};
        for (const row of rows) {
            try {
                settings[row.key] = JSON.parse(row.value);
            } catch {
                settings[row.key] = row.value;
            }
        }
        return settings;
    }

    deleteSetting(key) {
        const stmt = this.db.prepare('DELETE FROM settings WHERE key = ?');
        return stmt.run(key);
    }

    // Utility methods
    close() {
        if (this.db) {
            this.db.close();
            console.log('Database closed');
        }
    }

    backup(backupPath) {
        if (this.db) {
            this.db.backup(backupPath);
            console.log('Database backup created:', backupPath);
        }
    }

    getStats() {
        const conversations = this.db.prepare('SELECT COUNT(*) as count FROM conversations').get();
        const workflows = this.db.prepare('SELECT COUNT(*) as count FROM workflows').get();
        const actionLogs = this.db.prepare('SELECT COUNT(*) as count FROM action_logs').get();
        const settings = this.db.prepare('SELECT COUNT(*) as count FROM settings').get();

        return {
            conversations: conversations.count,
            workflows: workflows.count,
            actionLogs: actionLogs.count,
            settings: settings.count
        };
    }
}

module.exports = DatabaseManager;
