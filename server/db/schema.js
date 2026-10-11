import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_DIR = (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) ? '/tmp' : __dirname;
const DB_PATH = path.join(DB_DIR, 'ritece.json');

// In-memory database that persists to JSON file
let database = {
  users: [],
  education: [],
  experience: [],
  skills: [],
  projects: [],
  certifications: [],
  achievements: [],
  connections: [],
  followers: [],
  posts: [],
  reactions: [],
  comments: [],
  saved_posts: [],
  conversations: [],
  messages: [],
  notifications: [],
  jobs: [],
  hackathons: [],
  incubation_programs: [],
  workshops: [],
  events: [],
  event_registrations: [],
  communities: [],
  community_channels: [],
  community_messages: [],
  community_members: [],
  mentorship_requests: [],
  documents: [],
  reports: [],
  announcements: [],
  saved_jobs: [],
  job_applications: [],
  languages: [],
  interests: [],
};

// Load database from file
function loadDb() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, 'utf-8');
      const parsed = JSON.parse(data);
      database = { ...database, ...parsed };
    } else {
      const bundledUrl = new URL('./ritece.json', import.meta.url);
      if (fs.existsSync(bundledUrl)) {
        const data = fs.readFileSync(bundledUrl, 'utf-8');
        const parsed = JSON.parse(data);
        database = { ...database, ...parsed };
        try {
          fs.writeFileSync(DB_PATH, JSON.stringify(database, null, 2));
        } catch (e) {
          // ignore read-only warnings
        }
      }
    }
  } catch (err) {
    console.log('Database load error:', err.message);
  }
}

// Save database to file (debounced)
let saveTimeout = null;
function saveDb() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    try {
      fs.writeFileSync(DB_PATH, JSON.stringify(database, null, 2));
    } catch (err) {
      console.error('Error saving database:', err);
    }
  }, 100);
}

// Force save (synchronous)
function saveDbSync() {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(database, null, 2));
  } catch (err) {
    console.error('Error saving database:', err);
  }
}

// Database operations
export function getDb() {
  return database;
}

// Generic CRUD operations
export function findAll(table, filter = null) {
  let results = database[table] || [];
  if (filter) {
    results = results.filter(item => {
      return Object.entries(filter).every(([key, value]) => item[key] === value);
    });
  }
  return results;
}

export function findById(table, id) {
  return (database[table] || []).find(item => item.id === id);
}

export function findOne(table, filter) {
  return (database[table] || []).find(item => {
    return Object.entries(filter).every(([key, value]) => item[key] === value);
  });
}

export function findWhere(table, predicate) {
  return (database[table] || []).filter(predicate);
}

export function insert(table, record) {
  if (!database[table]) database[table] = [];
  database[table].push(record);
  saveDb();
  return record;
}

export function update(table, id, updates) {
  const index = (database[table] || []).findIndex(item => item.id === id);
  if (index === -1) return null;
  database[table][index] = { ...database[table][index], ...updates, updated_at: new Date().toISOString() };
  saveDb();
  return database[table][index];
}

export function updateWhere(table, filter, updates) {
  let updated = 0;
  (database[table] || []).forEach((item, index) => {
    const matches = Object.entries(filter).every(([key, value]) => item[key] === value);
    if (matches) {
      database[table][index] = { ...item, ...updates };
      updated++;
    }
  });
  if (updated > 0) saveDb();
  return updated;
}

export function remove(table, id) {
  const index = (database[table] || []).findIndex(item => item.id === id);
  if (index === -1) return false;
  database[table].splice(index, 1);
  saveDb();
  return true;
}

export function removeWhere(table, filter) {
  const before = (database[table] || []).length;
  database[table] = (database[table] || []).filter(item => {
    return !Object.entries(filter).every(([key, value]) => item[key] === value);
  });
  const removed = before - database[table].length;
  if (removed > 0) saveDb();
  return removed;
}

export function count(table, filter = null) {
  if (!filter) return (database[table] || []).length;
  return findAll(table, filter).length;
}

// Full-text search across fields
export function search(table, query, fields) {
  const lower = query.toLowerCase();
  return (database[table] || []).filter(item => {
    return fields.some(field => {
      const value = item[field];
      if (!value) return false;
      return String(value).toLowerCase().includes(lower);
    });
  });
}

export function initDatabase() {
  // Ensure db directory exists
  const dbDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  
  // Ensure uploads directory exists
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  const profilesDir = path.join(uploadsDir, 'profiles');
  if (!fs.existsSync(profilesDir)) {
    fs.mkdirSync(profilesDir, { recursive: true });
  }
  const postsDir = path.join(uploadsDir, 'posts');
  if (!fs.existsSync(postsDir)) {
    fs.mkdirSync(postsDir, { recursive: true });
  }
  const documentsDir = path.join(uploadsDir, 'documents');
  if (!fs.existsSync(documentsDir)) {
    fs.mkdirSync(documentsDir, { recursive: true });
  }

  loadDb();
  console.log('✅ Database initialized successfully');
  return database;
}

export { saveDbSync };
