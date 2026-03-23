#!/usr/bin/env node
/**
 * submit-review-batch.cjs
 * Reenvía submit-review para los 14 blog items ya en pending_review
 */

const http = require('http');

const ITEM_IDS = [
  '2b4478a8-770d-4c1e-bfae-c435eca330aa',
  '37b1924c-f565-491c-8f80-98102fd04ff4',
  '76b6433d-3637-40ff-b964-6ae8ddbb4c12',
  '6a59fd8b-97d8-4a14-a08b-bab4d9b532ea',
  '8de67672-0337-45df-805c-43d372d204ea',
  '392a0378-cca9-4faf-8567-9be731a71375',
  'a26dd7c8-0c23-490d-a39c-26556279802f',
  'c51aab48-9f34-47e3-bcfd-fc7674714ed8',
  '4382d9fb-6667-4392-83ad-302eee0dd958',
  '105f6ff1-aa07-484c-a823-e3bc071e741b',
  'f23632d0-abc6-483b-af92-00015ccd60c9',
  '8e321db7-ba47-47aa-9491-6c8434ecffe8',
  '60f9dbab-e7d3-4837-8ae7-07b447fa8998',
  '7b50068d-d861-4d99-80a3-2872945ce28b',
];

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body || {});
    const options = {
      hostname: 'localhost',
      port: 3001,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    };
    const req = http.request(options, (res) => {
      let raw = '';
      res.on('data', (c) => (raw += c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, body: raw }); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  console.log('=== submit-review batch (14 items) ===\n');
  let ok = 0;
  let fail = 0;

  for (let i = 0; i < ITEM_IDS.length; i++) {
    const id = ITEM_IDS[i];
    const res = await post(`/api/campaigns/items/${id}/submit-review`, {});
    if (res.status === 200 || res.status === 201) {
      console.log(`[${i + 1}/14] OK — ${id}`);
      ok++;
    } else {
      console.error(`[${i + 1}/14] ERROR ${res.status} — ${id}:`, res.body);
      fail++;
    }
  }

  console.log(`\n=== RESULTADO: ${ok} OK / ${fail} errores ===`);
}

main().catch(console.error);
