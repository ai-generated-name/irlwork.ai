/**
 * Geographic distance calculation utilities
 * Uses the Haversine formula to calculate great-circle distances between two points on Earth
 */

/**
 * Convert degrees to radians
 * @param {number} degrees - Angle in degrees
 * @returns {number} Angle in radians
 */
function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate distance between two geographic coordinates using the Haversine formula
 *
 * The Haversine formula determines the great-circle distance between two points
 * on a sphere given their longitudes and latitudes.
 *
 * @param {number} lat1 - Latitude of first point (in decimal degrees)
 * @param {number} lon1 - Longitude of first point (in decimal degrees)
 * @param {number} lat2 - Latitude of second point (in decimal degrees)
 * @param {number} lon2 - Longitude of second point (in decimal degrees)
 * @returns {number} Distance in miles
 *
 * @example
 * // Calculate distance from New York to Los Angeles
 * const distance = haversineDistance(40.7128, -74.0060, 34.0522, -118.2437);
 * console.log(distance); // ~2451 miles
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 3959; // Earth's radius in miles (use 6371 for kilometers)

  // Convert coordinates to radians
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const lat1Rad = toRadians(lat1);
  const lat2Rad = toRadians(lat2);

  // Haversine formula
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = R * c; // Distance in miles

  return distance;
}

/**
 * Filter an array of items by distance from a reference point
 *
 * @param {Array} items - Array of objects with latitude and longitude properties
 * @param {number} refLat - Reference point latitude
 * @param {number} refLon - Reference point longitude
 * @param {number} maxRadius - Maximum distance in miles
 * @param {object} options - Optional configuration
 * @param {string} options.latKey - Property name for latitude (default: 'latitude')
 * @param {string} options.lonKey - Property name for longitude (default: 'longitude')
 * @param {boolean} options.addDistance - Whether to add distance property to each item (default: true)
 * @returns {Array} Filtered and sorted array of items within radius, sorted by distance
 *
 * @example
 * const humans = [
 *   { name: 'Alice', latitude: 40.7128, longitude: -74.0060 },
 *   { name: 'Bob', latitude: 34.0522, longitude: -118.2437 }
 * ];
 * const nearby = filterByDistance(humans, 40.7580, -73.9855, 10); // Within 10 miles of Times Square
 */
function filterByDistance(items, refLat, refLon, maxRadius, options = {}) {
  const {
    latKey = 'latitude',
    lonKey = 'longitude',
    addDistance = true
  } = options;

  // Calculate distance for each item
  const itemsWithDistance = items
    .map(item => {
      // Skip items without coordinates
      if (item[latKey] == null || item[lonKey] == null) {
        return { ...item, distance: null };
      }

      const distance = haversineDistance(
        refLat,
        refLon,
        parseFloat(item[latKey]),
        parseFloat(item[lonKey])
      );

      return addDistance ? { ...item, distance } : item;
    })
    .filter(item => {
      // Include items without coordinates (backward compatibility)
      if (item.distance === null) return true;
      // Filter by radius
      return item.distance <= maxRadius;
    })
    .sort((a, b) => {
      // Items without distance go to the end
      if (a.distance === null) return 1;
      if (b.distance === null) return -1;
      // Sort by distance (closest first)
      return a.distance - b.distance;
    });

  return itemsWithDistance;
}

module.exports = {
  haversineDistance,
  filterByDistance,
  toRadians
};
