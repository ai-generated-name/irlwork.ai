/**
 * Backfill script for existing user and task locations
 * Uses cities.json to geocode existing city strings
 *
 * Usage: node backfill-locations.js
 *
 * This script:
 * 1. Loads cities.json and admin1.json for city lookups
 * 2. Finds users with city but no latitude/longitude
 * 3. Matches city strings to cities.json entries
 * 4. Updates latitude, longitude, country, country_code
 * 5. Repeats for tasks table
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Load cities data
const cities = require('cities.json');
const admin1 = require('cities.json/admin1.json');

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Country code to country name mapping
const COUNTRY_NAMES = {
  'US': 'USA', 'GB': 'UK', 'CA': 'Canada', 'AU': 'Australia', 'NZ': 'New Zealand',
  'FR': 'France', 'DE': 'Germany', 'IT': 'Italy', 'ES': 'Spain', 'JP': 'Japan',
  'CN': 'China', 'IN': 'India', 'BR': 'Brazil', 'MX': 'Mexico', 'AR': 'Argentina',
  'ZA': 'South Africa', 'NG': 'Nigeria', 'EG': 'Egypt', 'KE': 'Kenya',
  'NL': 'Netherlands', 'BE': 'Belgium', 'SE': 'Sweden', 'NO': 'Norway',
  'DK': 'Denmark', 'FI': 'Finland', 'PL': 'Poland', 'RU': 'Russia', 'UA': 'Ukraine',
  'TR': 'Turkey', 'SA': 'Saudi Arabia', 'AE': 'UAE', 'IL': 'Israel', 'SG': 'Singapore',
  'MY': 'Malaysia', 'TH': 'Thailand', 'PH': 'Philippines', 'ID': 'Indonesia',
  'VN': 'Vietnam', 'KR': 'South Korea', 'PK': 'Pakistan', 'BD': 'Bangladesh',
  'CL': 'Chile', 'CO': 'Colombia', 'PE': 'Peru', 'VE': 'Venezuela', 'PT': 'Portugal',
  'GR': 'Greece', 'CZ': 'Czech Republic', 'AT': 'Austria', 'CH': 'Switzerland', 'IE': 'Ireland'
};

// Build admin1 lookup map
const admin1Map = new Map();
admin1.forEach(a => admin1Map.set(a.code, a.name));

// Build city index for fast lookup
const cityIndex = new Map();
cities.forEach(city => {
  const key = city.name.toLowerCase();
  if (!cityIndex.has(key)) {
    cityIndex.set(key, []);
  }
  cityIndex.get(key).push(city);
});

/**
 * Find best matching city from cities.json
 * @param {string} cityString - City string to match (e.g., "San Francisco" or "San Francisco, CA")
 * @returns {object|null} Matched city with lat, lng, country, etc.
 */
function findBestCityMatch(cityString) {
  if (!cityString) return null;

  // Parse "City, State" or "City, Country" patterns
  const parts = cityString.split(',').map(p => p.trim());
  const cityName = parts[0].toLowerCase();
  const stateOrCountry = parts[1]?.toLowerCase();

  // Look up in index
  const candidates = cityIndex.get(cityName) || [];

  if (candidates.length === 0) {
    // Try partial match
    for (const [key, value] of cityIndex.entries()) {
      if (key.includes(cityName) || cityName.includes(key)) {
        candidates.push(...value);
      }
    }
  }

  if (candidates.length === 0) {
    return null;
  }

  // If only one candidate, use it
  if (candidates.length === 1) {
    return formatCityResult(candidates[0]);
  }

  // Try to match state/country if provided
  if (stateOrCountry) {
    for (const city of candidates) {
      const countryName = COUNTRY_NAMES[city.country]?.toLowerCase() || city.country.toLowerCase();
      const stateName = admin1Map.get(`${city.country}.${city.admin1}`)?.toLowerCase();

      if (countryName === stateOrCountry ||
          city.country.toLowerCase() === stateOrCountry ||
          stateName === stateOrCountry ||
          city.admin1?.toLowerCase() === stateOrCountry) {
        return formatCityResult(city);
      }
    }
  }

  // Default to first candidate (usually most populous)
  return formatCityResult(candidates[0]);
}

function formatCityResult(city) {
  const countryName = COUNTRY_NAMES[city.country] || city.country;
  const stateName = admin1Map.get(`${city.country}.${city.admin1}`) || null;

  return {
    latitude: parseFloat(city.lat),
    longitude: parseFloat(city.lng),
    country: countryName,
    country_code: city.country,
    state: stateName,
    state_code: city.admin1 || null
  };
}

async function backfillUsers() {
  console.log('\n=== Backfilling Users ===');

  // Find users with city but no latitude
  const { data: users, error } = await supabase
    .from('users')
    .select('id, city')
    .is('latitude', null)
    .not('city', 'is', null);

  if (error) {
    console.error('Error fetching users:', error.message);
    return { updated: 0, failed: 0 };
  }

  console.log(`Found ${users?.length || 0} users to backfill`);

  let updated = 0;
  let failed = 0;

  for (const user of users || []) {
    const match = findBestCityMatch(user.city);

    if (match) {
      const { error: updateError } = await supabase
        .from('users')
        .update({
          latitude: match.latitude,
          longitude: match.longitude,
          country: match.country,
          country_code: match.country_code
        })
        .eq('id', user.id);

      if (updateError) {
        console.error(`Failed to update user ${user.id}:`, updateError.message);
        failed++;
      } else {
        console.log(`Updated user ${user.id}: ${user.city} -> ${match.latitude}, ${match.longitude}`);
        updated++;
      }
    } else {
      console.log(`No match found for user ${user.id}: "${user.city}"`);
      failed++;
    }
  }

  return { updated, failed };
}

async function backfillTasks() {
  console.log('\n=== Backfilling Tasks ===');

  // Find tasks with location but no latitude
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('id, location')
    .is('latitude', null)
    .not('location', 'is', null);

  if (error) {
    console.error('Error fetching tasks:', error.message);
    return { updated: 0, failed: 0 };
  }

  console.log(`Found ${tasks?.length || 0} tasks to backfill`);

  let updated = 0;
  let failed = 0;

  for (const task of tasks || []) {
    const match = findBestCityMatch(task.location);

    if (match) {
      const { error: updateError } = await supabase
        .from('tasks')
        .update({
          latitude: match.latitude,
          longitude: match.longitude,
          country: match.country,
          country_code: match.country_code
        })
        .eq('id', task.id);

      if (updateError) {
        console.error(`Failed to update task ${task.id}:`, updateError.message);
        failed++;
      } else {
        console.log(`Updated task ${task.id}: ${task.location} -> ${match.latitude}, ${match.longitude}`);
        updated++;
      }
    } else {
      console.log(`No match found for task ${task.id}: "${task.location}"`);
      failed++;
    }
  }

  return { updated, failed };
}

async function main() {
  console.log('Starting location backfill...');
  console.log(`Loaded ${cities.length} cities from cities.json`);
  console.log(`Loaded ${admin1.length} admin1 regions`);

  const userResults = await backfillUsers();
  const taskResults = await backfillTasks();

  console.log('\n=== Summary ===');
  console.log(`Users: ${userResults.updated} updated, ${userResults.failed} failed`);
  console.log(`Tasks: ${taskResults.updated} updated, ${taskResults.failed} failed`);
  console.log('Done!');
}

main().catch(console.error);
