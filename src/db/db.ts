import Dexie, { type EntityTable } from 'dexie';

export interface Assessment {
  id?: number;
  siteId: string;
  latitude: number;
  longitude: number;
  address: string;
  condition: 'Good' | 'Moderate' | 'Bad';
  totalChickens: number;
  photos: string[];
  notes?: string;
  timestamp: Date;
  synced: boolean;
  syncedAt: Date | null;
  userId?: string; // Track who created this offline assessment
}

const db = new Dexie('FloodDB') as Dexie & {
  assessments: EntityTable<Assessment, 'id'>;
};

db.version(1).stores({
  assessments: '++id, siteId, synced, timestamp'
});

db.version(2).stores({
  assessments: '++id, siteId, synced, timestamp',
  syncHistory: '++id, timestamp'
});

db.version(3).stores({
  assessments: '++id, siteId, synced, timestamp',
  syncHistory: '++id, timestamp, userId'
});

db.version(4).stores({
  assessments: '++id, siteId, synced, timestamp, userId',
  syncHistory: '++id, timestamp, userId'
});

db.version(5).stores({
  assessments: '++id, siteId, synced, timestamp, userId',
  syncHistory: null
});

export { db };
