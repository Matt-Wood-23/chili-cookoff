const express = require('express');
const router = express.Router();

// GET /api/results/leaderboard - Get overall rankings
router.get('/leaderboard', async (req, res) => {
  try {
    const leaderboard = await req.db.all(`
      SELECT 
        c.id,
        c.name,
        c.contestant_name,
        c.description,
        c.image_path,
        COUNT(v.id) as vote_count,
        ROUND(AVG(v.overall), 1) as avg_overall,
        ROUND(AVG(v.heat), 1) as avg_heat,
        ROUND(AVG(v.flavor), 1) as avg_flavor,
        ROUND(AVG(v.texture), 1) as avg_texture,
        ROUND(AVG(v.presentation), 1) as avg_presentation,
        MAX(v.overall) as highest_overall,
        MIN(v.overall) as lowest_overall
      FROM chilis c
      LEFT JOIN votes v ON c.id = v.chili_id
      GROUP BY c.id
      HAVING vote_count > 0
      ORDER BY avg_overall DESC, vote_count DESC
    `);

    // Add ranking
    leaderboard.forEach((entry, index) => {
      entry.rank = index + 1;
      entry.podium_position = index < 3 ? index + 1 : null;
    });

    res.json({
      leaderboard,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// GET /api/results/category/:category - Get category-specific rankings
router.get('/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    
    // Validate category
    const validCategories = ['heat', 'flavor', 'texture', 'presentation', 'overall'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ 
        error: 'Invalid category. Valid categories: heat, flavor, texture, presentation, overall' 
      });
    }

    const rankings = await req.db.all(`
      SELECT 
        c.id,
        c.name,
        c.contestant_name,
        c.description,
        c.image_path,
        COUNT(v.id) as vote_count,
        ROUND(AVG(v.${category}), 1) as avg_category_score,
        MAX(v.${category}) as highest_score,
        MIN(v.${category}) as lowest_score
      FROM chilis c
      LEFT JOIN votes v ON c.id = v.chili_id
      GROUP BY c.id
      HAVING vote_count > 0
      ORDER BY avg_category_score DESC, vote_count DESC
    `);

    // Add ranking
    rankings.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    res.json({
      category,
      rankings,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching category rankings:', error);
    res.status(500).json({ error: 'Failed to fetch category rankings' });
  }
});

// GET /api/results/stats - Get aggregate statistics
router.get('/stats', async (req, res) => {
  try {
    // Overall event stats
    const eventStats = await req.db.get(`
      SELECT 
        COUNT(DISTINCT c.id) as total_chilis,
        COUNT(v.id) as total_votes,
        COUNT(DISTINCT v.judge_name) as total_judges,
        ROUND(AVG(v.overall), 1) as event_avg_overall,
        ROUND(AVG(v.heat), 1) as event_avg_heat,
        ROUND(AVG(v.flavor), 1) as event_avg_flavor,
        ROUND(AVG(v.texture), 1) as event_avg_texture,
        ROUND(AVG(v.presentation), 1) as event_avg_presentation
      FROM chilis c
      LEFT JOIN votes v ON c.id = v.chili_id
    `);

    // Top performers in each category
    const categoryLeaders = {};
    for (const category of ['heat', 'flavor', 'texture', 'presentation', 'overall']) {
      const leader = await req.db.get(`
        SELECT 
          c.name,
          c.contestant_name,
          ROUND(AVG(v.${category}), 1) as avg_score
        FROM chilis c
        JOIN votes v ON c.id = v.chili_id
        GROUP BY c.id
        ORDER BY avg_score DESC
        LIMIT 1
      `);
      categoryLeaders[category] = leader;
    }

    // Most active judges
    const activeJudges = await req.db.all(`
      SELECT 
        judge_name,
        COUNT(*) as vote_count,
        ROUND(AVG(overall), 1) as avg_given_score
      FROM votes
      GROUP BY judge_name
      ORDER BY vote_count DESC
      LIMIT 5
    `);

    // Score distribution
    const scoreDistribution = await req.db.all(`
      SELECT 
        overall,
        COUNT(*) as vote_count
      FROM votes
      GROUP BY overall
      ORDER BY overall
    `);

    // Voting timeline (votes per hour)
    const votingTimeline = await req.db.all(`
      SELECT 
        DATE(created_at) as vote_date,
        COUNT(*) as vote_count
      FROM votes
      GROUP BY DATE(created_at)
      ORDER BY vote_date
    `);

    res.json({
      eventStats,
      categoryLeaders,
      activeJudges,
      scoreDistribution,
      votingTimeline,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching event stats:', error);
    res.status(500).json({ error: 'Failed to fetch event statistics' });
  }
});

// GET /api/results/chili/:id - Get detailed results for specific chili
router.get('/chili/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get chili details with aggregated scores
    const chiliDetails = await req.db.get(`
      SELECT 
        c.*,
        COUNT(v.id) as vote_count,
        ROUND(AVG(v.heat), 1) as avg_heat,
        ROUND(AVG(v.flavor), 1) as avg_flavor,
        ROUND(AVG(v.texture), 1) as avg_texture,
        ROUND(AVG(v.presentation), 1) as avg_presentation,
        ROUND(AVG(v.overall), 1) as avg_overall,
        MAX(v.overall) as highest_overall,
        MIN(v.overall) as lowest_overall,
        STDDEV(v.overall) as overall_stddev
      FROM chilis c
      LEFT JOIN votes v ON c.id = v.chili_id
      WHERE c.id = ?
      GROUP BY c.id
    `, [id]);

    if (!chiliDetails) {
      return res.status(404).json({ error: 'Chili entry not found' });
    }

    // Get all individual votes for this chili
    const individualVotes = await req.db.all(`
      SELECT 
        v.*,
        v.judge_name
      FROM votes v
      WHERE v.chili_id = ?
      ORDER BY v.overall DESC, v.created_at DESC
    `, [id]);

    // Calculate rank in overall leaderboard
    const rankQuery = await req.db.get(`
      SELECT 
        COUNT(*) + 1 as rank
      FROM (
        SELECT c.id, AVG(v.overall) as avg_overall, COUNT(v.id) as vote_count
        FROM chilis c
        JOIN votes v ON c.id = v.chili_id
        GROUP BY c.id
        HAVING vote_count > 0
        ORDER BY avg_overall DESC, vote_count DESC
      ) ranked
      WHERE avg_overall > ? OR (avg_overall = ? AND vote_count > ?)
    `, [chiliDetails.avg_overall, chiliDetails.avg_overall, chiliDetails.vote_count]);

    res.json({
      chili: chiliDetails,
      votes: individualVotes,
      overall_rank: rankQuery.rank,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching chili results:', error);
    res.status(500).json({ error: 'Failed to fetch chili results' });
  }
});

// GET /api/results/export/csv - Export results as CSV
router.get('/export/csv', async (req, res) => {
  try {
    const results = await req.db.all(`
      SELECT 
        c.name,
        c.contestant_name,
        COUNT(v.id) as vote_count,
        ROUND(AVG(v.heat), 1) as avg_heat,
        ROUND(AVG(v.flavor), 1) as avg_flavor,
        ROUND(AVG(v.texture), 1) as avg_texture,
        ROUND(AVG(v.presentation), 1) as avg_presentation,
        ROUND(AVG(v.overall), 1) as avg_overall,
        MAX(v.overall) as highest_overall,
        MIN(v.overall) as lowest_overall
      FROM chilis c
      LEFT JOIN votes v ON c.id = v.chili_id
      GROUP BY c.id
      ORDER BY avg_overall DESC
    `);

    // Create CSV content
    const csvHeader = 'Name,Contestant,Vote Count,Avg Heat,Avg Flavor,Avg Texture,Avg Presentation,Avg Overall,Highest,Lowest\n';
    const csvRows = results.map(row => 
      `"${row.name}","${row.contestant_name}",${row.vote_count},${row.avg_heat},${row.avg_flavor},${row.avg_texture},${row.avg_presentation},${row.avg_overall},${row.highest_overall},${row.lowest_overall}`
    ).join('\n');
    
    const csvContent = csvHeader + csvRows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="chili-cookoff-results-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csvContent);
  } catch (error) {
    console.error('Error exporting CSV:', error);
    res.status(500).json({ error: 'Failed to export results' });
  }
});

module.exports = router;
