import axios from 'axios';
import { logger } from '../utils/logger.js';

const GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

export async function callGeminiAPI(prompt, imageUrl = null) {
  if (!GEMINI_API_KEY) {
    throw new Error('Google Gemini API key not configured');
  }
  
  try {
    const requestBody = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }]
    };
    
    // Add image if provided (for image analysis)
    if (imageUrl) {
      // Note: In a real implementation, you'd need to handle image data properly
      // This is a simplified version for demonstration
      logger.info(`Image analysis requested for: ${imageUrl}`);
    }
    
    const response = await axios.post(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, requestBody, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 second timeout
    });
    
    if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
      return response.data.candidates[0].content.parts[0].text;
    } else {
      throw new Error('Invalid response format from Gemini API');
    }
  } catch (error) {
    logger.error('Gemini API call failed:', error.message);
    throw new Error(`Gemini API error: ${error.message}`);
  }
}