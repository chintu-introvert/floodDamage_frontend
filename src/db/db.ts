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
  assessorName: string;
  timestamp: Date;
  synced: boolean;
  syncedAt: Date | null;
}

export interface SyncHistory {
  id?: number;
  timestamp: Date;
  successful: number;
  failed: number;
  total: number;
}

const db = new Dexie('FloodDB') as Dexie & {
  assessments: EntityTable<Assessment, 'id'>;
  syncHistory: EntityTable<SyncHistory, 'id'>;
};

db.version(1).stores({
  assessments: '++id, siteId, synced, timestamp'
});

db.version(2).stores({
  assessments: '++id, siteId, synced, timestamp',
  syncHistory: '++id, timestamp'
});

export { db };
