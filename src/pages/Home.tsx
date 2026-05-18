import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import { db } from '../db/db';

const getIcon = (condition: string) => {
  let color = '#22c55e'; // default green for Good
  if (condition === 'Moderate') color = '#f97316';
  if (condition === 'Bad') color = '#ef4444';
  
  const markerHtmlStyles = `
    background-color: ${color};
    width: 16px;
    height: 16px;
    display: block;
    left: -8px;
    top: -8px;
    position: relative;
    border-radius: 50%;
    border: 2px solid #FFFFFF;
    box-shadow: 0 2px 4px rgba(0,0,0,0.4);
  `;
  
  return L.divIcon({
    className: "custom-pin",
    iconAnchor: [0, 0],
    popupAnchor: [0, -10],
    html: `<span style="${markerHtmlStyles}" />`
  });
};

export default function Home() {
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

  // Fetch only pending assessments from local DB
  const localPending = useLiveQuery(() => db.assessments.filter(a => !a.synced).toArray()) || [];
  
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
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col">
            <span className="text-xs text-gray-500 uppercase font-semibold">Total Assessments</span>
            <span className="text-2xl font-bold text-gray-900 mt-1">{totalAssessments}</span>
          </div>
          <div className="bg-orange-50 p-4 rounded-xl shadow-sm border border-orange-100 flex flex-col relative">
            <span className="text-xs text-orange-600 uppercase font-semibold">Pending Sync</span>
            <span className="text-2xl font-bold text-orange-700 mt-1">{pendingSyncCount}</span>
            {pendingSyncCount > 0 && (
              <div className="absolute top-3 right-3 w-2.5 h-2.5 bg-orange-500 rounded-full animate-pulse"></div>
            )}
          </div>
          
          <div className="col-span-2 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <span className="text-xs text-gray-500 uppercase font-semibold block mb-3">Condition Breakdown</span>
            <div className="flex gap-2">
              <div className="flex-1 bg-green-50 text-green-700 py-2 rounded-lg text-center font-medium border border-green-100">
                <span className="block text-xl font-bold">{conditionCounts.Good || 0}</span>
                <span className="text-[10px] uppercase">Good</span>
              </div>
              <div className="flex-1 bg-orange-50 text-orange-700 py-2 rounded-lg text-center font-medium border border-orange-100">
                <span className="block text-xl font-bold">{conditionCounts.Moderate || 0}</span>
                <span className="text-[10px] uppercase">Mod</span>
              </div>
              <div className="flex-1 bg-red-50 text-red-700 py-2 rounded-lg text-center font-medium border border-red-100">
                <span className="block text-xl font-bold">{conditionCounts.Bad || 0}</span>
                <span className="text-[10px] uppercase">Bad</span>
              </div>
            </div>
          </div>

          <div className="col-span-2 bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
            <span className="text-sm text-gray-600 font-semibold">Total Chickens Counted</span>
            <span className="text-2xl font-bold text-gray-900">{totalChickensCount.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 relative w-full border-t border-gray-200" style={{ minHeight: '350px' }}>
        <MapContainer 
          center={[35.84, -82.72]} 
          zoom={11} 
          style={{ height: '100%', width: '100%', zIndex: 0 }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {allAssessments.map(assessment => {
            const siteId = assessment.siteId || assessment.id;
            const cond = assessment.condition || assessment.cond;
            return (
              <Marker 
                key={siteId} 
                position={[assessment.latitude, assessment.longitude]}
                icon={getIcon(cond)}
              >
                <Popup>
                  <div className="p-0.5 min-w-[140px]">
                    <h3 className="font-bold text-gray-900 mb-1 text-sm">Assessment</h3>
                    <p className="text-xs text-gray-600 mb-2 truncate max-w-[180px]">{assessment.address || 'No address'}</p>
                    <div className="flex items-center gap-2 mb-3 text-xs">
                      <span className={`px-1.5 py-0.5 rounded font-semibold ${
                        cond === 'Good' ? 'bg-green-100 text-green-800' :
                        cond === 'Moderate' ? 'bg-orange-100 text-orange-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {cond}
                      </span>
                      <span className="text-gray-300">•</span>
                      <span className="text-gray-700 font-medium">
                        {(assessment.totalChickens || assessment.total_chickens)} chickens
                      </span>
                    </div>
                    <Link to={`/assessments/${siteId}`} className="text-primary text-xs font-medium hover:underline block text-right">
                      View Details &rarr;
                    </Link>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
        
        <Link 
          to="/new" 
          className="absolute bottom-6 right-4 z-[400] bg-primary text-white rounded-full p-4 shadow-lg hover:bg-orange-700 active:scale-95 transition-all flex items-center justify-center"
        >
          <Plus size={28} />
        </Link>
      </div>
    </div>
  );
}
