import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Package, Camera, BarChart3, Footprints, Monitor, Globe, CheckCircle, ClipboardList, Search } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icons for Vite/bundlers
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

// Custom coral marker icon for tasks
const createTaskIcon = (isSelected = false, isHovered = false) => {
  const size = isSelected ? 40 : isHovered ? 36 : 32;
  const color = isSelected ? '#C35A44' : '#E8853D';

  return L.divIcon({
    className: 'task-marker-icon',
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border: 3px solid white;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <span style="
          transform: rotate(45deg);
          color: white;
          font-size: ${size * 0.4}px;
        ">$</span>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
};

// Component to handle map view updates
function MapUpdater({ center, selectedTask, programmaticMoveRef }) {
  const map = useMap();

  useEffect(() => {
    if (selectedTask?.latitude && selectedTask?.longitude) {
      programmaticMoveRef.current++;
      map.panTo([selectedTask.latitude, selectedTask.longitude], { animate: true });
      setTimeout(() => { programmaticMoveRef.current = Math.max(0, programmaticMoveRef.current - 1); }, 500);
    }
  }, [selectedTask, map, programmaticMoveRef]);

  useEffect(() => {
    if (center && center[0] && center[1]) {
      programmaticMoveRef.current++;
      map.setView(center, map.getZoom());
      setTimeout(() => { programmaticMoveRef.current = Math.max(0, programmaticMoveRef.current - 1); }, 500);
    }
  }, [center, map, programmaticMoveRef]);

  return null;
}

// Component to fit bounds to all tasks
function FitBounds({ tasks, disabled, programmaticMoveRef }) {
  const map = useMap();
  const fittedRef = useRef(false);

  useEffect(() => {
    if (disabled) return;
    if (tasks.length > 0 && !fittedRef.current) {
      const validTasks = tasks.filter(t => t.latitude && t.longitude);
      if (validTasks.length > 0) {
        programmaticMoveRef.current++;
        const bounds = L.latLngBounds(validTasks.map(t => [t.latitude, t.longitude]));
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
        setTimeout(() => { programmaticMoveRef.current = Math.max(0, programmaticMoveRef.current - 1); }, 500);
        fittedRef.current = true;
      }
    }
  }, [tasks, map, disabled, programmaticMoveRef]);

  return null;
}

// Compute approximate visible radius in km from map bounds
function boundsToRadiusKm(map) {
  const bounds = map.getBounds();
  const center = map.getCenter();
  const corner = bounds.getNorthEast();
  // Haversine between center and corner
  const toRad = (deg) => (deg * Math.PI) / 180;
  const lat1 = toRad(center.lat);
  const lat2 = toRad(corner.lat);
  const dLat = toRad(corner.lat - center.lat);
  const dLng = toRad(corner.lng - center.lng);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return 6371 * c; // Earth radius in km
}

// Component to detect user-initiated map moves and show "Search this area" button
function MapMoveDetector({ programmaticMoveRef, onSearchArea }) {
  const map = useMap();
  const [showButton, setShowButton] = useState(false);
  const pendingBoundsRef = useRef(null);

  useEffect(() => {
    const handleMoveEnd = () => {
      if (programmaticMoveRef.current > 0) return;
      const center = map.getCenter();
      const radiusKm = boundsToRadiusKm(map);
      pendingBoundsRef.current = { lat: center.lat, lng: center.lng, radiusKm };
      setShowButton(true);
    };

    map.on('moveend', handleMoveEnd);
    return () => { map.off('moveend', handleMoveEnd); };
  }, [map, programmaticMoveRef]);

  const handleClick = useCallback(() => {
    if (pendingBoundsRef.current && onSearchArea) {
      onSearchArea(pendingBoundsRef.current);
    }
    setShowButton(false);
  }, [onSearchArea]);

  if (!showButton || !onSearchArea) return null;

  return (
    <div className="task-map-search-area-wrapper">
      <button className="task-map-search-area-btn" onClick={handleClick}>
        <Search size={14} />
        Search this area
      </button>
    </div>
  );
}

const CATEGORY_ICONS = {
  delivery: <Package size={20} />,
  photography: <Camera size={20} />,
  'data-collection': <BarChart3 size={20} />,
  errands: <Footprints size={20} />,
  'tech-setup': <Monitor size={20} />,
  translation: <Globe size={20} />,
  verification: <CheckCircle size={20} />,
  other: <ClipboardList size={20} />,
};

export default function TaskMap({
  tasks = [],
  center = [10.8231, 106.6297], // Default: HCMC
  zoom = 12,
  radius = null,
  selectedTaskId = null,
  hoveredTaskId = null,
  onTaskSelect = () => {},
  onTaskHover = () => {},
  onBoundsChange = null,
  disableFitBounds = false,
}) {
  const selectedTask = tasks.find(t => t.id === selectedTaskId);
  const programmaticMoveRef = useRef(0);

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: '100%', width: '100%', borderRadius: 'var(--radius-lg)' }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <MapUpdater center={center} selectedTask={selectedTask} programmaticMoveRef={programmaticMoveRef} />
      <FitBounds tasks={tasks} disabled={disableFitBounds} programmaticMoveRef={programmaticMoveRef} />
      <MapMoveDetector programmaticMoveRef={programmaticMoveRef} onSearchArea={onBoundsChange} />

      {/* Radius circle */}
      {radius && center[0] && center[1] && (
        <Circle
          center={center}
          radius={radius * 1000} // km to meters
          pathOptions={{
            color: '#E8853D',
            fillColor: '#E8853D',
            fillOpacity: 0.08,
            weight: 2,
            dashArray: '5, 5',
          }}
        />
      )}

      {/* Task markers */}
      {tasks.filter(t => t.latitude && t.longitude).map(task => (
        <Marker
          key={task.id}
          position={[task.latitude, task.longitude]}
          icon={createTaskIcon(
            task.id === selectedTaskId,
            task.id === hoveredTaskId
          )}
          eventHandlers={{
            click: () => onTaskSelect(task.id),
            mouseover: () => onTaskHover(task.id),
            mouseout: () => onTaskHover(null),
          }}
        >
          <Popup>
            <div style={{ minWidth: 200, fontFamily: 'DM Sans, sans-serif' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 20 }}>{CATEGORY_ICONS[task.category] || <ClipboardList size={20} />}</span>
                <span style={{
                  fontSize: 11,
                  color: '#333333',
                  textTransform: 'capitalize',
                }}>
                  {task.category?.replace('-', ' ') || 'General'}
                </span>
              </div>
              <h4 style={{
                margin: '0 0 8px',
                fontSize: 14,
                fontWeight: 600,
                color: '#1A1A1A',
              }}>
                {task.title}
              </h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <span style={{
                  fontWeight: 700,
                  color: '#E8853D',
                  fontSize: 16,
                }}>
                  ${task.budget || 0}
                </span>
                {task.distance_km != null && (
                  <span style={{
                    fontSize: 12,
                    color: '#888888',
                  }}>
                    {task.distance_km.toFixed(1)} km away
                  </span>
                )}
              </div>
              <button
                onClick={() => onTaskSelect(task.id)}
                style={{
                  width: '100%',
                  padding: '8px 16px',
                  background: '#E8853D',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                View Details
              </button>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
