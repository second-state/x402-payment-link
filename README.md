# x402 Payment Page Demo

A Flask-based payment page demo implementing the [x402 protocol](https://www.x402.org/) for USDC cryptocurrency payments on the Base chain. Product and link data now come from the `x402-payment-link` Next.js service (no local YAML or per-product templates). Uses the Coinbase facilitator for payment verification and settlement.

## Quick Start

### Prerequisites

- Python 3.13+
- [uv](https://docs.astral.sh/uv/) package manager
- A Base wallet address for receiving USDC payments

### Installation

```bash
# Install dependencies
uv sync

# Copy environment template and configure
cp .env.example .env
# Edit .env with your wallet address and dashboard API info
```

### Run Locally

```bash
python3 main.py
```

The server starts at `http://localhost:5000` (or your configured `APP_PORT`).

### Run with Docker

```bash
docker compose up --build
```

### Test the Payment Flow

1. Create a link and products in `x402-payment-link`, then note the link code.
2. Open `http://localhost:5000/<link_code>` in your browser.
3. Fill out the order form and submit.
4. The payment page returns a 402 status with payment requirements.
5. Use an x402-compatible wallet to complete the payment.

## Configuration

Create a `.env` file in the project root. See `.env.example` for a template.

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `ADDRESS` | Wallet address for receiving USDC payments | `0xYourBaseWalletAddress` |
| `NETWORK` | Blockchain network | `base-sepolia` (testnet) or `base` (mainnet) |
| `LINK_API_BASE` | Base URL for the dashboard API | `http://localhost:3000` |
| `LINK_API_KEY` | API key for the dashboard (if required) | `sk_live_...` |

### Optional Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `APP_PORT` | `5000` | Server port |
| `MAX_DEADLINE_SECONDS` | `60` | Payment timeout in seconds |
| `FACILITATOR_URL` | `https://x402f1.secondstate.io` | x402 facilitator service URL |
| `APP_NAME` | `x402-mvp` | Application name shown in paywall |
| `APP_LOGO` | `/static/secondstate.png` | Logo URL for paywall |
| `LINK_API_TIMEOUT` | `5` | Timeout (seconds) for dashboard API calls |
| `DEBUG` | `false` | Enable Flask debug mode |

### Email Notifications (Optional)

To send order confirmation emails via SendGrid:

| Variable | Description |
|----------|-------------|
| `SENDGRID_API_KEY` | Your SendGrid API key |
| `FROM_EMAIL` | Sender email address |
| `ORDER_CONFIRMATION_RECIPIENT` | CC recipient for order confirmations |

## How It Works

The x402 protocol enables HTTP-native cryptocurrency payments using the `402 Payment Required` status code.

### Payment Flow

```
┌──────────┐     ┌──────────────┐     ┌─────────────┐     ┌─────────────┐
│  Browse  │────▶│ Submit Order │────▶│ Payment 402 │────▶│ Settlement  │
│ Product  │     │    Form      │     │ Requirements│     │ Confirmation│
└──────────┘     └──────────────┘     └─────────────┘     └─────────────┘
```

1. **Browse Product** (`GET /<link_code>`) - User views product page with pricing fetched from `x402-payment-link`
2. **Submit Order** (`POST /<link_code>/order`) - Order details saved, redirects to payment
3. **Payment Required** (`GET /<link_code>/order/<order_id>`) - Returns 402 with payment requirements if no `X-PAYMENT` header
4. **Settlement** - Client sends payment via `X-PAYMENT` header; facilitator verifies and settles on blockchain
5. **Confirmation** - Success page displayed with transaction link; email sent if configured

## Project Structure

```
├── main.py              # Flask application entry point
├── config.py            # Environment configuration
├── services/
│   ├── product_service.py     # Fetches links/products from dashboard API
│   ├── order_service.py       # Order persistence (JSONL)
│   ├── payment_service.py     # x402 payment verification/settlement
│   └── notification_service.py # SendGrid email notifications
├── templates/
│   ├── checkout.html               # Generic checkout page (API-driven)
│   ├── order_confirmation.html     # Post-payment success page
│   └── order_confirmation_email.html # Email template for confirmations
├── static/              # Static assets (images, etc.)
├── data/                # Runtime data (orders, logs)
├── Dockerfile
└── docker-compose.yaml
```

## Adding Products

Create products and links in `x402-payment-link` and use the generated link codes here. No local YAML or per-product templates are needed.

## Docker Deployment

The `docker-compose.yaml` configuration:

```yaml
services:
  x402-mvp:
    build: .
    restart: unless-stopped
    ports:
      - "${SERVER_PORT}:${APP_PORT}"
    volumes:
      - ./.env:/app/.env
      - ./data:/app/data
```

**Volume Mounts:**
- `.env` - Configuration file
- `data/` - Persistent storage for orders (`<product>.txt`) and logs (`app.log`)

**Port Configuration:**
- Set `SERVER_PORT` in your environment for the external port
- Set `APP_PORT` in `.env` for the internal Flask port

## Development

### Services

| Service | Purpose |
|---------|---------|
| `product_service` | Fetches link/product data from `LINK_API_BASE` (with optional `LINK_API_KEY`) |
| `order_service` | Generates order IDs, stores orders as JSONL in `data/` |
| `payment_service` | Creates payment requirements, verifies/settles via facilitator |
| `notification_service` | Sends confirmation emails via SendGrid |

### Testing on Testnet

1. Set `NETWORK=base-sepolia` in `.env`
2. Use a testnet wallet with Sepolia USDC
3. No Coinbase API keys required for testnet

### Order Storage

Orders are stored as JSON lines in `data/<product>.txt`:

```json
{"time":"2024-01-01T12:00:00","email":"user@example.com","order_id":"ABC123","quantity":1,"total":"0.10","payment":false}
```

After payment settlement, a new entry is appended with `"payment":true`.

## License

See [LICENSE](LICENSE) for details.
