const express = require('express');
const os = require('os');
const adminAuth = require('../middleware/adminAuth');
const router = express.Router();

// GET /api/config/network/addresses - LAN addresses this machine is reachable on
//
// Only needed as a fallback: the admin panel builds its share link from the
// address the browser is already using, which is correct by construction. This
// covers the one case where that fails - the organizer viewing the panel on the
// host machine itself, where the origin is localhost and means nothing to a
// guest's phone.
router.get('/network/addresses', adminAuth, (req, res) => {
  try {
    const addresses = [];
    for (const [name, entries] of Object.entries(os.networkInterfaces())) {
      for (const entry of entries || []) {
        if (entry.family === 'IPv4' && !entry.internal) {
          addresses.push({ name, address: entry.address });
        }
      }
    }
    res.json({ addresses });
  } catch (error) {
    console.error('Error reading network addresses:', error);
    res.status(500).json({ error: 'Failed to read network addresses' });
  }
});

// GET config
router.get('/', async (req, res) => {
  try {
    const config = await req.db.getConfig();
    res.json(config);
  } catch (error) {
    console.error('Error getting config:', error);
    res.status(500).json({ error: 'Failed to get configuration' });
  }
});

// GET config by key
router.get('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const value = await req.db.getConfigValue(key);
    res.json({ key, value });
  } catch (error) {
    console.error('Error getting config value:', error);
    res.status(500).json({ error: 'Failed to get configuration value' });
  }
});

// UPDATE config
router.put('/', adminAuth, async (req, res) => {
  try {
    const configData = req.body;
    await req.db.updateConfig(configData);
    res.json({ message: 'Configuration updated successfully' });
  } catch (error) {
    console.error('Error updating config:', error);
    res.status(500).json({ error: 'Failed to update configuration' });
  }
});

// UPDATE config value
router.put('/:key', adminAuth, async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    await req.db.updateConfigValue(key, value);
    res.json({ message: 'Configuration value updated successfully' });
  } catch (error) {
    console.error('Error updating config value:', error);
    res.status(500).json({ error: 'Failed to update configuration value' });
  }
});

module.exports = router;
