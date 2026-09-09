const express = require('express');
const adminAuth = require('../middleware/adminAuth');
const router = express.Router();

// Rank entries, letting genuine ties share a place (1, 2, 2, 4) instead of
// being separated by whatever order the database happened to return.
function applyRanks(entries, scoreOf) {
  entries.forEach((entry, index) => {
    const score = scoreOf(entry);
    const previous = entries[index - 1];
    entry.rank = previous && scoreOf(previous) === score ? previous.rank : index + 1;
  });

  const perRank = entries.reduce((acc, e) => {
    acc[e.rank] = (acc[e.rank] || 0) + 1;
    return acc;
  }, {});
  entries.forEach((e) => { e.tied = perRank[e.rank] > 1; });

  return entries;
}

// How many judges the event is scored against.
//
// Set it explicitly and "done" becomes a target you reach; leave it blank and it
// is inferred, preferring the number of live judge codes over the number of
// people who happen to have voted so far - the latter moves as people arrive,
// so nothing ever looks finished.
async function getExpectedJudges(db) {
  const configured = Number(await db.getConfigValue('expected_judges'));
  if (Number.isInteger(configured) && configured > 0) {
    return { expected: configured, source: 'manual' };
  }

  const { codes } = await db.get(
    'SELECT COUNT(*) as codes FROM judge_codes WHERE revoked = 0'
  );
  if (codes > 0) {
    return { expected: codes, source: 'codes' };
  }

  const { voters } = await db.get(
    'SELECT COUNT(DISTINCT voter_key) as voters FROM votes'
  );
  return { expected: voters, source: 'voters' };
}

async function getCoverage(db) {
  const { expected, source } = await getExpectedJudges(db);

  const { chili_count: chiliCount } = await db.get(
    'SELECT COUNT(*) as chili_count FROM chilis'
  );

  // A ballot is complete when that judge has rated every entry. Scoring on
  // these alone is what makes every chili carry an identical set of votes.
  const qualified = chiliCount > 0
    ? await db.all(`
        SELECT voter_key, MIN(judge_name) as judge_name
        FROM votes
        GROUP BY voter_key
        HAVING COUNT(DISTINCT chili_id) = ?
      `, [chiliCount])
    : [];

  const { voters: started } = await db.get(
    'SELECT COUNT(DISTINCT voter_key) as voters FROM votes'
  );

  const perChili = await db.all(`
    SELECT c.id, c.name, c.contestant_name, COUNT(v.id) as vote_count
    FROM chilis c
    LEFT JOIN votes v ON c.id = v.chili_id
    GROUP BY c.id
    ORDER BY vote_count ASC, c.name
  `);

  const missing = expected > 0
    ? perChili
        .filter((c) => c.vote_count < expected)
        .map((c) => ({ ...c, missing: expected - c.vote_count }))
    : [];

  const qualifiedCount = qualified.length;

  return {
    expected_judges: expected,
    expected_source: source,
    qualified_judges: qualifiedCount,
    started_judges: started,
    partial_judges: Math.max(0, started - qualifiedCount),
    chili_count: chiliCount,
    // Scoring is finished when enough judges have completed the whole slate.
    ready: expected > 0 && chiliCount > 0 && qualifiedCount >= expected,
    complete: expected > 0 && missing.length === 0,
    missing
  };
}

// GET /api/results/leaderboard - Get overall rankings
router.get('/leaderboard', async (req, res) => {
  try {
    const coverage = await getCoverage(req.db);

    // Final tally counts only judges who rated every entry, so each chili is
    // scored by an identical set of people. Anything else is provisional.
    const requested = String(req.query.tally || '').toLowerCase();
    const tally = requested === 'all' || (requested !== 'final' && !coverage.ready)
      ? 'all'
      : 'final';

    const ballotFilter = tally === 'final'
      ? `AND v.voter_key IN (
           SELECT voter_key FROM votes
           GROUP BY voter_key
           HAVING COUNT(DISTINCT chili_id) = (SELECT COUNT(*) FROM chilis)
         )`
      : '';

    const rows = await req.db.all(`
      SELECT 
        c.id,
        c.name,
        c.contestant_name,
        c.description,
        c.image_path,
        COUNT(v.id) as vote_count,
        SUM(v.overall) as total_overall,
        ROUND(AVG(v.overall), 1) as avg_overall,
        ROUND(AVG(v.heat), 1) as avg_heat,
        ROUND(AVG(v.flavor), 1) as avg_flavor,
        ROUND(AVG(v.texture), 1) as avg_texture,
        ROUND(AVG(v.presentation), 1) as avg_presentation,
        MAX(v.overall) as highest_overall,
        MIN(v.overall) as lowest_overall
      FROM chilis c
      LEFT JOIN votes v ON c.id = v.chili_id ${ballotFilter}
      GROUP BY c.id
      HAVING vote_count > 0
    `);

    // Total points, always. Ranking an incomplete board by average lets one
    // generous rating outrank a chili twenty people scored well, and a wrong
    // winner is worse than a chili placing lower because fewer people tried it.
    // Under full coverage the two agree anyway.
    const scoreOf = (entry) => entry.total_overall;

    rows.sort((a, b) =>
      scoreOf(b) - scoreOf(a) ||
      b.avg_overall - a.avg_overall ||
      String(a.name).localeCompare(String(b.name))
    );

    applyRanks(rows, scoreOf);
    rows.forEach((entry) => {
      entry.podium_position = entry.rank <= 3 ? entry.rank : null;
      entry.missing_votes = Math.max(0, coverage.expected_judges - entry.vote_count);
    });

    res.json({
      leaderboard: rows,
      ranking: {
        basis: 'total',
        tally,
        complete: coverage.complete,
        // In a final tally every chili carries exactly this many votes.
        ballots_counted: tally === 'final' ? coverage.qualified_judges : coverage.started_judges,
        ballots_excluded: tally === 'final' ? coverage.partial_judges : 0
      },
      coverage,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// GET /api/results/coverage - Which entries still need ratings
router.get('/coverage', async (req, res) => {
  try {
    res.json({ ...(await getCoverage(req.db)), lastUpdated: new Date().toISOString() });
  } catch (error) {
    console.error('Error fetching coverage:', error);
    res.status(500).json({ error: 'Failed to fetch coverage' });
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

    applyRanks(rankings, (entry) => entry.avg_category_score);

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
        COUNT(DISTINCT v.voter_key) as total_judges,
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
        MIN(judge_name) as judge_name,
        COUNT(*) as vote_count,
        ROUND(AVG(overall), 1) as avg_given_score
      FROM votes
      GROUP BY voter_key
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
        MIN(v.overall) as lowest_overall
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

    // SQLite ships no STDDEV aggregate, so derive the spread from the votes we
    // already loaded. Useful for spotting an entry the judges disagreed on.
    const overallScores = individualVotes.map(v => v.overall);
    let overall_stddev = null;
    if (overallScores.length > 1) {
      const mean = overallScores.reduce((a, b) => a + b, 0) / overallScores.length;
      const variance = overallScores.reduce((sum, n) => sum + (n - mean) ** 2, 0) / overallScores.length;
      overall_stddev = Math.round(Math.sqrt(variance) * 100) / 100;
    }

    // Aggregates are public; the per-judge breakdown is not, so guests get the
    // scores without who gave them.
    res.json({
      chili: { ...chiliDetails, overall_stddev },
      votes: adminAuth.isAuthorized(req) ? individualVotes : undefined,
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

    // Escape embedded quotes so a name like 5\" Alarm cannot break the row,
    // and leave unscored entries blank instead of writing the string "null".
    const quote = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const number = (value) => (value === null || value === undefined ? '' : value);

    const csvHeader = 'Name,Contestant,Vote Count,Avg Heat,Avg Flavor,Avg Texture,Avg Presentation,Avg Overall,Highest,Lowest';
    const csvRows = results.map(row => [
      quote(row.name),
      quote(row.contestant_name),
      row.vote_count,
      number(row.avg_heat),
      number(row.avg_flavor),
      number(row.avg_texture),
      number(row.avg_presentation),
      number(row.avg_overall),
      number(row.highest_overall),
      number(row.lowest_overall)
    ].join(','));

    const csvContent = [csvHeader, ...csvRows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="chili-cookoff-results-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csvContent);
  } catch (error) {
    console.error('Error exporting CSV:', error);
    res.status(500).json({ error: 'Failed to export results' });
  }
});

module.exports = router;
