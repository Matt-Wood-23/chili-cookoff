const express = require('express');
const router = express.Router();

// GET /api/votes - Get all votes
router.get('/', async (req, res) => {
  try {
    const votes = await req.db.all(`
      SELECT v.*, c.name as chili_name, c.contestant_name
      FROM votes v
      JOIN chilis c ON v.chili_id = c.id
      ORDER BY v.created_at DESC
    `);
    res.json(votes);
  } catch (error) {
    console.error('Error fetching votes:', error);
    res.status(500).json({ error: 'Failed to fetch votes' });
  }
});

// GET /api/votes/chili/:id - Get votes for specific chili
router.get('/chili/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const votes = await req.db.all(`
      SELECT v.*, c.name as chili_name, c.contestant_name
      FROM votes v
      JOIN chilis c ON v.chili_id = c.id
      WHERE v.chili_id = ?
      ORDER BY v.created_at DESC
    `, [id]);

    const chili = await req.db.get('SELECT * FROM chilis WHERE id = ?', [id]);
    if (!chili) {
      return res.status(404).json({ error: 'Chili entry not found' });
    }

    res.json({ chili, votes });
  } catch (error) {
    console.error('Error fetching chili votes:', error);
    res.status(500).json({ error: 'Failed to fetch chili votes' });
  }
});

// POST /api/votes - Submit a new vote
router.post('/', async (req, res) => {
  try {
    const { 
      chili_id, 
      judge_name, 
      heat, 
      flavor, 
      texture, 
      presentation, 
      overall, 
      comments 
    } = req.body;

    // Validate required fields
    if (!chili_id || !judge_name || heat === undefined || flavor === undefined || 
        texture === undefined || presentation === undefined || overall === undefined) {
      return res.status(400).json({ 
        error: 'Chili ID, judge name, and all rating scores are required' 
      });
    }

    // Validate rating scores are within range 1-10
    const scores = [heat, flavor, texture, presentation, overall];
    if (scores.some(score => score < 1 || score > 10 || isNaN(score))) {
      return res.status(400).json({ 
        error: 'All rating scores must be between 1 and 10' 
      });
    }

    // Check if chili exists
    const chili = await req.db.get('SELECT * FROM chilis WHERE id = ?', [chili_id]);
    if (!chili) {
      return res.status(404).json({ error: 'Chili entry not found' });
    }

    // Check if voting is open
    const config = await req.db.get('SELECT value FROM config WHERE key = ?', ['voting_open']);
    if (!config || config.value !== 'true') {
      return res.status(403).json({ error: 'Voting is currently closed' });
    }

    // Insert the vote
    const result = await req.db.run(
      `INSERT INTO votes (chili_id, judge_name, heat, flavor, texture, presentation, overall, comments) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [chili_id, judge_name, heat, flavor, texture, presentation, overall, comments]
    );

    const newVote = await req.db.get(
      'SELECT * FROM votes WHERE id = ?',
      [result.id]
    );

    res.status(201).json(newVote);
  } catch (error) {
    console.error('Error submitting vote:', error);
    res.status(500).json({ error: 'Failed to submit vote' });
  }
});

// DELETE /api/votes - Clear all votes (admin only)
router.delete('/', async (req, res) => {
  try {
    // Check if admin (you might want to add proper authentication)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.includes('admin')) {
      return res.status(403).json({ error: 'Admin privileges required' });
    }

    await req.db.run('DELETE FROM votes');
    res.json({ message: 'All votes cleared successfully' });
  } catch (error) {
    console.error('Error clearing votes:', error);
    res.status(500).json({ error: 'Failed to clear votes' });
  }
});

// DELETE /api/votes/:id - Delete specific vote
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if vote exists
    const existingVote = await req.db.get('SELECT * FROM votes WHERE id = ?', [id]);
    if (!existingVote) {
      return res.status(404).json({ error: 'Vote not found' });
    }

    await req.db.run('DELETE FROM votes WHERE id = ?', [id]);
    res.json({ message: 'Vote deleted successfully' });
  } catch (error) {
    console.error('Error deleting vote:', error);
    res.status(500).json({ error: 'Failed to delete vote' });
  }
});

// GET /api/votes/stats - Get voting statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await req.db.get(`
      SELECT 
        COUNT(*) as total_votes,
        COUNT(DISTINCT chili_id) as total_chilis_voted,
        COUNT(DISTINCT judge_name) as total_judges,
        ROUND(AVG(overall), 1) as avg_overall_score,
        ROUND(AVG(heat), 1) as avg_heat_score,
        ROUND(AVG(flavor), 1) as avg_flavor_score,
        ROUND(AVG(texture), 1) as avg_texture_score,
        ROUND(AVG(presentation), 1) as avg_presentation_score
      FROM votes
    `);

    const topJudges = await req.db.all(`
      SELECT judge_name, COUNT(*) as vote_count
      FROM votes
      GROUP BY judge_name
      ORDER BY vote_count DESC
      LIMIT 5
    `);

    res.json({ ...stats, topJudges });
  } catch (error) {
    console.error('Error fetching voting stats:', error);
    res.status(500).json({ error: 'Failed to fetch voting statistics' });
  }
});

module.exports = router;
