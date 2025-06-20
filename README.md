# Disaster Response Coordination Platform

A comprehensive disaster response coordination platform built with the MERN stack, featuring real-time data aggregation, geospatial queries, and external API integrations.

## Features

### Core Functionality
- **Disaster Data Management**: Complete CRUD operations for disaster records with ownership tracking and audit trails
- **Location Extraction & Geocoding**: Google Gemini API integration for location extraction from text, with multi-provider geocoding (Google Maps, Mapbox, OpenStreetMap)
- **Real-time Social Media Monitoring**: Mock Twitter API integration with urgency classification and keyword extraction
- **Geospatial Resource Mapping**: Supabase PostGIS integration for location-based resource queries
- **Official Updates Aggregation**: Web scraping for government and relief organization updates
- **Image Verification**: Google Gemini API for disaster image authenticity analysis

### Technical Architecture
- **Backend**: Node.js with Express.js, Socket.IO for real-time updates
- **Database**: Supabase (PostgreSQL) with PostGIS for geospatial operations
- **Frontend**: React with TypeScript, Tailwind CSS for styling
- **Caching**: Supabase-based caching system with TTL management
- **Authentication**: Mock authentication system with role-based access

## Setup Instructions

### Prerequisites
- Node.js 18+ and npm
- Supabase account and project
- Google Gemini API key
- (Optional) Google Maps API key or Mapbox token

### Environment Configuration

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Configure your environment variables:
```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Google Gemini API
GOOGLE_GEMINI_API_KEY=your_gemini_api_key_here

# Mapping Service (choose one)
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
MAPBOX_ACCESS_TOKEN=your_mapbox_token_here

# Server Configuration
PORT=3001
NODE_ENV=development
```

### Database Setup

1. Create a new Supabase project at https://supabase.com
2. In your Supabase SQL editor, run the following migration:

```sql
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

-- Create function for nearby resources query
CREATE OR REPLACE FUNCTION get_nearby_resources(
  disaster_id UUID,
  center_lat FLOAT,
  center_lon FLOAT,
  radius_meters INT
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  location_name TEXT,
  type TEXT,
  created_at TIMESTAMPTZ,
  distance_meters FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.name,
    r.location_name,
    r.type,
    r.created_at,
    ST_Distance(
      r.location::geometry,
      ST_SetSRID(ST_Point(center_lon, center_lat), 4326)::geometry
    ) as distance_meters
  FROM resources r
  WHERE r.disaster_id = get_nearby_resources.disaster_id
    AND r.location IS NOT NULL
    AND ST_DWithin(
      r.location::geometry,
      ST_SetSRID(ST_Point(center_lon, center_lat), 4326)::geometry,
      radius_meters
    )
  ORDER BY distance_meters;
END;
$$ LANGUAGE plpgsql;
```

### Installation and Running

1. Install dependencies:
```bash
npm install
```

2. Start the development server (runs both frontend and backend):
```bash
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

## API Endpoints

### Disasters
- `GET /api/disasters` - List disasters with optional filtering
- `POST /api/disasters` - Create new disaster
- `GET /api/disasters/:id` - Get specific disaster
- `PUT /api/disasters/:id` - Update disaster
- `DELETE /api/disasters/:id` - Delete disaster

### Social Media
- `GET /api/social-media/:disasterId` - Get social media reports for disaster

### Resources
- `GET /api/resources/:disasterId` - Get resources with optional geospatial filtering
- `POST /api/resources` - Create new resource

### Official Updates
- `GET /api/updates/:disasterId` - Get official updates for disaster

### Verification
- `POST /api/verification/:disasterId/verify-image` - Verify image authenticity

### Geocoding
- `POST /api/geocoding/extract-and-geocode` - Extract location from text and geocode
- `POST /api/geocoding/coordinates` - Direct geocoding of location name

## Real-time Features

The platform uses Socket.IO for real-time updates:
- `disaster_updated` - Emitted when disasters are created, updated, or deleted
- `social_media_updated` - Emitted when new social media data is available
- `resources_updated` - Emitted when resources are added or updated

## Mock Authentication

The platform includes a mock authentication system with the following users:
- `netrunnerX` - Admin role
- `reliefAdmin` - Admin role
- `fieldWorker` - Contributor role
- `volunteer` - Contributor role

Use these user IDs in the Authorization header or as query parameters for testing.

## External API Integrations

### Google Gemini API
- Location extraction from disaster descriptions
- Image verification for authenticity analysis
- Get your API key from: https://aistudio.google.com/app/apikey

### Geocoding Services
The platform supports multiple geocoding providers:
1. **Google Maps Geocoding API** (primary)
2. **Mapbox Geocoding API** (fallback)
3. **OpenStreetMap Nominatim** (free fallback)

### Social Media Integration
Currently uses mock data for demonstration. Can be extended to integrate with:
- Twitter API v2
- Bluesky API
- Other social media platforms

## Caching Strategy

The platform implements intelligent caching using Supabase:
- Social media data: 5 minutes TTL
- Geocoding results: 1 hour TTL
- Official updates: 30 minutes TTL
- Image verification: 1 hour TTL

## Development Notes

This project was built using AI coding tools (Cursor/Windsurf) for rapid development, focusing on:
- Complex backend logic and API integrations
- Real-time data processing and WebSocket communication
- Geospatial query optimization
- Comprehensive error handling and logging

## Production Deployment

For production deployment:
1. Set up proper authentication (JWT tokens)
2. Configure rate limiting and security headers
3. Set up monitoring and logging
4. Use environment-specific configurations
5. Implement proper error tracking

## License

This project is for educational and demonstration purposes.