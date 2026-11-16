"""Radice del repo nel percorso di import: `import assistente` e `import officina` funzionano da pytest."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
