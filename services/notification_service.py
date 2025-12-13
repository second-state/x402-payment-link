"""Notification service for sending order confirmation emails."""

import logging
import os

import sendgrid
from flask import render_template
from sendgrid.helpers.mail import Cc, Email, Mail, To


logger = logging.getLogger(__name__)


def send_order_confirmation_email(
    order: dict,
    product_config: dict,
    product: str,
    order_id: str,
    tx_hash: str,
    tx_link: str,
    from_email: str,
    cc_recipient: str,
    sendgrid_api_key: str
) -> bool:
    """Send order confirmation email to customer.

    Args:
        order: Order data dictionary
        product_config: Product configuration dictionary
        product: Product identifier
        order_id: Order ID
        tx_hash: Transaction hash
        tx_link: Transaction explorer link
        from_email: Sender email address
        cc_recipient: CC recipient email address
        sendgrid_api_key: SendGrid API key

    Returns:
        True if email sent successfully, False otherwise
    """
    try:
        sendgrid_client = sendgrid.SendGridAPIClient(api_key=sendgrid_api_key)
        sender = Email(from_email)
        to_email = To(order.get("email"))
        cc_email = Cc(cc_recipient)
        subject = f"Order Confirmation - {order_id}"

        html_content = render_template(
            "order_confirmation_email.html",
            order_id=order_id,
            name=order.get("name", "Customer"),
            email=order.get("email"),
            phone=order.get("phone"),
            address1=order.get("address1"),
            address2=order.get("address2"),
            state=order.get("state"),
            zip=order.get("zip"),
            country=order.get("country"),
            total=order.get("total"),
            quantity=order.get("quantity"),
            product=product_config,
            tx_hash=tx_hash,
            tx_link=tx_link,
        )

        mail = Mail(sender, to_email, subject, html_content=html_content)
        mail.cc = cc_email
        sendgrid_client.send(mail)

        logger.info(f"Order confirmation email sent ({order_id})")
        return True

    except Exception as e:
        logger.error(f"Failed to send email ({order_id}): {e}")
        return False
