import React, { useEffect, useRef } from 'react';
import { Package, Camera, BarChart3, Footprints, Monitor, Globe, CheckCircle, ClipboardList } from 'lucide-react';
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
  const color = isSelected ? '#C35A44' : '#E07A5F';

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
function MapUpdater({ center, selectedTask }) {
  const map = useMap();

  useEffect(() => {
    if (selectedTask?.latitude && selectedTask?.longitude) {
      map.panTo([selectedTask.latitude, selectedTask.longitude], { animate: true });
    }
  }, [selectedTask, map]);

  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);

  return null;
}

// Component to fit bounds to all tasks
function FitBounds({ tasks }) {
  const map = useMap();
  const fittedRef = useRef(false);

  useEffect(() => {
    if (tasks.length > 0 && !fittedRef.current) {
      const validTasks = tasks.filter(t => t.latitude && t.longitude);
      if (validTasks.length > 0) {
        const bounds = L.latLngBounds(validTasks.map(t => [t.latitude, t.longitude]));
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
        fittedRef.current = true;
      }
    }
  }, [tasks, map]);

  return null;
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
}) {
  const selectedTask = tasks.find(t => t.id === selectedTaskId);

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

      <MapUpdater center={center} selectedTask={selectedTask} />
      <FitBounds tasks={tasks} />

      {/* Radius circle */}
      {radius && center[0] && center[1] && (
        <Circle
          center={center}
          radius={radius * 1000} // km to meters
          pathOptions={{
            color: '#E07A5F',
            fillColor: '#E07A5F',
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
                  color: '#525252',
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
                  color: '#E07A5F',
                  fontSize: 16,
                }}>
                  ${task.budget || 0}
                </span>
                {task.distance_km != null && (
                  <span style={{
                    fontSize: 12,
                    color: '#8A8A8A',
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
                  background: 'linear-gradient(135deg, #E07A5F 0%, #F4845F 100%)',
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
