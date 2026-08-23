#!/usr/bin/env bash
set -e

# Colors for terminal output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}====================================================${NC}"
echo -e "${BLUE}       Installing ReadBook (Personal PDF Reader)    ${NC}"
echo -e "${BLUE}====================================================${NC}"

# 1. Check Python version
if ! command -v python3 &>/dev/null; then
    echo -e "${RED}Error: python3 is not installed. Please install Python 3.9 or higher.${NC}"
    exit 1
fi

PYTHON_VERSION=$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
PYTHON_MAJOR=$(echo "$PYTHON_VERSION" | cut -d. -f1)
PYTHON_MINOR=$(echo "$PYTHON_VERSION" | cut -d. -f2)

if [ "$PYTHON_MAJOR" -lt 3 ] || { [ "$PYTHON_MAJOR" -eq 3 ] && [ "$PYTHON_MINOR" -lt 9 ]; }; then
    echo -e "${RED}Error: Python 3.9+ is required (found Python $PYTHON_VERSION).${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Found Python $PYTHON_VERSION${NC}"

# Check for required Qt system library on Ubuntu
if ! dpkg -s libxcb-cursor0 &>/dev/null; then
    echo -e "${YELLOW}→ Installing missing system library libxcb-cursor0 (required by Qt6)...${NC}"
    if command -v sudo &>/dev/null; then
        sudo apt-get update -qq && sudo apt-get install -y libxcb-cursor0 || true
    fi
fi

# 2. Setup paths
APP_NAME="readbook"
INSTALL_DIR="$HOME/.local/share/readbook"
BIN_DIR="$HOME/.local/bin"
VENV_DIR="$INSTALL_DIR/venv"
BOOKS_DIR="$HOME/Book"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Ensure directories exist
mkdir -p "$INSTALL_DIR"
mkdir -p "$BIN_DIR"
mkdir -p "$BOOKS_DIR"
mkdir -p "$HOME/.config/readbook"

# 3. Create or reuse virtual environment
echo -e "${BLUE}→ Setting up virtual environment in $VENV_DIR...${NC}"
if [ ! -d "$VENV_DIR" ]; then
    python3 -m venv "$VENV_DIR"
fi

# Activate venv
source "$VENV_DIR/bin/activate"

# 4. Install / Update dependencies and package
echo -e "${BLUE}→ Installing dependencies and readbook package...${NC}"
pip install --upgrade pip --quiet
pip install -e "$PROJECT_DIR" --quiet

# 5. Create executable launcher in ~/.local/bin/readbook
LAUNCHER="$BIN_DIR/$APP_NAME"
echo -e "${BLUE}→ Creating launcher command at $LAUNCHER...${NC}"

cat > "$LAUNCHER" << EOF
#!/usr/bin/env bash
exec "$VENV_DIR/bin/readbook" "\$@"
EOF

chmod +x "$LAUNCHER"

# 6. Check PATH in .bashrc / .profile
PATH_CONFIGURED=false
if [[ ":$PATH:" == *":$BIN_DIR:"* ]]; then
    PATH_CONFIGURED=true
else
    # Check if ~/.bashrc contains ~/.local/bin
    if [ -f "$HOME/.bashrc" ] && ! grep -q '\.local/bin' "$HOME/.bashrc"; then
        echo -e "${YELLOW}→ Adding $BIN_DIR to PATH in ~/.bashrc...${NC}"
        echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$HOME/.bashrc"
    fi
    if [ -f "$HOME/.profile" ] && ! grep -q '\.local/bin' "$HOME/.profile"; then
        echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$HOME/.profile"
    fi
fi

echo -e "${GREEN}====================================================${NC}"
echo -e "${GREEN}       Installation Completed Successfully!         ${NC}"
echo -e "${GREEN}====================================================${NC}"
echo ""
echo -e "You can now run ${GREEN}readbook${NC} from anywhere in your terminal:"
echo -e "  ${YELLOW}$ readbook${NC}"
echo ""
echo -e "Books directory: ${BLUE}$BOOKS_DIR${NC}"
echo -e "Data directory:  ${BLUE}$INSTALL_DIR${NC}"
echo ""
if [ "$PATH_CONFIGURED" = false ]; then
    echo -e "${YELLOW}Note: If 'readbook' is not recognized immediately in your current terminal, run:${NC}"
    echo -e "  ${YELLOW}source ~/.bashrc${NC} or restart your terminal."
fi
