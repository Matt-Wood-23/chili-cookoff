const path = require('path');

// Single source of truth for on-disk locations. Multer's destination and the
// Express static handler used to compute this separately and drifted apart,
// which made every photo upload fail with ENOENT.
const serverRoot = path.join(__dirname, '..');

module.exports = {
  serverRoot,
  uploadsDir: path.join(serverRoot, 'uploads'),
  dbPath: process.env.DATABASE_PATH || path.join(serverRoot, 'database.db')
};
