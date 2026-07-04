# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.0.x   | ✅ Active support |
| < 1.0   | ❌ No longer supported |

## Reporting a Vulnerability

**Please do NOT report security vulnerabilities via public GitHub issues.**

If you discover a security vulnerability in VisionAI, please report it responsibly:

### How to Report

1. **Email**: Send details to [security@visionai.example.com]
2. **Subject**: `[SECURITY] VisionAI - Brief description`
3. **Include**:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact assessment
   - Suggested fix (optional)

### Response Timeline

| Milestone | Timeframe |
|-----------|-----------|
| Initial response | Within 48 hours |
| Confirmation & triage | Within 5 business days |
| Fix development | Depends on severity |
| Public disclosure | After fix is released |

### Severity Levels

| Level | Description | Example |
|-------|-------------|---------|
| **Critical** | Remote code execution, data breach | RCE via file upload |
| **High** | Privilege escalation, data exposure | Auth bypass |
| **Medium** | Limited impact vulnerabilities | Info disclosure |
| **Low** | Minor issues with minimal risk | UI-only issues |

## Security Considerations

### VisionAI-Specific Notes

1. **Local-only by default**: VisionAI is designed to run on localhost. Exposing it to the internet requires additional security measures.

2. **File uploads**: Image/video uploads are processed locally. Ensure your `ALLOWED_EXTENSIONS` configuration is properly set.

3. **Camera access**: The application accesses local camera hardware. Ensure only trusted users can access the web interface.

4. **No authentication**: VisionAI v1.0 does not include authentication. Do not deploy on public networks without adding auth middleware.

5. **HTTPS**: Push notifications require HTTPS in production. Use a reverse proxy (nginx) with SSL for network deployments.

### Recommended Deployment Hardening

```python
# config.py — Production settings
DEBUG = False
ALLOWED_EXTENSIONS = {'jpg', 'jpeg', 'png', 'webp', 'mp4', 'avi', 'mov'}
MAX_CONTENT_LENGTH = 100 * 1024 * 1024  # 100MB max upload
UPLOAD_FOLDER = '/secure/path/outside/webroot'
```

## Disclosure Policy

We follow [Responsible Disclosure](https://en.wikipedia.org/wiki/Responsible_disclosure) principles. Security researchers who responsibly disclose vulnerabilities will be credited in the release notes (unless they prefer to remain anonymous).

---

Thank you for helping keep VisionAI secure! 🔒
