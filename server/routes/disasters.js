import express from 'express';
import { supabase } from '../database/supabase.js';
import { logger } from '../utils/logger.js';
import { mockAuth } from '../middleware/mockAuth.js';

const router = express.Router();

// GET /disasters - List disasters with optional filtering
router.get('/', async (req, res) => {
  try {
    const { tag, owner_id, limit = 50 } = req.query;
    
    let query = supabase
      .from('disasters')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));
    
    if (tag) {
      query = query.contains('tags', [tag]);
    }
    
    if (owner_id) {
      query = query.eq('owner_id', owner_id);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    res.json(data);
  } catch (error) {
    logger.error('Error fetching disasters:', error);
    res.status(500).json({ error: 'Failed to fetch disasters' });
  }
});

// POST /disasters - Create new disaster
router.post('/', mockAuth, async (req, res) => {
  try {
    const { title, location_name, description, tags, lat, lng } = req.body;
    const owner_id = req.user.id;
    
    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }
    
    const disasterData = {
      title,
      location_name,
      description,
      tags: tags || [],
      owner_id,
      audit_trail: [{
        action: 'create',
        user_id: owner_id,
        timestamp: new Date().toISOString()
      }]
    };
    
    // Add location if coordinates provided
    if (lat && lng) {
      disasterData.location = `POINT(${lng} ${lat})`;
    }
    
    const { data, error } = await supabase
      .from('disasters')
      .insert([disasterData])
      .select()
      .single();
    
    if (error) throw error;
    
    // Emit real-time update
    req.io.emit('disaster_updated', { type: 'create', data });
    
    logger.info(`Disaster created: ${data.title} by ${owner_id}`);
    res.status(201).json(data);
  } catch (error) {
    logger.error('Error creating disaster:', error);
    res.status(500).json({ error: 'Failed to create disaster' });
  }
});

// GET /disasters/:id - Get specific disaster
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('disasters')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Disaster not found' });
      }
      throw error;
    }
    
    res.json(data);
  } catch (error) {
    logger.error('Error fetching disaster:', error);
    res.status(500).json({ error: 'Failed to fetch disaster' });
  }
});

// PUT /disasters/:id - Update disaster
router.put('/:id', mockAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, location_name, description, tags, lat, lng } = req.body;
    const user_id = req.user.id;
    
    // Get current disaster for audit trail
    const { data: currentDisaster, error: fetchError } = await supabase
      .from('disasters')
      .select('audit_trail')
      .eq('id', id)
      .single();
    
    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Disaster not found' });
      }
      throw fetchError;
    }
    
    const updateData = {
      updated_at: new Date().toISOString(),
      audit_trail: [
        ...(currentDisaster.audit_trail || []),
        {
          action: 'update',
          user_id,
          timestamp: new Date().toISOString()
        }
      ]
    };
    
    if (title) updateData.title = title;
    if (location_name) updateData.location_name = location_name;
    if (description) updateData.description = description;
    if (tags) updateData.tags = tags;
    if (lat && lng) {
      updateData.location = `POINT(${lng} ${lat})`;
    }
    
    const { data, error } = await supabase
      .from('disasters')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    // Emit real-time update
    req.io.emit('disaster_updated', { type: 'update', data });
    
    logger.info(`Disaster updated: ${data.title} by ${user_id}`);
    res.json(data);
  } catch (error) {
    logger.error('Error updating disaster:', error);
    res.status(500).json({ error: 'Failed to update disaster' });
  }
});

// DELETE /disasters/:id - Delete disaster
router.delete('/:id', mockAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;
    
    const { data, error } = await supabase
      .from('disasters')
      .delete()
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Disaster not found' });
      }
      throw error;
    }
    
    // Emit real-time update
    req.io.emit('disaster_updated', { type: 'delete', data });
    
    logger.info(`Disaster deleted: ${data.title} by ${user_id}`);
    res.json({ message: 'Disaster deleted successfully' });
  } catch (error) {
    logger.error('Error deleting disaster:', error);
    res.status(500).json({ error: 'Failed to delete disaster' });
  }
});

export default router;