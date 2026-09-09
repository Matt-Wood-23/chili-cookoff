const express = require('express');
const multer = require('multer');
const path = require('path');
const { uploadsDir } = require('../config/paths');
const adminAuth = require('../middleware/adminAuth');
const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'chili-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files (jpeg, jpg, png, gif) are allowed'));
    }
  }
});

// GET /api/chilis - Get all chili entries
router.get('/', async (req, res) => {
  try {
    const chilis = await req.db.all(`
      SELECT c.*, 
             COUNT(v.id) as vote_count,
             ROUND(AVG(v.overall), 1) as avg_overall,
             ROUND(AVG(v.heat), 1) as avg_heat,
             ROUND(AVG(v.flavor), 1) as avg_flavor,
             ROUND(AVG(v.texture), 1) as avg_texture,
             ROUND(AVG(v.presentation), 1) as avg_presentation
      FROM chilis c
      LEFT JOIN votes v ON c.id = v.chili_id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `);
    res.json(chilis);
  } catch (error) {
    console.error('Error fetching chilis:', error);
    res.status(500).json({ error: 'Failed to fetch chili entries' });
  }
});

// POST /api/chilis - Create new chili entry
router.post('/', adminAuth, upload.single('image'), async (req, res) => {
  try {
    const { name, description, contestant_name } = req.body;

    if (!name || !contestant_name) {
      return res.status(400).json({ 
        error: 'Name and contestant name are required' 
      });
    }

    const image_path = req.file ? `/uploads/${req.file.filename}` : null;

    const result = await req.db.run(
      `INSERT INTO chilis (name, description, contestant_name, image_path) 
       VALUES (?, ?, ?, ?)`,
      [name, description, contestant_name, image_path]
    );

    const newChili = await req.db.get(
      'SELECT * FROM chilis WHERE id = ?',
      [result.id]
    );

    res.status(201).json(newChili);
  } catch (error) {
    console.error('Error creating chili entry:', error);
    res.status(500).json({ error: 'Failed to create chili entry' });
  }
});

// PUT /api/chilis/:id - Update chili entry
router.put('/:id', adminAuth, upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, contestant_name } = req.body;

    // Check if chili exists
    const existingChili = await req.db.get('SELECT * FROM chilis WHERE id = ?', [id]);
    if (!existingChili) {
      return res.status(404).json({ error: 'Chili entry not found' });
    }

    let image_path = existingChili.image_path;
    if (req.file) {
      image_path = `/uploads/${req.file.filename}`;
    }

    await req.db.run(
      `UPDATE chilis SET name = ?, description = ?, contestant_name = ?, image_path = ? 
       WHERE id = ?`,
      [name, description, contestant_name, image_path, id]
    );

    const updatedChili = await req.db.get('SELECT * FROM chilis WHERE id = ?', [id]);
    res.json(updatedChili);
  } catch (error) {
    console.error('Error updating chili entry:', error);
    res.status(500).json({ error: 'Failed to update chili entry' });
  }
});

// DELETE /api/chilis/:id - Delete chili entry
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if chili exists
    const existingChili = await req.db.get('SELECT * FROM chilis WHERE id = ?', [id]);
    if (!existingChili) {
      return res.status(404).json({ error: 'Chili entry not found' });
    }

    await req.db.run('DELETE FROM chilis WHERE id = ?', [id]);
    res.json({ message: 'Chili entry deleted successfully' });
  } catch (error) {
    console.error('Error deleting chili entry:', error);
    res.status(500).json({ error: 'Failed to delete chili entry' });
  }
});

// GET /api/chilis/:id - Get specific chili entry
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const chili = await req.db.get(`
      SELECT c.*, 
             COUNT(v.id) as vote_count,
             ROUND(AVG(v.overall), 1) as avg_overall,
             ROUND(AVG(v.heat), 1) as avg_heat,
             ROUND(AVG(v.flavor), 1) as avg_flavor,
             ROUND(AVG(v.texture), 1) as avg_texture,
             ROUND(AVG(v.presentation), 1) as avg_presentation
      FROM chilis c
      LEFT JOIN votes v ON c.id = v.chili_id
      WHERE c.id = ?
      GROUP BY c.id
    `, [id]);

    if (!chili) {
      return res.status(404).json({ error: 'Chili entry not found' });
    }

    res.json(chili);
  } catch (error) {
    console.error('Error fetching chili entry:', error);
    res.status(500).json({ error: 'Failed to fetch chili entry' });
  }
});

module.exports = router;
