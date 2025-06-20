import express from 'express';
import { logger } from '../utils/logger.js';
import { getCachedData, setCachedData } from '../utils/cache.js';
import { callGeminiAPI } from '../services/gemini.js';
import { geocodeLocation } from '../services/geocoding.js';

const router = express.Router();

// POST /geocoding/extract-and-geocode - Extract location from text and convert to coordinates
router.post('/extract-and-geocode', async (req, res) => {
  try {
    const { text, description } = req.body;
    
    if (!text && !description) {
      return res.status(400).json({ error: 'text or description is required' });
    }
    
    const inputText = text || description;
    const cacheKey = `geocode_${Buffer.from(inputText).toString('base64').slice(0, 32)}`;
    
    // Check cache first
    const cachedResult = await getCachedData(cacheKey);
    if (cachedResult) {
      logger.info(`Geocoding result served from cache`);
      return res.json(cachedResult);
    }
    
    // Step 1: Extract location using Gemini API
    const locationExtractionPrompt = `
    Extract location names from the following text. Look for:
    - City names, neighborhoods, districts
    - Street names, addresses
    - Landmarks, buildings
    - Geographic references
    
    Text: "${inputText}"
    
    Respond with a JSON object containing:
    - locations: array of location names found
    - primary_location: the most specific/relevant location
    - confidence: how confident you are (low/medium/high)
    
    If no clear location is found, return empty locations array.
    `;
    
    let extractedLocations;
    try {
      const geminiResponse = await callGeminiAPI(locationExtractionPrompt);
      extractedLocations = parseLocationExtractionResponse(geminiResponse);
    } catch (error) {
      logger.warn('Gemini location extraction failed, using fallback:', error.message);
      extractedLocations = extractLocationsFallback(inputText);
    }
    
    // Step 2: Geocode the primary location
    let geocodingResult = null;
    if (extractedLocations.primary_location) {
      try {
        geocodingResult = await geocodeLocation(extractedLocations.primary_location);
      } catch (error) {
        logger.warn('Geocoding failed:', error.message);
      }
    }
    
    const result = {
      input_text: inputText,
      extracted_locations: extractedLocations,
      geocoding: geocodingResult,
      coordinates: geocodingResult ? {
        lat: geocodingResult.lat,
        lng: geocodingResult.lng
      } : null,
      timestamp: new Date().toISOString()
    };
    
    // Cache the result
    await setCachedData(cacheKey, result, 3600); // 1 hour TTL
    
    logger.info(`Location extraction and geocoding completed for: ${extractedLocations.primary_location || 'no location found'}`);
    res.json(result);
  } catch (error) {
    logger.error('Error in geocoding pipeline:', error);
    res.status(500).json({ error: 'Failed to extract and geocode location' });
  }
});

// POST /geocoding/coordinates - Direct geocoding of location name
router.post('/coordinates', async (req, res) => {
  try {
    const { location_name } = req.body;
    
    if (!location_name) {
      return res.status(400).json({ error: 'location_name is required' });
    }
    
    const cacheKey = `direct_geocode_${Buffer.from(location_name).toString('base64').slice(0, 32)}`;
    
    // Check cache first
    const cachedResult = await getCachedData(cacheKey);
    if (cachedResult) {
      logger.info(`Direct geocoding result served from cache for: ${location_name}`);
      return res.json(cachedResult);
    }
    
    const geocodingResult = await geocodeLocation(location_name);
    
    const result = {
      location_name,
      coordinates: geocodingResult ? {
        lat: geocodingResult.lat,
        lng: geocodingResult.lng
      } : null,
      geocoding: geocodingResult,
      timestamp: new Date().toISOString()
    };
    
    // Cache the result
    await setCachedData(cacheKey, result, 3600); // 1 hour TTL
    
    logger.info(`Direct geocoding completed for: ${location_name}`);
    res.json(result);
  } catch (error) {
    logger.error('Error in direct geocoding:', error);
    res.status(500).json({ error: 'Failed to geocode location' });
  }
});

// Helper function to parse Gemini location extraction response
function parseLocationExtractionResponse(geminiResponse) {
  try {
    const jsonMatch = geminiResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    // Fallback parsing
    return {
      locations: [],
      primary_location: null,
      confidence: 'low'
    };
  } catch (error) {
    logger.warn('Failed to parse Gemini location extraction response:', error);
    return extractLocationsFallback(geminiResponse);
  }
}

// Fallback location extraction using simple pattern matching
function extractLocationsFallback(text) {
  const locationPatterns = [
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s*([A-Z]{2})\b/g, // City, State
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd)\b/gi,
    /\b(?:downtown|uptown|north|south|east|west)\s+([A-Z][a-z]+)\b/gi
  ];
  
  const locations = [];
  
  locationPatterns.forEach(pattern => {
    const matches = [...text.matchAll(pattern)];
    matches.forEach(match => {
      if (match[1]) locations.push(match[1].trim());
    });
  });
  
  return {
    locations: [...new Set(locations)], // remove duplicates
    primary_location: locations[0] || null,
    confidence: locations.length > 0 ? 'medium' : 'low',
    method: 'pattern_matching_fallback'
  };
}

export default router;