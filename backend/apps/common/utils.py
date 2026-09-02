import hashlib
import re
from user_agents import parse as parse_user_agent

# Simple regex to validate URLs and prevent SSRF / javascript: / file:// schemes
URL_REGEX = re.compile(
    r'^(?:http)s?://'  # http:// or https://
    r'(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+(?:[A-Z]{2,6}\.?|[A-Z0-9-]{2,}\.?)|'  # domain...
    r'localhost|'  # localhost...
    r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'  # ...or ip
    r'(?::\d+)?'  # optional port
    r'(?:/?|[/?]\S+)$', re.IGNORECASE
)

# Private / local IP ranges to prevent SSRF
PRIVATE_IPS = [
    re.compile(r'^127\.'),
    re.compile(r'^10\.'),
    re.compile(r'^172\.(1[6-9]|2[0-9]|3[0-1])\.'),
    re.compile(r'^192\.168\.'),
    re.compile(r'^169\.254\.'),  # AWS metadata endpoint
]


def is_valid_url(url: str) -> bool:
    """Validates URL format and rejects non-HTTP(S) schemes."""
    if not url or not isinstance(url, str):
        return False
    if len(url) > 2048:
        return False
    return bool(URL_REGEX.match(url))


def is_ssrf_safe_url(url: str) -> bool:
    """Ensures URL does not point to internal metadata/private network ranges."""
    for pattern in PRIVATE_IPS:
        if pattern.search(url):
            return False
    return True


def get_client_ip(request) -> str:
    """Extracts client IP address safely from request headers."""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('HTTP_X_REAL_IP', request.META.get('REMOTE_ADDR', '127.0.0.1'))
    return ip


def hash_ip(ip: str, salt: str = "url_shortener_ip_salt") -> str:
    """Hashes IP address for privacy / GDPR compliance."""
    return hashlib.sha256(f"{ip}:{salt}".encode('utf-8')).hexdigest()[:32]


def parse_user_agent_details(user_agent_string: str) -> dict:
    """
    Parses user agent into browser, OS, and device classification.
    """
    if not user_agent_string:
        return {
            "browser": "Unknown",
            "os": "Unknown",
            "device_type": "Desktop",
            "is_bot": False
        }

    try:
        ua = parse_user_agent(user_agent_string)
        
        device_type = "Desktop"
        if ua.is_mobile:
            device_type = "Mobile"
        elif ua.is_tablet:
            device_type = "Tablet"
        elif ua.is_bot:
            device_type = "Bot"

        return {
            "browser": f"{ua.browser.family} {ua.browser.version_string}".strip() or "Unknown",
            "os": f"{ua.os.family} {ua.os.version_string}".strip() or "Unknown",
            "device_type": device_type,
            "is_bot": ua.is_bot
        }
    except Exception:
        return {
            "browser": "Unknown",
            "os": "Unknown",
            "device_type": "Desktop",
            "is_bot": False
        }


def extract_geo_location(request) -> dict:
    """
    Extracts GeoIP country and city from Cloudflare/CDN headers or defaults.
    """
    country = request.META.get('HTTP_CF_IPCOUNTRY') or request.META.get('HTTP_X_GEO_COUNTRY') or 'US'
    city = request.META.get('HTTP_CF_IPCITY') or request.META.get('HTTP_X_GEO_CITY') or 'Unknown'
    return {
        "country_code": country[:2].upper(),
        "city": city[:100]
    }
