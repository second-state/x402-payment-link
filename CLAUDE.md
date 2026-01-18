# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

x402-mvp is a Flask-based payment page demo that implements the x402 protocol for cryptocurrency payments. It uses the Coinbase facilitator to accept USDC payments on the Base chain (mainnet or Sepolia testnet).

## Development Commands

```bash
# Install dependencies (uses uv package manager)
uv sync

# Run the development server
python3 main.py

# Run with Docker
docker compose up --build
```

## Environment Setup

Copy `.env.example` to `.env` and configure:
- `NETWORK`: `base-sepolia` (testnet) or `base` (mainnet)
- `ADDRESS`: Wallet address for receiving USDC payments
- For production: `CDP_API_KEY_ID` and `CDP_API_KEY_SECRET` from Coinbase Developer Portal
- Optional: SendGrid email settings for order confirmations

## Architecture

### Request Flow
1. User browses products at `/<product>` (renders product page)
2. Order form submits to `/<product>/order` (creates order, redirects to payment)
3. Payment page at `/<product>/order/<order_id>` handles x402 protocol:
   - Returns 402 with payment requirements if no `X-PAYMENT` header
   - Verifies and settles payment via facilitator if header present
   - Renders confirmation page on success

### Service Layer (`services/`)
- `product_service.py`: Reads product catalog from `products.yaml`
- `order_service.py`: Persists orders as JSON lines in `data/<product>.txt`
- `notification_service.py`: SendGrid email notifications

### Configuration
- `config.py`: Loads environment variables, creates facilitator config
- `products.yaml`: Product catalog with environment-specific pricing (staging/production)

### Key Dependencies
- `x402`: Protocol implementation (from Coinbase x402 repo)
- `x402-payment-service`: Payment verification/settlement logic (external package from GitHub)
- `cdp-sdk`: Coinbase Developer Platform SDK
- `flask[async]`: Async views for payment handlers

## Adding New Products

1. Add entry to `products.yaml` with name, description, image, and pricing per environment
2. Create templates in `templates/<product_id>/`:
   - `product.html`: Product landing page
   - `order_confirmation.html`: Post-payment confirmation
   - `order_confirmation_email.html`: Email template (optional)
