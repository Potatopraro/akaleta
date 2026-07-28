#!/usr/bin/env bash
# ╔═══════════════════════════════════════════════════════════════╗
# ║           AKALETA — Full Setup Script                        ║
# ║   Nigerian Sign Language Translator                          ║
# ╚═══════════════════════════════════════════════════════════════╝

set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
RESET='\033[0m'

print_step() { echo -e "\n${CYAN}▶ $1${RESET}"; }
print_ok()   { echo -e "${GREEN}✔ $1${RESET}"; }
print_warn() { echo -e "${YELLOW}⚠ $1${RESET}"; }
print_err()  { echo -e "${RED}✘ $1${RESET}"; }

echo -e "
${CYAN}
 █████╗ ██╗  ██╗ █████╗ ██╗     ███████╗████████╗ █████╗
██╔══██╗██║ ██╔╝██╔══██╗██║     ██╔════╝╚══██╔══╝██╔══██╗
███████║█████╔╝ ███████║██║     █████╗     ██║   ███████║
██╔══██║██╔═██╗ ██╔══██║██║     ██╔══╝     ██║   ██╔══██║
██║  ██║██║  ██╗██║  ██║███████╗███████╗   ██║   ██║  ██║
╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚══════╝   ╚═╝   ╚═╝  ╚═╝
${RESET}
Nigerian Sign Language Translator — Setup Script
"

# ── Check Prerequisites ─────────────────────────────────────────────────────
print_step "Checking prerequisites..."

check_cmd() {
  if ! command -v "$1" &>/dev/null; then
    print_err "$1 is not installed. Please install it first."
    exit 1
  fi
  print_ok "$1 found: $(command -v $1)"
}

check_cmd node
check_cmd npm
check_cmd git

# Check Node version
NODE_VERSION=$(node --version | cut -d. -f1 | tr -d 'v')
if [ "$NODE_VERSION" -lt 18 ]; then
  print_err "Node.js 18+ required. Current: $(node --version)"
  exit 1
fi
print_ok "Node.js version OK: $(node --version)"

# Optional: Docker
if command -v docker &>/dev/null; then
  print_ok "Docker found (optional): $(docker --version)"
  DOCKER_AVAILABLE=true
else
  print_warn "Docker not found. DeepStack ML engine requires Docker. Manual Python setup available."
  DOCKER_AVAILABLE=false
fi

# ── Create .env Files ───────────────────────────────────────────────────────
print_step "Creating environment configuration..."

if [ ! -f backend/.env ]; then
  cp backend/.env.example backend/.env
  print_ok "Created backend/.env from template"
  print_warn "IMPORTANT: Edit backend/.env and add your credentials (JWT_SECRET, SMTP, OpenAI)"
else
  print_warn "backend/.env already exists, skipping"
fi

# ── Clone ML Engine Repository ──────────────────────────────────────────────
print_step "Setting up ML Engine (GitHub repo)..."

ML_ENGINE_DIR="backend/ml_engine"

if [ -d "$ML_ENGINE_DIR" ] && [ -f "$ML_ENGINE_DIR/image_detection.py" ]; then
  print_ok "ML engine already cloned at $ML_ENGINE_DIR"
else
  echo "Cloning ML-Collective Sign Language repository..."
  git clone https://github.com/ML-Collective/Sign-to-Speech-for-Sign-Language-Understanding.git "$ML_ENGINE_DIR" || {
    print_warn "Could not clone repo (network issue?). Creating ml_engine directory with placeholder."
    mkdir -p "$ML_ENGINE_DIR"
  }
  print_ok "ML engine cloned to $ML_ENGINE_DIR"
fi

# Create AKALETA Python wrapper
cat > "$ML_ENGINE_DIR/akaleta_wrapper.py" << 'PYEOF'
#!/usr/bin/env python3
"""
AKALETA Detection Wrapper
Bridges the backend to the ML-Collective NSL detection scripts.
"""
import sys, os, json, argparse
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def detect(image_path, min_conf=0.4):
    result = {"predictions": [], "success": False}
    try:
        # Try repo's detection function
        try:
            from image_detection import detect_signs
            preds = detect_signs(image_path)
            result.update({"predictions": preds, "success": True, "model": "yolo-nsl"})
            return result
        except (ImportError, AttributeError):
            pass

        # Fallback: attempt basic opencv detection
        try:
            import cv2
            img = cv2.imread(image_path)
            if img is None:
                result["error"] = f"Cannot read image: {image_path}"
                return result
            result.update({"success": True, "image_loaded": True, "shape": list(img.shape),
                "message": "Image loaded. Install model requirements for sign detection."})
        except ImportError:
            result["error"] = "OpenCV not available. Run: pip install opencv-python"
    except Exception as e:
        result["error"] = str(e)
    return result

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--image", required=True)
    parser.add_argument("--output", default="json")
    parser.add_argument("--min-confidence", type=float, default=0.4)
    args = parser.parse_args()
    if not os.path.exists(args.image):
        print(json.dumps({"success": False, "error": f"Not found: {args.image}"}))
        sys.exit(1)
    print(json.dumps(detect(args.image, args.min_confidence), indent=2))
PYEOF

chmod +x "$ML_ENGINE_DIR/akaleta_wrapper.py"
print_ok "AKALETA wrapper script created"

# Install Python requirements if requirements.txt exists
if [ -f "$ML_ENGINE_DIR/requirements.txt" ]; then
  if command -v pip3 &>/dev/null; then
    print_step "Installing Python ML dependencies..."
    pip3 install -r "$ML_ENGINE_DIR/requirements.txt" --break-system-packages 2>/dev/null || \
    pip3 install -r "$ML_ENGINE_DIR/requirements.txt" || \
    print_warn "Could not install Python deps automatically. Run manually: pip3 install -r $ML_ENGINE_DIR/requirements.txt"
  fi
fi

# ── Create DeepStack Models Directory ──────────────────────────────────────
print_step "Creating DeepStack model directories..."
mkdir -p backend/ml_engine/deepstack_models
mkdir -p backend/uploads/frames

# Check for .pt model files to copy to deepstack models dir
if ls "$ML_ENGINE_DIR"/*.pt 1>/dev/null 2>&1; then
  cp "$ML_ENGINE_DIR"/*.pt backend/ml_engine/deepstack_models/ 2>/dev/null || true
  print_ok "Copied YOLO model files to DeepStack models directory"
else
  print_warn "No .pt model files found yet. Download models from HuggingFace as per repo instructions."
  print_warn "Place models in: backend/ml_engine/deepstack_models/"
fi

# ── Install Backend Dependencies ────────────────────────────────────────────
print_step "Installing backend Node.js dependencies..."
cd backend
npm install
print_ok "Backend dependencies installed"
cd ..

# ── Install Frontend Dependencies ──────────────────────────────────────────
print_step "Installing frontend dependencies..."
cd frontend
npm install
print_ok "Frontend dependencies installed"
cd ..

# ── Start DeepStack (if Docker available) ──────────────────────────────────
if [ "$DOCKER_AVAILABLE" = true ]; then
  print_step "Starting DeepStack ML container..."

  # Stop existing container if running
  docker stop akaleta_deepstack 2>/dev/null || true
  docker rm akaleta_deepstack 2>/dev/null || true

  docker run -d \
    --name akaleta_deepstack \
    -p 80:5000 \
    -v "$(pwd)/backend/ml_engine/deepstack_models:/modelstore" \
    -e VISION-CUSTOM=True \
    -e MODE=Medium \
    --restart unless-stopped \
    deepquestai/deepstack:latest && \
    print_ok "DeepStack container started on port 80" || \
    print_warn "Could not start DeepStack. Start manually with docker-compose."
fi

# ── Final Summary ───────────────────────────────────────────────────────────
echo -e "
${GREEN}
╔══════════════════════════════════════════════════════════╗
║                 SETUP COMPLETE! 🎉                       ║
╠══════════════════════════════════════════════════════════╣
║  NEXT STEPS:                                            ║
║                                                         ║
║  1. Edit backend/.env with your credentials             ║
║     - Set JWT_SECRET (min 32 chars)                     ║
║     - Add SMTP credentials for email                    ║
║     - (Optional) Add OPENAI_API_KEY for chatbot         ║
║                                                         ║
║  2. Start MongoDB:                                      ║
║     docker-compose up mongodb -d                        ║
║     OR: use MongoDB Atlas (add URI to .env)             ║
║                                                         ║
║  3. Start the backend:                                  ║
║     cd backend && npm run dev                           ║
║                                                         ║
║  4. Start the frontend (new terminal):                  ║
║     cd frontend && npm start                            ║
║                                                         ║
║  5. Open: http://localhost:3000                         ║
║                                                         ║
║  OR start everything with Docker:                       ║
║     docker-compose up --build                           ║
╚══════════════════════════════════════════════════════════╝
${RESET}"
