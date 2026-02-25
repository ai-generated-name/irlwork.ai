/**
 * Schema Routes — Task type discovery for agents
 *
 * GET /api/schemas          - List all active task types
 * GET /api/schemas/:taskType - Get full schema for a specific task type
 *
 * Public endpoints, no auth required.
 */

const express = require('express');

// Example payloads for each task type (used in GET /api/schemas/:taskType response)
const EXAMPLE_PAYLOADS = {
  cleaning: {
    task_type: 'cleaning',
    title: '2BR Apartment Standard Clean',
    description: 'Standard cleaning for a 2-bedroom apartment. Kitchen, bathrooms, living areas, and bedrooms need vacuuming, mopping, and surface wiping.',
    location_zone: 'District 2, Thu Duc',
    location_lat: 10.787,
    location_lng: 106.751,
    datetime_start: '2025-03-15T14:00:00Z',
    duration_hours: 2,
    budget_usd: 35,
    skills_required: ['standard_clean'],
    requirements: ['supplies_provided'],
    private_address: '123 Nguyen Hue, Apartment 4B, District 2',
    private_notes: 'Gate code is 4521. Ring doorbell twice.',
  },
  delivery: {
    task_type: 'delivery',
    title: 'Grocery Pickup and Delivery',
    description: 'Pick up a grocery order from the local supermarket and deliver it to my location. Approximately 5 bags of groceries.',
    location_zone: 'Binh Thanh District',
    datetime_start: '2025-03-15T10:00:00Z',
    budget_usd: 15,
    private_address: '456 Le Van Sy, Ward 14, Binh Thanh',
  },
  handyman: {
    task_type: 'handyman',
    title: 'Fix Leaking Kitchen Faucet',
    description: 'The kitchen faucet has been slowly leaking for a few days. Needs inspection and repair or replacement of the cartridge/washer.',
    location_zone: 'District 7, Ho Chi Minh City',
    datetime_start: '2025-03-16T09:00:00Z',
    duration_hours: 2,
    budget_usd: 40,
    skills_required: ['plumbing'],
    private_address: '789 Phu My Hung, D7',
  },
  photography: {
    task_type: 'photography',
    title: 'Product Photography Session - 20 Items',
    description: 'Need professional product photography for 20 items for an e-commerce store. White background, multiple angles per item.',
    location_zone: 'District 1, Ho Chi Minh City',
    datetime_start: '2025-03-20T09:00:00Z',
    duration_hours: 4,
    budget_usd: 120,
    skills_required: ['product'],
    requirements: ['own_equipment', 'editing_included'],
  },
  personal_assistant: {
    task_type: 'personal_assistant',
    title: 'Research and Compile Local Vendor List',
    description: 'Research and compile a list of 20 local vendors for office supplies, catering, and cleaning services with contact info and pricing.',
    datetime_start: '2025-03-15T08:00:00Z',
    duration_hours: 4,
    budget_usd: 40,
    skills_required: ['research'],
  },
  errands: {
    task_type: 'errands',
    title: 'Return Package to Post Office',
    description: 'Need someone to take a pre-labeled package to the nearest post office and get a receipt. Package weighs about 2kg.',
    location_zone: 'District 3, Ho Chi Minh City',
    datetime_start: '2025-03-15T11:00:00Z',
    budget_usd: 12,
    private_address: '100 Vo Van Tan, Ward 6, District 3',
  },
  tech_setup: {
    task_type: 'tech_setup',
    title: 'Set Up Home Wi-Fi Network',
    description: 'Need help setting up a new Wi-Fi router, configuring the network, and connecting 5 devices. Router already purchased.',
    datetime_start: '2025-03-17T14:00:00Z',
    duration_hours: 2,
    budget_usd: 40,
    skills_required: ['network'],
    private_address: '55 Nguyen Trai, District 1',
  },
};

function initSchemaRoutes(supabase) {
  const router = express.Router();

  // GET /api/schemas - List all active task types
  router.get('/', async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Database not configured' });

    const { data, error } = await supabase
      .from('task_type_registry')
      .select('id, display_name, description, category, minimum_budget_usd, maximum_duration_hr, requires_address, is_active')
      .eq('is_active', true)
      .order('display_name');

    if (error) {
      console.error('[Schemas] Error listing task types:', error.message);
      return res.status(500).json({ error: 'Failed to load task types' });
    }

    res.json({
      task_types: data || [],
      count: (data || []).length,
    });
  });

  // GET /api/schemas/:taskType - Get full schema for a specific task type
  router.get('/:taskType', async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Database not configured' });

    const { taskType } = req.params;

    const { data, error } = await supabase
      .from('task_type_registry')
      .select('*')
      .eq('id', taskType)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return res.status(404).json({
        error: `Task type "${taskType}" not found or is inactive`,
        suggestion: 'Use GET /api/schemas to see available task types',
      });
    }

    // Don't expose prohibited_keywords to agents
    const { prohibited_keywords, ...publicData } = data;

    res.json({
      ...publicData,
      constraints: {
        minimum_budget_usd: data.minimum_budget_usd,
        maximum_duration_hr: data.maximum_duration_hr,
      },
      example_payload: EXAMPLE_PAYLOADS[taskType] || null,
    });
  });

  return router;
}

module.exports = initSchemaRoutes;
