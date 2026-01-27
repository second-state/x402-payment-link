# x402 Payment Page Demo

A Flask-based payment page demo implementing the [x402 protocol](https://www.x402.org/) for USDC cryptocurrency payments on the Base chain. Uses the Coinbase facilitator for payment verification and settlement.

## Quick Start

### Prerequisites

- Python 3.13+
- [uv](https://docs.astral.sh/uv/) package manager
- A Base wallet address for receiving USDC payments

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd x402-mvp

# Install dependencies
uv sync

# Copy environment template and configure
cp .env.example .env
# Edit .env with your wallet address
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

1. Open `http://localhost:5000/demo` in your browser
2. Fill out the order form and submit
3. The payment page returns a 402 status with payment requirements
4. Use an x402-compatible wallet to complete the payment

## Configuration

Create a `.env` file in the project root. See `.env.example` for a template.

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `ADDRESS` | Wallet address for receiving USDC payments | `0xYourBaseWalletAddress` |
| `NETWORK` | Blockchain network | `base-sepolia` (testnet) or `base` (mainnet) |

### Optional Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `APP_PORT` | `5000` | Server port |
| `ENVIRONMENT` | `staging` | Affects product pricing (`staging` or `production`) |
| `MAX_DEADLINE_SECONDS` | `60` | Payment timeout in seconds |
| `FACILITATOR_URL` | `https://x402f1.secondstate.io` | x402 facilitator service URL |
| `APP_NAME` | `x402-mvp` | Application name shown in paywall |
| `APP_LOGO` | `/static/secondstate.png` | Logo URL for paywall |

### Production (Mainnet)

For mainnet deployments, register at the [Coinbase Developer Portal](https://portal.cdp.coinbase.com/) and add:

| Variable | Description |
|----------|-------------|
| `CDP_API_KEY_ID` | Coinbase Developer Platform API Key ID |
| `CDP_API_KEY_SECRET` | Coinbase Developer Platform API Key Secret |

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

1. **Browse Product** (`GET /<product>`) - User views product page with pricing
2. **Submit Order** (`POST /<product>/order`) - Order details saved, redirects to payment
3. **Payment Required** (`GET /<product>/order/<order_id>`) - Returns 402 with payment requirements if no `X-PAYMENT` header
4. **Settlement** - Client sends payment via `X-PAYMENT` header; facilitator verifies and settles on blockchain
5. **Confirmation** - Success page displayed with transaction link; email sent if configured

## Project Structure

```
├── main.py              # Flask application entry point
├── config.py            # Environment configuration
├── products.yaml        # Product catalog
├── services/
│   ├── product_service.py     # Product catalog management
│   ├── order_service.py       # Order persistence (JSONL)
│   ├── payment_service.py     # x402 payment verification/settlement
│   └── notification_service.py # SendGrid email notifications
├── templates/
│   └── <product_id>/
│       ├── product.html               # Product landing page
│       ├── order_confirmation.html    # Success page
│       └── order_confirmation_email.html  # Email template
├── static/              # Static assets (images, etc.)
├── data/                # Runtime data (orders, logs)
├── Dockerfile
└── docker-compose.yaml
```

## Adding New Products

1. Add an entry to `products.yaml`:

```yaml
my_product:
  name: My Product
  description: "Product description here"
  image: https://example.com/image.png
  staging:
    price: 0.10
    shipping: 0.00
  production:
    price: 29.99
    shipping: 4.99
```

2. Create templates in `templates/my_product/`:
   - `product.html` - Product landing page with order form
   - `order_confirmation.html` - Post-payment success page
   - `order_confirmation_email.html` - Email template (optional)

### Multi-Token / Native-Token Payments

To accept payments in additional tokens (native ETH or custom ERC-20) beyond the default USDC:

1. Create `tokens.yaml` in the project root to define supported tokens (defaults to USDC only if not provided)
2. Add token-specific pricing under `tokens` in `products.yaml`

See `example/configs/multi-token/` and `example/configs/native-token/` for reference configurations.

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
| `product_service` | Reads product catalog from `products.yaml` |
| `order_service` | Generates order IDs, stores orders as JSONL in `data/` |
| `payment_service` | Creates payment requirements, verifies/settles via facilitator |
| `notification_service` | Sends confirmation emails via SendGrid |

### Testing on Testnet

1. Set `NETWORK=base-sepolia` in `.env`
2. Set `ENVIRONMENT=staging` for lower test prices ($0.10)
3. Use a testnet wallet with Sepolia USDC
4. No Coinbase API keys required for testnet

### Order Storage

Orders are stored as JSON lines in `data/<product>.txt`:

```json
{"time":"2024-01-01T12:00:00","email":"user@example.com","order_id":"ABC123","quantity":1,"total":"0.10","payment":false}
```

After payment settlement, a new entry is appended with `"payment":true`.

## License

See [LICENSE](LICENSE) for details.
