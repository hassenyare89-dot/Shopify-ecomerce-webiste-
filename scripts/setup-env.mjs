#!/usr/bin/env node
/**
 * Creates/updates the local `.env` file (Windows, macOS, Linux).
 *
 *   npm run setup:env
 *
 * - Creates `.env` from `.env.example` if it doesn't exist.
 * - Generates a cryptographically secure SESSION_SECRET ONLY if it is missing
 *   or empty. Existing values (including real Shopify credentials) are never
 *   changed.
 * - Never prints secret values.
 * - Reports which required Shopify variables are still empty.
 *
 * Shopify credentials themselves can't be generated: get them with
 * `npx shopify hydrogen link` then `npx shopify hydrogen env pull`, or from
 * the Hydrogen sales channel in Shopify admin (docs/SHOPIFY_SETUP.md).
 */
import {randomBytes} from 'node:crypto';
import {existsSync, readFileSync, writeFileSync, copyFileSync} from 'node:fs';
import {resolve} from 'node:path';

const root = resolve(import.meta.dirname, '..');
const envPath = resolve(root, '.env');
const examplePath = resolve(root, '.env.example');

// Required to render against a real store (others in .env.example are optional).
const REQUIRED_FOR_STORE = [
  'PUBLIC_STORE_DOMAIN',
  'PUBLIC_STOREFRONT_API_TOKEN',
  'PRIVATE_STOREFRONT_API_TOKEN',
  'PUBLIC_STOREFRONT_ID',
  'PUBLIC_CHECKOUT_DOMAIN',
];
// Required only for customer login (/account).
const REQUIRED_FOR_ACCOUNTS = ['PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID', 'SHOP_ID'];

export function parseEnv(text) {
  const values = new Map();
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    let value = match[2].trim();
    // Quoted value, optionally followed by an inline comment: KEY="v"  # note
    const quoted = value.match(/^"([^"]*)"\s*(?:#.*)?$|^'([^']*)'\s*(?:#.*)?$/);
    if (quoted) value = quoted[1] ?? quoted[2];
    else value = value.replace(/\s+#.*$/, '').trim();
    values.set(match[1], value);
  }
  return values;
}

/** Sets KEY="value" in env text, replacing an existing (possibly empty) line or appending. */
export function setEnvValue(text, key, value) {
  const line = `${key}="${value}"`;
  const pattern = new RegExp(`^\\s*${key}\\s*=.*$`, 'm');
  if (pattern.test(text)) return text.replace(pattern, line);
  return `${text.replace(/\s*$/, '')}\n${line}\n`;
}

function main() {
  let created = false;
  if (!existsSync(envPath)) {
    if (existsSync(examplePath)) copyFileSync(examplePath, envPath);
    else writeFileSync(envPath, '');
    created = true;
  }

  let text = readFileSync(envPath, 'utf8');
  const values = parseEnv(text);
  let generated = false;
  if (!values.get('SESSION_SECRET')) {
    text = setEnvValue(text, 'SESSION_SECRET', randomBytes(32).toString('hex'));
    writeFileSync(envPath, text, {mode: 0o600});
    generated = true;
  }

  const after = parseEnv(text);
  const missingStore = REQUIRED_FOR_STORE.filter((k) => !after.get(k));
  const missingAccounts = REQUIRED_FOR_ACCOUNTS.filter((k) => !after.get(k));

  console.log(created ? '✔ Created .env from .env.example' : '✔ Found existing .env (existing values kept)');
  console.log(generated ? '✔ Generated a new SESSION_SECRET (value not shown)' : '✔ SESSION_SECRET already set (unchanged)');

  if (missingStore.length) {
    console.log('\n⚠ Shopify store credentials are still missing:');
    for (const k of missingStore) console.log(`   - ${k}`);
    console.log('\n  Get them (they cannot be generated):');
    console.log('    npx shopify hydrogen link');
    console.log('    npx shopify hydrogen env pull');
    console.log('  Or preview with sample data, no credentials needed:');
    console.log('    npm run dev:mock');
  } else {
    console.log('✔ Shopify store variables are set');
  }
  if (missingAccounts.length) {
    console.log(`\nℹ Customer login (/account) also needs: ${missingAccounts.join(', ')}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('setup-env.mjs')) {
  main();
}
