# x402 payment page demo

This application uses the Coinbase facilitator. It supports USDC payments on the Base chain. You will need to add a `.env` file in order to make it work.

## Staging environment on Testnet

No Coinbase account needed.

```
NETWORK=base-sepolia            # Base Sepolia testnet
ADDRESS=0xYourBaseWalletAddress # Where USDC payments go
```

## Production environment

You must register an account at the [Coinbase Developer Portal](https://portal.cdp.coinbase.com/) and get an API key.

```
NETWORK=base                                # Base mainnet
ADDRESS=0xYourBaseWalletAddress             # Where USDC payments go
CDP_API_KEY_ID=YourCoinbaseAPIKeyID         # Get this from Coinbase Developer Portal
CDP_API_KEY_SECRET=YourCoinbaseAPIKeySecret # Get this from Coinbase Developer Portal
```

## Email settings

To send email notifications, you need to set up SMTP settings in the `.env` file.

```
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USE_TLS=True
MAIL_USE_SSL=False
MAIL_USERNAME=<your_email_username>
MAIL_PASSWORD=<your_email_password>
MAIL_DEFAULT_SENDER=<your_default_sender_email>
ORDER_CONFIRMATION_RECIPIENT=<recipient_email_for_order_confirmations>
```
