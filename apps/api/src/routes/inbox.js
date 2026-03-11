/**
 * Emiralia — Inbox + PM Agent Chat API Routes
 *
 * Endpoints consumed by the Dashboard inbox (InboxPanel + PMAgentChat).
 */

import { Router } from 'express';
import pool from '../../../../tools/db/pool.js';
import { chatWithPMAgent, extractJSON, generateSummary, generateProject } from '../../../../tools/pm-agent/core.js';
import { saveProject } from '../../../../tools/db/save_project.js';
import { buildProjectContext } from '../../../../tools/pm-agent/context-builder.js';

const router = Router();

// ─── GET /api/inbox ─────────────────────────────────────────────────────────
// List inbox items with optional department/status filters.

router.get('/inbox', async (req, res) => {
    const { department, status } = req.query;
    try {
        let query = `SELECT id, title, description, source, source_user, department,
                            status, project_id, weekly_session_id, created_at, updated_at
                     FROM inbox_items WHERE 1=1`;
        const params = [];
        if (department) {
            params.push(department);
            query += ` AND department = $${params.length}`;
        }
        if (status && status !== 'all') {
            params.push(status);
            query += ` AND status = $${params.length}`;
        }
        query += ` ORDER BY created_at DESC`;
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── GET /api/inbox/:id ─────────────────────────────────────────────────────
// Get a single inbox item including its conversation history.

router.get('/inbox/:id', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM inbox_items WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Inbox item not found' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── POST /api/inbox ────────────────────────────────────────────────────────
// Quick-add a new inbox item from the dashboard.

router.post('/inbox', async (req, res) => {
    const { title, department } = req.body;
    if (!title) return res.status(400).json({ error: 'title is required' });
    try {
        const result = await pool.query(
            `INSERT INTO inbox_items (title, department, source, source_user, status, conversation)
             VALUES ($1, $2, 'dashboard', 'user', 'chat', '[]'::jsonb)
             RETURNING *`,
            [title, department || null]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── POST /api/chat/pm-agent ────────────────────────────────────────────────
// Chat with the PM Agent via SSE streaming.
// Body: { inbox_item_id?, message, action }

router.post('/chat/pm-agent', async (req, res) => {
    const { inbox_item_id, message } = req.body;

    try {
        // 1. Resolve or create the inbox item + fetch live context in parallel
        let itemId = inbox_item_id;
        let conversation = [];

        const [_, projectContext] = await Promise.all([
            (async () => {
                if (itemId) {
                    const existing = await pool.query(
                        'SELECT id, conversation FROM inbox_items WHERE id = $1',
                        [itemId]
                    );
                    if (existing.rows.length === 0) throw new Error('NOT_FOUND');
                    conversation = existing.rows[0].conversation || [];
                } else {
                    const newItem = await pool.query(
                        `INSERT INTO inbox_items (title, source, source_user, status, conversation)
                         VALUES ($1, 'dashboard', 'user', 'chat', '[]'::jsonb)
                         RETURNING id`,
                        [message.substring(0, 100)]
                    );
                    itemId = newItem.rows[0].id;
                }
            })(),
            buildProjectContext(pool),
        ]);

        // 2. Set SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Inbox-Item-Id', String(itemId));
        res.flushHeaders();

        // 3. Build messages array
        const messages = [
            ...conversation,
            { role: 'user', content: message }
        ];

        // 4. Stream the PM Agent response (with live context injected)
        let fullText = '';
        const stream = await chatWithPMAgent(messages, { stream: true, projectContext });

        stream.on('text', (chunk) => {
            fullText += chunk;
            res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
        });

        await stream.finalMessage();

        res.write('data: [DONE]\n\n');
        res.end();

        // 5. Persist conversation (temporary — cleared when borrador is created)
        // Status stays as 'chat', no auto-advance
        const updatedConversation = [
            ...conversation,
            { role: 'user', content: message },
            { role: 'assistant', content: fullText }
        ];

        await pool.query(
            `UPDATE inbox_items
             SET conversation = $1, updated_at = NOW()
             WHERE id = $2`,
            [JSON.stringify(updatedConversation), itemId]
        );

    } catch (err) {
        if (err.message === 'NOT_FOUND') {
            return res.status(404).json({ error: 'Inbox item not found' });
        }
        if (!res.headersSent) {
            return res.status(500).json({ error: err.message });
        }
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
    }
});

// ─── POST /api/inbox/:id/to-borrador ─────────────────────────────────────────
// Generate summary from conversation and transition to borrador phase.

router.post('/inbox/:id/to-borrador', async (req, res) => {
    try {
        const item = await pool.query('SELECT * FROM inbox_items WHERE id = $1', [req.params.id]);
        if (item.rows.length === 0) return res.status(404).json({ error: 'Not found' });

        const { conversation, status } = item.rows[0];
        if (status !== 'chat') {
            return res.status(400).json({ error: `Cannot create borrador from status '${status}'` });
        }
        if (!conversation || conversation.length === 0) {
            return res.status(400).json({ error: 'No conversation to summarize' });
        }

        // Generate summary via PM Agent
        const summary = await generateSummary(conversation);

        // Update item: save summary, clear conversation, advance to borrador
        await pool.query(
            `UPDATE inbox_items
             SET summary = $1, conversation = '[]'::jsonb, status = 'borrador', updated_at = NOW()
             WHERE id = $2`,
            [summary, req.params.id]
        );

        res.json({ id: parseInt(req.params.id), status: 'borrador', summary });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── POST /api/inbox/:id/to-proyecto ──────────────────────────────────────────
// Generate full project from borrador summary and create project in DB.

router.post('/inbox/:id/to-proyecto', async (req, res) => {
    try {
        const item = await pool.query('SELECT * FROM inbox_items WHERE id = $1', [req.params.id]);
        if (item.rows.length === 0) return res.status(404).json({ error: 'Not found' });

        const { title, summary, status } = item.rows[0];
        if (status !== 'borrador') {
            return res.status(400).json({ error: `Cannot create project from status '${status}'` });
        }
        if (!summary) {
            return res.status(400).json({ error: 'No summary available' });
        }

        // Generate full project with context
        const projectContext = await buildProjectContext(pool);
        const { text, json: projectData } = await generateProject(title, summary, projectContext);

        if (!projectData) {
            return res.status(500).json({ error: 'PM Agent did not generate valid project JSON', response: text });
        }

        // Save project to DB
        const projectId = await saveProject(projectData);

        // Update inbox item
        await pool.query(
            `UPDATE inbox_items
             SET structured_data = $1, project_id = $2, status = 'proyecto', updated_at = NOW()
             WHERE id = $3`,
            [JSON.stringify(projectData), projectId, req.params.id]
        );

        res.json({ id: parseInt(req.params.id), status: 'proyecto', project_id: projectId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── POST /api/inbox/:id/reopen ───────────────────────────────────────────────
// Reopen a borrador back to chat (to continue refining).

router.post('/inbox/:id/reopen', async (req, res) => {
    try {
        const item = await pool.query('SELECT * FROM inbox_items WHERE id = $1', [req.params.id]);
        if (item.rows.length === 0) return res.status(404).json({ error: 'Not found' });

        const { status, summary } = item.rows[0];
        if (status !== 'borrador') {
            return res.status(400).json({ error: `Cannot reopen from status '${status}'` });
        }

        // Seed conversation with the summary as context so the PM Agent knows what was discussed
        const seedConversation = [
            { role: 'user', content: `Contexto previo (borrador anterior):\n${summary}\n\nQuiero seguir refinando esta idea.` }
        ];

        await pool.query(
            `UPDATE inbox_items
             SET status = 'chat', conversation = $1, updated_at = NOW()
             WHERE id = $2`,
            [JSON.stringify(seedConversation), req.params.id]
        );

        res.json({ id: parseInt(req.params.id), status: 'chat' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
