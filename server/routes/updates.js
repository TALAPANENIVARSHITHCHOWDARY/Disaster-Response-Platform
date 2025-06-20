import express from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { logger } from '../utils/logger.js';
import { getCachedData, setCachedData } from '../utils/cache.js';

const router = express.Router();

// Mock official updates for demonstration
const generateMockOfficialUpdates = (disasterTitle) => {
  return [
    {
      id: `update_${Date.now()}_1`,
      source: 'FEMA',
      title: `Emergency Declaration for ${disasterTitle}`,
      content: 'Federal emergency declaration approved. Disaster assistance resources being deployed to affected areas.',
      url: 'https://www.fema.gov/disaster/current',
      timestamp: new Date().toISOString(),
      priority: 'high'
    },
    {
      id: `update_${Date.now()}_2`,
      source: 'Red Cross',
      title: 'Shelter Operations Update',
      content: 'Multiple emergency shelters operational with capacity for 500+ individuals. Hot meals and supplies available.',
      url: 'https://www.redcross.org/get-help/disaster-relief-and-recovery-services',
      timestamp: new Date(Date.now() - 1800000).toISOString(),
      priority: 'medium'
    },
    {
      id: `update_${Date.now()}_3`,
      source: 'Local Emergency Management',
      title: 'Transportation and Road Updates',
      content: 'Major roadways cleared. Public transportation resuming limited service. Check local advisories for routes.',
      url: 'https://example.com/emergency-management',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      priority: 'medium'
    },
    {
      id: `update_${Date.now()}_4`,
      source: 'National Weather Service',
      title: 'Weather Advisory Update',
      content: 'Conditions improving. No additional severe weather expected in the next 48 hours.',
      url: 'https://weather.gov',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      priority: 'low'
    }
  ];
};

// GET /updates/:disasterId - Get official updates for a disaster
router.get('/:disasterId', async (req, res) => {
  try {
    const { disasterId } = req.params;
    const cacheKey = `official_updates_${disasterId}`;
    
    // Check cache first
    const cachedData = await getCachedData(cacheKey);
    if (cachedData) {
      logger.info(`Official updates served from cache for disaster: ${disasterId}`);
      return res.json(cachedData);
    }
    
    // Get disaster info for context
    const { supabase } = await import('../database/supabase.js');
    const { data: disaster, error: disasterError } = await supabase
      .from('disasters')
      .select('title, tags')
      .eq('id', disasterId)
      .single();
    
    if (disasterError) {
      if (disasterError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Disaster not found' });
      }
      throw disasterError;
    }
    
    // Generate mock official updates (in production, this would scrape official websites)
    const officialUpdates = generateMockOfficialUpdates(disaster.title);
    
    // Try to fetch real data from official sources (with fallback to mock data)
    let realUpdates = [];
    try {
      realUpdates = await fetchOfficialUpdates(disaster.tags);
    } catch (error) {
      logger.warn('Failed to fetch real official updates, using mock data:', error.message);
    }
    
    const allUpdates = [...realUpdates, ...officialUpdates];
    
    const result = {
      disaster_id: disasterId,
      updates: allUpdates.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
      summary: {
        total_updates: allUpdates.length,
        high_priority: allUpdates.filter(u => u.priority === 'high').length,
        sources: [...new Set(allUpdates.map(u => u.source))],
        last_updated: new Date().toISOString()
      }
    };
    
    // Cache the result
    await setCachedData(cacheKey, result, 1800); // 30 minutes TTL for official updates
    
    logger.info(`Official updates processed for disaster: ${disasterId}`);
    res.json(result);
  } catch (error) {
    logger.error('Error fetching official updates:', error);
    res.status(500).json({ error: 'Failed to fetch official updates' });
  }
});

// Helper function to fetch real official updates (example implementation)
async function fetchOfficialUpdates(tags) {
  const updates = [];
  
  try {
    // Example: Fetch from FEMA RSS feed or API
    // In a real implementation, you would scrape or call official APIs
    const femaUrl = 'https://www.fema.gov/about/news-multimedia/news-stories';
    
    // Mock implementation - in reality, you'd use axios and cheerio to scrape
    logger.info('Attempting to fetch real official updates...');
    
    // For demonstration, we'll just return empty array and rely on mock data
    return [];
  } catch (error) {
    logger.error('Error fetching real official updates:', error);
    return [];
  }
}

export default router;