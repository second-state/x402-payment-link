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
