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
- `LINK_API_BASE`: Base URL for the `x402-payment-link` dashboard API
- `LINK_API_KEY`: API key for dashboard access (if required)
- For production: `CDP_API_KEY_ID` and `CDP_API_KEY_SECRET` from Coinbase Developer Portal
- Optional: SendGrid email settings for order confirmations

## Architecture

### Request Flow
1. User visits `/<link_code>`; the app fetches link + product data from `LINK_API_BASE`
2. Order form submits to `/<link_code>/order` (creates order, redirects to payment)
3. Payment page at `/<link_code>/order/<order_id>` handles x402 protocol:
   - Returns 402 with payment requirements if no `X-PAYMENT` header
   - Verifies and settles payment via facilitator if header present
   - Renders confirmation page on success

### Service Layer (`services/`)
- `product_service.py`: Fetches link + product data from the dashboard API
- `order_service.py`: Persists orders as JSON lines in `data/<product>.txt`
- `payment_service.py`: x402 payment verification/settlement logic
- `notification_service.py`: SendGrid email notifications

### Configuration
- `config.py`: Loads environment variables, creates facilitator config (uses LINK_API_BASE/KEY)

### Key Dependencies
- `x402`: Protocol implementation (from Coinbase x402 repo)
- `cdp-sdk`: Coinbase Developer Platform SDK
- `flask[async]`: Async views for payment handlers

## Adding New Products

Create products and links in `x402-payment-link`, then use the generated link codes here. Templates are generic (`checkout.html`, `order_confirmation.html`, `order_confirmation_email.html`); no per-product template work is needed.
