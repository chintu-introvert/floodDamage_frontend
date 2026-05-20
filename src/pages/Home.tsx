import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import axios from 'axios';
import { db, type Assessment } from '../db/db';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const { user } = useAuth();
  const [serverData, setServerData] = useState<{ assessments: any[], totalChickens: number }>({
    assessments: [],
    totalChickens: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        if (navigator.onLine) {
          const res = await axios.get('/api/assessments');
          setServerData(res.data);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  // Fetch only pending assessments from local DB belonging to the logged-in user
  const localPending = useLiveQuery(
    () => {
      if (!user?.id) return Promise.resolve([] as Assessment[]);
      return db.assessments
        .filter(a => !a.synced && a.userId === user.id)
        .toArray();
    },
    [user?.id]
  ) || [];
  
  // Combine only unique pending and server data, deduplicating by siteId
  const pendingSiteIds = new Set(localPending.map(a => String(a.siteId)));
  const uniqueServerAssessments = serverData.assessments
    .map(a => ({ ...a, synced: true, siteId: String(a.id || a.siteId) }))
    .filter(a => !pendingSiteIds.has(a.siteId));

  const allAssessments = [
    ...uniqueServerAssessments,
    ...localPending
  ];

  // Combine for metrics
  const totalAssessments = allAssessments.length;
  const pendingSyncCount = localPending.length;

  const conditionCounts = allAssessments.reduce((acc, curr) => {
    const cond = curr.condition || curr.cond;
    if (cond) {
      acc[cond] = (acc[cond] || 0) + 1;
    }
    return acc;
  }, { Good: 0, Moderate: 0, Bad: 0 } as Record<string, number>);

  const totalChickensCount = allAssessments.reduce((acc, curr) => 
    acc + (Number(curr.totalChickens || curr.total_chickens) || 0), 0
  );

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <header className="px-4 pt-4 pb-2">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      </header>

      <div className="px-4 pb-4">
        {/* Core Stats Overview */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col">
            <span className="text-xs text-gray-500 uppercase font-semibold">Total Assessments</span>
            {isLoading ? (
              <span className="text-lg font-bold text-gray-400 mt-1 animate-pulse">Calculating...</span>
            ) : (
              <span className="text-2xl font-bold text-gray-900 mt-1">{totalAssessments}</span>
            )}
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col relative overflow-hidden">
            <span className="text-xs text-gray-500 uppercase font-semibold">Pending Sync</span>
            <span className="text-2xl font-bold text-gray-900 mt-1">{pendingSyncCount}</span>
            {pendingSyncCount > 0 && (
              <div className="absolute right-[-10px] top-[-10px] w-8 h-8 bg-orange-500 rounded-full animate-ping opacity-10 pointer-events-none"></div>
            )}
          </div>
        </div>

        {/* Condition Metrics Grid */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm mt-4">
          <h2 className="text-xs text-gray-500 uppercase font-semibold mb-3">Condition Status</h2>
          <div className="grid grid-cols-3 gap-2.5">
            <div className="bg-green-50/50 p-3 rounded-xl border border-green-100/50 flex flex-col text-center">
              <span className="text-[10px] text-green-700 uppercase font-bold tracking-wider">Good</span>
              <span className="text-xl font-bold text-green-600 mt-1">{conditionCounts.Good}</span>
            </div>
            <div className="bg-orange-50/50 p-3 rounded-xl border border-orange-100/50 flex flex-col text-center">
              <span className="text-[10px] text-orange-700 uppercase font-bold tracking-wider">Moderate</span>
              <span className="text-xl font-bold text-orange-500 mt-1">{conditionCounts.Moderate}</span>
            </div>
            <div className="bg-red-50/50 p-3 rounded-xl border border-red-100/50 flex flex-col text-center">
              <span className="text-[10px] text-red-700 uppercase font-bold tracking-wider">Bad</span>
              <span className="text-xl font-bold text-red-600 mt-1">{conditionCounts.Bad}</span>
            </div>
          </div>
        </div>

        {/* Aggregate Stats and Action */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm mt-4 flex items-center justify-between">
          <div>
            <h3 className="text-xs text-gray-500 uppercase font-semibold">Total Chickens Counted</h3>
            {isLoading ? (
              <span className="text-lg font-bold text-gray-400 mt-1 block animate-pulse">Summing...</span>
            ) : (
              <span className="text-2xl font-black text-gray-900 mt-1 block">
                {totalChickensCount.toLocaleString()}
              </span>
            )}
          </div>
          <Link
            to="/new"
            className="flex items-center gap-1 bg-primary hover:bg-orange-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-md transition-colors text-sm"
          >
            <Plus size={16} />
            Add New
          </Link>
        </div>
      </div>
    </div>
  );
}
