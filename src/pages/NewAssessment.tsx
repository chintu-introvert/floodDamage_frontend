import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import axios from 'axios';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { db } from '../db/db';
import type { Assessment } from '../db/db';
import { useAuth } from '../context/AuthContext';
import { 
  MapPin, Loader2, Camera, X, ChevronLeft, ChevronRight, CheckCircle 
} from 'lucide-react';

// Fix Leaflet's default icon path issues
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const TOTAL_STEPS = 4;

export default function NewAssessment() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const [step, setStep] = useState(1);
  const [toast, setToast] = useState<{show: boolean; message: string}>({ show: false, message: '' });

  // Form State
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [address, setAddress] = useState('');
  const [condition, setCondition] = useState<'Good' | 'Moderate' | 'Bad' | null>(null);
  const [totalChickens, setTotalChickens] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const isEditing = !!editId;

  // Load existing assessment if editing
  const existingAssessment = useLiveQuery(
    () => editId ? db.assessments.where('siteId').equals(editId).first() : undefined,
    [editId]
  );

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      if (!editId) return;

      // Check if it exists in local Dexie first to prioritize local pending/edited changes
      const local = await db.assessments.where('siteId').equals(editId).first();
      
      if (!active) return;

      if (local) {
        setLatitude(local.latitude);
        setLongitude(local.longitude);
        setAddress(local.address);
        setCondition(local.condition);
        setTotalChickens(local.totalChickens.toString());
        setNotes(local.notes || '');
        setPhotos(local.photos || []);
      } else if (navigator.onLine) {
        // If not found locally, only then fetch from the server
        try {
          const res = await axios.get(`/api/assessments/${editId}`);
          if (!active) return;
          const item = res.data;
          setLatitude(parseFloat(item.latitude));
          setLongitude(parseFloat(item.longitude));
          setAddress(item.address || '');
          setCondition(item.condition || item.cond);
          
          const tc = item.total_chickens !== undefined ? item.total_chickens : item.totalChickens;
          setTotalChickens(tc !== undefined && tc !== null ? String(tc) : '');
          
          setNotes(item.notes || '');
          setPhotos(Array.isArray(item.photos) ? item.photos : []);
        } catch (err) {
          console.error("Failed to fetch assessment for edit:", err);
        }
      }
    };

    loadData();

    return () => {
      active = false;
    };
  }, [editId]);

  // Step 1: Location
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState('');

  const getLocation = () => {
    setIsLocating(true);
    setLocationError('');
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude);
          setLongitude(position.coords.longitude);
          setIsLocating(false);
        },
        () => {
          setLocationError('Failed to get location. Please enable GPS.');
          setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setLocationError('Geolocation is not supported by your browser.');
      setIsLocating(false);
    }
  };

  // Step 3: Photos
  const fileInputRef = useRef<HTMLInputElement>(null);

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          let width = img.width;
          let height = img.height;
 
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.7));
          } else {
            reject(new Error('Canvas context null'));
          }
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    if (photos.length + files.length > 10) {
      alert('Maximum 10 photos allowed.');
      return;
    }

    const newPhotos: string[] = [];
    for (let i = 0; i < files.length; i++) {
      try {
        const base64 = await compressImage(files[i]);
        newPhotos.push(base64);
      } catch (err) {
        console.error('Failed to compress image', err);
      }
    }
    setPhotos([...photos, ...newPhotos]);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  // Validation
  const validateStep = () => {
    if (step === 1) {
      if (latitude === null || longitude === null) return 'Please get your GPS location.';
      if (!address.trim()) return 'Please enter the address.';
    }
    if (step === 2) {
      if (!condition) return 'Please select a farm condition.';
      if (!totalChickens || isNaN(Number(totalChickens)) || Number(totalChickens) < 0) return 'Please enter a valid total number of chickens.';
    }
    return null;
  };

  const handleNext = () => {
    const error = validateStep();
    if (error) {
      alert(error);
      return;
    }
    setStep(s => Math.min(s + 1, TOTAL_STEPS));
  };

  const handleBack = () => {
    setStep(s => Math.max(s - 1, 1));
  };

  // Save
  const handleSave = async () => {
    const error = validateStep(); // Validate final step just in case
    if (error) {
      alert(error);
      return;
    }

    try {
      const siteId = editId || crypto.randomUUID();
      const assessment: Assessment = {
        siteId,
        latitude: latitude as number,
        longitude: longitude as number,
        address,
        condition: condition as 'Good' | 'Moderate' | 'Bad',
        totalChickens: Number(totalChickens),
        photos,
        notes,
        timestamp: new Date(),
        synced: false,
        syncedAt: null,
        userId: user?.id || 'guest',
      };

      if (editId) {
        if (existingAssessment) {
          assessment.id = existingAssessment.id;
        } else {
          const parsedId = parseInt(editId);
          if (!isNaN(parsedId)) {
            assessment.id = parsedId;
          }
        }
      }
      await db.assessments.put(assessment);
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
      
      setToast({ show: true, message: 'Saved offline. Will sync when connected.' });
      setTimeout(() => {
        navigate('/assessments');
      }, 2000);
    } catch (err) {
      console.error('Failed to save assessment', err);
      alert('Failed to save assessment. Please try again.');
    }
  };

  // Step Renders
  const renderStep1 = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">Location Details</h2>
      
      <div className="space-y-4">
        <button
          onClick={getLocation}
          disabled={isLocating}
          className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-orange-700 text-white p-4 rounded-xl font-medium transition-colors"
        >
          {isLocating ? <Loader2 className="animate-spin" size={20} /> : <MapPin size={20} />}
          {isLocating ? 'Acquiring GPS...' : 'Get My GPS Location'}
        </button>
        
        {locationError && <p className="text-red-500 text-sm">{locationError}</p>}

        {latitude !== null && longitude !== null && (
          <div className="h-48 w-full rounded-xl overflow-hidden border border-gray-200 z-0 relative">
            <MapContainer 
              center={[latitude, longitude]} 
              zoom={15} 
              scrollWheelZoom={false}
              style={{ height: '100%', width: '100%', zIndex: 0 }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker position={[latitude, longitude]} />
            </MapContainer>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Latitude</label>
            <input
              type="text"
              inputMode="decimal"
              value={latitude === null ? '' : latitude}
              onChange={(e) => setLatitude(e.target.value === '' ? null : parseFloat(e.target.value) || 0)}
              placeholder="e.g., 35.84"
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Longitude</label>
            <input
              type="text"
              inputMode="decimal"
              value={longitude === null ? '' : longitude}
              onChange={(e) => setLongitude(e.target.value === '' ? null : parseFloat(e.target.value) || 0)}
              placeholder="e.g., -82.72"
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Address</label>
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter or paste farm address..."
            className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none min-h-[80px]"
          />
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">Farm Condition</h2>

      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">Overall Condition</label>
        <div className="grid grid-cols-1 gap-3">
          <button
            onClick={() => setCondition('Good')}
            className={`p-4 rounded-xl border-2 flex items-center justify-between transition-colors ${
              condition === 'Good' 
                ? 'border-green-500 bg-green-50 text-green-700' 
                : 'border-gray-200 bg-white text-gray-700 hover:border-green-200'
            }`}
          >
            <span className="font-semibold text-lg">Good</span>
            {condition === 'Good' && <CheckCircle size={20} className="text-green-500" />}
          </button>
          
          <button
            onClick={() => setCondition('Moderate')}
            className={`p-4 rounded-xl border-2 flex items-center justify-between transition-colors ${
              condition === 'Moderate' 
                ? 'border-amber-500 bg-amber-50 text-amber-700' 
                : 'border-gray-200 bg-white text-gray-700 hover:border-amber-200'
            }`}
          >
            <span className="font-semibold text-lg">Moderate</span>
            {condition === 'Moderate' && <CheckCircle size={20} className="text-amber-500" />}
          </button>
          
          <button
            onClick={() => setCondition('Bad')}
            className={`p-4 rounded-xl border-2 flex items-center justify-between transition-colors ${
              condition === 'Bad' 
                ? 'border-red-500 bg-red-50 text-red-700' 
                : 'border-gray-200 bg-white text-gray-700 hover:border-red-200'
            }`}
          >
            <span className="font-semibold text-lg">Bad</span>
            {condition === 'Bad' && <CheckCircle size={20} className="text-red-500" />}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Total Number of Chickens</label>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={totalChickens}
          onChange={(e) => {
            const val = e.target.value;
            // Only allow digits to prevent letters, decimals, and negative signs
            if (val === '' || /^\d+$/.test(val)) {
              setTotalChickens(val);
            }
          }}
          placeholder="e.g., 500"
          className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Notes (Optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any additional observations..."
          className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none min-h-[100px]"
        />
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-end mb-4">
        <h2 className="text-xl font-bold text-gray-900">Photos</h2>
        <span className="text-sm text-gray-500">{photos.length}/10</span>
      </div>

      {photos.length < 10 && (
        <>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            ref={fileInputRef}
            onChange={handlePhotoUpload}
            className="hidden"
            multiple
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex flex-col items-center justify-center gap-2 border-2 border-dashed border-primary bg-orange-50 text-primary p-8 rounded-xl hover:bg-orange-100 transition-colors"
          >
            <Camera size={32} />
            <span className="font-medium">Take Photo / Upload</span>
          </button>
        </>
      )}

      {photos.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mt-6">
          {photos.map((photo, idx) => (
            <div key={idx} className="relative rounded-xl overflow-hidden aspect-square border border-gray-200">
              <img src={photo} alt={`Farm ${idx + 1}`} className="w-full h-full object-cover" />
              <button
                onClick={() => removePhoto(idx)}
                className="absolute top-2 right-2 bg-black/60 text-white p-1.5 rounded-full hover:bg-red-500 transition-colors backdrop-blur-sm"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">Review & Save</h2>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Location</h3>
          <p className="text-gray-900 font-medium">{address}</p>
          <p className="text-sm text-gray-500">{latitude?.toFixed(5)}, {longitude?.toFixed(5)}</p>
        </div>

        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Condition</h3>
            <p className="text-gray-900 font-medium">{condition}</p>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Chickens</h3>
            <p className="text-gray-900 font-medium">{totalChickens}</p>
          </div>
        </div>

        {notes && (
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Notes</h3>
            <p className="text-gray-900 text-sm">{notes}</p>
          </div>
        )}

        <div className="p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Photos</h3>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {photos.length === 0 ? (
              <p className="text-sm text-gray-500">No photos added</p>
            ) : (
              photos.map((p, i) => (
                <img key={i} src={p} alt="" className="h-16 w-16 object-cover rounded-lg border border-gray-200 shrink-0" />
              ))
            )}
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-orange-700 text-white p-4 rounded-xl font-bold text-lg transition-colors shadow-md"
      >
        <CheckCircle size={24} />
        Save Assessment
      </button>
    </div>
  );

  return (
    <div className="p-4 max-w-md mx-auto min-h-screen pb-24 relative">
      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed top-4 left-4 right-4 z-50 bg-green-600 text-white p-4 rounded-xl shadow-lg flex items-center justify-center font-medium animate-in fade-in slide-in-from-top-5">
          {toast.message}
        </div>
      )}

      {/* Header & Step Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">{isEditing ? 'Edit Assessment' : 'New Assessment'}</h1>
          <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm font-semibold">
            Step {step} of {TOTAL_STEPS}
          </span>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
          <div 
            className="bg-primary h-full transition-all duration-300 ease-out"
            style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
          />
        </div>
      </div>

      {/* Form Content */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-8">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
      </div>

      {/* Navigation Buttons */}
      <div className="flex gap-3 mt-auto">
        {step > 1 && (
          <button
            onClick={handleBack}
            className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium flex items-center justify-center gap-1 transition-colors"
          >
            <ChevronLeft size={20} />
            Back
          </button>
        )}
        
        {step < TOTAL_STEPS && (
          <button
            onClick={handleNext}
            className="flex-1 py-3 px-4 bg-gray-900 hover:bg-black text-white rounded-xl font-medium flex items-center justify-center gap-1 transition-colors ml-auto"
          >
            Next
            <ChevronRight size={20} />
          </button>
        )}
      </div>
    </div>
  );
}
