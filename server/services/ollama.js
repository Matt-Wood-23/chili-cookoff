const axios = require('axios');

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';

class OllamaService {
  constructor() {
    this.client = axios.create({
      baseURL: OLLAMA_HOST,
      timeout: 120000, // 2 minutes timeout for OCR processing
    });
  }

  async testConnection() {
    try {
      const response = await this.client.get('/api/tags');
      return response.status === 200;
    } catch (error) {
      console.log('⚠️  Ollama connection failed:', error.message);
      return false;
    }
  }

  async getAvailableModels() {
    try {
      const response = await this.client.get('/api/tags');
      return response.data.models || [];
    } catch (error) {
      console.error('Error fetching models:', error.message);
      return [];
    }
  }

  async extractScoresheetData(imageBase64, chiliName = '') {
    try {
      const prompt = `You are an OCR system for chili cook-off scoresheets. Extract the following data from this image and return ONLY valid JSON format:

{
  "chili_name": "",
  "heat": 0,
  "flavor": 0,
  "texture": 0,
  "presentation": 0,
  "overall": 0,
  "comments": ""
}

Instructions:
1. Rate each category on a scale of 1-10 (use integers)
2. If chili name is visible, extract it
3. If you can't read a rating clearly, use 0
4. Only return the JSON, no other text or explanations
5. If no ratings are visible, set all ratings to 0

${chiliName ? `This scoresheet is for: ${chiliName}` : ''}

Only return valid JSON.`;

      const response = await this.client.post('/api/generate', {
        model: 'qwen2.5-vl:3b',
        prompt: prompt,
        images: [imageBase64],
        stream: false,
        options: {
          temperature: 0.1,
          num_predict: 200
        }
      });

      const extractedText = response.data.response.trim();
      
      // Try to parse JSON from the response
      let parsedData;
      try {
        parsedData = JSON.parse(extractedText);
      } catch (jsonError) {
        // Try to extract JSON from markdown code blocks
        const jsonMatch = extractedText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          parsedData = JSON.parse(jsonMatch[1].trim());
        } else {
          // Try to find JSON-like content
          const braceMatch = extractedText.match(/\{[\s\S]*\}/);
          if (braceMatch) {
            parsedData = JSON.parse(braceMatch[0]);
          } else {
            throw new Error('Could not extract valid JSON from OCR response');
          }
        }
      }

      // Validate and sanitize the extracted data
      return {
        chili_name: parsedData.chili_name || chiliName || '',
        heat: Math.max(0, Math.min(10, parseInt(parsedData.heat) || 0)),
        flavor: Math.max(0, Math.min(10, parseInt(parsedData.flavor) || 0)),
        texture: Math.max(0, Math.min(10, parseInt(parsedData.texture) || 0)),
        presentation: Math.max(0, Math.min(10, parseInt(parsedData.presentation) || 0)),
        overall: Math.max(0, Math.min(10, parseInt(parsedData.overall) || 0)),
        comments: parsedData.comments || '',
        confidence: 0.8 // Since we're using advanced vision model
      };

    } catch (error) {
      console.error('OCR extraction failed:', error.message);
      
      // Return fallback data when OCR fails
      return {
        chili_name: chiliName || '',
        heat: 0,
        flavor: 0,
        texture: 0,
        presentation: 0,
        overall: 0,
        comments: 'OCR processing failed - manual entry required',
        confidence: 0,
        error: error.message
      };
    }
  }

  async processImageFile(imageBuffer, chiliName = '') {
    try {
      // Convert buffer to base64
      const base64 = imageBuffer.toString('base64');
      const mimeType = 'image/jpeg'; // Assume JPEG, could be detected from buffer
      
      const base64Data = `data:${mimeType};base64,${base64}`;
      
      return await this.extractScoresheetData(base64, chiliName);
    } catch (error) {
      console.error('Error processing image file:', error.message);
      return {
        chili_name: chiliName || '',
        heat: 0,
        flavor: 0,
        texture: 0,
        presentation: 0,
        overall: 0,
        comments: 'File processing failed',
        confidence: 0,
        error: error.message
      };
    }
  }

  async processMultipleImages(imageBuffers, chiliNames = []) {
    try {
      const results = [];
      
      for (let i = 0; i < imageBuffers.length; i++) {
        const chiliName = chiliNames[i] || '';
        console.log(`Processing image ${i + 1}/${imageBuffers.length} for chili: ${chiliName || 'Unknown'}`);
        
        const result = await this.processImageFile(imageBuffers[i], chiliName);
        results.push({
          ...result,
          filename: `image_${i + 1}`
        });
        
        // Add small delay between requests to avoid overwhelming Ollama
        if (i < imageBuffers.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      return results;
    } catch (error) {
      console.error('Error processing multiple images:', error.message);
      throw error;
    }
  }

  async getSystemInfo() {
    try {
      const response = await this.client.get('/api/version');
      return {
        version: response.data.version,
        models: await this.getAvailableModels(),
        connection: 'success'
      };
    } catch (error) {
      return {
        connection: 'failed',
        error: error.message
      };
    }
  }
}

module.exports = new OllamaService();
