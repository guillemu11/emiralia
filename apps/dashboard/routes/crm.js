/**
 * CRM Routes — Project 045
 *
 * Exports TWO router factories:
 *   createLeadsRouter(pool)  → mounted at /api/leads
 *   createCrmRouter(pool)    → mounted at /api/crm
 *
 * Leads endpoints:
 *   POST   /api/leads                    — capture lead from website (fixes 404 bug)
 *   GET    /api/leads                    — list leads (filters: status, source, search, limit, offset)
 *   PATCH  /api/leads/:id                — update lead (status, qualify, etc.)
 *   POST   /api/leads/:id/assign         — assign lead to developer → creates lead_assignment
 *
 * CRM endpoints:
 *   GET    /api/crm/metrics              — MRR, ARR, pipeline_value, leads_by_status, devs_by_tier
 *   GET    /api/crm/developers           — list developers (filter: tier, search)
 *   POST   /api/crm/developers           — create developer
 *   GET    /api/crm/developers/:id       — developer profile + active subscription
 *   PATCH  /api/crm/developers/:id       — update developer
 *   GET    /api/crm/developers/:id/leads — leads assigned to developer
 *   GET    /api/crm/deals                — list deals (filter: stage, developer_id)
 *   POST   /api/crm/deals                — create deal
 *   PATCH  /api/crm/deals/:id            — update deal fields
 *   PATCH  /api/crm/deals/:id/stage      — move deal to new stage (validated transitions)
 *   GET    /api/crm/subscriptions        — list subscriptions
 *   POST   /api/crm/subscriptions        — create subscription
 *   PATCH  /api/crm/subscriptions/:id    — update subscription
 *   GET    /api/crm/communications       — list communications (filter: entity_type, entity_id)
 *   POST   /api/crm/communications       — log new communication
 */

import { Router } from 'express';

// ─── Deal stage transitions ───────────────────────────────────────────────────
const STAGE_TRANSITIONS = {
  prospecting:     ['contacted'],
  contacted:       ['demo_scheduled', 'closed_lost'],
  demo_scheduled:  ['proposal_sent', 'closed_lost'],
  proposal_sent:   ['negotiation', 'closed_lost'],
  negotiation:     ['closed_won', 'closed_lost'],
  closed_won:      [],
  closed_lost:     [],
};

// Default probability by stage
const STAGE_PROBABILITY = {
  prospecting:    10,
  contacted:      20,
  demo_scheduled: 40,
  proposal_sent:  60,
  negotiation:    80,
  closed_won:     100,
  closed_lost:    0,
};

// ─── Leads Router ─────────────────────────────────────────────────────────────

export function createLeadsRouter(pool) {
  const router = Router();

  // POST /api/leads — capture lead from website
  router.post('/', async (req, res) => {
    try {
      const {
        name,
        email,
        country = null,
        interests = [],
        source = null,
        message = null,
        metadata = {},
      } = req.body;

      if (!name || !email) {
        return res.status(400).json({ error: 'name and email are required' });
      }

      const result = await pool.query(
        `INSERT INTO leads (name, email, country, interests, source, message, metadata, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'captured')
         ON CONFLICT (email) DO UPDATE SET
           name = EXCLUDED.name,
           country = COALESCE(EXCLUDED.country, leads.country),
           interests = EXCLUDED.interests,
           source = COALESCE(EXCLUDED.source, leads.source),
           message = COALESCE(EXCLUDED.message, leads.message),
           metadata = leads.metadata || EXCLUDED.metadata,
           updated_at = NOW()
         RETURNING *`,
        [name, email, country, JSON.stringify(interests), source, message, JSON.stringify(metadata)]
      );

      res.status(201).json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/leads — list leads with filters
  router.get('/', async (req, res) => {
    try {
      const { status, source, search, limit = 100, offset = 0 } = req.query;
      const conditions = [];
      const params = [];

      if (status && status !== 'all') {
        params.push(status);
        conditions.push(`l.status = $${params.length}`);
      }
      if (source && source !== 'all') {
        params.push(source);
        conditions.push(`l.source = $${params.length}`);
      }
      if (search) {
        params.push(`%${search}%`);
        conditions.push(`(l.name ILIKE $${params.length} OR l.email ILIKE $${params.length} OR l.country ILIKE $${params.length})`);
      }

      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      params.push(parseInt(limit), parseInt(offset));

      const result = await pool.query(
        `SELECT l.*,
                d.name AS assigned_developer_name,
                d.company AS assigned_developer_company
         FROM leads l
         LEFT JOIN developers d ON d.id = l.assigned_developer_id
         ${where}
         ORDER BY l.created_at DESC
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params
      );

      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // PATCH /api/leads/:id — update lead fields
  router.patch('/:id', async (req, res) => {
    try {
      const { status, qualified_by, deal_value, assigned_developer_id, name, email, country, source, message, metadata } = req.body;
      const fields = [];
      const params = [];

      if (status !== undefined)               { params.push(status);               fields.push(`status = $${params.length}`); }
      if (qualified_by !== undefined)         { params.push(qualified_by);         fields.push(`qualified_by = $${params.length}`); }
      if (deal_value !== undefined)           { params.push(deal_value);           fields.push(`deal_value = $${params.length}`); }
      if (assigned_developer_id !== undefined){ params.push(assigned_developer_id);fields.push(`assigned_developer_id = $${params.length}`); }
      if (name !== undefined)                 { params.push(name);                 fields.push(`name = $${params.length}`); }
      if (email !== undefined)                { params.push(email);                fields.push(`email = $${params.length}`); }
      if (country !== undefined)              { params.push(country);              fields.push(`country = $${params.length}`); }
      if (source !== undefined)               { params.push(source);               fields.push(`source = $${params.length}`); }
      if (message !== undefined)              { params.push(message);              fields.push(`message = $${params.length}`); }
      if (metadata !== undefined)             { params.push(JSON.stringify(metadata)); fields.push(`metadata = $${params.length}`); }

      if (!fields.length) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      params.push(req.params.id);
      const result = await pool.query(
        `UPDATE leads SET ${fields.join(', ')}, updated_at = NOW()
         WHERE id = $${params.length} RETURNING *`,
        params
      );

      if (!result.rows.length) return res.status(404).json({ error: 'Lead not found' });
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/leads/:id/assign — assign lead to developer
  router.post('/:id/assign', async (req, res) => {
    try {
      const { developer_id, commission_amount = 0 } = req.body;
      if (!developer_id) return res.status(400).json({ error: 'developer_id is required' });

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Create/update assignment
        const assign = await client.query(
          `INSERT INTO lead_assignments (lead_id, developer_id, commission_amount)
           VALUES ($1, $2, $3)
           ON CONFLICT (lead_id, developer_id) DO UPDATE SET commission_amount = EXCLUDED.commission_amount
           RETURNING *`,
          [req.params.id, developer_id, commission_amount]
        );

        // Update lead status and assigned developer
        await client.query(
          `UPDATE leads SET status = 'assigned', assigned_developer_id = $1, updated_at = NOW()
           WHERE id = $2`,
          [developer_id, req.params.id]
        );

        await client.query('COMMIT');
        res.status(201).json(assign.rows[0]);
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}

// ─── CRM Router ───────────────────────────────────────────────────────────────

export function createCrmRouter(pool) {
  const router = Router();

  // GET /api/crm/metrics
  router.get('/metrics', async (req, res) => {
    try {
      const result = await pool.query(`
        WITH
          mrr_data AS (
            SELECT COALESCE(SUM(mrr), 0) AS mrr
            FROM subscriptions
            WHERE status = 'active'
          ),
          pipeline_data AS (
            SELECT COALESCE(SUM(value), 0) AS pipeline_value
            FROM deals
            WHERE stage NOT IN ('closed_won', 'closed_lost')
          ),
          leads_week AS (
            SELECT COUNT(*) AS count
            FROM leads
            WHERE created_at >= NOW() - INTERVAL '7 days'
          ),
          leads_by_status AS (
            SELECT status, COUNT(*) AS count
            FROM leads
            GROUP BY status
          ),
          devs_by_tier AS (
            SELECT tier, COUNT(*) AS count
            FROM developers
            GROUP BY tier
          ),
          deals_by_stage AS (
            SELECT stage, COUNT(*) AS count, COALESCE(SUM(value), 0) AS value
            FROM deals
            GROUP BY stage
          )
        SELECT
          m.mrr,
          m.mrr * 12 AS arr,
          p.pipeline_value,
          lw.count AS leads_this_week,
          (SELECT JSON_AGG(ROW_TO_JSON(r)) FROM (SELECT * FROM leads_by_status) r) AS leads_by_status,
          (SELECT JSON_AGG(ROW_TO_JSON(r)) FROM (SELECT * FROM devs_by_tier) r) AS developers_by_tier,
          (SELECT JSON_AGG(ROW_TO_JSON(r)) FROM (SELECT * FROM deals_by_stage) r) AS deals_by_stage
        FROM mrr_data m, pipeline_data p, leads_week lw
      `);

      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── Developers ──────────────────────────────────────────────────────────

  // GET /api/crm/developers
  router.get('/developers', async (req, res) => {
    try {
      const { tier, search, limit = 100, offset = 0 } = req.query;
      const conditions = [];
      const params = [];

      if (tier && tier !== 'all') {
        params.push(tier);
        conditions.push(`d.tier = $${params.length}`);
      }
      if (search) {
        params.push(`%${search}%`);
        conditions.push(`(d.name ILIKE $${params.length} OR d.company ILIKE $${params.length} OR d.email ILIKE $${params.length})`);
      }

      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      params.push(parseInt(limit), parseInt(offset));

      const result = await pool.query(
        `SELECT d.*,
                s.plan AS subscription_plan, s.mrr AS subscription_mrr, s.status AS subscription_status,
                COUNT(DISTINCT la.lead_id) AS leads_assigned
         FROM developers d
         LEFT JOIN subscriptions s ON s.developer_id = d.id AND s.status = 'active'
         LEFT JOIN lead_assignments la ON la.developer_id = d.id
         ${where}
         GROUP BY d.id, s.plan, s.mrr, s.status
         ORDER BY d.created_at DESC
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params
      );

      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/crm/developers
  router.post('/developers', async (req, res) => {
    try {
      const { name, email = null, company = null, phone = null, website = null, tier = 'prospect', notes = null, metadata = {} } = req.body;
      if (!name) return res.status(400).json({ error: 'name is required' });

      const result = await pool.query(
        `INSERT INTO developers (name, email, company, phone, website, tier, notes, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [name, email, company, phone, website, tier, notes, JSON.stringify(metadata)]
      );

      res.status(201).json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/crm/developers/:id
  router.get('/developers/:id', async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT d.*,
                JSON_AGG(DISTINCT JSONB_BUILD_OBJECT(
                  'id', s.id, 'plan', s.plan, 'mrr', s.mrr,
                  'status', s.status, 'start_date', s.start_date
                )) FILTER (WHERE s.id IS NOT NULL) AS subscriptions,
                JSON_AGG(DISTINCT JSONB_BUILD_OBJECT(
                  'id', dp.id, 'name', dp.name, 'location', dp.location,
                  'units', dp.units, 'status', dp.status
                )) FILTER (WHERE dp.id IS NOT NULL) AS projects
         FROM developers d
         LEFT JOIN subscriptions s ON s.developer_id = d.id
         LEFT JOIN developer_projects dp ON dp.developer_id = d.id
         WHERE d.id = $1
         GROUP BY d.id`,
        [req.params.id]
      );

      if (!result.rows.length) return res.status(404).json({ error: 'Developer not found' });
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // PATCH /api/crm/developers/:id
  router.patch('/developers/:id', async (req, res) => {
    try {
      const { name, email, company, phone, website, tier, notes, metadata } = req.body;
      const fields = [];
      const params = [];

      if (name !== undefined)     { params.push(name);     fields.push(`name = $${params.length}`); }
      if (email !== undefined)    { params.push(email);    fields.push(`email = $${params.length}`); }
      if (company !== undefined)  { params.push(company);  fields.push(`company = $${params.length}`); }
      if (phone !== undefined)    { params.push(phone);    fields.push(`phone = $${params.length}`); }
      if (website !== undefined)  { params.push(website);  fields.push(`website = $${params.length}`); }
      if (tier !== undefined)     { params.push(tier);     fields.push(`tier = $${params.length}`); }
      if (notes !== undefined)    { params.push(notes);    fields.push(`notes = $${params.length}`); }
      if (metadata !== undefined) { params.push(JSON.stringify(metadata)); fields.push(`metadata = $${params.length}`); }

      if (!fields.length) return res.status(400).json({ error: 'No fields to update' });

      params.push(req.params.id);
      const result = await pool.query(
        `UPDATE developers SET ${fields.join(', ')}, updated_at = NOW()
         WHERE id = $${params.length} RETURNING *`,
        params
      );

      if (!result.rows.length) return res.status(404).json({ error: 'Developer not found' });
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/crm/developers/:id/leads
  router.get('/developers/:id/leads', async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT l.*, la.commission_amount, la.status AS assignment_status, la.assigned_at
         FROM leads l
         JOIN lead_assignments la ON la.lead_id = l.id
         WHERE la.developer_id = $1
         ORDER BY la.assigned_at DESC`,
        [req.params.id]
      );
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── Deals ───────────────────────────────────────────────────────────────

  // GET /api/crm/deals
  router.get('/deals', async (req, res) => {
    try {
      const { stage, developer_id, limit = 200, offset = 0 } = req.query;
      const conditions = [];
      const params = [];

      if (stage && stage !== 'all') {
        params.push(stage);
        conditions.push(`d.stage = $${params.length}`);
      }
      if (developer_id) {
        params.push(developer_id);
        conditions.push(`d.developer_id = $${params.length}`);
      }

      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      params.push(parseInt(limit), parseInt(offset));

      const result = await pool.query(
        `SELECT d.*, dev.name AS developer_name, dev.company AS developer_company
         FROM deals d
         LEFT JOIN developers dev ON dev.id = d.developer_id
         ${where}
         ORDER BY d.created_at DESC
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params
      );

      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/crm/deals
  router.post('/deals', async (req, res) => {
    try {
      const {
        title,
        developer_id = null,
        stage = 'prospecting',
        value = 0,
        probability,
        assigned_to = null,
        notes = null,
        metadata = {},
      } = req.body;

      if (!title) return res.status(400).json({ error: 'title is required' });

      const prob = probability ?? STAGE_PROBABILITY[stage] ?? 10;

      const result = await pool.query(
        `INSERT INTO deals (title, developer_id, stage, value, probability, assigned_to, notes, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [title, developer_id, stage, value, prob, assigned_to, notes, JSON.stringify(metadata)]
      );

      res.status(201).json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // PATCH /api/crm/deals/:id — update deal fields
  router.patch('/deals/:id', async (req, res) => {
    try {
      const { title, developer_id, value, probability, assigned_to, notes, metadata } = req.body;
      const fields = [];
      const params = [];

      if (title !== undefined)       { params.push(title);       fields.push(`title = $${params.length}`); }
      if (developer_id !== undefined){ params.push(developer_id);fields.push(`developer_id = $${params.length}`); }
      if (value !== undefined)       { params.push(value);       fields.push(`value = $${params.length}`); }
      if (probability !== undefined) { params.push(probability); fields.push(`probability = $${params.length}`); }
      if (assigned_to !== undefined) { params.push(assigned_to); fields.push(`assigned_to = $${params.length}`); }
      if (notes !== undefined)       { params.push(notes);       fields.push(`notes = $${params.length}`); }
      if (metadata !== undefined)    { params.push(JSON.stringify(metadata)); fields.push(`metadata = $${params.length}`); }

      if (!fields.length) return res.status(400).json({ error: 'No fields to update' });

      params.push(req.params.id);
      const result = await pool.query(
        `UPDATE deals SET ${fields.join(', ')}, updated_at = NOW()
         WHERE id = $${params.length} RETURNING *`,
        params
      );

      if (!result.rows.length) return res.status(404).json({ error: 'Deal not found' });
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // PATCH /api/crm/deals/:id/stage — move deal stage with validation
  router.patch('/deals/:id/stage', async (req, res) => {
    try {
      const { stage, lost_reason } = req.body;
      if (!stage) return res.status(400).json({ error: 'stage is required' });

      // Get current deal
      const current = await pool.query('SELECT * FROM deals WHERE id = $1', [req.params.id]);
      if (!current.rows.length) return res.status(404).json({ error: 'Deal not found' });

      const deal = current.rows[0];
      const allowed = STAGE_TRANSITIONS[deal.stage] ?? [];

      if (!allowed.includes(stage)) {
        return res.status(422).json({
          error: `Cannot move from '${deal.stage}' to '${stage}'`,
          allowed_transitions: allowed,
        });
      }

      if (stage === 'closed_lost' && !lost_reason) {
        return res.status(400).json({ error: 'lost_reason is required when closing as lost' });
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Update deal stage
        const updated = await client.query(
          `UPDATE deals SET
             stage = $1,
             probability = $2,
             lost_reason = COALESCE($3, lost_reason),
             closed_at = CASE WHEN $1 IN ('closed_won','closed_lost') THEN NOW() ELSE closed_at END,
             updated_at = NOW()
           WHERE id = $4 RETURNING *`,
          [stage, STAGE_PROBABILITY[stage], lost_reason ?? null, req.params.id]
        );

        // Side effect: closed_won → update developer tier to 'active'
        if (stage === 'closed_won' && deal.developer_id) {
          await client.query(
            `UPDATE developers SET tier = 'active', updated_at = NOW() WHERE id = $1`,
            [deal.developer_id]
          );

          // Auto-log communication
          await client.query(
            `INSERT INTO communications (entity_type, entity_id, channel, summary, created_by)
             VALUES ('developer', $1, 'note', $2, 'system')`,
            [deal.developer_id, `Deal "${deal.title}" cerrado como WON. Developer activado automáticamente.`]
          );
        }

        await client.query('COMMIT');
        res.json(updated.rows[0]);
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── Subscriptions ───────────────────────────────────────────────────────

  // GET /api/crm/subscriptions
  router.get('/subscriptions', async (req, res) => {
    try {
      const { developer_id, status } = req.query;
      const conditions = [];
      const params = [];

      if (developer_id) { params.push(developer_id); conditions.push(`s.developer_id = $${params.length}`); }
      if (status && status !== 'all') { params.push(status); conditions.push(`s.status = $${params.length}`); }

      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

      const result = await pool.query(
        `SELECT s.*, d.name AS developer_name, d.company
         FROM subscriptions s
         JOIN developers d ON d.id = s.developer_id
         ${where}
         ORDER BY s.created_at DESC`,
        params
      );

      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/crm/subscriptions
  router.post('/subscriptions', async (req, res) => {
    try {
      const { developer_id, plan = 'starter', mrr = 0, currency = 'USD', start_date, end_date, notes } = req.body;
      if (!developer_id) return res.status(400).json({ error: 'developer_id is required' });

      const result = await pool.query(
        `INSERT INTO subscriptions (developer_id, plan, mrr, currency, start_date, end_date, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [developer_id, plan, mrr, currency, start_date ?? null, end_date ?? null, notes ?? null]
      );

      res.status(201).json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // PATCH /api/crm/subscriptions/:id
  router.patch('/subscriptions/:id', async (req, res) => {
    try {
      const { plan, mrr, currency, status, end_date, notes } = req.body;
      const fields = [];
      const params = [];

      if (plan !== undefined)     { params.push(plan);     fields.push(`plan = $${params.length}`); }
      if (mrr !== undefined)      { params.push(mrr);      fields.push(`mrr = $${params.length}`); }
      if (currency !== undefined) { params.push(currency); fields.push(`currency = $${params.length}`); }
      if (status !== undefined)   { params.push(status);   fields.push(`status = $${params.length}`); }
      if (end_date !== undefined) { params.push(end_date); fields.push(`end_date = $${params.length}`); }
      if (notes !== undefined)    { params.push(notes);    fields.push(`notes = $${params.length}`); }

      if (!fields.length) return res.status(400).json({ error: 'No fields to update' });

      params.push(req.params.id);
      const result = await pool.query(
        `UPDATE subscriptions SET ${fields.join(', ')}, updated_at = NOW()
         WHERE id = $${params.length} RETURNING *`,
        params
      );

      if (!result.rows.length) return res.status(404).json({ error: 'Subscription not found' });
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── Communications ───────────────────────────────────────────────────────

  // GET /api/crm/communications
  router.get('/communications', async (req, res) => {
    try {
      const { entity_type, entity_id, channel, limit = 100 } = req.query;
      const conditions = [];
      const params = [];

      if (entity_type) { params.push(entity_type); conditions.push(`entity_type = $${params.length}`); }
      if (entity_id)   { params.push(entity_id);   conditions.push(`entity_id = $${params.length}`); }
      if (channel)     { params.push(channel);      conditions.push(`channel = $${params.length}`); }

      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      params.push(parseInt(limit));

      const result = await pool.query(
        `SELECT * FROM communications ${where} ORDER BY created_at DESC LIMIT $${params.length}`,
        params
      );

      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/crm/communications
  router.post('/communications', async (req, res) => {
    try {
      const { entity_type, entity_id, channel, summary, created_by = 'human', metadata = {} } = req.body;

      if (!entity_type || !entity_id || !channel || !summary) {
        return res.status(400).json({ error: 'entity_type, entity_id, channel, and summary are required' });
      }

      const result = await pool.query(
        `INSERT INTO communications (entity_type, entity_id, channel, summary, created_by, metadata)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [entity_type, entity_id, channel, summary, created_by, JSON.stringify(metadata)]
      );

      res.status(201).json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
