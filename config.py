"""Application configuration and constants."""

import os
from cdp.x402 import create_facilitator_config
from dotenv import load_dotenv
from x402.facilitator import FacilitatorConfig
from x402.types import PaywallConfig


# Load environment variables
load_dotenv()

# Application settings
APP_PORT = int(os.getenv("APP_PORT", "5000"))
ORDER_DIR = "data"
DEBUG_MODE = os.getenv("DEBUG", "false").lower() == "true"

# Network settings
NETWORK = os.getenv("NETWORK", "base-sepolia")
ADDRESS = os.getenv("ADDRESS")
MAX_DEADLINE_SECONDS = int(os.getenv("MAX_DEADLINE_SECONDS", "60"))

# CDP settings (for production)
CDP_API_KEY_ID = os.getenv("CDP_API_KEY_ID")
CDP_API_KEY_SECRET = os.getenv("CDP_API_KEY_SECRET")

# Email settings
FROM_EMAIL = os.getenv("FROM_EMAIL", "vivian@secondstate.io")
SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")
ORDER_CONFIRMATION_RECIPIENT = os.getenv("ORDER_CONFIRMATION_RECIPIENT")

# Paywall configuration
PAYWALL_CONFIG = PaywallConfig(
    app_name=os.getenv("APP_NAME", "x402-mvp"),
    app_logo=os.getenv("APP_LOGO", "/static/secondstate.png"),
)

# Validate required environment variables
if not ADDRESS:
    raise ValueError("Missing required environment variable: ADDRESS")
supported_networks = ["base-sepolia", "base"]
if NETWORK not in supported_networks:
    raise ValueError(f"Unsupported network: {NETWORK}")

# Create facilitator config
FACILITATOR_URL = os.getenv("FACILITATOR_URL", "https://x402f1.secondstate.io")
FACILITATOR_CONFIG = FacilitatorConfig(url=FACILITATOR_URL)
