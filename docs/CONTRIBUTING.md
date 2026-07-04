# Contributing to VisionAI

Thank you for your interest in contributing to VisionAI! 🎉

This document provides guidelines for contributing to the project.

---

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Submitting Changes](#submitting-changes)
- [Style Guidelines](#style-guidelines)
- [Reporting Bugs](#reporting-bugs)
- [Requesting Features](#requesting-features)

---

## Code of Conduct

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md).

---

## Getting Started

1. **Fork** the repository on GitHub
2. **Clone** your fork locally
3. **Create a branch** for your feature or bugfix
4. **Make your changes** with clear commits
5. **Test** your changes thoroughly
6. **Submit a Pull Request**

---

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/VisionAI.git
cd VisionAI

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/macOS
.\venv\Scripts\activate   # Windows

# Install dependencies
pip install -r requirements.txt
pip install -r requirements-dev.txt  # Dev tools

# Run the development server
python app.py --debug
```

---

## Submitting Changes

### Branch Naming

Use descriptive branch names:
- `feature/multi-camera-support`
- `fix/roi-polygon-drawing-crash`
- `docs/update-installation-guide`
- `perf/optimize-yolov8-inference`

### Commit Messages

Follow [Conventional Commits](https://conventionalcommits.org):

```
feat: add multi-camera grid view
fix: resolve ROI polygon crash on empty selection
docs: update installation guide for Windows
perf: reduce inference latency with INT8 quantization
refactor: split detector.py into smaller modules
test: add unit tests for zone crossing logic
```

### Pull Request Guidelines

- Keep PRs focused — one feature or fix per PR
- Include description of changes
- Add tests where applicable
- Update documentation if needed
- Ensure no regression on existing features
- Screenshots/GIFs for UI changes

---

## Style Guidelines

### Python

- Follow **PEP 8** style guide
- Use **type hints** where practical
- Maximum line length: **100 characters**
- Docstrings for all public functions/classes
- Use `black` for formatting: `black .`
- Use `flake8` for linting: `flake8 .`

### JavaScript / HTML / CSS

- **2 spaces** indentation
- **Single quotes** for strings
- Descriptive variable names
- Comments for complex logic

### Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Module | `snake_case` | `camera_manager.py` |
| Class | `PascalCase` | `ObjectDetector` |
| Function | `snake_case` | `process_frame()` |
| Constant | `UPPER_SNAKE` | `MAX_DETECTIONS` |
| Variable | `snake_case` | `frame_count` |

---

## Reporting Bugs

Please include:

1. **VisionAI version** (`python app.py --version`)
2. **OS and Python version**
3. **GPU / CUDA version** (if applicable)
4. **Steps to reproduce** (detailed, numbered)
5. **Expected behavior**
6. **Actual behavior**
7. **Error messages / traceback** (full output)
8. **Screenshots** (if UI-related)

---

## Requesting Features

Feature requests are welcome! Please:

1. Check [existing issues](https://github.com/yourusername/VisionAI/issues) first
2. Describe the **use case** clearly
3. Explain **why** it would benefit users
4. Include **mock-ups** if it's a UI feature
5. Note if you're willing to implement it

---

## Development Roadmap

See the [CHANGELOG](CHANGELOG.md) for completed features and the `Future Improvements` section in [README](README.md) for planned features.

---

## Questions?

Open a [GitHub Discussion](https://github.com/yourusername/VisionAI/discussions) for questions, ideas, or help.

---

Thank you for making VisionAI better! 🙏
