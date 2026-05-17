import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import axios from 'axios';
import { db } from '../db/db';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import { ChevronLeft, MapPin, User, Calendar, Edit, X, CheckCircle2, Clock, RefreshCw } from 'lucide-react';

export default function AssessmentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const [isFetchingServer, setIsFetchingServer] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [serverAssessment, setServerAssessment] = useState<any>(undefined);

  const assessment = useLiveQuery(
    () => db.assessments.where('siteId').equals(id || '').first(),
    [id]
  );

  useEffect(() => {
    // Try to fetch freshest data from server when component mounts, if online
    if (navigator.onLine && id) {
      fetchFromServer();
    }
    const timer = setTimeout(() => {
      setInitialLoad(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [id]);

  const fetchFromServer = async () => {
    if (!id || !navigator.onLine) return;
    try {
      setIsFetchingServer(true);
      const res = await axios.get(`/api/assessments/${id}`);
      const item = res.data;
      console.log(res, "fetching from server")
      const serverSiteId = String(item.id || item.siteId);
      const existing = await db.assessments.where('siteId').equals(serverSiteId).first();
      
      // If the local record is unsynced (pending upload), don't overwrite it with server data
      if (existing && !existing.synced) {
        return;
      }
      
      const localFormat = {
        ...(existing ? { id: existing.id } : {}),
        siteId: serverSiteId,
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
      };
      setServerAssessment(localFormat);
    } catch (error) {
      console.error('Fetch error:', error);
      // If 404 or other error, it just won't be put into DB
    } finally {
      setIsFetchingServer(false);
    }
  };

  const displayAssessment = assessment || serverAssessment;

  if (initialLoad && displayAssessment === undefined) {
    return <div className="p-8 text-center text-gray-500">Loading details...</div>;
  }

  if (displayAssessment === undefined && !isFetchingServer) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Not Found</h2>
        <p className="text-gray-500 mb-6">This assessment could not be found locally or on the server.</p>
        <button onClick={() => navigate('/assessments')} className="text-primary font-medium hover:underline">
          Return to List
        </button>
      </div>
    );
  }

  if (displayAssessment === undefined && isFetchingServer) {
    return <div className="p-8 text-center text-gray-500">Fetching from server...</div>;
  }

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'Good': return 'bg-green-100 text-green-800 border-green-200';
      case 'Moderate': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Bad': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto min-h-screen pb-24 relative">
      {/* Lightbox Overlay */}
      {lightboxImage && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 text-white bg-black/50 p-2 rounded-full hover:bg-gray-800 transition-colors"
          >
            <X size={24} />
          </button>
          <img src={lightboxImage} alt="Farm Full View" className="max-w-full max-h-full object-contain rounded-lg" />
        </div>
      )}

      {/* Header Navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate('/assessments')}
          className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ChevronLeft size={24} className="-ml-1" />
          <span className="font-medium">Back</span>
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchFromServer}
            disabled={isFetchingServer || !navigator.onLine}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors border ${isFetchingServer || !navigator.onLine
                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                : 'text-blue-600 bg-blue-50 hover:bg-blue-100 border-blue-200'
              }`}
            title="Refresh from server"
          >
            <RefreshCw size={16} className={isFetchingServer ? 'animate-spin' : ''} />
            Refresh
          </button>
          <Link
            to={`/new?edit=${displayAssessment!.siteId}`}
            className="flex items-center gap-1.5 text-primary bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-lg font-medium transition-colors border border-orange-200"
          >
            <Edit size={16} />
            Edit
          </Link>
        </div>
      </div>

      <div className="space-y-6">
        {/* Sync Status Banner */}
        {displayAssessment.synced ? (
          <div className="bg-green-50 border border-green-200 p-4 rounded-xl flex items-center gap-3 text-green-800 shadow-sm">
            <CheckCircle2 size={24} className="text-green-600 shrink-0" />
            <div>
              <p className="font-bold text-sm">Successfully Synced</p>
              {displayAssessment.syncedAt && (
                <p className="text-xs text-green-600/80 mt-0.5">
                  Last synced: {new Date(displayAssessment.syncedAt).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center gap-3 text-amber-800 shadow-sm">
            <Clock size={24} className="text-amber-600 shrink-0" />
            <div>
              <p className="font-bold text-sm">Pending Synchronization</p>
              <p className="text-xs text-amber-600/80 mt-0.5">Will sync when internet connection is available.</p>
            </div>
          </div>
        )}

        {/* Map Header */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
          <div className="h-48 w-full z-0 relative bg-gray-100">
            <MapContainer
              center={[displayAssessment.latitude, displayAssessment.longitude]}
              zoom={15}
              zoomControl={false}
              dragging={false}
              scrollWheelZoom={false}
              doubleClickZoom={false}
              touchZoom={false}
              style={{ height: '100%', width: '100%', zIndex: 0 }}
            >
              <TileLayer
                attribution='&copy; OpenStreetMap'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker position={[displayAssessment.latitude, displayAssessment.longitude]} />
            </MapContainer>
          </div>

          <div className="p-5 space-y-4">
            <div className="flex items-start gap-3">
              <MapPin className="text-gray-400 mt-1 shrink-0" size={20} />
              <div>
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Address & Location</p>
                <p className="text-gray-900 font-medium leading-tight">{displayAssessment.address}</p>
                <p className="text-xs text-gray-500 mt-1 font-mono">
                  {displayAssessment.latitude.toFixed(6)}, {displayAssessment.longitude.toFixed(6)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Details */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-5">
          <div className="flex justify-between items-center pb-5 border-b border-gray-100">
            <div>
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Condition</p>
              <span className={`px-3 py-1.5 rounded-full text-sm font-bold border ${getConditionColor(displayAssessment.condition)}`}>
                {displayAssessment.condition}
              </span>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Chickens</p>
              <p className="text-xl font-bold text-gray-900">{displayAssessment.totalChickens}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <User className="text-gray-400 shrink-0" size={20} />
            <div>
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-0.5">Assessor</p>
              <p className="text-gray-900 font-medium">{displayAssessment.assessorName}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Calendar className="text-gray-400 shrink-0" size={20} />
            <div>
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-0.5">Date Assessed</p>
              <p className="text-gray-900 font-medium">{new Date(displayAssessment.timestamp).toLocaleString()}</p>
            </div>
          </div>

          {displayAssessment.notes && (
            <div className="pt-4 border-t border-gray-100">
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Notes</p>
              <p className="text-gray-700 bg-gray-50 p-4 rounded-xl border border-gray-100 text-sm leading-relaxed whitespace-pre-wrap">
                {displayAssessment.notes}
              </p>
            </div>
          )}
        </div>

        {/* Photos */}
        {displayAssessment.photos && displayAssessment.photos.length > 0 && (
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-3 px-1">Photos ({displayAssessment.photos.length})</h3>
            <div className="grid grid-cols-2 gap-3">
              {displayAssessment.photos.map((photo: string, idx: number) => (
                <div
                  key={idx}
                  onClick={() => setLightboxImage(photo)}
                  className="relative rounded-xl overflow-hidden aspect-square border border-gray-200 shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                >
                  <img src={photo} alt={`Farm Photo ${idx + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
