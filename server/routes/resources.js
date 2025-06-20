import express from 'express';
import { supabase } from '../database/supabase.js';
import { logger } from '../utils/logger.js';
import { getCachedData, setCachedData } from '../utils/cache.js';

const router = express.Router();

// GET /resources/:disasterId - Get resources for a disaster with geospatial filtering
router.get('/:disasterId', async (req, res) => {
  try {
    const { disasterId } = req.params;
    const { lat, lon, radius = 10000 } = req.query; // radius in meters, default 10km
    
    const cacheKey = `resources_${disasterId}_${lat}_${lon}_${radius}`;
    
    // Check cache first
    const cachedData = await getCachedData(cacheKey);
    if (cachedData) {
      logger.info(`Resources data served from cache for disaster: ${disasterId}`);
      return res.json(cachedData);
    }
    
    let query = supabase
      .from('resources')
      .select('*')
      .eq('disaster_id', disasterId);
    
    // Add geospatial filtering if coordinates provided
    if (lat && lon) {
      // Using PostGIS ST_DWithin for proximity search
      const { data: spatialResources, error: spatialError } = await supabase
        .rpc('get_nearby_resources', {
          disaster_id: disasterId,
          center_lat: parseFloat(lat),
          center_lon: parseFloat(lon),
          radius_meters: parseInt(radius)
        });
      
      if (spatialError) {
        logger.warn('Spatial query failed, falling back to all resources:', spatialError);
        // Fallback to regular query without spatial filtering
      } else if (spatialResources) {
        const result = {
          disaster_id: disasterId,
          resources: spatialResources,
          query_params: { lat, lon, radius },
          total_count: spatialResources.length
        };
        
        await setCachedData(cacheKey, result, 600); // 10 minutes TTL
        req.io.to(`disaster_${disasterId}`).emit('resources_updated', result);
        
        return res.json(result);
      }
    }
    
    // Regular query without spatial filtering
    const { data, error } = await query;
    
    if (error) throw error;
    
    // If no resources exist, create some sample resources
    if (data.length === 0) {
      const sampleResources = await createSampleResources(disasterId, lat, lon);
      const result = {
        disaster_id: disasterId,
        resources: sampleResources,
        query_params: { lat, lon, radius },
        total_count: sampleResources.length,
        note: 'Sample resources created for demonstration'
      };
      
      await setCachedData(cacheKey, result, 600);
      req.io.to(`disaster_${disasterId}`).emit('resources_updated', result);
      
      return res.json(result);
    }
    
    const result = {
      disaster_id: disasterId,
      resources: data,
      query_params: { lat, lon, radius },
      total_count: data.length
    };
    
    await setCachedData(cacheKey, result, 600);
    req.io.to(`disaster_${disasterId}`).emit('resources_updated', result);
    
    logger.info(`Resources processed for disaster: ${disasterId}`);
    res.json(result);
  } catch (error) {
    logger.error('Error fetching resources:', error);
    res.status(500).json({ error: 'Failed to fetch resources' });
  }
});

// POST /resources - Create new resource
router.post('/', async (req, res) => {
  try {
    const { disaster_id, name, location_name, type, lat, lng } = req.body;
    
    if (!disaster_id || !name || !type) {
      return res.status(400).json({ error: 'disaster_id, name, and type are required' });
    }
    
    const resourceData = {
      disaster_id,
      name,
      location_name,
      type
    };
    
    // Add location if coordinates provided
    if (lat && lng) {
      resourceData.location = `POINT(${lng} ${lat})`;
    }
    
    const { data, error } = await supabase
      .from('resources')
      .insert([resourceData])
      .select()
      .single();
    
    if (error) throw error;
    
    // Emit real-time update
    req.io.to(`disaster_${disaster_id}`).emit('resources_updated', { 
      type: 'create', 
      data,
      disaster_id 
    });
    
    logger.info(`Resource created: ${data.name} for disaster ${disaster_id}`);
    res.status(201).json(data);
  } catch (error) {
    logger.error('Error creating resource:', error);
    res.status(500).json({ error: 'Failed to create resource' });
  }
});

// Helper function to create sample resources for demonstration
async function createSampleResources(disasterId, lat, lon) {
  const sampleResources = [
    {
      disaster_id: disasterId,
      name: 'Red Cross Emergency Shelter',
      location_name: 'Community Center',
      type: 'shelter'
    },
    {
      disaster_id: disasterId,
      name: 'Mobile Medical Unit',
      location_name: 'Main Street Parking',
      type: 'medical'
    },
    {
      disaster_id: disasterId,
      name: 'Food Distribution Point',
      location_name: 'City Hall',
      type: 'food'
    },
    {
      disaster_id: disasterId,
      name: 'Emergency Water Station',
      location_name: 'Central Park',
      type: 'water'
    }
  ];
  
  // Add coordinates if provided (offset slightly for variety)
  if (lat && lon) {
    sampleResources.forEach((resource, index) => {
      const offsetLat = parseFloat(lat) + (Math.random() - 0.5) * 0.01;
      const offsetLon = parseFloat(lon) + (Math.random() - 0.5) * 0.01;
      resource.location = `POINT(${offsetLon} ${offsetLat})`;
    });
  }
  
  const { data, error } = await supabase
    .from('resources')
    .insert(sampleResources)
    .select();
  
  if (error) {
    logger.error('Error creating sample resources:', error);
    return [];
  }
  
  return data;
}

export default router;