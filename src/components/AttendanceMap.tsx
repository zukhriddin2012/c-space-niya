'use client';

import { useEffect, useRef, useState } from 'react';
import { MapPin, Users, Clock, Activity } from 'lucide-react';

interface BranchAttendance {
  id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  present: number;
  late: number;
  absent: number;
  earlyLeave: number;
  total: number;
}

interface AttendanceMapProps {
  branches: BranchAttendance[];
  height?: string;
  selectedDate: string;
}

// C-Space brand colors
const BRAND_COLORS = {
  primary: '#7c3aed',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
};

export default function AttendanceMap({ branches, height = '350px', selectedDate }: AttendanceMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const totalPresent = branches.reduce((sum, b) => sum + b.present, 0);
  const totalLate = branches.reduce((sum, b) => sum + b.late, 0);
  const totalAbsent = branches.reduce((sum, b) => sum + b.absent, 0);
  const totalEmployees = branches.reduce((sum, b) => sum + b.total, 0);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const loadMap = async () => {
      const L = (await import('leaflet')).default;

      // Load Leaflet CSS
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      if (!mapRef.current) return;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
      }

      const validBranches = branches.filter(b => b.latitude && b.longitude);

      if (validBranches.length === 0) {
        setIsLoaded(true);
        return;
      }

      const avgLat = validBranches.reduce((sum, b) => sum + (b.latitude || 0), 0) / validBranches.length;
      const avgLng = validBranches.reduce((sum, b) => sum + (b.longitude || 0), 0) / validBranches.length;

      const map = L.map(mapRef.current, {
        center: [avgLat, avgLng],
        zoom: 13,
        zoomControl: true,
        scrollWheelZoom: true,
      });

      mapInstanceRef.current = map;

      // Use a cleaner map style
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20,
      }).addTo(map);

      // Create custom marker with attendance info
      const createAttendanceMarker = (branch: BranchAttendance) => {
        const activeCount = branch.present + branch.late;
        const attendanceRate = branch.total > 0 ? (activeCount / branch.total) * 100 : 0;

        const statusColor = attendanceRate >= 80 ? BRAND_COLORS.success
          : attendanceRate >= 50 ? BRAND_COLORS.warning
          : attendanceRate > 0 ? BRAND_COLORS.danger
          : '#9ca3af';

        return L.divIcon({
          className: 'attendance-marker',
          html: `
            <div style="
              position: relative;
              width: 56px;
              height: 70px;
              display: flex;
              flex-direction: column;
              align-items: center;
            ">
              <div style="
                width: 52px;
                height: 52px;
                background: linear-gradient(135deg, ${statusColor}22 0%, ${statusColor}44 100%);
                border: 3px solid ${statusColor};
                border-radius: 50%;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                box-shadow: 0 4px 12px ${statusColor}40;
                position: relative;
                z-index: 1;
              ">
                <div style="
                  font-size: 16px;
                  font-weight: 700;
                  color: ${statusColor};
                  line-height: 1;
                ">${activeCount}</div>
                <div style="
                  font-size: 9px;
                  color: #6b7280;
                  margin-top: 1px;
                ">/${branch.total}</div>
              </div>
              <div style="
                width: 0;
                height: 0;
                border-left: 10px solid transparent;
                border-right: 10px solid transparent;
                border-top: 12px solid ${statusColor};
                margin-top: -3px;
                filter: drop-shadow(0 2px 2px rgba(0,0,0,0.15));
              "></div>
              ${branch.late > 0 ? `
                <div style="
                  position: absolute;
                  top: -6px;
                  right: -6px;
                  background: ${BRAND_COLORS.warning};
                  color: white;
                  font-size: 10px;
                  font-weight: 600;
                  padding: 2px 5px;
                  border-radius: 8px;
                  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                ">${branch.late} late</div>
              ` : ''}
            </div>
          `,
          iconSize: [56, 70],
          iconAnchor: [28, 70],
          popupAnchor: [0, -60],
        });
      };

      // Add markers
      validBranches.forEach(branch => {
        if (!branch.latitude || !branch.longitude) return;

        const marker = L.marker([branch.latitude, branch.longitude], {
          icon: createAttendanceMarker(branch),
        });

        const activeCount = branch.present + branch.late;
        const attendanceRate = branch.total > 0 ? Math.round((activeCount / branch.total) * 100) : 0;

        const popupContent = `
          <div style="
            min-width: 240px;
            font-family: system-ui, -apple-system, sans-serif;
          ">
            <div style="
              display: flex;
              align-items: center;
              gap: 10px;
              margin-bottom: 12px;
              padding-bottom: 10px;
              border-bottom: 1px solid #e5e7eb;
            ">
              <img src="/logo-icon.svg" alt="C-Space" style="width: 28px; height: 28px;" onerror="this.style.display='none'" />
              <div>
                <div style="font-weight: 600; font-size: 14px; color: #111827;">${branch.name}</div>
                <div style="font-size: 11px; color: #6b7280;">${branch.address || 'No address'}</div>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 10px;">
              <div style="background: #dcfce7; padding: 8px; border-radius: 8px; text-align: center;">
                <div style="font-size: 18px; font-weight: 700; color: #16a34a;">${branch.present}</div>
                <div style="font-size: 10px; color: #15803d;">Present</div>
              </div>
              <div style="background: #fef3c7; padding: 8px; border-radius: 8px; text-align: center;">
                <div style="font-size: 18px; font-weight: 700; color: #d97706;">${branch.late}</div>
                <div style="font-size: 10px; color: #b45309;">Late</div>
              </div>
              <div style="background: #fee2e2; padding: 8px; border-radius: 8px; text-align: center;">
                <div style="font-size: 18px; font-weight: 700; color: #dc2626;">${branch.absent}</div>
                <div style="font-size: 10px; color: #b91c1c;">Absent</div>
              </div>
              <div style="background: #fef9c3; padding: 8px; border-radius: 8px; text-align: center;">
                <div style="font-size: 18px; font-weight: 700; color: #ca8a04;">${branch.earlyLeave}</div>
                <div style="font-size: 10px; color: #a16207;">Early Leave</div>
              </div>
            </div>

            <div>
              <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px;">
                <span style="color: #6b7280;">Attendance Rate</span>
                <span style="font-weight: 600; color: ${attendanceRate >= 80 ? '#16a34a' : attendanceRate >= 50 ? '#d97706' : '#dc2626'};">${attendanceRate}%</span>
              </div>
              <div style="
                height: 8px;
                background: #e5e7eb;
                border-radius: 4px;
                overflow: hidden;
              ">
                <div style="
                  height: 100%;
                  width: ${attendanceRate}%;
                  background: linear-gradient(90deg, ${attendanceRate >= 80 ? '#22c55e' : attendanceRate >= 50 ? '#f59e0b' : '#ef4444'} 0%, ${attendanceRate >= 80 ? '#16a34a' : attendanceRate >= 50 ? '#d97706' : '#dc2626'} 100%);
                  border-radius: 4px;
                "></div>
              </div>
            </div>
          </div>
        `;

        marker.bindPopup(popupContent, {
          maxWidth: 300,
          className: 'attendance-popup',
        });

        marker.addTo(map);
      });

      if (validBranches.length > 1) {
        const bounds = L.latLngBounds(
          validBranches.map(b => [b.latitude!, b.longitude!] as [number, number])
        );
        map.fitBounds(bounds, { padding: [50, 50] });
      }

      setIsLoaded(true);
    };

    loadMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [branches]);

  const validBranches = branches.filter(b => b.latitude && b.longitude);

  if (validBranches.length === 0) {
    return (
      <div
        className="bg-gray-50 rounded-xl border border-gray-200 flex flex-col items-center justify-center p-8"
        style={{ height }}
      >
        <MapPin size={48} className="text-gray-300 mb-4" />
        <p className="text-gray-500 text-center">
          No branches with GPS coordinates.<br />
          Configure branch locations to see the attendance map.
        </p>
      </div>
    );
  }

  const formattedDate = new Date(selectedDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Activity size={20} className="text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Live Attendance Map</h3>
              <p className="text-sm text-gray-500">{formattedDate}</p>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-green-700">{totalPresent} present</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 rounded-lg">
              <span className="text-sm font-medium text-orange-700">{totalLate} late</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 rounded-lg">
              <span className="text-sm font-medium text-red-700">{totalAbsent} absent</span>
            </div>
          </div>
        </div>
      </div>

      {/* Map */}
      <div
        ref={mapRef}
        style={{ height, width: '100%' }}
        className="relative"
      >
        {!isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm text-gray-500">Loading map...</span>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="p-3 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-gray-600">80%+ attendance</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span className="text-gray-600">50-80%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-gray-600">&lt;50%</span>
            </div>
          </div>
          <span className="text-xs text-gray-400">
            Click markers for details
          </span>
        </div>
      </div>

      <style jsx global>{`
        .attendance-marker {
          background: transparent !important;
          border: none !important;
        }
        .attendance-popup .leaflet-popup-content-wrapper {
          border-radius: 12px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.15);
          padding: 0;
        }
        .attendance-popup .leaflet-popup-content {
          margin: 12px;
        }
        .attendance-popup .leaflet-popup-tip {
          background: white;
        }
      `}</style>
    </div>
  );
}
