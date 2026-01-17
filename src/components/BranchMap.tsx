'use client';

import { useEffect, useRef, useState } from 'react';
import { MapPin, Users, Clock, Building2 } from 'lucide-react';

interface Branch {
  id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  geofence_radius: number;
  totalEmployees: number;
  presentToday: number;
}

interface BranchMapProps {
  branches: Branch[];
  height?: string;
  showLegend?: boolean;
}

// C-Space brand colors
const BRAND_COLORS = {
  primary: '#7c3aed', // Purple
  secondary: '#a855f7',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
};

export default function BranchMap({ branches, height = '400px', showLegend = true }: BranchMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    // Dynamic import of Leaflet
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

      // Clean up existing map
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
      }

      // Filter branches with coordinates
      const validBranches = branches.filter(b => b.latitude && b.longitude);

      if (validBranches.length === 0) {
        setIsLoaded(true);
        return;
      }

      // Calculate center from all branches
      const avgLat = validBranches.reduce((sum, b) => sum + (b.latitude || 0), 0) / validBranches.length;
      const avgLng = validBranches.reduce((sum, b) => sum + (b.longitude || 0), 0) / validBranches.length;

      // Initialize map with custom styling
      const map = L.map(mapRef.current, {
        center: [avgLat, avgLng],
        zoom: 13,
        zoomControl: true,
        scrollWheelZoom: true,
      });

      mapInstanceRef.current = map;

      // Add custom styled tiles (CartoDB Positron for a cleaner look)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20,
      }).addTo(map);

      // Create custom marker icon with C-Space branding
      const createCustomIcon = (branch: Branch) => {
        const presenceRate = branch.totalEmployees > 0
          ? (branch.presentToday / branch.totalEmployees) * 100
          : 0;

        const color = presenceRate >= 80 ? BRAND_COLORS.success
          : presenceRate >= 50 ? BRAND_COLORS.warning
          : presenceRate > 0 ? BRAND_COLORS.danger
          : BRAND_COLORS.primary;

        return L.divIcon({
          className: 'custom-branch-marker',
          html: `
            <div style="
              position: relative;
              width: 48px;
              height: 60px;
              display: flex;
              flex-direction: column;
              align-items: center;
            ">
              <div style="
                width: 44px;
                height: 44px;
                background: white;
                border: 3px solid ${color};
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                position: relative;
                z-index: 1;
              ">
                <img
                  src="/logo-icon.svg"
                  alt="C-Space"
                  style="width: 28px; height: 28px;"
                  onerror="this.style.display='none'"
                />
              </div>
              <div style="
                width: 0;
                height: 0;
                border-left: 8px solid transparent;
                border-right: 8px solid transparent;
                border-top: 10px solid ${color};
                margin-top: -2px;
              "></div>
              ${branch.presentToday > 0 ? `
                <div style="
                  position: absolute;
                  top: -4px;
                  right: -4px;
                  background: ${BRAND_COLORS.success};
                  color: white;
                  font-size: 11px;
                  font-weight: 600;
                  padding: 2px 6px;
                  border-radius: 10px;
                  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                ">${branch.presentToday}</div>
              ` : ''}
            </div>
          `,
          iconSize: [48, 60],
          iconAnchor: [24, 60],
          popupAnchor: [0, -50],
        });
      };

      // Add markers for each branch
      validBranches.forEach(branch => {
        if (!branch.latitude || !branch.longitude) return;

        const marker = L.marker([branch.latitude, branch.longitude], {
          icon: createCustomIcon(branch),
        });

        // Create custom popup
        const presenceRate = branch.totalEmployees > 0
          ? Math.round((branch.presentToday / branch.totalEmployees) * 100)
          : 0;

        const popupContent = `
          <div style="
            min-width: 220px;
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
              <img src="/logo-icon.svg" alt="C-Space" style="width: 32px; height: 32px;" onerror="this.style.display='none'" />
              <div>
                <div style="font-weight: 600; font-size: 15px; color: #111827;">${branch.name}</div>
                <div style="font-size: 12px; color: #6b7280;">${branch.address || 'No address'}</div>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              <div style="
                background: #f3f4f6;
                padding: 8px 10px;
                border-radius: 8px;
              ">
                <div style="font-size: 11px; color: #6b7280; margin-bottom: 2px;">Total Staff</div>
                <div style="font-size: 18px; font-weight: 600; color: #7c3aed;">${branch.totalEmployees}</div>
              </div>
              <div style="
                background: ${branch.presentToday > 0 ? '#dcfce7' : '#f3f4f6'};
                padding: 8px 10px;
                border-radius: 8px;
              ">
                <div style="font-size: 11px; color: #6b7280; margin-bottom: 2px;">Present Now</div>
                <div style="font-size: 18px; font-weight: 600; color: ${branch.presentToday > 0 ? '#16a34a' : '#9ca3af'};">${branch.presentToday}</div>
              </div>
            </div>

            ${branch.totalEmployees > 0 ? `
              <div style="margin-top: 10px;">
                <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
                  <span style="color: #6b7280;">Presence Rate</span>
                  <span style="font-weight: 600; color: ${presenceRate >= 80 ? '#16a34a' : presenceRate >= 50 ? '#d97706' : '#dc2626'};">${presenceRate}%</span>
                </div>
                <div style="
                  height: 6px;
                  background: #e5e7eb;
                  border-radius: 3px;
                  overflow: hidden;
                ">
                  <div style="
                    height: 100%;
                    width: ${presenceRate}%;
                    background: ${presenceRate >= 80 ? '#22c55e' : presenceRate >= 50 ? '#f59e0b' : '#ef4444'};
                    border-radius: 3px;
                    transition: width 0.3s ease;
                  "></div>
                </div>
              </div>
            ` : ''}

            <div style="
              margin-top: 10px;
              padding-top: 10px;
              border-top: 1px solid #e5e7eb;
              font-size: 11px;
              color: #9ca3af;
            ">
              Geofence: ${branch.geofence_radius}m radius
            </div>
          </div>
        `;

        marker.bindPopup(popupContent, {
          maxWidth: 280,
          className: 'custom-popup',
        });

        // Add geofence circle
        const circle = L.circle([branch.latitude, branch.longitude], {
          radius: branch.geofence_radius,
          color: BRAND_COLORS.primary,
          fillColor: BRAND_COLORS.primary,
          fillOpacity: 0.1,
          weight: 2,
          dashArray: '5, 5',
        });

        marker.on('click', () => {
          setSelectedBranch(branch);
          circle.addTo(map);
        });

        marker.on('popupclose', () => {
          setSelectedBranch(null);
          map.removeLayer(circle);
        });

        marker.addTo(map);
      });

      // Fit bounds to show all markers
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
  const totalPresent = branches.reduce((sum, b) => sum + b.presentToday, 0);
  const totalEmployees = branches.reduce((sum, b) => sum + b.totalEmployees, 0);

  if (validBranches.length === 0) {
    return (
      <div
        className="bg-gray-50 rounded-xl border border-gray-200 flex flex-col items-center justify-center p-8"
        style={{ height }}
      >
        <MapPin size={48} className="text-gray-300 mb-4" />
        <p className="text-gray-500 text-center">
          No branch locations with coordinates configured.<br />
          Add latitude and longitude to branches to see them on the map.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Map Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <Building2 size={20} className="text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Branch Locations</h3>
            <p className="text-sm text-gray-500">{validBranches.length} locations on map</p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 rounded-lg">
            <Users size={16} className="text-purple-600" />
            <span className="text-sm font-medium text-purple-700">{totalEmployees} staff</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-lg">
            <Clock size={16} className="text-green-600" />
            <span className="text-sm font-medium text-green-700">{totalPresent} present</span>
          </div>
        </div>
      </div>

      {/* Map Container */}
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
      {showLegend && (
        <div className="p-3 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-gray-600">80%+ present</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span className="text-gray-600">50-80% present</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-gray-600">&lt;50% present</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500"></div>
              <span className="text-gray-600">No staff assigned</span>
            </div>
          </div>
        </div>
      )}

      {/* Custom CSS for Leaflet popups */}
      <style jsx global>{`
        .custom-branch-marker {
          background: transparent !important;
          border: none !important;
        }
        .custom-popup .leaflet-popup-content-wrapper {
          border-radius: 12px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.15);
          padding: 0;
        }
        .custom-popup .leaflet-popup-content {
          margin: 12px;
        }
        .custom-popup .leaflet-popup-tip {
          background: white;
        }
        .leaflet-control-zoom {
          border: none !important;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1) !important;
        }
        .leaflet-control-zoom a {
          border-radius: 8px !important;
          margin: 2px !important;
        }
      `}</style>
    </div>
  );
}
