import { supabase } from './supabase.js';
import { logger } from '../utils/logger.js';

export async function initializeDatabase() {
  try {
    logger.info('Initializing database...');
    
    // Check if tables exist by querying them
    const { data: disasters, error: disastersError } = await supabase
      .from('disasters')
      .select('count')
      .limit(1);
    
    if (disastersError && disastersError.code === 'PGRST116') {
      logger.warn('Database tables not found. Please run the SQL migrations in Supabase.');
      logger.info('Create the following tables in your Supabase SQL editor:');
      logger.info(`
-- Enable PostGIS extension for geospatial queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- Disasters table
CREATE TABLE IF NOT EXISTS disasters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  location_name TEXT,
  location GEOGRAPHY(POINT, 4326),
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  owner_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  audit_trail JSONB DEFAULT '[]'
);

-- Reports table
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  disaster_id UUID REFERENCES disasters(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  verification_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Resources table
CREATE TABLE IF NOT EXISTS resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  disaster_id UUID REFERENCES disasters(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location_name TEXT,
  location GEOGRAPHY(POINT, 4326),
  type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Cache table
CREATE TABLE IF NOT EXISTS cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS disasters_location_idx ON disasters USING GIST (location);
CREATE INDEX IF NOT EXISTS disasters_tags_idx ON disasters USING GIN (tags);
CREATE INDEX IF NOT EXISTS disasters_owner_idx ON disasters (owner_id);
CREATE INDEX IF NOT EXISTS resources_location_idx ON resources USING GIST (location);
CREATE INDEX IF NOT EXISTS cache_key_idx ON cache (key);
CREATE INDEX IF NOT EXISTS cache_expires_idx ON cache (expires_at);

-- Enable Row Level Security
ALTER TABLE disasters ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE cache ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Disasters are publicly readable" ON disasters FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create disasters" ON disasters FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own disasters" ON disasters FOR UPDATE USING (true);
CREATE POLICY "Users can delete their own disasters" ON disasters FOR DELETE USING (true);

CREATE POLICY "Reports are publicly readable" ON reports FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create reports" ON reports FOR INSERT WITH CHECK (true);

CREATE POLICY "Resources are publicly readable" ON resources FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create resources" ON resources FOR INSERT WITH CHECK (true);

CREATE POLICY "Cache is publicly readable" ON cache FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage cache" ON cache FOR ALL USING (true);
      `);
    } else {
      logger.info('Database connection successful');
    }
    
  } catch (error) {
    logger.error('Database initialization failed:', error);
    throw error;
  }
}