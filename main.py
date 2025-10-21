import os

from dotenv import load_dotenv
from flask import Flask, send_from_directory
from x402.flask.middleware import PaymentMiddleware
from x402.types import PaywallConfig

# Load environment variables
load_dotenv()

NETWORK = os.getenv("NETWORK", "base-sepolia")
ADDRESS = os.getenv("ADDRESS")

app = Flask(__name__)

payment_middleware = PaymentMiddleware(app)
payment_middleware.add(
    path="/paid",
    price="$0.01",
    pay_to_address=ADDRESS,
    network=NETWORK,
    paywall_config=PaywallConfig(
        app_name="x402-mvp",
        app_logo="/static/secondstate.png",
    ),
)

@app.route("/")
def index():
    return '''<!DOCTYPE html>
    <html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>X402 MVP</title>
    <style>body{font-family:system-ui,sans-serif;max-width:600px;margin:80px auto;padding:20px}h1{color:#333;margin-bottom:30px}
    a{display:inline-block;margin:10px 20px 10px 0;padding:12px 24px;text-decoration:none;border:2px solid #333;border-radius:6px;color:#333;transition:all 0.2s}
    a:hover{background:#333;color:#fff}</style></head>
    <body><h1>X402 MVP</h1><a href="/public">Public Resource</a><a href="/paid">Paid Resource</a></body></html>'''

@app.route('/static/<path:filename>')
def serve_static(filename):
    return send_from_directory('static', filename)

@app.route("/public")
def public():
    return '''<!DOCTYPE html>
    <html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Public Resource</title>
    <style>body{font-family:system-ui,sans-serif;max-width:600px;margin:80px auto;padding:20px}h1{color:#333}p{color:#666;margin:20px 0}
    a{color:#0066cc;text-decoration:none}a:hover{text-decoration:underline}</style></head>
    <body><a href="/">← Back</a><h1>Public Resource</h1><p>This is a freely accessible public resource. No payment required!</p></body></html>'''

@app.route("/paid")
def paid():
    return '''<!DOCTYPE html>
    <html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Paid Resource</title>
    <style>body{font-family:system-ui,sans-serif;max-width:600px;margin:80px auto;padding:20px}h1{color:#333}p{color:#666;margin:20px 0}
    a{color:#0066cc;text-decoration:none}a:hover{text-decoration:underline}.success{background:#e8f5e9;padding:15px;border-left:4px solid #4caf50;border-radius:4px;margin-top:20px}</style></head>
    <body><a href="/">← Back</a><h1>Premium Content Unlocked!</h1><p>Congratulations! You have successfully accessed this paid resource.</p>
    <div class="success"><strong>✓ Payment Verified</strong><br>You now have full access to this premium content.</div></body></html>'''

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8008)
