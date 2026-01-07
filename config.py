"""Application configuration and constants."""

import os

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
