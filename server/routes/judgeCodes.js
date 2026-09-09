const express = require('express');
const crypto = require('crypto');
const adminAuth = require('../middleware/adminAuth');
const router = express.Router();

// No I, L, O, 0 or 1: these get read off a printed slip and typed on a phone,
// and the usual confusions cost more than the extra entropy is worth.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 4;
const MAX_BATCH = 200;

function generateCode() {
  const bytes = crypto.randomBytes(CODE_LENGTH);
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return code;
}

const normalize = (code) => String(code || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

// GET /api/judge-codes - List codes with how much each has been used
router.get('/', adminAuth, async (req, res) => {
  try {
    const codes = await req.db.all(`
      SELECT
        jc.code,
        jc.label,
        jc.created_at,
        jc.first_used_at,
        jc.device_id,
        jc.revoked,
        COUNT(v.id) as vote_count
      FROM judge_codes jc
      LEFT JOIN votes v ON v.judge_code = jc.code
      GROUP BY jc.code
      ORDER BY jc.created_at DESC, jc.code
    `);
    res.json({ codes });
  } catch (error) {
    console.error('Error listing judge codes:', error);
    res.status(500).json({ error: 'Failed to list judge codes' });
  }
});

// POST /api/judge-codes - Generate a batch of codes
router.post('/', adminAuth, async (req, res) => {
  try {
    const count = Number(req.body.count);
    const label = req.body.label ? String(req.body.label).trim() : null;

    if (!Number.isInteger(count) || count < 1 || count > MAX_BATCH) {
      return res.status(400).json({ error: `Count must be a whole number between 1 and ${MAX_BATCH}` });
    }

    const created = [];
    // Retry on collision rather than trusting randomness; the code space is
    // large but a batch reuses it many times over the life of the database.
    for (let i = 0; i < count; i++) {
      let inserted = false;
      for (let attempt = 0; attempt < 20 && !inserted; attempt++) {
        const code = generateCode();
        try {
          await req.db.run(
            'INSERT INTO judge_codes (code, label) VALUES (?, ?)',
            [code, label]
          );
          created.push(code);
          inserted = true;
        } catch (error) {
          if (!String(error.message).includes('UNIQUE')) throw error;
        }
      }
      if (!inserted) {
        return res.status(500).json({
          error: 'Could not generate enough unique codes. Revoke unused ones and try again.'
        });
      }
    }

    res.status(201).json({ created, count: created.length });
  } catch (error) {
    console.error('Error generating judge codes:', error);
    res.status(500).json({ error: 'Failed to generate judge codes' });
  }
});

// POST /api/judge-codes/validate - Check a code before letting someone rate
router.post('/validate', async (req, res) => {
  try {
    const code = normalize(req.body.code);
    if (!code) {
      return res.status(400).json({ valid: false, error: 'Enter your judge code' });
    }

    const row = await req.db.get('SELECT code, revoked FROM judge_codes WHERE code = ?', [code]);

    // Deliberately vague and identical for both cases: this endpoint is
    // unauthenticated, so it should not confirm which codes exist.
    if (!row || row.revoked) {
      return res.status(404).json({ valid: false, error: 'That code is not valid. Check the slip and try again.' });
    }

    res.json({ valid: true, code: row.code });
  } catch (error) {
    console.error('Error validating judge code:', error);
    res.status(500).json({ valid: false, error: 'Failed to validate code' });
  }
});

// DELETE /api/judge-codes/:code - Revoke a code
router.delete('/:code', adminAuth, async (req, res) => {
  try {
    const code = normalize(req.params.code);
    const existing = await req.db.get('SELECT code FROM judge_codes WHERE code = ?', [code]);
    if (!existing) {
      return res.status(404).json({ error: 'Judge code not found' });
    }

    // Soft delete: votes already cast under this code stay counted, the code
    // just cannot be used again.
    await req.db.run('UPDATE judge_codes SET revoked = 1 WHERE code = ?', [code]);
    res.json({ message: 'Judge code revoked', code });
  } catch (error) {
    console.error('Error revoking judge code:', error);
    res.status(500).json({ error: 'Failed to revoke judge code' });
  }
});

module.exports = router;
module.exports.normalizeCode = normalize;
