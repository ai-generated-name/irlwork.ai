import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Package, Camera, BarChart3, Footprints, Monitor, Globe, CheckCircle, ClipboardList, Search, Brush, Truck, Dumbbell, ScanSearch, X, Users } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

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

// Lucide icon components for map popup (matches TaskCardV2 categories)
const CATEGORY_ICONS = {
  delivery: <Package size={16} />,
  photography: <Camera size={16} />,
  'data-collection': <BarChart3 size={16} />,
  data_collection: <BarChart3 size={16} />,
  errands: <Footprints size={16} />,
  cleaning: <Brush size={16} />,
  moving: <Truck size={16} />,
  manual_labor: <Dumbbell size={16} />,
  inspection: <ScanSearch size={16} />,
  'tech-setup': <Monitor size={16} />,
  tech: <Monitor size={16} />,
  translation: <Globe size={16} />,
  verification: <CheckCircle size={16} />,
  general: <ClipboardList size={16} />,
  other: <ClipboardList size={16} />,
};

function formatCategory(cat) {
  if (!cat) return 'General';
  return cat.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// Custom coral marker icon for tasks
const createTaskIcon = (isSelected = false, isHovered = false, budget = null) => {
  const size = isSelected ? 40 : isHovered ? 36 : 32;
  const color = isSelected ? '#C35A44' : '#E8853D';
  const shadow = isSelected
    ? '0 2px 12px rgba(195, 90, 68, 0.5)'
    : isHovered
      ? '0 2px 10px rgba(232, 133, 61, 0.4)'
      : '0 2px 8px rgba(0,0,0,0.3)';

  // Show price tooltip on hover
  const tooltipHtml = (isHovered && !isSelected && budget != null) ? `
    <div class="task-map-price-tooltip">$${budget}</div>
  ` : '';

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
        box-shadow: ${shadow};
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.15s ease;
      ">
        <span style="
          transform: rotate(45deg);
          color: white;
          font-size: ${size * 0.4}px;
          font-weight: 700;
        ">$</span>
      </div>
      ${tooltipHtml}
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
  const toRad = (deg) => (deg * Math.PI) / 180;
  const lat1 = toRad(center.lat);
  const lat2 = toRad(corner.lat);
  const dLat = toRad(corner.lat - center.lat);
  const dLng = toRad(corner.lng - center.lng);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return 6371 * c;
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

// Close popup when clicking empty map area or pressing Escape
function MapClickHandler({ onClosePopup }) {
  useMapEvents({
    click: (e) => {
      // Only fire if not clicking a marker
      if (e.originalEvent?.target?.closest?.('.task-marker-icon')) return;
      onClosePopup();
    },
  });

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClosePopup();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClosePopup]);

  return null;
}

// MarkerCluster component for mobile
function MarkerClusterGroup({ tasks, isMobile, selectedTaskId, hoveredTaskId, onTaskClick, onTaskHover, clusterGroupRef }) {
  const map = useMap();

  useEffect(() => {
    if (!isMobile) return;

    const clusterGroup = L.markerClusterGroup({
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount();
        return L.divIcon({
          className: 'task-cluster-icon',
          html: `<div class="task-cluster-marker"><span>${count}</span></div>`,
          iconSize: [40, 40],
          iconAnchor: [20, 20],
        });
      },
    });

    const validTasks = tasks.filter(t => t.latitude && t.longitude);
    validTasks.forEach(task => {
      const marker = L.marker([task.latitude, task.longitude], {
        icon: createTaskIcon(task.id === selectedTaskId, task.id === hoveredTaskId, task.budget),
      });
      marker.on('click', () => onTaskClick(task.id));
      clusterGroup.addLayer(marker);
    });

    map.addLayer(clusterGroup);
    clusterGroupRef.current = clusterGroup;

    return () => {
      map.removeLayer(clusterGroup);
      clusterGroupRef.current = null;
    };
  }, [tasks, isMobile, selectedTaskId, hoveredTaskId, map, onTaskClick, onTaskHover, clusterGroupRef]);

  return null;
}

// Popup card rendered as a React portal-like overlay positioned on the map
function TaskPopupCard({ task, position, onClose, onViewDetails, isMobile }) {
  if (!task || !position || isMobile) return null;

  const categoryIcon = CATEGORY_ICONS[task.category] || <ClipboardList size={16} />;
  const categoryLabel = formatCategory(task.category);
  const locationText = task.is_remote
    ? (task.location || task.city ? `Remote · ${task.location || task.city}` : 'Remote')
    : (task.location || task.city || 'Location not specified');

  return (
    <div className="task-map-popup-card" style={{ left: position.x, top: position.y }}>
      <button className="task-map-popup-close" onClick={(e) => { e.stopPropagation(); onClose(); }}>
        <X size={14} />
      </button>

      <div className="task-map-popup-category">
        <span className="task-map-popup-category-icon">{categoryIcon}</span>
        <span className="task-map-popup-category-label">{categoryLabel}</span>
      </div>

      <h4 className="task-map-popup-title">{task.title}</h4>

      {task.description && (
        <p className="task-map-popup-description">{task.description}</p>
      )}

      <div className="task-map-popup-price">
        <span className="task-map-popup-price-amount">${task.budget || 0}</span>
        <span className="task-map-popup-price-label">USD</span>
      </div>

      <div className="task-map-popup-meta">
        <span className="task-map-popup-location">
          {task.is_remote ? (
            <Globe size={12} />
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          )}
          {locationText}
        </span>
        {task.applicant_count > 0 && (
          <span className="task-map-popup-applicants">
            <Users size={12} />
            {task.applicant_count} applied
          </span>
        )}
      </div>

      <button className="task-map-popup-cta" onClick={() => onViewDetails(task.id)}>
        View Details
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </button>
    </div>
  );
}

// Mobile bottom sheet component
function MobileBottomSheet({ task, onClose, onViewDetails }) {
  const [dragState, setDragState] = useState('collapsed'); // collapsed | expanded
  const sheetRef = useRef(null);
  const dragStartRef = useRef(null);
  const dragCurrentRef = useRef(null);

  useEffect(() => {
    if (task) setDragState('collapsed');
  }, [task]);

  const handleTouchStart = useCallback((e) => {
    dragStartRef.current = e.touches[0].clientY;
    dragCurrentRef.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!dragStartRef.current || !sheetRef.current) return;
    dragCurrentRef.current = e.touches[0].clientY;
    const delta = dragStartRef.current - dragCurrentRef.current;
    const sheet = sheetRef.current;

    if (dragState === 'collapsed') {
      // Swiping up from collapsed
      if (delta > 0) {
        const progress = Math.min(delta / 200, 1);
        const height = 35 + progress * 35; // 35% → 70%
        sheet.style.height = `${height}vh`;
        sheet.style.transition = 'none';
      }
      // Swiping down from collapsed — dismiss
      if (delta < 0) {
        const progress = Math.min(Math.abs(delta) / 150, 1);
        sheet.style.transform = `translateY(${Math.abs(delta)}px)`;
        sheet.style.opacity = String(1 - progress * 0.5);
        sheet.style.transition = 'none';
      }
    } else {
      // expanded - swiping down
      if (delta < 0) {
        const absDelta = Math.abs(delta);
        if (absDelta > 100) {
          // Collapse back
          sheet.style.height = `${70 - (absDelta - 100) / 5}vh`;
        }
        sheet.style.transition = 'none';
      }
    }
  }, [dragState]);

  const handleTouchEnd = useCallback(() => {
    if (!dragStartRef.current || !sheetRef.current) return;
    const delta = dragStartRef.current - dragCurrentRef.current;
    const sheet = sheetRef.current;
    sheet.style.transition = '';
    sheet.style.transform = '';
    sheet.style.opacity = '';

    if (dragState === 'collapsed') {
      if (delta > 80) {
        // Swipe up → expand
        setDragState('expanded');
        sheet.style.height = '70vh';
      } else if (delta < -80) {
        // Swipe down → dismiss
        onClose();
      } else {
        sheet.style.height = '35vh';
      }
    } else {
      if (delta < -80) {
        // Swipe down → collapse
        setDragState('collapsed');
        sheet.style.height = '35vh';
      } else {
        sheet.style.height = '70vh';
      }
    }

    dragStartRef.current = null;
    dragCurrentRef.current = null;
  }, [dragState, onClose]);

  if (!task) return null;

  const categoryIcon = CATEGORY_ICONS[task.category] || <ClipboardList size={16} />;
  const categoryLabel = formatCategory(task.category);
  const locationText = task.is_remote
    ? (task.location || task.city ? `Remote · ${task.location || task.city}` : 'Remote')
    : (task.location || task.city || 'Location not specified');

  return (
    <>
      <div className="task-map-sheet-backdrop" onClick={onClose} />
      <div
        ref={sheetRef}
        className={`task-map-bottom-sheet ${dragState}`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="task-map-sheet-drag-handle">
          <div className="task-map-sheet-drag-bar" />
        </div>

        <div className="task-map-sheet-content">
          <div className="task-map-popup-category">
            <span className="task-map-popup-category-icon">{categoryIcon}</span>
            <span className="task-map-popup-category-label">{categoryLabel}</span>
          </div>

          <h4 className="task-map-popup-title" style={{ WebkitLineClamp: dragState === 'expanded' ? 3 : 1 }}>
            {task.title}
          </h4>

          {task.description && (
            <p className="task-map-popup-description" style={{ WebkitLineClamp: dragState === 'expanded' ? 6 : 2 }}>
              {task.description}
            </p>
          )}

          <div className="task-map-popup-price">
            <span className="task-map-popup-price-amount">${task.budget || 0}</span>
            <span className="task-map-popup-price-label">USD</span>
          </div>

          <div className="task-map-popup-meta">
            <span className="task-map-popup-location">
              {task.is_remote ? (
                <Globe size={12} />
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              )}
              {locationText}
            </span>
            {task.applicant_count > 0 && (
              <span className="task-map-popup-applicants">
                <Users size={12} />
                {task.applicant_count} applied
              </span>
            )}
          </div>

          {dragState === 'expanded' && task.required_skills && task.required_skills.length > 0 && (
            <div className="task-map-sheet-skills">
              {task.required_skills.slice(0, 5).map((skill, i) => (
                <span key={i} className="task-map-sheet-skill-pill">{skill}</span>
              ))}
              {task.required_skills.length > 5 && (
                <span className="task-map-sheet-skill-pill more">+{task.required_skills.length - 5} more</span>
              )}
            </div>
          )}

          <button className="task-map-popup-cta" onClick={() => onViewDetails(task.id)}>
            View Details
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}

// Component that stores map ref and tracks map move/zoom for popup repositioning
function MapRefAndMoveTracker({ mapRefOut, onMapMove }) {
  const map = useMap();

  useEffect(() => {
    mapRefOut.current = map;
  }, [map, mapRefOut]);

  useEffect(() => {
    const handler = () => onMapMove();
    map.on('move', handler);
    map.on('zoom', handler);
    return () => {
      map.off('move', handler);
      map.off('zoom', handler);
    };
  }, [map, onMapMove]);

  return null;
}

export default function TaskMap({
  tasks = [],
  center = [10.8231, 106.6297],
  zoom = 12,
  radius = null,
  selectedTaskId = null,
  hoveredTaskId = null,
  onTaskSelect = () => {},
  onTaskHover = () => {},
  onBoundsChange = null,
  disableFitBounds = false,
  isMobile = false,
  popupTaskId = null,
  onPopupOpen = () => {},
  onPopupClose = () => {},
}) {
  const selectedTask = tasks.find(t => t.id === selectedTaskId);
  const programmaticMoveRef = useRef(0);
  const mapRef = useRef(null);
  const clusterGroupRef = useRef(null);
  const [popupPosition, setPopupPosition] = useState(null);
  const popupTask = tasks.find(t => t.id === popupTaskId);

  // Compute popup screen position from map coordinates
  const updatePopupPosition = useCallback(() => {
    if (!popupTask || !mapRef.current || isMobile) {
      setPopupPosition(null);
      return;
    }
    const map = mapRef.current;
    if (!popupTask.latitude || !popupTask.longitude) return;
    const point = map.latLngToContainerPoint([popupTask.latitude, popupTask.longitude]);
    setPopupPosition({ x: point.x, y: point.y });
  }, [popupTask, isMobile]);

  useEffect(() => {
    updatePopupPosition();
  }, [updatePopupPosition, popupTaskId]);

  const handleMarkerClick = useCallback((taskId) => {
    if (isMobile) {
      onPopupOpen(taskId);
    } else {
      if (popupTaskId === taskId) {
        onPopupClose();
      } else {
        onPopupOpen(taskId);
      }
    }
  }, [isMobile, popupTaskId, onPopupOpen, onPopupClose]);

  const handleViewDetails = useCallback((taskId) => {
    onTaskSelect(taskId);
  }, [onTaskSelect]);

  const handleClosePopup = useCallback(() => {
    onPopupClose();
  }, [onPopupClose]);

  const validTasks = useMemo(() => tasks.filter(t => t.latitude && t.longitude), [tasks]);

  return (
    <div className="task-map-container">
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
        <MapClickHandler onClosePopup={handleClosePopup} />
        <MapRefAndMoveTracker mapRefOut={mapRef} onMapMove={updatePopupPosition} />

        {/* Radius circle */}
        {radius && center[0] && center[1] && (
          <Circle
            center={center}
            radius={radius * 1000}
            pathOptions={{
              // eslint-disable-next-line irlwork/no-orange-outside-button -- map circle uses brand color
              color: '#E8853D',
              // eslint-disable-next-line irlwork/no-orange-outside-button -- map circle fill uses brand color
              fillColor: '#E8853D',
              fillOpacity: 0.08,
              weight: 2,
              dashArray: '5, 5',
            }}
          />
        )}

        {/* Mobile: clustered markers */}
        {isMobile && (
          <MarkerClusterGroup
            tasks={tasks}
            isMobile={isMobile}
            selectedTaskId={popupTaskId}
            hoveredTaskId={hoveredTaskId}
            onTaskClick={handleMarkerClick}
            onTaskHover={onTaskHover}
            clusterGroupRef={clusterGroupRef}
          />
        )}

        {/* Desktop: individual markers (no clustering) */}
        {!isMobile && validTasks.map(task => (
          <Marker
            key={task.id}
            position={[task.latitude, task.longitude]}
            icon={createTaskIcon(
              task.id === popupTaskId,
              task.id === hoveredTaskId,
              task.budget
            )}
            eventHandlers={{
              click: () => handleMarkerClick(task.id),
              mouseover: () => onTaskHover(task.id),
              mouseout: () => onTaskHover(null),
            }}
          />
        ))}
      </MapContainer>

      {/* Desktop popup card (rendered outside MapContainer for proper React rendering) */}
      {!isMobile && popupTask && popupPosition && (
        <TaskPopupCard
          task={popupTask}
          position={popupPosition}
          onClose={handleClosePopup}
          onViewDetails={handleViewDetails}
        />
      )}

      {/* Mobile bottom sheet */}
      {isMobile && (
        <MobileBottomSheet
          task={popupTask}
          onClose={handleClosePopup}
          onViewDetails={handleViewDetails}
        />
      )}
    </div>
  );
}
