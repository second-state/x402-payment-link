# x402 payment page demo

This application uses the Coinbase facilitator. It supports USDC payments on the Base chain. You will need to add a `.env` file in order to make it work.

## Staging environment on Testnet

No Coinbase account needed.

```
PAY_TO_ADDRESS=0xYourBaseWalletAddress  # Where USDC payments go
BASE_RPC_URL=https://sepolia.base.org
```

## Production environment

You must register an account at the [Coinbase Developer Portal](https://portal.cdp.coinbase.com/) and get an API key.

```
COINBASE_API_KEY=your_cdp_api_key_here  # From CDP console
PAY_TO_ADDRESS=0xYourBaseWalletAddress  # Where USDC payments go
BASE_RPC_URL=https://mainnet.base.org
```
