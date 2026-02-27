// ============================================
// GET /api/mcp/docs — Public MCP method documentation
// No authentication required. Agents fetch this at runtime
// to discover available methods and parameters.
// ============================================

const express = require('express');
const router = express.Router();
const { MCP_METHODS, CATEGORIES } = require('../config/mcp-methods');

// GET /api/mcp/docs — Full method catalog
router.get('/docs', (req, res) => {
  const { method, category } = req.query;

  // Single method lookup: ?method=list_humans
  if (method) {
    const found = MCP_METHODS.find(m => m.name === method || (m.aliases && m.aliases.includes(method)));
    if (!found) return res.status(404).json({ error: `Method '${method}' not found` });
    return res.json({ method: found });
  }

  // Category filter: ?category=tasks
  let filtered = MCP_METHODS;
  if (category) {
    filtered = MCP_METHODS.filter(m => m.category === category);
  }

  res.json({
    methods: filtered,
    categories: CATEGORIES,
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
      requests: '60/min per API key'
    },
    total_methods: filtered.length
  });
});

module.exports = router;
