#!/usr/bin/env node

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';

function configPath() {
  if (process.env.ATLAS_MEDIA_CONFIG_FILE) return path.resolve(process.env.ATLAS_MEDIA_CONFIG_FILE);
  const root = process.platform === 'win32'
    ? (process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'))
    : path.join(os.homedir(), '.config');
  return path.join(root, 'atlas-cloud-media', 'credentials.json');
}

async function readHidden(prompt) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error('Run this command in an interactive terminal. Do not pipe an API key into it.');
  }
  process.stdout.write(prompt);
  readline.emitKeypressEvents(process.stdin);
  const wasRaw = process.stdin.isRaw;
  process.stdin.setRawMode(true);
  process.stdin.resume();
  let value = '';
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      process.stdin.off('keypress', onKeypress);
      process.stdin.setRawMode(Boolean(wasRaw));
      process.stdin.pause();
      process.stdout.write('\n');
    };
    const onKeypress = (text, key = {}) => {
      if (key.ctrl && key.name === 'c') {
        cleanup();
        reject(new Error('Configuration cancelled.'));
        return;
      }
      if (key.name === 'return' || key.name === 'enter') {
        cleanup();
        resolve(value.trim());
        return;
      }
      if (key.name === 'backspace') {
        value = value.slice(0, -1);
        return;
      }
      if (text && !key.ctrl && !key.meta) value += text;
    };
    process.stdin.on('keypress', onKeypress);
  });
}

async function main() {
  console.log('Create a key at https://www.atlascloud.ai/console/api-keys');
  console.log('The key will be stored outside the skill folder and will not be displayed.');
  const apiKey = await readHidden('Atlas Cloud API key: ');
  if (apiKey.length < 16 || /\s/u.test(apiKey)) {
    throw new Error('The key appears incomplete. Nothing was saved.');
  }
  const file = configPath();
  await fs.mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  await fs.writeFile(file, `${JSON.stringify({ apiKey }, null, 2)}\n`, { mode: 0o600 });
  if (process.platform !== 'win32') {
    await fs.chmod(path.dirname(file), 0o700);
    await fs.chmod(file, 0o600);
  }
  console.log(`Atlas Cloud credential saved securely at ${file}`);
}

main().catch(error => {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
});
