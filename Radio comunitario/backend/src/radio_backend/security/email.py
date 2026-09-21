import smtplib
from email.message import EmailMessage

from radio_backend.config import get_settings

settings = get_settings()


def send_verification_email(to_email: str, token: str) -> None:
    verify_url = f"{settings.frontend_url}/verify?token={token}"

    msg = EmailMessage()
    msg["Subject"] = "Verifique seu e-mail - Rádio Comunitária"
    msg["From"] = settings.smtp_from
    msg["To"] = to_email
    msg.set_content(f"Confirme seu cadastro acessando: {verify_url}")

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
        server.send_message(msg)
