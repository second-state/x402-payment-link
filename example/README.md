# Adding x402 Payment to a Flask Application

This example demonstrates how to integrate x402 payment functionality into a simple Flask application using `PaymentService` from the `x402-payment-service` package.

## Before: A Simple Flask Server (Without Payment)

Here's what a basic Flask server looks like without any payment integration:

```python
from flask import Flask

app = Flask(__name__)

@app.route("/")
def index():
    return "<h1>Welcome</h1>"

@app.route("/premium")
def premium_content():
    # Anyone can access this content for free
    return "<h1>Premium Content</h1><p>This is exclusive content!</p>"

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
```

## After: Adding Payment with PaymentService

With `PaymentService`, you can easily add payment requirements to any endpoint. Here's the transformation:

### Step 1: Import and Configure

```python
import os
from flask import Flask, request
from x402_payment_service import PaymentService

app = Flask(__name__)

# Configuration
NETWORK = os.getenv("NETWORK", "base-sepolia")
ADDRESS = os.getenv("ADDRESS")  # Your wallet address to receive payments
FACILITATOR_URL = os.getenv("FACILITATOR_URL", "https://x402f1.secondstate.io")
MAX_DEADLINE_SECONDS = 60

# Paywall configuration
APP_NAME = "My App"
APP_LOGO = "/static/logo.png"
```

### Step 2: Transform Your Endpoint

Change your endpoint from a regular function to an `async` function and add the payment flow:

```python
@app.route("/premium")
async def premium_content():
    # Create payment service
    payment_service = PaymentService(
        app_name=APP_NAME,
        app_logo=APP_LOGO,
        headers=request.headers,
        resource_url=request.url,
        price=0.01,  # $0.01 USD
        description="Access to premium content",
        network=NETWORK,
        pay_to_address=ADDRESS,
        facilitator_url=FACILITATOR_URL,
        max_timeout_seconds=MAX_DEADLINE_SECONDS
    )

    # Parse and validate payment header
    success, payment, selected_requirements, parse_error = payment_service.parse()
    if not success:
        return payment_service.response(parse_error)

    # Verify payment
    is_valid, verify_error = await payment_service.verify(
        payment, selected_requirements, "premium"
    )
    if not is_valid:
        return payment_service.response(verify_error)

    # Settle payment
    success, tx_hash, tx_network, settle_error = await payment_service.settle(
        payment, selected_requirements, "premium"
    )
    if not success:
        return payment_service.response(settle_error)

    # Return premium content after successful payment
    return "<h1>Premium Content</h1><p>Thank you for your payment!</p>"
```

## How It Works

1. **PaymentService Initialization**: When a request comes in, create a `PaymentService` instance with:
   - `app_name`: Your application name (displayed on the paywall)
   - `app_logo`: Your application logo URL (displayed on the paywall)
   - `headers`: Request headers (contains the `X-PAYMENT` header from clients)
   - `resource_url`: The URL being accessed
   - `price`: The price in USD
   - `description`: What the user is paying for
   - `network`: Blockchain network (`base-sepolia` for testnet, `base` for mainnet)
   - `pay_to_address`: Your wallet address to receive payments
   - `facilitator_url`: URL of the x402 facilitator service

2. **Parse**: Check if there's a valid payment header in the request

3. **Verify**: Verify that the payment signature is valid

4. **Settle**: Execute the payment on the blockchain

5. **Respond**: If any step fails, `payment_service.response(error)` returns an appropriate response that prompts the user to pay

## Running the Demo

1. Set up environment variables:

```bash
export ADDRESS="0xYourWalletAddress"
export NETWORK="base-sepolia"  # Use "base" for mainnet
export FACILITATOR_URL="https://x402f1.secondstate.io"
```

2. Install dependencies:

```bash
pip install flask python-dotenv git+https://github.com/second-state/x402-payment-service.git
```

3. Run the demo:

```bash
cd example
python demo.py
```

4. Visit http://localhost:5000 in your browser

## Testing with x402-enabled Clients

The payment flow works automatically with x402-enabled clients (browsers with wallet extensions, API clients with payment capabilities). When accessing the `/premium` endpoint:

- **Without payment**: Returns a 402 Payment Required response with a paywall UI
- **With valid payment**: Returns the premium content

## Key Benefits

- **Simple Integration**: Just wrap your endpoint logic with the payment flow
- **Automatic Paywall**: Browser users see a friendly payment UI
- **API Compatible**: Non-browser clients receive proper 402 responses with payment requirements
- **Flexible Pricing**: Set any USD price for your content
- **Network Agnostic**: Works on testnet (base-sepolia) or mainnet (base)
