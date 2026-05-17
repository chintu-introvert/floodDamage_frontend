import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import axios from 'axios';
import { db } from '../db/db';
import { Search, MapPin, Calendar, CheckCircle2, Clock, CloudDownload } from 'lucide-react';

export default function AllAssessments() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isFetchingServer, setIsFetchingServer] = useState(false);
  const [serverData, setServerData] = useState<any[]>([]);

  useEffect(() => {
    if (navigator.onLine) {
      fetchFromServer();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchFromServer = async () => {
    try {
      setIsFetchingServer(true);
      const res = await axios.get('/api/assessments');
      console.log(res, 'response');
      const fetchedItems = res.data.assessments;

      // We no longer store synced records in Dexie, so let's clean up any lingering ones
      const allRecords = await db.assessments.toArray();
      const syncedIds = allRecords.filter(a => a.synced).map(a => a.id as number);
      if (syncedIds.length > 0) {
        await db.assessments.bulkDelete(syncedIds);
      }

      const formattedServerData = fetchedItems.map((item: any) => ({
        siteId: String(item.id || item.siteId),
        latitude: parseFloat(item.latitude),
        longitude: parseFloat(item.longitude),
        address: item.address || '',
        condition: item.condition || item.cond,
        totalChickens: parseInt(item.total_chickens || item.totalChickens),
        photos: Array.isArray(item.photos) ? item.photos : [],
        notes: item.notes || '',
        assessorName: item.assessor_name || item.assessorName,
        timestamp: item.created_at || item.timestamp,
        synced: true,
        syncedAt: item.synced_at || new Date().toISOString(),
      }));

      setServerData(formattedServerData);
    } catch (error) {
      console.error('Fetch error:', error);
      alert('Failed to fetch from server.');
    } finally {
      setIsFetchingServer(false);
    }
  };

  // Fetch only pending assessments from local DB
  const localAssessments = useLiveQuery(() => db.assessments.filter(a => !a.synced).reverse().toArray());

  // Combine local (pending) and server (synced) data
  const assessments = [...(localAssessments || []), ...serverData].sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Filter based on search term
  const filteredAssessments = assessments?.filter(assessment => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (assessment.address && assessment.address.toLowerCase().includes(searchLower)) ||
      assessment.condition.toLowerCase().includes(searchLower)
    );
  }) || [];

  // Calculate stats
  const totalCount = assessments?.length || 0;
  const pendingCount = assessments?.filter(a => !a.synced).length || 0;

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'Good': return 'bg-green-100 text-green-800 border-green-200';
      case 'Moderate': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Bad': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto min-h-screen pb-24">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Assessments</h1>
          <p className="text-sm text-gray-500 font-medium">
            {totalCount} total ({pendingCount} pending sync)
          </p>
        </div>
        <button
          onClick={fetchFromServer}
          disabled={isFetchingServer || !navigator.onLine}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors text-sm ${isFetchingServer || !navigator.onLine
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200'
            }`}
          title="Pull latest data from server"
        >
          <CloudDownload size={16} className={isFetchingServer ? 'animate-bounce' : ''} />
          {isFetchingServer ? 'Pulling...' : 'Pull'}
        </button>
      </div>

      <div className="relative mb-6">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search size={18} className="text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search by address or condition..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
        />
      </div>

      <div className="space-y-4">
        {assessments === undefined ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 animate-pulse">
                <div className="flex justify-between items-start mb-3">
                  <div className="h-5 bg-gray-200 rounded w-2/3"></div>
                  <div className="h-6 bg-gray-200 rounded-full w-16"></div>
                </div>
                <div className="flex justify-between mt-4">
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                  <div className="h-4 bg-gray-200 rounded w-32"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredAssessments.length === 0 ? (
          <div className="text-center py-10 text-gray-500 bg-white rounded-xl border border-gray-100 shadow-sm">
            No assessments found.
          </div>
        ) : (
          filteredAssessments.map((assessment) => (
            <Link
              key={assessment.siteId}
              to={`/assessments/${assessment.siteId}`}
              className="block bg-white rounded-xl shadow-sm border border-gray-100 hover:border-primary/50 transition-colors overflow-hidden"
            >
              <div className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1 pr-2">
                    <div className="flex items-start gap-1.5 text-gray-900 font-medium line-clamp-2">
                      <MapPin size={18} className="shrink-0 text-gray-400 mt-0.5" />
                      <span>{assessment.address || `${assessment.latitude.toFixed(5)}, ${assessment.longitude.toFixed(5)}`}</span>
                    </div>
                  </div>
                  <div className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getConditionColor(assessment.condition)} shrink-0`}>
                    {assessment.condition}
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm mt-4">
                  <div className="flex items-center gap-1.5 text-gray-500">
                    <Calendar size={14} />
                    <span>{new Date(assessment.timestamp).toLocaleDateString()}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-gray-600 font-medium text-xs bg-gray-100 px-2 py-1 rounded-md">
                      🐔 {assessment.totalChickens}
                    </span>

                    {assessment.synced ? (
                      <span className="flex items-center gap-1 text-green-600 text-xs font-semibold bg-green-50 px-2 py-1 rounded-md border border-green-100">
                        <CheckCircle2 size={12} />
                        Synced
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-amber-600 text-xs font-semibold bg-amber-50 px-2 py-1 rounded-md border border-amber-100">
                        <Clock size={12} />
                        Pending
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
