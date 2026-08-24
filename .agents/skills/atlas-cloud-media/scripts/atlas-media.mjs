#!/usr/bin/env node

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const API_ROOT = 'https://api.atlascloud.ai/api/v1';
const MODELS_URL = `${API_ROOT}/models`;
const TERMINAL_SUCCESS = new Set(['completed', 'succeeded']);
const TERMINAL_FAILURE = new Set(['failed', 'canceled', 'cancelled', 'error', 'timeout']);

function help() {
  return `Atlas Cloud image and video client

Usage:
  node scripts/atlas-media.mjs models [--type image|video] [--search QUERY] [--json]
  node scripts/atlas-media.mjs schema --model MODEL_ID [--json]
  node scripts/atlas-media.mjs generate --type image|video --model MODEL_ID
    (--prompt TEXT | --prompt-file PATH) [--params JSON] [--param KEY=VALUE ...]
    [--input FIELD=PATH ...] [--output-dir PATH] [--dry-run | --confirm] [--no-wait]

Generation is billable and requires --confirm. Run --dry-run first.
Credentials: ATLASCLOUD_API_KEY, or run node scripts/configure-key.mjs.
`;
}

function parseArgs(argv) {
  const parsed = { _: [], param: [], input: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) {
      parsed._.push(token);
      continue;
    }
    const key = token.slice(2);
    if (['json', 'dry-run', 'confirm', 'no-wait', 'help'].includes(key)) {
      parsed[key] = true;
      continue;
    }
    const value = argv[i + 1];
    if (value === undefined || value.startsWith('--')) throw new Error(`--${key} requires a value.`);
    i += 1;
    if (key === 'param' || key === 'input') parsed[key].push(value);
    else parsed[key] = value;
  }
  return parsed;
}

function credentialsPath() {
  if (process.env.ATLAS_MEDIA_CONFIG_FILE) return path.resolve(process.env.ATLAS_MEDIA_CONFIG_FILE);
  const root = process.platform === 'win32'
    ? (process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'))
    : path.join(os.homedir(), '.config');
  return path.join(root, 'atlas-cloud-media', 'credentials.json');
}

async function apiKey() {
  if (process.env.ATLASCLOUD_API_KEY?.trim()) return process.env.ATLASCLOUD_API_KEY.trim();
  try {
    const parsed = JSON.parse(await fs.readFile(credentialsPath(), 'utf8'));
    if (typeof parsed.apiKey === 'string' && parsed.apiKey.trim()) return parsed.apiKey.trim();
  } catch (error) {
    if (error.code !== 'ENOENT') throw new Error(`Could not read Atlas credential: ${error.message}`);
  }
  throw new Error('No Atlas Cloud key is available. Run node scripts/configure-key.mjs; never paste the key into chat.');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchJson(url, options = {}, retries = 2) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, { ...options, signal: AbortSignal.timeout(options.timeoutMs || 30_000) });
      const text = await response.text();
      let body;
      try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text.slice(0, 1000) }; }
      if (!response.ok) {
        const message = body?.message || body?.error || body?.data?.error || JSON.stringify(body);
        const error = new Error(`${response.status} ${response.statusText}: ${message}`);
        error.status = response.status;
        throw error;
      }
      return body;
    } catch (error) {
      lastError = error;
      const safeToRetry = !options.method || options.method === 'GET';
      if (!safeToRetry || attempt === retries || (error.status && error.status < 500 && error.status !== 429)) break;
      await sleep(1000 * (2 ** attempt));
    }
  }
  if (lastError?.message === 'fetch failed') {
    const reason = lastError.cause?.code || lastError.cause?.message || 'network unavailable';
    throw new Error(`Could not reach ${new URL(url).host} (${reason}). Check this process's internet access, DNS, firewall, or sandbox permissions.`);
  }
  throw lastError;
}

async function publicModels() {
  const envelope = await fetchJson(MODELS_URL);
  const models = Array.isArray(envelope.data) ? envelope.data : envelope.data?.models;
  if (!Array.isArray(models)) throw new Error('Atlas returned an unexpected model catalog shape.');
  return models.filter(model => model.display_console === true);
}

function modelName(model) {
  return model.displayName || model.name || model.model;
}

function normalizedType(value) {
  if (!value) return undefined;
  const type = String(value).toLowerCase();
  if (!['image', 'video'].includes(type)) throw new Error('--type must be image or video.');
  return type;
}

function priceSummary(model) {
  const actual = model.price?.actual || {};
  const value = actual.base_price ?? actual.input_price ?? model.basePrice ?? model.inputPrice;
  if (value === undefined || value === null || value === '') return 'price unavailable';
  return `base ${value} (confirm billing unit in live model detail)`;
}

function matches(model, query) {
  if (!query) return true;
  const haystack = [model.model, modelName(model), model.organization, model.familyName, model.familyDisplayName,
    ...(model.categories || []), ...(model.tags || [])].filter(Boolean).join(' ').toLowerCase();
  return query.toLowerCase().split(/\s+/u).every(term => haystack.includes(term));
}

async function listModels(args) {
  const type = normalizedType(args.type);
  const models = (await publicModels())
    .filter(model => !type || String(model.type).toLowerCase() === type)
    .filter(model => matches(model, args.search))
    .sort((a, b) => String(a.model).localeCompare(String(b.model)));
  if (args.json) {
    console.log(JSON.stringify(models, null, 2));
    return;
  }
  console.log(`${models.length} client-facing model${models.length === 1 ? '' : 's'}`);
  for (const model of models) {
    console.log(`${model.type}\t${model.model}\t${modelName(model)}\t${priceSummary(model)}`);
  }
}

async function exactModel(id, expectedType) {
  if (!id) throw new Error('--model is required.');
  const model = (await publicModels()).find(entry => entry.model === id);
  if (!model) throw new Error(`Model is not in the current client-facing Atlas catalog: ${id}`);
  if (expectedType && String(model.type).toLowerCase() !== expectedType) {
    throw new Error(`${id} is type ${model.type}, not ${expectedType}.`);
  }
  if (!model.schema) throw new Error(`Atlas did not publish a schema URL for ${id}.`);
  return model;
}

function inputSchema(document) {
  const schemas = document?.components?.schemas || {};
  if (schemas.Input) return schemas.Input;
  const found = Object.entries(schemas).find(([name]) => /input|request/i.test(name));
  if (found) return found[1];
  throw new Error('The model schema does not expose components.schemas.Input.');
}

async function modelSchema(model) {
  const document = await fetchJson(model.schema);
  return { document, input: inputSchema(document) };
}

function fieldSummary(name, schema, required) {
  const choices = Array.isArray(schema.enum) ? ` enum=${JSON.stringify(schema.enum)}` : '';
  const defaultValue = schema.default !== undefined ? ` default=${JSON.stringify(schema.default)}` : '';
  return `${required ? '*' : ' '} ${name}: ${schema.type || 'any'}${choices}${defaultValue}`;
}

async function showSchema(args) {
  const model = await exactModel(args.model);
  const schema = await modelSchema(model);
  if (args.json) {
    console.log(JSON.stringify({ model, schema: schema.document }, null, 2));
    return;
  }
  const required = new Set(schema.input.required || []);
  console.log(`${model.type}\t${model.model}\t${modelName(model)}\t${priceSummary(model)}`);
  for (const [name, definition] of Object.entries(schema.input.properties || {})) {
    console.log(fieldSummary(name, definition, required.has(name)));
  }
}

function parseValue(raw) {
  try { return JSON.parse(raw); } catch { return raw; }
}

function splitAssignment(raw, flag) {
  const index = raw.indexOf('=');
  if (index < 1) throw new Error(`${flag} must use FIELD=VALUE.`);
  return [raw.slice(0, index), raw.slice(index + 1)];
}

async function promptText(args) {
  if (args.prompt && args['prompt-file']) throw new Error('Use --prompt or --prompt-file, not both.');
  if (args['prompt-file']) return (await fs.readFile(path.resolve(args['prompt-file']), 'utf8')).trim();
  return String(args.prompt || '').trim();
}

function buildParams(args) {
  let params = {};
  if (args.params) {
    params = JSON.parse(args.params);
    if (!params || Array.isArray(params) || typeof params !== 'object') throw new Error('--params must be a JSON object.');
  }
  for (const assignment of args.param) {
    const [key, raw] = splitAssignment(assignment, '--param');
    params[key] = parseValue(raw);
  }
  return params;
}

async function uploadFile(filePath, key) {
  const absolute = path.resolve(filePath);
  const stat = await fs.stat(absolute);
  if (!stat.isFile() || stat.size === 0) throw new Error(`Input is not a non-empty file: ${absolute}`);
  const form = new FormData();
  form.append('file', new Blob([await fs.readFile(absolute)]), path.basename(absolute));
  const response = await fetchJson(`${API_ROOT}/model/uploadMedia`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}` },
    body: form,
    timeoutMs: 120_000,
  }, 0);
  const url = response?.data?.download_url || response?.data?.url || response?.download_url || response?.url;
  if (typeof url !== 'string' || !/^https:\/\//u.test(url)) throw new Error('Atlas upload completed without a valid HTTPS URL.');
  return url;
}

async function resolveInputs(args, properties, key, dryRun) {
  const grouped = new Map();
  for (const assignment of args.input) {
    const [field, file] = splitAssignment(assignment, '--input');
    if (!properties[field]) throw new Error(`Input field is not in the live model schema: ${field}`);
    const absolute = path.resolve(file);
    const stat = await fs.stat(absolute);
    if (!stat.isFile() || stat.size === 0) throw new Error(`Input is not a non-empty file: ${absolute}`);
    const value = dryRun ? `[local file will upload: ${path.basename(absolute)}]` : await uploadFile(absolute, key);
    if (!grouped.has(field)) grouped.set(field, []);
    grouped.get(field).push(value);
  }
  const result = {};
  for (const [field, values] of grouped) {
    result[field] = properties[field]?.type === 'array' || values.length > 1 ? values : values[0];
  }
  return result;
}

function validatePayload(payload, schema) {
  const properties = schema.properties || {};
  // Atlas schemas sometimes mark `model` as required without repeating it in
  // Input.properties. It is the one transport field shared by every route.
  const unknown = Object.keys(payload).filter(key => key !== 'model' && !properties[key]);
  if (unknown.length) throw new Error(`Fields not present in the live schema: ${unknown.join(', ')}`);
  const missing = (schema.required || []).filter(key => payload[key] === undefined || payload[key] === '');
  if (missing.length) throw new Error(`Missing required live-schema fields: ${missing.join(', ')}`);
  for (const [key, value] of Object.entries(payload)) {
    const choices = properties[key]?.enum;
    if (Array.isArray(choices) && !choices.includes(value)) {
      throw new Error(`${key} must be one of ${JSON.stringify(choices)}.`);
    }
  }
}

function sanitized(payload) {
  return JSON.parse(JSON.stringify(payload, (key, value) => /api.?key|authorization|token|secret/i.test(key) ? '[REDACTED]' : value));
}

async function pollPrediction(id, key, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const envelope = await fetchJson(`${API_ROOT}/model/prediction/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    const data = envelope.data || envelope;
    const status = String(data.status || 'unknown').toLowerCase();
    console.log(`Prediction ${id}: ${status}`);
    if (TERMINAL_SUCCESS.has(status)) return data;
    if (TERMINAL_FAILURE.has(status)) throw new Error(`Prediction ${id} failed: ${data.error || data.message || status}`);
    await sleep(3000);
  }
  throw new Error(`Polling timed out. Prediction ${id} may still be running; check it before any resubmission.`);
}

function outputUrls(data) {
  const raw = data.outputs ?? data.output ?? data.urls ?? [];
  const values = Array.isArray(raw) ? raw : [raw];
  return values.flatMap(value => typeof value === 'string' ? [value] : value?.url ? [value.url] : [])
    .filter(url => /^https:\/\//u.test(url));
}

function extension(url, contentType, type) {
  const pathname = new URL(url).pathname;
  const found = path.extname(pathname).toLowerCase();
  if (/^\.[a-z0-9]{2,5}$/u.test(found)) return found;
  if (contentType?.includes('png')) return '.png';
  if (contentType?.includes('jpeg')) return '.jpg';
  if (contentType?.includes('quicktime')) return '.mov';
  return type === 'video' ? '.mp4' : '.bin';
}

async function downloadOutputs(urls, directory, type, predictionId) {
  const root = path.resolve(directory, predictionId);
  await fs.mkdir(root, { recursive: true });
  const saved = [];
  for (let index = 0; index < urls.length; index += 1) {
    const response = await fetch(urls[index], { signal: AbortSignal.timeout(180_000) });
    if (!response.ok) throw new Error(`Output download failed: ${response.status} ${response.statusText}`);
    const file = path.join(root, `output-${index + 1}${extension(urls[index], response.headers.get('content-type'), type)}`);
    await fs.writeFile(file, Buffer.from(await response.arrayBuffer()));
    saved.push(file);
  }
  return saved;
}

async function generate(args) {
  const type = normalizedType(args.type);
  if (!type) throw new Error('--type is required for generation.');
  if (args['dry-run'] && args.confirm) throw new Error('Use --dry-run or --confirm, not both.');
  if (!args['dry-run'] && !args.confirm) throw new Error('Generation is billable. Run --dry-run first, then repeat with --confirm after user approval.');
  const model = await exactModel(args.model, type);
  const { input } = await modelSchema(model);
  const properties = input.properties || {};
  const prompt = await promptText(args);
  const params = buildParams(args);
  const key = args['dry-run'] ? undefined : await apiKey();
  const uploads = await resolveInputs(args, properties, key, args['dry-run']);
  const payload = { model: model.model, ...params, ...uploads };
  if (prompt) payload.prompt = prompt;
  validatePayload(payload, input);
  if (args['dry-run']) {
    console.log(JSON.stringify({ endpoint: `${API_ROOT}/model/${type === 'image' ? 'generateImage' : 'generateVideo'}`, model: model.model,
      price: model.price || null, payload: sanitized(payload) }, null, 2));
    return;
  }
  const endpoint = `${API_ROOT}/model/${type === 'image' ? 'generateImage' : 'generateVideo'}`;
  const envelope = await fetchJson(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    timeoutMs: 300_000,
  }, 0);
  const predictionId = envelope?.data?.id || envelope?.data?.taskId || envelope?.id || envelope?.taskId;
  if (!predictionId) throw new Error('Atlas accepted the request but did not return a prediction ID. Do not resubmit automatically.');
  console.log(`Submitted once. Prediction ID: ${predictionId}`);
  if (args['no-wait']) return;
  const result = await pollPrediction(String(predictionId), key, type === 'video' ? 15 * 60_000 : 10 * 60_000);
  const urls = outputUrls(result);
  if (!urls.length) throw new Error(`Prediction ${predictionId} completed without a recognized output URL.`);
  console.log(JSON.stringify({ predictionId, outputs: urls }, null, 2));
  if (args['output-dir']) {
    const files = await downloadOutputs(urls, args['output-dir'], type, String(predictionId));
    console.log(JSON.stringify({ downloaded: files }, null, 2));
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  if (!command || args.help) {
    console.log(help());
    return;
  }
  if (command === 'models') return listModels(args);
  if (command === 'schema') return showSchema(args);
  if (command === 'generate') return generate(args);
  throw new Error(`Unknown command: ${command}\n\n${help()}`);
}

main().catch(error => {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
});
