"""Order management service for handling order persistence and retrieval."""

import json
import secrets
import string


ORDER_DIR = "data"


def generate_order_id(length=12):
    """Generate a random order ID.

    Args:
        length: Length of the order ID (default: 12)

    Returns:
        Random alphanumeric string in uppercase
    """
    chars = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(chars) for _ in range(length))


def get_orders(product):
    """Get all orders for a product.

    Args:
        product: Product identifier

    Returns:
        List of order dictionaries
    """
    filepath = f"{ORDER_DIR}/{product}.txt"
    try:
        with open(filepath, "r") as f:
            return [json.loads(line) for line in f.readlines()]
    except FileNotFoundError:
        # Create a new file if not exists
        with open(filepath, "w") as f:
            pass
        return []


def get_order_by_id(product, order_id):
    """Get a specific order by ID.

    Args:
        product: Product identifier
        order_id: Order ID to find

    Returns:
        Order dictionary or None if not found
    """
    orders = get_orders(product)
    # Prefer the latest occurrence (in case older entries exist)
    for order in reversed(orders):
        if order.get("order_id") == order_id:
            return order
    return None


def save_product_order(product, data):
    """Save an order to the product's order file.

    Args:
        product: Product identifier
        data: Order data dictionary
    """
    filepath = f"{ORDER_DIR}/{product}.txt"

    # Load existing orders and replace the one with the same ID (if any)
    existing = get_orders(product)
    updated_orders = [o for o in existing if o.get("order_id") != data.get("order_id")]
    updated_orders.append(data)

    with open(filepath, "w") as f:
        for order in updated_orders:
            f.write(f"{json.dumps(order)}\n")
