import { useState, useEffect, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import axios from 'axios';
import { db, type Assessment } from '../db/db';
import { useAuth } from '../context/AuthContext';
import { Wifi, WifiOff, RefreshCw, CheckCircle2, XCircle, Clock } from 'lucide-react';

export interface BackendSyncRecord {
  id: number;
  timestamp: string;
  successful: number;
  failed: number;
  total: number;
  userId: string;
}

export default function Sync() {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncTotal, setSyncTotal] = useState(0);
  const [syncResult, setSyncResult] = useState<{ success: number, failed: number } | null>(null);

  // REST API Sync History state
  const [syncHistory, setSyncHistory] = useState<BackendSyncRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const timeSince = (dateString: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch assessments awaiting sync locally from Dexie belonging to the logged-in user
  const unsyncedAssessments = useLiveQuery(
    () => {
      if (!user?.id) return Promise.resolve([] as Assessment[]);
      return db.assessments
        .filter(a => !a.synced && a.userId === user.id)
        .toArray();
    },
    [user?.id]
  );

  // Fetch sync history list from backend database
  const fetchSyncHistory = useCallback(async () => {
    if (!user) return;
    try {
      setLoadingHistory(true);
      const res = await axios.get('/api/sync-history');
      if (res.data && res.data.data) {
        setSyncHistory(res.data.data);
      }
    } catch (error) {
      console.error('Failed to retrieve sync history from backend database:', error);
    } finally {
      setLoadingHistory(false);
    }
  }, [user]);

  // Load sync history on mount
  useEffect(() => {
    fetchSyncHistory();
  }, [fetchSyncHistory]);

  const handleSync = async () => {
    if (!isOnline || !unsyncedAssessments || unsyncedAssessments.length === 0) return;

    setSyncing(true);
    setSyncResult(null);
    setSyncTotal(unsyncedAssessments.length);
    setSyncProgress(0);

    let successCount = 0;
    let failedCount = 0;

    for (const assessment of unsyncedAssessments) {
      try {
        // Send the assessment data to the backend
        await axios.post('/api/assessments', assessment, {
          timeout: 5000 // 5 seconds timeout
        });

        // If successful, update local DB
        await db.assessments.update(assessment.id!, {
          synced: true,
          syncedAt: new Date()
        });
        successCount++;
      } catch (error) {
        console.error('Failed to sync assessment:', assessment.siteId, error);
        failedCount++;
      } finally {
        setSyncProgress(prev => prev + 1);
      }
    }

    try {
      // Record history directly in the MySQL backend database
      await axios.post('/api/sync-history', {
        successful: successCount,
        failed: failedCount,
        total: unsyncedAssessments.length
      });
      
      // Refresh list from the backend database immediately
      await fetchSyncHistory();
    } catch (err) {
      console.error('Failed to save sync log to backend database:', err);
    }

    setSyncResult({ success: successCount, failed: failedCount });
    setSyncing(false);
  };



  return (
    <div className="p-4 max-w-md mx-auto min-h-screen pb-24">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Sync Status</h1>
        {syncHistory && syncHistory.length > 0 && (
          <p className="text-sm text-gray-500 font-medium">Last synced: {timeSince(syncHistory[0].timestamp)}</p>
        )}
      </div>

      {/* Network Status Banner */}
      {!isOnline && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-center gap-3 text-red-800 shadow-sm mb-6 animate-in fade-in slide-in-from-top-4">
          <WifiOff size={24} className="text-red-600 shrink-0" />
          <p className="font-medium text-sm">You are offline — connect to WiFi to sync</p>
        </div>
      )}

      {/* Sync Control Card */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Pending Sync</h2>
            <p className="text-gray-500 text-sm mt-0.5">
              {unsyncedAssessments === undefined ? 'Loading...' : `${unsyncedAssessments.length} items waiting`}
            </p>
          </div>
          <div className={`p-3 rounded-full ${isOnline ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
            <Wifi size={24} />
          </div>
        </div>

        {syncing ? (
          <div className="space-y-3">
            <div className="flex justify-between text-sm font-medium text-gray-700 mb-1">
              <span>Syncing {syncProgress} / {syncTotal}...</span>
              <span>{Math.round((syncProgress / syncTotal) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
              <div
                className="bg-primary h-full transition-all duration-300 ease-out"
                style={{ width: `${(syncProgress / syncTotal) * 100}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <button
              onClick={handleSync}
              disabled={!isOnline || unsyncedAssessments?.length === 0}
              className={`w-full flex items-center justify-center gap-2 p-4 rounded-xl font-bold text-lg transition-colors shadow-sm ${isOnline && unsyncedAssessments?.length && unsyncedAssessments.length > 0
                ? 'bg-primary hover:bg-orange-700 text-white cursor-pointer'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
            >
              <RefreshCw size={20} className={syncing ? 'animate-spin' : ''} />
              {isOnline ? 'Sync Now' : 'Offline'}
            </button>

            {/* Sync Result Summary */}
            {syncResult && (
              <div className={`p-4 rounded-xl border text-sm font-medium ${syncResult.failed > 0 ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-green-50 border-green-200 text-green-800'
                }`}>
                {syncResult.success} synced successfully, {syncResult.failed} failed.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sync History */}
      <div className="mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4 px-1">Recent Sync History (Database)</h2>

        {loadingHistory ? (
          <div className="text-gray-500 text-sm px-1 animate-pulse">Loading history...</div>
        ) : syncHistory.length === 0 ? (
          <div className="bg-white p-6 rounded-xl border border-gray-100 text-center text-gray-500 shadow-sm">
            No previous sync records found in the database.
          </div>
        ) : (
          <div className="space-y-3">
            {syncHistory.map((record) => (
              <div key={record.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Clock size={18} className="text-gray-400" />
                  <div>
                    <p className="text-gray-900 font-medium text-sm">
                      {new Date(record.timestamp).toLocaleDateString()} at {new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <div className="flex gap-3 mt-1">
                      <span className="text-xs font-semibold text-green-600 flex items-center gap-1">
                        <CheckCircle2 size={12} /> {record.successful}
                      </span>
                      {record.failed > 0 && (
                        <span className="text-xs font-semibold text-red-600 flex items-center gap-1">
                          <XCircle size={12} /> {record.failed}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <span className="text-xs font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-md">
                  Total: {record.total}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>


    </div>
  );
}
