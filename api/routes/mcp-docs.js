const express = require('express');
const router = express.Router();
const { methods, categories } = require('../config/mcp-methods');

// GET /api/mcp/docs — Full method catalog
// Publicly accessible — no auth required (agents need docs before they have a key)
router.get('/docs', (req, res) => {
  const { method, category } = req.query;

  let filtered = methods;

  // Single method lookup: ?method=list_humans
  if (method) {
    const found = methods.find(m => m.name === method || (m.aliases && m.aliases.includes(method)));
    if (!found) return res.status(404).json({ error: `Method '${method}' not found` });
    return res.json({ method: found });
  }

  // Category filter: ?category=tasks
  if (category) {
    filtered = methods.filter(m => m.category === category);
  }

  res.json({
    methods: filtered,
    categories,
    auth: {
      type: 'bearer',
      header: 'Authorization',
      format: 'Bearer YOUR_API_KEY',
      get_key_url: 'https://www.irlwork.ai/dashboard/hiring/api-keys'
    },
    base_url: 'https://api.irlwork.ai/api',
    endpoint: 'POST /api/mcp',
    request_format: {
      method: 'METHOD_NAME',
      params: {}
    },
    rate_limits: {
      get: '100/min',
      post: '20/min'
    },
    total_methods: filtered.length
  });
});

module.exports = router;
