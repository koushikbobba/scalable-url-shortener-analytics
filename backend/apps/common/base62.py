import secrets
import string
import hashlib

BASE62_ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
BASE = len(BASE62_ALPHABET)

# Reserved aliases that users cannot use to avoid conflicts with system routes
RESERVED_ALIASES = {
    'admin', 'api', 'login', 'register', 'dashboard', 'health', 'metrics',
    'auth', 'links', 'analytics', 'docs', 'schema', 'redoc', 'swagger',
    'static', 'media', 'favicon.ico', 'robots.txt', 'sitemap.xml', 'terms',
    'privacy', 'about', 'contact', 'help', 'status', 'ping', 'ready', 'live'
}


def encode_base62(num: int) -> str:
    """
    Encodes an integer into a Base62 string.
    Example: 125309 -> 'W7f'
    """
    if num == 0:
        return BASE62_ALPHABET[0]

    arr = []
    while num > 0:
        rem = num % BASE
        arr.append(BASE62_ALPHABET[rem])
        num = num // BASE

    arr.reverse()
    return "".join(arr)


def decode_base62(code: str) -> int:
    """
    Decodes a Base62 string back into an integer.
    Example: 'W7f' -> 125309
    """
    num = 0
    for char in code:
        idx = BASE62_ALPHABET.find(char)
        if idx == -1:
            raise ValueError(f"Invalid character '{char}' in Base62 string.")
        num = num * BASE + idx
    return num


def generate_random_short_code(length: int = 7) -> str:
    """
    Generates a cryptographically secure random Base62 short code of specified length.
    62^7 = 3.52 Trillion combinations.
    """
    return "".join(secrets.choice(BASE62_ALPHABET) for _ in range(length))


def hash_to_short_code(url: str, length: int = 7) -> str:
    """
    Generates a deterministic short code by hashing the URL with SHA-256 and Base62 encoding.
    """
    digest = hashlib.sha256(url.encode('utf-8')).hexdigest()
    int_val = int(digest[:12], 16)
    code = encode_base62(int_val)
    return code[:length].ljust(length, '0')


def is_reserved_alias(alias: str) -> bool:
    """Checks if a requested alias is reserved."""
    return alias.lower() in RESERVED_ALIASES
