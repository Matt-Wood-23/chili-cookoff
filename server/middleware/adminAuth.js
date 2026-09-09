// Shared-secret gate for the routes that change the event.
//
// Set ADMIN_TOKEN to require it; leave it unset and the API stays open, which
// keeps local development and a laptop-only setup working exactly as before.
// This is a single shared password, not per-user auth — enough to stop a guest
// who guesses /admin from closing voting mid-event, and no more than that.
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';

function adminAuth(req, res, next) {
  if (!ADMIN_TOKEN) {
    return next();
  }

  const header = req.get('Authorization') || '';
  const provided = header.startsWith('Bearer ') ? header.slice(7) : '';

  if (provided !== ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Admin token required' });
  }

  next();
}

adminAuth.isEnabled = () => Boolean(ADMIN_TOKEN);

module.exports = adminAuth;
