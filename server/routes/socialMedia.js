import express from 'express';
import { supabase } from '../database/supabase.js';
import { logger } from '../utils/logger.js';
import { getCachedData, setCachedData } from '../utils/cache.js';

const router = express.Router();

// Mock social media data for testing
const generateMockSocialMediaData = (disasterTitle, tags) => {
  const mockPosts = [
    {
      id: `post_${Date.now()}_1`,
      user: 'emergency_responder',
      content: `#${tags[0] || 'disaster'}relief Coordinating response for ${disasterTitle}. Resources needed in affected areas.`,
      timestamp: new Date().toISOString(),
      urgency: 'high',
      location: 'Field Team Alpha'
    },
    {
      id: `post_${Date.now()}_2`,
      user: 'local_resident',
      content: `Need supplies in the area. #help #${tags[0] || 'disaster'} Please share!`,
      timestamp: new Date(Date.now() - 300000).toISOString(),
      urgency: 'medium',
      location: 'Community Center'
    },
    {
      id: `post_${Date.now()}_3`,
      user: 'relief_volunteer',
      content: `Shelter available at Main St Community Center. Can accommodate 50 people. #shelter #${tags[0] || 'disaster'}`,
      timestamp: new Date(Date.now() - 600000).toISOString(),
      urgency: 'low',
      location: 'Main St Community Center'
    },
    {
      id: `post_${Date.now()}_4`,
      user: 'citizen_reporter',
      content: `URGENT: Road closures on Highway 101. Alternative routes recommended. #traffic #${tags[0] || 'disaster'} #SOS`,
      timestamp: new Date(Date.now() - 900000).toISOString(),
      urgency: 'high',
      location: 'Highway 101'
    }
  ];
  
  return mockPosts;
};

// GET /social-media/:disasterId - Get social media reports for a disaster
router.get('/:disasterId', async (req, res) => {
  try {
    const { disasterId } = req.params;
    const cacheKey = `social_media_${disasterId}`;
    
    // Check cache first
    const cachedData = await getCachedData(cacheKey);
    if (cachedData) {
      logger.info(`Social media data served from cache for disaster: ${disasterId}`);
      return res.json(cachedData);
    }
    
    // Get disaster info for context
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
    
    // Generate mock social media data (in real implementation, this would call Twitter API, etc.)
    const socialMediaData = generateMockSocialMediaData(disaster.title, disaster.tags);
    
    // Classify posts by urgency and keywords
    const classifiedPosts = socialMediaData.map(post => ({
      ...post,
      priority: classifyUrgency(post.content),
      keywords: extractKeywords(post.content)
    }));
    
    const result = {
      disaster_id: disasterId,
      posts: classifiedPosts,
      summary: {
        total_posts: classifiedPosts.length,
        urgent_posts: classifiedPosts.filter(p => p.urgency === 'high').length,
        last_updated: new Date().toISOString()
      }
    };
    
    // Cache the result
    await setCachedData(cacheKey, result, 300); // 5 minutes TTL for social media
    
    // Emit real-time update
    req.io.to(`disaster_${disasterId}`).emit('social_media_updated', result);
    
    logger.info(`Social media data processed for disaster: ${disasterId}`);
    res.json(result);
  } catch (error) {
    logger.error('Error fetching social media data:', error);
    res.status(500).json({ error: 'Failed to fetch social media data' });
  }
});

// Helper function to classify urgency based on keywords
function classifyUrgency(content) {
  const urgentKeywords = ['urgent', 'emergency', 'sos', 'help', 'critical', 'immediate'];
  const mediumKeywords = ['need', 'request', 'assistance', 'support'];
  
  const lowerContent = content.toLowerCase();
  
  if (urgentKeywords.some(keyword => lowerContent.includes(keyword))) {
    return 'high';
  } else if (mediumKeywords.some(keyword => lowerContent.includes(keyword))) {
    return 'medium';
  }
  return 'low';
}

// Helper function to extract relevant keywords
function extractKeywords(content) {
  const keywords = [];
  const patterns = [
    /\#\w+/g, // hashtags
    /\b(food|water|shelter|medical|supplies|rescue|evacuation)\b/gi,
    /\b(road|highway|bridge|building|hospital|school)\b/gi
  ];
  
  patterns.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      keywords.push(...matches.map(m => m.toLowerCase()));
    }
  });
  
  return [...new Set(keywords)]; // remove duplicates
}

export default router;