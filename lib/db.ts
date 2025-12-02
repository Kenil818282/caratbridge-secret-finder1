import fs from 'fs';
import path from 'path';

// The file where we save everything
const DB_PATH = path.join(process.cwd(), 'watchtower_data.json');

interface WatchData {
  monitoredTags: string[];
  leads: any[];
  lastChecked: number;
  isRunning: boolean;
}

const defaultData: WatchData = {
  monitoredTags: [],
  leads: [],
  lastChecked: 0,
  isRunning: false 
};

// 1. READ DATABASE (Safe Read)
export function getDb(): WatchData {
  try {
    if (!fs.existsSync(DB_PATH)) {
      fs.writeFileSync(DB_PATH, JSON.stringify(defaultData, null, 2));
      return defaultData;
    }
    const data = fs.readFileSync(DB_PATH, 'utf-8');
    if (!data) return defaultData;
    return JSON.parse(data);
  } catch (error) {
    console.error("DB Read Error:", error);
    return defaultData;
  }
}

// 2. SAVE DATABASE
export function saveDb(data: WatchData) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("DB Save Error:", e);
  }
}

// 3. TOGGLE STATUS
export function setRunningStatus(status: boolean) {
  const db = getDb();
  db.isRunning = status;
  saveDb(db);
}

// 4. ADD LEADS (Updated to return the ACTUAL OBJECTS added)
export function addLeadsToDb(newLeads: any[]) {
  const db = getDb();
  const addedLeads: any[] = []; // Track actual new items

  if (!db.leads) db.leads = [];

  newLeads.forEach(lead => {
    // Check duplicates by ID or Company Name
    const exists = db.leads.some(l => l.id === lead.id || l.companyName === lead.companyName);
    if (!exists) {
      db.leads.unshift(lead); 
      addedLeads.push(lead); // Add to our report list
    }
  });

  if (addedLeads.length > 0) {
      saveDb(db);
  }

  return addedLeads; // Return the array so we can send alerts
}

// 5. ADD TAG
export function addTag(tag: string) {
  const db = getDb();
  const cleanTag = tag.trim().replace('#', '');

  if (!db.monitoredTags) db.monitoredTags = [];

  if (cleanTag && !db.monitoredTags.includes(cleanTag)) {
    db.monitoredTags.push(cleanTag);
    saveDb(db);
  }
}

// 6. REMOVE TAG
export function removeTag(tag: string) {
  const db = getDb();
  if (!db.monitoredTags) db.monitoredTags = [];

  db.monitoredTags = db.monitoredTags.filter(t => t !== tag);
  saveDb(db);
}