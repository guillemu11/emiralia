/**
 * Emiralia — DB Init
 *
 * Applies the full schema (properties + workspace tables) to PostgreSQL.
 *
 * Usage: node tools/db/init_db.js
 */

import pool from './pool.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8');

console.log('Inicializando schema de Emiralia...');

pool.query(schema)
    .then(() => {
        console.log('Schema creado/verificado correctamente');
        console.log('Tablas: properties, projects, phases, tasks, agents, eod_reports, weekly_sessions, audit_log, collaboration_raises, raw_events');
    })
    .catch(err => {
        console.error('Error al crear schema:', err.message);
        process.exit(1);
    })
    .finally(() => pool.end());
