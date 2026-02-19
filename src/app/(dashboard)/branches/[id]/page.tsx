'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { MapPin, Save, ArrowLeft, Trash2, Navigation, Circle, Wifi, Plus, X, Moon, Sun, Lock, Construction, Star, User, Building2, Wrench, Landmark } from 'lucide-react';
import Link from 'next/link';

interface Branch {
  id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  geofence_radius: number;
  office_ips: string[] | null;
  // New configuration fields
  operational_status: 'under_construction' | 'operational' | 'rented' | 'facility_management' | 'headquarters';
  has_night_shift: boolean;
  smart_lock_enabled: boolean;
  smart_lock_start_time: string | null;
  smart_lock_end_time: string | null;
  branch_class: 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C';
  description: string | null;
  community_manager_id: string | null;
}

interface Employee {
  id: string;
  full_name: string;
  position: string;
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
    office_ips: [] as string[],
    // New configuration fields
    operational_status: 'operational' as 'under_construction' | 'operational' | 'rented' | 'facility_management' | 'headquarters',
    has_night_shift: false,
    smart_lock_enabled: false,
    smart_lock_start_time: '18:00',
    smart_lock_end_time: '09:00',
    branch_class: 'B' as 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C',
    description: '',
    community_manager_id: '',
  });
  const [newIp, setNewIp] = useState('');
  const [employees, setEmployees] = useState<Employee[]>([]);

  useEffect(() => {
    // Fetch employees for CM dropdown
    fetchEmployees();
    if (!isNew) {
      fetchBranch();
    }
  }, [branchId, isNew]);

  const fetchEmployees = async () => {
    try {
      const res = await fetch('/api/employees');
      if (res.ok) {
        const data = await res.json();
        // Filter for potential CMs (community managers or managers)
        setEmployees(data.employees || []);
      }
    } catch (err) {
      console.error('Failed to fetch employees');
    }
  };

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
        office_ips: branch.office_ips || [],
        // New configuration fields
        operational_status: branch.operational_status || 'operational',
        has_night_shift: branch.has_night_shift || false,
        smart_lock_enabled: branch.smart_lock_enabled || false,
        smart_lock_start_time: branch.smart_lock_start_time || '18:00',
        smart_lock_end_time: branch.smart_lock_end_time || '09:00',
        branch_class: branch.branch_class || 'B',
        description: branch.description || '',
        community_manager_id: branch.community_manager_id || '',
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Additional notes about this branch..."
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none resize-none"
              />
            </div>
          </div>
        </div>

        {/* Branch Configuration */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Star size={20} className="text-purple-600" />
            Branch Configuration
          </h2>

          <div className="space-y-4">
            {/* Operational Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Operational Status
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-all ${
                  formData.operational_status === 'operational'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <input
                    type="radio"
                    name="operational_status"
                    value="operational"
                    checked={formData.operational_status === 'operational'}
                    onChange={(e) => setFormData(prev => ({ ...prev, operational_status: e.target.value as typeof formData.operational_status }))}
                    className="sr-only"
                  />
                  <Sun size={20} className={formData.operational_status === 'operational' ? 'text-green-600' : 'text-gray-400'} />
                  <div>
                    <p className="font-medium text-gray-900">Operational</p>
                    <p className="text-xs text-gray-500">Fully running with staff</p>
                  </div>
                </label>
                <label className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-all ${
                  formData.operational_status === 'under_construction'
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <input
                    type="radio"
                    name="operational_status"
                    value="under_construction"
                    checked={formData.operational_status === 'under_construction'}
                    onChange={(e) => setFormData(prev => ({ ...prev, operational_status: e.target.value as typeof formData.operational_status }))}
                    className="sr-only"
                  />
                  <Construction size={20} className={formData.operational_status === 'under_construction' ? 'text-orange-600' : 'text-gray-400'} />
                  <div>
                    <p className="font-medium text-gray-900">Under Construction</p>
                    <p className="text-xs text-gray-500">No CM/NS needed</p>
                  </div>
                </label>
                <label className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-all ${
                  formData.operational_status === 'rented'
                    ? 'border-cyan-500 bg-cyan-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <input
                    type="radio"
                    name="operational_status"
                    value="rented"
                    checked={formData.operational_status === 'rented'}
                    onChange={(e) => setFormData(prev => ({ ...prev, operational_status: e.target.value as typeof formData.operational_status }))}
                    className="sr-only"
                  />
                  <Building2 size={20} className={formData.operational_status === 'rented' ? 'text-cyan-600' : 'text-gray-400'} />
                  <div>
                    <p className="font-medium text-gray-900">Rented</p>
                    <p className="text-xs text-gray-500">Rented to external company</p>
                  </div>
                </label>
                <label className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-all ${
                  formData.operational_status === 'facility_management'
                    ? 'border-slate-500 bg-slate-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <input
                    type="radio"
                    name="operational_status"
                    value="facility_management"
                    checked={formData.operational_status === 'facility_management'}
                    onChange={(e) => setFormData(prev => ({ ...prev, operational_status: e.target.value as typeof formData.operational_status }))}
                    className="sr-only"
                  />
                  <Wrench size={20} className={formData.operational_status === 'facility_management' ? 'text-slate-600' : 'text-gray-400'} />
                  <div>
                    <p className="font-medium text-gray-900">Facility Mgmt</p>
                    <p className="text-xs text-gray-500">Cleaning, procurement, etc.</p>
                  </div>
                </label>
                <label className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-all ${
                  formData.operational_status === 'headquarters'
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <input
                    type="radio"
                    name="operational_status"
                    value="headquarters"
                    checked={formData.operational_status === 'headquarters'}
                    onChange={(e) => setFormData(prev => ({ ...prev, operational_status: e.target.value as typeof formData.operational_status }))}
                    className="sr-only"
                  />
                  <Landmark size={20} className={formData.operational_status === 'headquarters' ? 'text-purple-600' : 'text-gray-400'} />
                  <div>
                    <p className="font-medium text-gray-900">Headquarters</p>
                    <p className="text-xs text-gray-500">Internal office, not coworking</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Branch Class */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Branch Class
              </label>
              <div className="grid grid-cols-6 gap-2">
                {(['A+', 'A', 'B+', 'B', 'C+', 'C'] as const).map((cls) => (
                  <label
                    key={cls}
                    className={`flex items-center justify-center p-3 border rounded-lg cursor-pointer transition-all ${
                      formData.branch_class === cls
                        ? 'border-purple-500 bg-purple-50 text-purple-700 font-bold'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="branch_class"
                      value={cls}
                      checked={formData.branch_class === cls}
                      onChange={(e) => setFormData(prev => ({ ...prev, branch_class: e.target.value as typeof formData.branch_class }))}
                      className="sr-only"
                    />
                    {cls}
                  </label>
                ))}
              </div>
            </div>

            {/* Community Manager */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Community Manager (CM)
              </label>
              <div className="relative">
                <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <select
                  value={formData.community_manager_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, community_manager_id: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none appearance-none bg-white"
                >
                  <option value="">No CM assigned</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} - {emp.position}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Night Shift Toggle */}
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-3">
                <Moon size={20} className="text-indigo-600" />
                <div>
                  <p className="font-medium text-gray-900">Night Shift</p>
                  <p className="text-xs text-gray-500">Branch operates night shifts (NS)</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.has_night_shift}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    has_night_shift: e.target.checked,
                    // If night shift enabled, disable smart lock
                    smart_lock_enabled: e.target.checked ? false : prev.smart_lock_enabled
                  }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {/* Smart Lock Toggle (only if no night shift) */}
            {!formData.has_night_shift && (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Lock size={20} className="text-blue-600" />
                    <div>
                      <p className="font-medium text-gray-900">Smart Lock</p>
                      <p className="text-xs text-gray-500">Auto-lock after hours</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.smart_lock_enabled}
                      onChange={(e) => setFormData(prev => ({ ...prev, smart_lock_enabled: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Smart Lock Hours (only if smart lock enabled) */}
                {formData.smart_lock_enabled && (
                  <div className="ml-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm font-medium text-blue-800 mb-3">Smart Lock Hours</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-blue-700 mb-1">Lock starts at</label>
                        <input
                          type="time"
                          value={formData.smart_lock_start_time}
                          onChange={(e) => setFormData(prev => ({ ...prev, smart_lock_start_time: e.target.value }))}
                          className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-blue-700 mb-1">Lock ends at</label>
                        <input
                          type="time"
                          value={formData.smart_lock_end_time}
                          onChange={(e) => setFormData(prev => ({ ...prev, smart_lock_end_time: e.target.value }))}
                          className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-blue-600 mt-2">
                      Smart lock will be active from {formData.smart_lock_start_time} to {formData.smart_lock_end_time}
                    </p>
                  </div>
                )}
              </div>
            )}
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

        {/* Office WiFi IP Verification */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Wifi size={20} className="text-purple-600" />
            Office WiFi Verification
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Add office IP addresses for instant check-in via WiFi. Employees connected to office WiFi can check in with one tap.
          </p>

          <div className="space-y-4">
            {/* Existing IPs */}
            {formData.office_ips.length > 0 && (
              <div className="space-y-2">
                {formData.office_ips.map((ip, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg font-mono text-sm">
                      {ip}
                    </div>
                    {index === 0 && (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                        Primary
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          office_ips: prev.office_ips.filter((_, i) => i !== index)
                        }));
                      }}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add new IP */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newIp}
                onChange={(e) => setNewIp(e.target.value)}
                placeholder="e.g., 203.145.67.89"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none font-mono"
              />
              <button
                type="button"
                onClick={() => {
                  if (newIp && !formData.office_ips.includes(newIp)) {
                    setFormData(prev => ({
                      ...prev,
                      office_ips: [...prev.office_ips, newIp]
                    }));
                    setNewIp('');
                  }
                }}
                disabled={!newIp}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={16} />
                Add IP
              </button>
            </div>

            {/* Help text */}
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                <strong>How to find your office IP:</strong>
              </p>
              <ol className="text-sm text-amber-700 mt-2 list-decimal list-inside space-y-1">
                <li>Connect to office WiFi</li>
                <li>Visit <a href="https://whatismyip.com" target="_blank" rel="noopener noreferrer" className="font-mono bg-amber-100 px-1 rounded underline">whatismyip.com</a></li>
                <li>Copy the IP address shown and add it here</li>
              </ol>
            </div>
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
