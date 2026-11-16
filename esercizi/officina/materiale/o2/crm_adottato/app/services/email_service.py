import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.config import settings

class EmailService:
    def __init__(self):
        self.host = settings.SMTP_HOST
        self.port = settings.SMTP_PORT

    def send_email(self, to_email: str, subject: str, body: str):
        try:
            msg = MIMEMultipart()
            msg['From'] = "sender@example.com"
            msg['To'] = to_email
            msg['Subject'] = subject

            msg.attach(MIMEText(body, 'plain'))

            # Try sending via SMTP
            try:
                with smtplib.SMTP(self.host, self.port) as server:
                    # server.set_debuglevel(1) 
                    server.send_message(msg)
                print(f"Email sent to {to_email} via SMTP")
                return True
            except (ConnectionRefusedError, OSError) as e:
                # Fallback to local file
                print(f"SMTP failed ({e}), saving email locally...")
                self._save_to_file(to_email, subject, body)
                return True
                
        except Exception as e:
            print(f"Failed to send email to {to_email}: {e}")
            return False

    def _save_to_file(self, to_email: str, subject: str, body: str):
        import os
        from datetime import datetime
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_email = to_email.replace("@", "_at_").replace(".", "_")
        filename = f"sent_emails/{timestamp}_{safe_email}.txt"
        
        os.makedirs("sent_emails", exist_ok=True)
        
        with open(filename, "w", encoding="utf-8") as f:
            f.write(f"To: {to_email}\n")
            f.write(f"Subject: {subject}\n")
            f.write("-" * 20 + "\n")
            f.write(body)
        
        print(f"Email saved to {filename}")
