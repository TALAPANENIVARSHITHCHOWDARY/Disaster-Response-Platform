import { supabase } from '../database/supabase.js';
import { logger } from './logger.js';

export async function getCachedData(key) {
  try {
    const { data, error } = await supabase
      .from('cache')
      .select('value, expires_at')
      .eq('key', key)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        // No data found
        return null;
      }
      throw error;
    }
    
    // Check if cache has expired
    if (new Date(data.expires_at) < new Date()) {
      // Delete expired cache entry
      await supabase
        .from('cache')
        .delete()
        .eq('key', key);
      
      return null;
    }
    
    return data.value;
  } catch (error) {
    logger.error('Error getting cached data:', error);
    return null;
  }
}

export async function setCachedData(key, value, ttlSeconds = 3600) {
  try {
    const expiresAt = new Date(Date.now() + (ttlSeconds * 1000));
    
    const { error } = await supabase
      .from('cache')
      .upsert({
        key,
        value,
        expires_at: expiresAt.toISOString()
      });
    
    if (error) throw error;
    
    logger.debug(`Data cached with key: ${key}, TTL: ${ttlSeconds}s`);
  } catch (error) {
    logger.error('Error setting cached data:', error);
  }
}

export async function clearExpiredCache() {
  try {
    const { error } = await supabase
      .from('cache')
      .delete()
      .lt('expires_at', new Date().toISOString());
    
    if (error) throw error;
    
    logger.info('Expired cache entries cleared');
  } catch (error) {
    logger.error('Error clearing expired cache:', error);
  }
}

// Clean up expired cache entries every hour
setInterval(clearExpiredCache, 60 * 60 * 1000);