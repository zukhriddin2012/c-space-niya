'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { MapPin, Save, ArrowLeft, Trash2, Navigation, Circle } from 'lucide-react';
import Link from 'next/link';

interface Branch {
  id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  geofence_radius: number;
}

export default function BranchDetailPage() {
  const router = useRouter();
  const params = useParams();
  const branchId = params.id as string;
  const isNew = branchId === 'new';

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    latitude: '',
    longitude: '',
    geofence_radius: '100',
  });

  useEffect(() => {
    if (!isNew) {
      fetchBranch();
    }
  }, [branchId, isNew]);

  const fetchBranch = async () => {
    try {
      const res = await fetch(`/api/branches/${branchId}`);
      if (!res.ok) throw new Error('Branch not found');
      const data = await res.json();
      const branch: Branch = data.branch;
      setFormData({
        name: branch.name || '',
        address: branch.address || '',
        latitude: branch.latitude?.toString() || '',
        longitude: branch.longitude?.toString() || '',
        geofence_radius: branch.geofence_radius?.toString() || '100',
      });
    } catch (err) {
      setError('Failed to load branch');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const url = isNew ? '/api/branches' : `/api/branches/${branchId}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save branch');
      }

      setSuccess(isNew ? 'Branch created successfully!' : 'Branch updated successfully!');

      if (isNew) {
        setTimeout(() => {
          router.push('/branches');
        }, 1500);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this branch?')) return;

    setSaving(true);
    setError('');

    try {
      const res = await fetch(`/api/branches/${branchId}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete branch');
      }

      router.push('/branches');
    } catch (err: any) {
      setError(err.message);
      setSaving(false);
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({
          ...prev,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
        }));
        setSuccess('Location captured successfully!');
        setTimeout(() => setSuccess(''), 3000);
      },
      (err) => {
        setError('Failed to get current location: ' + err.message);
      },
      { enableHighAccuracy: true }
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/branches"
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            {isNew ? 'Add New Branch' : 'Edit Branch'}
          </h1>
          <p className="text-gray-500 mt-1">
            {isNew ? 'Create a new branch location' : 'Update branch details and geofencing'}
          </p>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          {success}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <MapPin size={20} className="text-purple-600" />
            Branch Information
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Branch Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., C-Space Yunusabad"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address *
              </label>
              <input
                type="text"
                required
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="e.g., Yunusabad district, Tashkent"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Geofencing Settings */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Circle size={20} className="text-purple-600" />
            Geofencing Settings
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Set the GPS coordinates and geofence radius for attendance check-in verification.
          </p>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Latitude
                </label>
                <input
                  type="text"
                  value={formData.latitude}
                  onChange={(e) => setFormData(prev => ({ ...prev, latitude: e.target.value }))}
                  placeholder="e.g., 41.311158"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Longitude
                </label>
                <input
                  type="text"
                  value={formData.longitude}
                  onChange={(e) => setFormData(prev => ({ ...prev, longitude: e.target.value }))}
                  placeholder="e.g., 69.279737"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={getCurrentLocation}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
            >
              <Navigation size={16} />
              Use Current Location
            </button>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Geofence Radius (meters)
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="50"
                  max="500"
                  step="10"
                  value={formData.geofence_radius}
                  onChange={(e) => setFormData(prev => ({ ...prev, geofence_radius: e.target.value }))}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                />
                <div className="w-20 px-3 py-2 text-center border border-gray-300 rounded-lg bg-gray-50">
                  <span className="font-medium text-gray-900">{formData.geofence_radius}m</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Employees must be within this radius to check in at this branch.
              </p>
            </div>

            {/* Map Preview Placeholder */}
            {formData.latitude && formData.longitude && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm font-medium text-gray-700 mb-2">Location Preview</p>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin size={16} className="text-purple-600" />
                  <span>{formData.latitude}, {formData.longitude}</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Geofence: {formData.geofence_radius}m radius from this point
                </p>
                <a
                  href={`https://www.google.com/maps?q=${formData.latitude},${formData.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 mt-2"
                >
                  View on Google Maps →
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          {!isNew && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
            >
              <Trash2 size={18} />
              Delete Branch
            </button>
          )}
          <div className={`flex gap-3 ${isNew ? 'ml-auto' : ''}`}>
            <Link
              href="/branches"
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              <Save size={18} />
              {saving ? 'Saving...' : (isNew ? 'Create Branch' : 'Save Changes')}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
