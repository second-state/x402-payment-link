"""Product catalog service for managing product configurations."""

import os
import yaml


def get_products():
    """Get all products from product.yaml"""
    with open('products.yaml', 'r') as f:
        product_catalog = yaml.safe_load(f)
    return product_catalog.keys()


def get_product_config(product_id, environment=None):
    """Get product configuration based on current environment

    Args:
        product_id: The product identifier
        environment: Environment name (defaults to ENVIRONMENT env var)

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

    return {
        "id": product_id,
        "name": product["name"],
        "description": product["description"],
        "image": product["image"],
        "price": env_config["price"],
        "shipping": env_config["shipping"],
        "environment": environment,
    }
