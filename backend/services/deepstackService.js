const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const { execSync, exec } = require('child_process');

class DeepStackService {
  constructor() {
    this.baseUrl = process.env.DEEPSTACK_URL || 'http://localhost:80';
    this.apiKey = process.env.DEEPSTACK_API_KEY || '';
    this.modelName = process.env.DEEPSTACK_MODEL_NAME || 'nigerian-sign-language';
    this.timeout = 15000; // 15 seconds
  }

  /**
   * Check if DeepStack container is running and responsive
   */
  async checkStatus() {
    try {
      const response = await axios.get(`${this.baseUrl}/v1/vision/list`, {
        timeout: 3000,
        headers: this.apiKey ? { 'api-key': this.apiKey } : {}
      });
      if (response.status === 200) return true;
    } catch {
      // ignore and try root endpoint as a fallback
    }

    try {
      const response = await axios.get(`${this.baseUrl}/`, {
        timeout: 3000,
        headers: this.apiKey ? { 'api-key': this.apiKey } : {}
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  /**
   * Detect Nigerian Sign Language signs from an image file path
   * Uses the custom YOLO model loaded into DeepStack
   */
  async detectSigns(imagePath) {
    if (!fs.existsSync(imagePath)) {
      throw new Error(`Image file not found: ${imagePath}`);
    }

    const formData = new FormData();
    formData.append('image', fs.createReadStream(imagePath));
    if (this.apiKey) formData.append('api_key', this.apiKey);
    formData.append('min_confidence', '0.40');

    const startTime = Date.now();

    const response = await axios.post(
      `${this.baseUrl}/v1/vision/custom/${this.modelName}`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          ...(this.apiKey ? { 'api-key': this.apiKey } : {})
        },
        timeout: this.timeout
      }
    );

    const processingTime = Date.now() - startTime;

    if (!response.data.success) {
      throw new Error(`DeepStack detection failed: ${response.data.error || 'Unknown error'}`);
    }

    const detections = (response.data.predictions || [])
      .filter(p => p.confidence >= 0.40)
      .sort((a, b) => b.confidence - a.confidence)
      .map(p => ({
        label: p.label,
        confidence: p.confidence,
        boundingBox: {
          x1: p.x_min,
          y1: p.y_min,
          x2: p.x_max,
          y2: p.y_max,
          width: p.x_max - p.x_min,
          height: p.y_max - p.y_min
        }
      }));

    return {
      detections,
      processingTime,
      model: 'deepstack-yolo-nsl',
      raw: response.data
    };
  }

  /**
   * Detect using the general object detection (fallback)
   */
  async detectGeneral(imagePath) {
    const formData = new FormData();
    formData.append('image', fs.createReadStream(imagePath));

    const response = await axios.post(
      `${this.baseUrl}/v1/vision/detection`,
      formData,
      {
        headers: formData.getHeaders(),
        timeout: this.timeout
      }
    );

    return response.data;
  }

  /**
   * Attempt to start the DeepStack Docker container
   */
  async startContainer() {
    return new Promise((resolve) => {
      const cmd = `docker run -d \
        --name deepstack_akaleta \
        -p 80:5000 \
        -v /path/to/models:/modelstore \
        deepquestai/deepstack:latest`;

      exec(cmd, (err, stdout, stderr) => {
        if (err) {
          // Container might already be running
          exec('docker start deepstack_akaleta', (err2, stdout2) => {
            if (err2) {
              resolve({ success: false, error: err2.message });
            } else {
              resolve({ success: true, message: 'Container started', containerId: stdout2.trim() });
            }
          });
        } else {
          resolve({ success: true, message: 'Container created and started', containerId: stdout.trim() });
        }
      });
    });
  }

  /**
   * Stop the DeepStack Docker container
   */
  async stopContainer() {
    return new Promise((resolve) => {
      exec('docker stop deepstack_akaleta', (err, stdout) => {
        if (err) resolve({ success: false, error: err.message });
        else resolve({ success: true, message: 'Container stopped' });
      });
    });
  }

  /**
   * List available custom models in DeepStack
   */
  async listModels() {
    try {
      const response = await axios.get(`${this.baseUrl}/v1/vision/list`, {
        timeout: 5000,
        headers: this.apiKey ? { 'api-key': this.apiKey } : {}
      });
      return response.data;
    } catch (err) {
      throw new Error(`Cannot reach DeepStack: ${err.message}`);
    }
  }
}

module.exports = new DeepStackService();
