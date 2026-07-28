const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * PythonBridgeService
 * Calls the existing ML-Collective detection scripts as Python subprocesses.
 * Falls back to this when DeepStack is unavailable.
 *
 * Expects the GitHub repo cloned at: ./ml_engine/
 * Scripts: image_detection.py, livefeed_detection.py
 */
class PythonBridgeService {
  constructor() {
    this.pythonExec = process.env.PYTHON_EXECUTABLE || 'python3';
    this.scriptsDir = process.env.PYTHON_SCRIPTS_DIR || path.join(__dirname, '../ml_engine');
    this.imageDetectionScript = path.join(this.scriptsDir, 'image_detection.py');
    this.wrapperScript = path.join(this.scriptsDir, 'akaleta_wrapper.py');
    this.timeout = 30000; // 30 seconds max
  }

  /**
   * Check if Python environment is available
   */
  async checkPythonAvailable() {
    return new Promise((resolve) => {
      const proc = spawn(this.pythonExec, ['--version']);
      proc.on('close', (code) => resolve(code === 0));
      proc.on('error', () => resolve(false));
    });
  }

  /**
   * Check if ML engine scripts are available
   */
  isMLEngineAvailable() {
    return fs.existsSync(this.wrapperScript) || fs.existsSync(this.imageDetectionScript);
  }

  /**
   * Run detection on a single image using the repo's detection script
   * Returns structured detection results
   */
  async detectFromImage(imagePath) {
    if (!fs.existsSync(imagePath)) {
      throw new Error(`Image not found: ${imagePath}`);
    }

    // Use our wrapper script if available, otherwise the original
    const scriptPath = fs.existsSync(this.wrapperScript)
      ? this.wrapperScript
      : this.imageDetectionScript;

    if (!fs.existsSync(scriptPath)) {
      return this._getMockDetection(imagePath);
    }

    return new Promise((resolve, reject) => {
      const args = [scriptPath, '--image', imagePath, '--output', 'json'];
      const proc = spawn(this.pythonExec, args, {
        cwd: this.scriptsDir,
        timeout: this.timeout
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => { stdout += data.toString(); });
      proc.stderr.on('data', (data) => { stderr += data.toString(); });

      const timer = setTimeout(() => {
        proc.kill('SIGKILL');
        reject(new Error('Python detection script timed out'));
      }, this.timeout);

      proc.on('close', (code) => {
        clearTimeout(timer);
        if (code !== 0) {
          console.error('[PythonBridge] Script stderr:', stderr);
          // Return mock data on script error (graceful degradation)
          return resolve(this._getMockDetection(imagePath));
        }

        try {
          // Try to parse JSON output from script
          const jsonMatch = stdout.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const result = JSON.parse(jsonMatch[0]);
            resolve(this._normalizeOutput(result));
          } else {
            // Try to parse line-by-line output
            resolve(this._parseTextOutput(stdout));
          }
        } catch (parseErr) {
          console.error('[PythonBridge] Parse error:', parseErr.message);
          resolve(this._getMockDetection(imagePath));
        }
      });

      proc.on('error', (err) => {
        clearTimeout(timer);
        console.error('[PythonBridge] Spawn error:', err.message);
        resolve(this._getMockDetection(imagePath));
      });
    });
  }

  /**
   * Normalize output from various script formats to standard format
   */
  _normalizeOutput(raw) {
    // Handle output from ML-Collective's image_detection.py
    if (raw.predictions) {
      return {
        detections: raw.predictions.map(p => ({
          label: p.label || p.class || p.sign,
          confidence: p.confidence || p.score || 0,
          boundingBox: p.bbox || p.bounding_box || {}
        })).filter(d => d.label && d.confidence > 0.3),
        model: 'python-yolo-nsl',
        raw
      };
    }

    // Handle SSD model output
    if (raw.detections) {
      return {
        detections: raw.detections.map(d => ({
          label: d.label || d.class,
          confidence: d.confidence || d.score || 0,
          boundingBox: d.bbox || {}
        })).filter(d => d.label && d.confidence > 0.3),
        model: 'python-ssd-nsl',
        raw
      };
    }

    // Generic handler
    if (Array.isArray(raw)) {
      return {
        detections: raw.map(item => ({
          label: item.label || item.sign || item.class,
          confidence: item.confidence || item.score || 0,
          boundingBox: item.bbox || item.box || {}
        })).filter(d => d.label && d.confidence > 0.3),
        model: 'python-nsl',
        raw
      };
    }

    return { detections: [], model: 'python-nsl', raw };
  }

  /**
   * Parse plain text output format
   * Expected: "Label: HELLO, Confidence: 0.92"
   */
  _parseTextOutput(text) {
    const detections = [];
    const lines = text.split('\n');

    for (const line of lines) {
      const labelMatch = line.match(/(?:label|sign|detected):\s*([A-Za-z\s]+)/i);
      const confMatch = line.match(/(?:confidence|score|conf):\s*([0-9.]+)/i);

      if (labelMatch && confMatch) {
        detections.push({
          label: labelMatch[1].trim(),
          confidence: parseFloat(confMatch[1]),
          boundingBox: {}
        });
      }
    }

    return { detections, model: 'python-nsl-text' };
  }

  /**
   * Graceful fallback: returns a clearly-labeled mock response
   * when the ML engine is not available
   */
  _getMockDetection(imagePath) {
    console.warn('[PythonBridge] Using mock detection - ML engine not available');
    return {
      detections: [],
      model: 'mock',
      error: 'ML engine unavailable. Please start DeepStack or configure the Python environment.',
      imagePath
    };
  }

  /**
   * Create the wrapper Python script in the ml_engine directory
   * This adapts our API to the existing repo's interface
   */
  async createWrapperScript() {
    const wrapperContent = `#!/usr/bin/env python3
"""
AKALETA Wrapper Script
Bridges the backend API with the ML-Collective detection scripts.
Outputs JSON-formatted detection results to stdout.

Usage: python3 akaleta_wrapper.py --image <path> --output json
"""
import sys
import os
import json
import argparse

# Add the repo scripts to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def detect_image(image_path):
    """Run detection using available models."""
    results = {"predictions": [], "success": False, "error": None}
    
    try:
        # Try importing from the cloned repo
        # Attempt YOLO-based detection first
        try:
            from image_detection import detect_signs
            predictions = detect_signs(image_path)
            results["predictions"] = predictions
            results["success"] = True
            results["model"] = "yolo"
            return results
        except ImportError:
            pass

        # Try alternative imports from the repo
        try:
            import cv2
            import numpy as np
            
            # Load and preprocess image
            img = cv2.imread(image_path)
            if img is None:
                results["error"] = f"Could not read image: {image_path}"
                return results
            
            results["image_shape"] = list(img.shape)
            results["success"] = True
            results["message"] = "Image loaded but no model available. Install requirements.txt."
            return results
        except ImportError:
            results["error"] = "OpenCV not available. Run: pip install opencv-python"
            return results

    except Exception as e:
        results["error"] = str(e)
        return results

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="AKALETA Sign Language Detection Wrapper")
    parser.add_argument("--image", required=True, help="Path to input image")
    parser.add_argument("--output", default="json", choices=["json", "text"], help="Output format")
    parser.add_argument("--min-confidence", type=float, default=0.4, help="Minimum confidence threshold")
    args = parser.parse_args()

    if not os.path.exists(args.image):
        print(json.dumps({"success": False, "error": f"Image not found: {args.image}"}))
        sys.exit(1)

    result = detect_image(args.image)
    
    if args.output == "json":
        print(json.dumps(result, indent=2))
    else:
        for pred in result.get("predictions", []):
            print(f"Label: {pred.get('label', 'unknown')}, Confidence: {pred.get('confidence', 0):.2f}")
`;

    const mlEngineDir = this.scriptsDir;
    fs.mkdirSync(mlEngineDir, { recursive: true });
    fs.writeFileSync(this.wrapperScript, wrapperContent);
    console.log('[PythonBridge] Wrapper script created at:', this.wrapperScript);
  }

  /**
   * Clone the GitHub repo into ml_engine directory
   */
  async cloneMLRepo() {
    const repoUrl = 'https://github.com/ML-Collective/Sign-to-Speech-for-Sign-Language-Understanding.git';
    const targetDir = this.scriptsDir;

    if (fs.existsSync(path.join(targetDir, 'image_detection.py'))) {
      console.log('[PythonBridge] ML engine already cloned');
      return { success: true, message: 'Already cloned' };
    }

    return new Promise((resolve) => {
      const proc = spawn('git', ['clone', repoUrl, targetDir]);

      proc.on('close', async (code) => {
        if (code === 0) {
          await this.createWrapperScript();
          resolve({ success: true, message: 'Repo cloned successfully' });
        } else {
          resolve({ success: false, error: 'Git clone failed. Check network access.' });
        }
      });

      proc.on('error', (err) => {
        resolve({ success: false, error: err.message });
      });
    });
  }
}

module.exports = new PythonBridgeService();
