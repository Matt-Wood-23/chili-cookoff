const sqlite3 = require('sqlite3').verbose();
const { dbPath } = require('../config/paths');

// Normalize a judge name into the key used for one-vote-per-judge-per-chili.
// "  Matt  W " and "matt w" are the same judge; without this the constraint is
// trivially sidestepped by capitalization.
function judgeKey(name) {
  return String(name || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

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
          // SQLite ignores REFERENCES clauses unless this is on per-connection,
          // so ON DELETE CASCADE was silently doing nothing and deleted entries
          // left their votes behind.
          this.db.run('PRAGMA foreign_keys = ON', (pragmaErr) => {
            if (pragmaErr) reject(pragmaErr);
            else resolve();
          });
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
          judge_key TEXT,
          device_id TEXT,
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

      await this.migrate();

      console.log('Database schema initialized successfully');
    } catch (error) {
      console.error('Error initializing database:', error);
      throw error;
    }
  }

  // Idempotent migrations for databases created before one-vote-per-judge
  // existed. Safe to run on every boot, including a database from a past event.
  async migrate() {
    const columns = await this.all('PRAGMA table_info(votes)');
    const names = columns.map(c => c.name);

    if (!names.includes('judge_key')) {
      await this.run('ALTER TABLE votes ADD COLUMN judge_key TEXT');
    }
    if (!names.includes('device_id')) {
      await this.run('ALTER TABLE votes ADD COLUMN device_id TEXT');
    }

    // Backfill the normalized key for any rows predating the column.
    const unkeyed = await this.all(
      'SELECT id, judge_name FROM votes WHERE judge_key IS NULL OR judge_key = \'\''
    );
    for (const row of unkeyed) {
      await this.run('UPDATE votes SET judge_key = ? WHERE id = ?', [judgeKey(row.judge_name), row.id]);
    }

    // A unique index cannot be created while duplicates exist. Keep each
    // judge's first vote per chili and drop the rest, reporting what went.
    const duplicates = await this.all(`
      SELECT id FROM votes
      WHERE id NOT IN (
        SELECT MIN(id) FROM votes GROUP BY chili_id, judge_key
      )
    `);
    if (duplicates.length > 0) {
      await this.run(`
        DELETE FROM votes
        WHERE id NOT IN (
          SELECT MIN(id) FROM votes GROUP BY chili_id, judge_key
        )
      `);
      console.log(`Removed ${duplicates.length} duplicate vote(s) so one vote per judge per chili can be enforced`);
    }

    // Votes whose chili was deleted back when foreign keys were off.
    const orphans = await this.run(
      'DELETE FROM votes WHERE chili_id NOT IN (SELECT id FROM chilis)'
    );
    if (orphans.changes > 0) {
      console.log(`Removed ${orphans.changes} orphaned vote(s) left by deleted entries`);
    }

    // A database from an older build may have been created without the
    // FOREIGN KEY clause entirely, in which case turning the pragma on enforces
    // nothing. Rebuild the table so deletes actually cascade.
    const foreignKeys = await this.all('PRAGMA foreign_key_list(votes)');
    if (foreignKeys.length === 0) {
      await this.rebuildVotesTable();
      console.log('Rebuilt votes table to add the missing foreign key');
    }

    await this.run(
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_votes_chili_judge ON votes (chili_id, judge_key)'
    );
  }

  // Recreate `votes` with the current schema, carrying the existing rows over.
  // SQLite cannot add a foreign key to an existing table any other way.
  async rebuildVotesTable() {
    await this.run('PRAGMA foreign_keys = OFF');
    try {
      await this.run('BEGIN TRANSACTION');
      await this.run(`
        CREATE TABLE votes_rebuilt (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          chili_id INTEGER NOT NULL,
          judge_name TEXT NOT NULL,
          judge_key TEXT,
          device_id TEXT,
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
      await this.run(`
        INSERT INTO votes_rebuilt
          (id, chili_id, judge_name, judge_key, device_id, heat, flavor, texture, presentation, overall, comments, created_at)
        SELECT id, chili_id, judge_name, judge_key, device_id, heat, flavor, texture, presentation, overall, comments, created_at
        FROM votes
      `);
      await this.run('DROP TABLE votes');
      await this.run('ALTER TABLE votes_rebuilt RENAME TO votes');
      await this.run('COMMIT');
    } catch (error) {
      await this.run('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      await this.run('PRAGMA foreign_keys = ON');
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
module.exports.judgeKey = judgeKey;
