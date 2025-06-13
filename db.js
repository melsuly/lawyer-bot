import fs from 'fs';
import path from 'path';

const DB_FILE = './database.json';

// Initialize database (JSON file-based)
function loadDB() {
  if (!fs.existsSync(DB_FILE)) {
    const initialData = {
      activation_keys: {},
      users: {}
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
    return initialData;
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function saveDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Generate a random alphanumeric key of given length
function generateRandomKey(length = 10) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function generateKey(days) {
  const db = loadDB();
  const key = generateRandomKey(10);
  const now = Date.now();

  db.activation_keys[key] = {
    days,
    created_at: now,
    used: false
  };

  saveDB(db);
  return key;
}

export async function activateUser(chatId, key) {
  const db = loadDB();
  const keyData = db.activation_keys[key];

  if (!keyData) {
    throw new Error('invalid_key');
  }
  if (keyData.used) {
    throw new Error('key_used');
  }

  const now = Date.now();
  const expiration = now + keyData.days * 24 * 60 * 60 * 1000;

  // Mark key as used
  db.activation_keys[key].used = true;

  // Set user activation
  db.users[chatId] = {
    activated_until: expiration
  };

  saveDB(db);
  return expiration;
}

export async function isActivated(chatId) {
  const db = loadDB();
  const userData = db.users[chatId];

  if (!userData) return false;
  return userData.activated_until > Date.now();
}
