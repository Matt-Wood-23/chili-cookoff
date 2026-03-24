const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database file path
const dbPath = path.join(__dirname, '..', 'database.db');

class Database {
  constructor() {
    this.db = null;
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('Error opening database:', err.message);
          reject(err);
        } else {
          console.log('Connected to SQLite database');
          resolve();
        }
      });
    });
  }

  async initialize() {
    try {
      // Create chilis table
      await this.run(`
        CREATE TABLE IF NOT EXISTS chilis (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          contestant_name TEXT NOT NULL,
          image_path TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create votes table
      await this.run(`
        CREATE TABLE IF NOT EXISTS votes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          chili_id INTEGER NOT NULL,
          judge_name TEXT NOT NULL,
          heat INTEGER NOT NULL CHECK(heat >= 1 AND heat <= 10),
          flavor INTEGER NOT NULL CHECK(flavor >= 1 AND flavor <= 10),
          texture INTEGER NOT NULL CHECK(texture >= 1 AND texture <= 10),
          presentation INTEGER NOT NULL CHECK(presentation >= 1 AND presentation <= 10),
          overall INTEGER NOT NULL CHECK(overall >= 1 AND overall <= 10),
          comments TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (chili_id) REFERENCES chilis (id) ON DELETE CASCADE
        )
      `);

      // Create config table
      await this.run(`
        CREATE TABLE IF NOT EXISTS config (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        )
      `);

      // Insert default configuration
      await this.run(`
        INSERT OR IGNORE INTO config (key, value) VALUES
        ('voting_open', 'false'),
        ('event_name', 'Chili Cook-Off 2025'),
        ('event_date', '2025-11-04'),
        ('event_location', 'Community Center')
      `);

      console.log('Database schema initialized successfully');
    } catch (error) {
      console.error('Error initializing database:', error);
      throw error;
    }
  }

  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          console.error('Database run error:', err);
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, result) => {
        if (err) {
          console.error('Database get error:', err);
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          console.error('Database all error:', err);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  close() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            reject(err);
          } else {
            console.log('Database connection closed');
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  // Configuration management methods
  getConfig() {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT key, value FROM config', (err, rows) => {
        if (err) {
          reject(err);
        } else {
          const config = {};
          rows.forEach(row => {
            config[row.key] = row.value;
          });
          resolve(config);
        }
      });
    });
  }

  getConfigValue(key) {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT value FROM config WHERE key = ?', [key], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row ? row.value : null);
        }
      });
    });
  }

  updateConfig(configData) {
    return new Promise((resolve, reject) => {
      const promises = Object.keys(configData).map(key => 
        this.run(
          'INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)',
          [key, configData[key]]
        )
      );
      
      Promise.all(promises)
        .then(() => resolve())
        .catch(reject);
    });
  }

  updateConfigValue(key, value) {
    return new Promise((resolve, reject) => {
      this.run(
        'INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)',
        [key, value]
      ).then(() => resolve()).catch(reject);
    });
  }
}

module.exports = new Database();
