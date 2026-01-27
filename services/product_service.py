"""Product catalog service for managing product configurations."""

import os
import yaml


def get_products():
    """Get all products from product.yaml"""
    with open('products.yaml', 'r') as f:
        product_catalog = yaml.safe_load(f)
    return product_catalog.keys()


def get_product_config(product_id, environment=None, token_id=None):
    """Get product configuration based on current environment and token

    Args:
        product_id: The product identifier
        environment: Environment name (defaults to ENVIRONMENT env var)
        token_id: Optional token ID for token-specific pricing

    Returns:
        Product configuration dict or None if product not found
    """
    if environment is None:
        environment = os.getenv("ENVIRONMENT", "staging")

    with open('products.yaml', 'r') as f:
        product_catalog = yaml.safe_load(f)

    if product_id not in product_catalog:
        return None

    product = product_catalog[product_id]
    env_config = product.get(environment, product.get("production"))

    # Get base price and shipping
    price = env_config.get("price", 0)
    shipping = env_config.get("shipping", 0)

    # Check for token-specific pricing
    token_prices = {}
    if "tokens" in env_config:
        token_prices = env_config["tokens"]
        # If specific token requested, use its pricing
        if token_id and token_id in token_prices:
            token_config = token_prices[token_id]
            price = token_config.get("price", price)
            shipping = token_config.get("shipping", shipping)

    return {
        "id": product_id,
        "name": product["name"],
        "description": product["description"],
        "image": product["image"],
        "price": price,
        "shipping": shipping,
        "environment": environment,
        "token_prices": token_prices,
    }
