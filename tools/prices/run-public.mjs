#!/usr/bin/env node
// Limit the official-site price search to currently public, stay-eligible facilities.
// Results remain untrusted candidates in ignored cache/candidates files for manual review.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const snapshot = JSON.parse(fs.readFileSync(path.join(root, 'web', 'data', 'catalog-snapshot.json'), 'utf8'));
const prices = JSON.parse(fs.readFileSync(path.join(root, 'web', 'data', 'prices.json'), 'utf8')).items;
const limit = Number(process.argv[2] || 30);
const offset = Number(process.argv[3] || 0);
if (!Number.isInteger(limit) || limit < 1 || limit > 200 || !Number.isInteger(offset) || offset < 0) throw new Error('Usage: node run-public.mjs <limit 1..200> [offset >= 0]');
const targets = snapshot.rows
  .filter(row => row.record?.stay === '可' && /^https:\/\//.test(row.official_url || '') && !Number(row.record?.stayPricePerPerson) && !prices[row.id] && !row.record?.monitor?.price)
  .map(row => String(row.id))
  .filter(id => /^[\w-]+$/.test(id))
  .slice(offset, offset + limit);
if (!targets.length) { console.log('No unpriced public stay facilities in this batch.'); process.exit(0); }
console.log(`Checking ${targets.length} public facilities; candidates require manual source review.`);
const result = spawnSync(process.execPath, [path.join(here, 'price-finder.mjs'), '--budget-min', '3', '--concurrency', '5', '--ids', targets.join(',')], {stdio:'inherit'});
process.exit(result.status ?? 1);
