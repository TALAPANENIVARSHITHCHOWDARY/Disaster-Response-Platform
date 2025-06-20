import React, { useState } from 'react';
import { MapPin, AlertTriangle, Loader2, CheckCircle } from 'lucide-react';

interface CreateDisasterFormProps {
  onDisasterCreated: () => void;
}

const CreateDisasterForm: React.FC<CreateDisasterFormProps> = ({ onDisasterCreated }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location_name: '',
    tags: [] as string[],
    owner_id: 'netrunnerX'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const availableTags = ['flood', 'fire', 'earthquake', 'urgent', 'medical', 'evacuation', 'storm', 'landslide'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      // First, try to extract location and geocode if description contains location info
      let lat = coordinates?.lat;
      let lng = coordinates?.lng;
      
      if (!coordinates && (formData.description || formData.location_name)) {
        setIsGeocoding(true);
        try {
          const geocodeResponse = await fetch('http://localhost:3001/api/geocoding/extract-and-geocode', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              text: formData.location_name || formData.description
            })
          });
          
          const geocodeData = await geocodeResponse.json();
          if (geocodeData.coordinates) {
            lat = geocodeData.coordinates.lat;
            lng = geocodeData.coordinates.lng;
            setCoordinates({ lat, lng });
          }
        } catch (error) {
          console.warn('Geocoding failed:', error);
        }
        setIsGeocoding(false);
      }

      // Create the disaster
      const response = await fetch('http://localhost:3001/api/disasters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${formData.owner_id}`
        },
        body: JSON.stringify({
          ...formData,
          lat,
          lng
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create disaster');
      }

      const data = await response.json();
      
      setMessage({ type: 'success', text: 'Disaster reported successfully!' });
      setFormData({
        title: '',
        description: '',
        location_name: '',
        tags: [],
        owner_id: 'netrunnerX'
      });
      setCoordinates(null);
      onDisasterCreated();
      
      // Clear success message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error creating disaster:', error);
      setMessage({ type: 'error', text: 'Failed to report disaster. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTagToggle = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  const extractLocation = async () => {
    if (!formData.description && !formData.location_name) return;
    
    setIsGeocoding(true);
    try {
      const response = await fetch('http://localhost:3001/api/geocoding/extract-and-geocode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: formData.location_name || formData.description
        })
      });
      
      const data = await response.json();
      if (data.coordinates) {
        setCoordinates(data.coordinates);
        if (data.extracted_locations.primary_location && !formData.location_name) {
          setFormData(prev => ({
            ...prev,
            location_name: data.extracted_locations.primary_location
          }));
        }
        setMessage({ type: 'success', text: 'Location extracted and geocoded successfully!' });
      } else {
        setMessage({ type: 'error', text: 'Could not extract location from the provided text.' });
      }
    } catch (error) {
      console.error('Error extracting location:', error);
      setMessage({ type: 'error', text: 'Failed to extract location. Please try again.' });
    } finally {
      setIsGeocoding(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center space-x-3 mb-6">
          <AlertTriangle className="h-8 w-8 text-red-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Report New Disaster</h2>
            <p className="text-sm text-gray-600">Provide detailed information to coordinate response efforts</p>
          </div>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-md flex items-center space-x-2 ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="h-5 w-5" />
            ) : (
              <AlertTriangle className="h-5 w-5" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Disaster Title *
            </label>
            <input
              type="text"
              id="title"
              required
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="e.g., Manhattan Flash Flood"
            />
          </div>

          <div>
            <label htmlFor="location_name" className="block text-sm font-medium text-gray-700 mb-2">
              Location
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                id="location_name"
                value={formData.location_name}
                onChange={(e) => setFormData(prev => ({ ...prev, location_name: e.target.value }))}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="e.g., Manhattan, NYC"
              />
              <button
                type="button"
                onClick={extractLocation}
                disabled={isGeocoding || (!formData.description && !formData.location_name)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isGeocoding ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MapPin className="h-4 w-4" />
                )}
                <span>{isGeocoding ? 'Locating...' : 'Auto-locate'}</span>
              </button>
            </div>
            {coordinates && (
              <p className="mt-2 text-sm text-green-600">
                ✓ Location geocoded: {coordinates.lat.toFixed(4)}, {coordinates.lng.toFixed(4)}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description *
            </label>
            <textarea
              id="description"
              required
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="Describe the disaster situation, affected areas, and immediate needs..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Disaster Tags
            </label>
            <div className="flex flex-wrap gap-2">
              {availableTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleTagToggle(tag)}
                  className={`px-3 py-1 text-sm rounded-full border transition-colors duration-200 ${
                    formData.tags.includes(tag)
                      ? 'bg-red-100 text-red-800 border-red-300'
                      : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="owner_id" className="block text-sm font-medium text-gray-700 mb-2">
              Reporting As
            </label>
            <select
              id="owner_id"
              value={formData.owner_id}
              onChange={(e) => setFormData(prev => ({ ...prev, owner_id: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
            >
              <option value="netrunnerX">NetRunner X (Admin)</option>
              <option value="reliefAdmin">Relief Administrator</option>
              <option value="fieldWorker">Field Worker</option>
              <option value="volunteer">Volunteer</option>
            </select>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-red-600 text-white py-3 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isSubmitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <AlertTriangle className="h-5 w-5" />
              )}
              <span>{isSubmitting ? 'Reporting...' : 'Report Disaster'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateDisasterForm;