const express = require('express');
const adminAuth = require('../middleware/adminAuth');
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

    if (!String(judge_name).trim()) {
      return res.status(400).json({ error: 'Judge name cannot be blank' });
    }

    // Scores must be whole numbers in 1-10. The old check only compared
    // magnitude, so a 9.9 sailed through and outranked every honest 9.
    const scores = { heat, flavor, texture, presentation, overall };
    for (const [category, value] of Object.entries(scores)) {
      const numeric = Number(value);
      if (!Number.isInteger(numeric) || numeric < 1 || numeric > 10) {
        return res.status(400).json({
          error: `${category} must be a whole number between 1 and 10`
        });
      }
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

    const key = req.db.judgeKey(judge_name);
    const deviceId = req.get('X-Device-Id') || null;
    const values = [
      Number(heat), Number(flavor), Number(texture),
      Number(presentation), Number(overall), comments || null
    ];

    const existing = await req.db.get(
      'SELECT * FROM votes WHERE chili_id = ? AND judge_key = ?',
      [chili_id, key]
    );

    if (existing) {
      // Same judge, same device: they are correcting a score they already
      // submitted, so replace it rather than adding a second vote.
      if (existing.device_id && deviceId && existing.device_id === deviceId) {
        await req.db.run(
          `UPDATE votes SET judge_name = ?, heat = ?, flavor = ?, texture = ?,
                            presentation = ?, overall = ?, comments = ?
           WHERE id = ?`,
          [String(judge_name).trim(), ...values, existing.id]
        );
        const updated = await req.db.get('SELECT * FROM votes WHERE id = ?', [existing.id]);
        return res.json({ ...updated, updated: true });
      }

      // Same name from a different device is a name collision, not a
      // correction. Tell them how to fix it instead of silently overwriting
      // someone else's scores.
      return res.status(409).json({
        error: `A judge named "${existing.judge_name}" has already rated this chili. ` +
               'Add a last initial to your name so both ratings count.'
      });
    }

    const result = await req.db.run(
      `INSERT INTO votes (chili_id, judge_name, judge_key, device_id, heat, flavor, texture, presentation, overall, comments)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [chili_id, String(judge_name).trim(), key, deviceId, ...values]
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
router.delete('/', adminAuth, async (req, res) => {
  try {
    await req.db.run('DELETE FROM votes');
    res.json({ message: 'All votes cleared successfully' });
  } catch (error) {
    console.error('Error clearing votes:', error);
    res.status(500).json({ error: 'Failed to clear votes' });
  }
});

// DELETE /api/votes/:id - Delete specific vote
router.delete('/:id', adminAuth, async (req, res) => {
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
        COUNT(DISTINCT judge_key) as total_judges,
        ROUND(AVG(overall), 1) as avg_overall_score,
        ROUND(AVG(heat), 1) as avg_heat_score,
        ROUND(AVG(flavor), 1) as avg_flavor_score,
        ROUND(AVG(texture), 1) as avg_texture_score,
        ROUND(AVG(presentation), 1) as avg_presentation_score
      FROM votes
    `);

    const topJudges = await req.db.all(`
      SELECT MIN(judge_name) as judge_name, COUNT(*) as vote_count
      FROM votes
      GROUP BY judge_key
      ORDER BY vote_count DESC
      LIMIT 5
    `);

    // One device submitting under many names is legitimate (people share a
    // phone) but it is also what stuffing looks like, so surface it rather than
    // blocking it and let the organizer judge.
    const deviceActivity = await req.db.all(`
      SELECT device_id, COUNT(DISTINCT judge_key) as judge_count, COUNT(*) as vote_count
      FROM votes
      WHERE device_id IS NOT NULL
      GROUP BY device_id
      HAVING judge_count > 1
      ORDER BY judge_count DESC
      LIMIT 10
    `);

    res.json({ ...stats, topJudges, deviceActivity });
  } catch (error) {
    console.error('Error fetching voting stats:', error);
    res.status(500).json({ error: 'Failed to fetch voting statistics' });
  }
});

module.exports = router;
