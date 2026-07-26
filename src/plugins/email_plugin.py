"""Sends an email via SMTP.

If SMTP isn't configured (no host/credentials in settings or node config),
this does not fail the node -- it composes the message and reports
``sent: False`` with the reason, which is the correct behavior for an
optional integration: the workflow can still branch on whether the email
actually went out.
"""
from __future__ import annotations

import smtplib
from email.message import EmailMessage
from typing import Any, ClassVar, Dict

from src.config.settings import settings
from src.models.execution import ExecutionContext
from src.models.plugin import ConfigField, PluginMetadata

from .base import Plugin, PluginExecutionError


class EmailPlugin(Plugin):
    metadata: ClassVar[PluginMetadata] = PluginMetadata(
        id="email",
        name="Email",
        description="Sends an email via SMTP.",
        category="notification",
        config_schema=[
            ConfigField("to", "string", required=True, description="Recipient email address"),
            ConfigField("subject", "string", required=True, description="Email subject"),
            ConfigField("body", "string", required=True, description="Email body (plain text)"),
        ],
    )

    def execute(self, config: Dict[str, Any], context: ExecutionContext) -> Any:
        message = EmailMessage()
        message["To"] = config["to"]
        message["From"] = settings.smtp_username or "flowforge@localhost"
        message["Subject"] = config["subject"]
        message.set_content(config["body"])

        if not settings.smtp_host:
            self._log("email not sent: SMTP not configured", to=config["to"])
            return {"sent": False, "reason": "SMTP is not configured", "to": config["to"], "subject": config["subject"]}

        try:
            with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as smtp:
                smtp.starttls()
                if settings.smtp_username:
                    smtp.login(settings.smtp_username, settings.smtp_password)
                smtp.send_message(message)
        except (smtplib.SMTPException, OSError) as exc:
            raise PluginExecutionError(f"Failed to send email: {exc}") from exc

        self._log("email sent", to=config["to"])
        return {"sent": True, "to": config["to"], "subject": config["subject"]}
