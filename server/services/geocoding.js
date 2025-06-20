import axios from 'axios';
import { logger } from '../utils/logger.js';

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const MAPBOX_ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN;

export async function geocodeLocation(locationName) {
  // Try Google Maps first, then Mapbox, then OpenStreetMap
  const geocoders = [
    () => geocodeWithGoogleMaps(locationName),
    () => geocodeWithMapbox(locationName),
    () => geocodeWithOpenStreetMap(locationName)
  ];
  
  for (const geocoder of geocoders) {
    try {
      const result = await geocoder();
      if (result) {
        return result;
      }
    } catch (error) {
      logger.warn(`Geocoding attempt failed:`, error.message);
      continue;
    }
  }
  
  throw new Error('All geocoding services failed');
}

async function geocodeWithGoogleMaps(locationName) {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error('Google Maps API key not configured');
  }
  
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(locationName)}&key=${GOOGLE_MAPS_API_KEY}`;
  
  const response = await axios.get(url, { timeout: 10000 });
  
  if (response.data.status === 'OK' && response.data.results.length > 0) {
    const result = response.data.results[0];
    return {
      lat: result.geometry.location.lat,
      lng: result.geometry.location.lng,
      formatted_address: result.formatted_address,
      place_id: result.place_id,
      service: 'google_maps'
    };
  }
  
  throw new Error(`Google Maps geocoding failed: ${response.data.status}`);
}

async function geocodeWithMapbox(locationName) {
  if (!MAPBOX_ACCESS_TOKEN) {
    throw new Error('Mapbox access token not configured');
  }
  
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(locationName)}.json?access_token=${MAPBOX_ACCESS_TOKEN}`;
  
  const response = await axios.get(url, { timeout: 10000 });
  
  if (response.data.features && response.data.features.length > 0) {
    const feature = response.data.features[0];
    return {
      lat: feature.center[1],
      lng: feature.center[0],
      formatted_address: feature.place_name,
      place_id: feature.id,
      service: 'mapbox'
    };
  }
  
  throw new Error('Mapbox geocoding returned no results');
}

async function geocodeWithOpenStreetMap(locationName) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationName)}&limit=1`;
  
  const response = await axios.get(url, { 
    timeout: 10000,
    headers: {
      'User-Agent': 'DisasterResponsePlatform/1.0'
    }
  });
  
  if (response.data && response.data.length > 0) {
    const result = response.data[0];
    return {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      formatted_address: result.display_name,
      place_id: result.place_id,
      service: 'openstreetmap'
    };
  }
  
  throw new Error('OpenStreetMap geocoding returned no results');
}