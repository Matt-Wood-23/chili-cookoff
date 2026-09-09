const express = require('express');
const adminAuth = require('../middleware/adminAuth');
const router = express.Router();

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
