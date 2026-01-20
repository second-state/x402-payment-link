"""Application configuration and constants."""

import os
from pathlib import Path
from typing import Optional

import yaml
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Application settings
APP_PORT = int(os.getenv("APP_PORT", "5000"))
ENVIRONMENT = os.getenv("ENVIRONMENT", "staging")
ORDER_DIR = "data"

# Network settings
NETWORK = os.getenv("NETWORK", "base-sepolia")
ADDRESS = os.getenv("ADDRESS")
MAX_DEADLINE_SECONDS = int(os.getenv("MAX_DEADLINE_SECONDS", "60"))

# Email settings
FROM_EMAIL = os.getenv("FROM_EMAIL", "vivian@secondstate.io")
SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")
ORDER_CONFIRMATION_RECIPIENT = os.getenv("ORDER_CONFIRMATION_RECIPIENT")

# Paywall configuration
APP_NAME = os.getenv("APP_NAME", "x402-mvp")
APP_LOGO = os.getenv("APP_LOGO", "/static/secondstate.png")

# Validate required environment variables
if not ADDRESS:
    raise ValueError("Missing required environment variable: ADDRESS")
supported_networks = ["base-sepolia", "base"]
if NETWORK not in supported_networks:
    raise ValueError(f"Unsupported network: {NETWORK}")

# Create facilitator config
FACILITATOR_URL = os.getenv("FACILITATOR_URL", "https://x402f1.secondstate.io")

# Tokens configuration
TOKENS_CONFIG_PATH = Path(__file__).parent / "tokens.yaml"

# Default USDC token (used when tokens.yaml doesn't exist for backward compatibility)
DEFAULT_USDC_TOKEN = {
    "id": "usdc",
    "symbol": "USDC",
    "name": "USD Coin",
    "decimals": 6,
    "address": None,
    "is_default": True,
}


def load_tokens_config() -> dict:
    """Load tokens configuration from tokens.yaml.

    Returns:
        Tokens configuration dict
    """
    if not TOKENS_CONFIG_PATH.exists():
        return {"defaults": {}, "tokens": {}, "environments": {}}

    with open(TOKENS_CONFIG_PATH, "r") as f:
        return yaml.safe_load(f) or {}


def get_available_tokens(network: str, environment: str) -> list[dict]:
    """Get available tokens for the given network and environment.

    Args:
        network: Network name (e.g., 'base-sepolia', 'base')
        environment: Environment name (e.g., 'staging', 'production')

    Returns:
        List of token configuration dicts
    """
    config = load_tokens_config()
    tokens = []

    # Get environment-specific enabled tokens
    env_config = config.get("environments", {}).get(environment, {})
    enabled_ids = env_config.get("enabled_tokens", list(config.get("tokens", {}).keys()))

    # Process all tokens
    for token_id, token_data in config.get("tokens", {}).items():
        if token_id not in enabled_ids:
            continue

        # Get address for current network (if addresses dict exists)
        addresses = token_data.get("addresses", {})
        address = addresses.get(network) if addresses else token_data.get("address")

        # Skip if token has addresses but not for current network
        if addresses and not address:
            continue

        # Build token dict
        token = {
            "id": token_id,
            "symbol": token_data.get("symbol", token_id.upper()),
            "name": token_data.get("name", token_id),
            "decimals": token_data.get("decimals", 18),
            "address": address,
            "version": token_data.get("version", "1"),
            "is_default": token_id == "usdc" or not address,
        }
        tokens.append(token)

    # Fallback to default USDC if no tokens configured
    if not tokens:
        tokens.append(DEFAULT_USDC_TOKEN.copy())

    return tokens


def get_token_by_id(token_id: str) -> Optional[dict]:
    """Get token configuration by ID.

    Args:
        token_id: Token identifier

    Returns:
        Token configuration dict or None if not found
    """
    tokens = get_available_tokens(NETWORK, ENVIRONMENT)
    for token in tokens:
        if token["id"] == token_id:
            return token
    return tokens[0] if tokens else None


def get_token_config_for_payment(token: dict) -> Optional[dict]:
    """Get token configuration for PaymentService.

    Args:
        token: Token dict from get_token_by_id

    Returns:
        Token config dict for PaymentService or None if using default USDC
    """
    if not token or not token.get("address"):
        return None

    return {
        "address": token["address"],
        "decimals": token.get("decimals", 18),
        "name": token.get("name", token.get("symbol", "Token")),
        "symbol": token.get("symbol", "TOKEN"),
        "version": token.get("version", "1"),
    }


# Pre-load available tokens
AVAILABLE_TOKENS = get_available_tokens(NETWORK, ENVIRONMENT)
