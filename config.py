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
ENVIRONMENT = os.getenv("ENVIRONMENT", "staging")
ORDER_DIR = "data"

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

# Validate required environment variables and create facilitator config
if NETWORK == "base-sepolia":
    if not ADDRESS:
        raise ValueError("Missing required environment variable: ADDRESS")
    facilitator_config = FacilitatorConfig(url="https://x402.org/facilitator")
elif NETWORK == "base":
    if not ADDRESS or not CDP_API_KEY_ID or not CDP_API_KEY_SECRET:
        raise ValueError("Missing required environment variables for base network")
    facilitator_config = create_facilitator_config(
        CDP_API_KEY_ID, CDP_API_KEY_SECRET)
else:
    raise ValueError(f"Unsupported network: {NETWORK}")
