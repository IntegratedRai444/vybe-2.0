import os
import base64
import pickle
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# If modifying these scopes, delete the file token.pickle
SCOPES = ['https://www.googleapis.com/auth/gmail.send']

def get_gmail_credentials():
    """Get valid user credentials from storage or prompt user to log in."""
    creds = None
    # The file token.pickle stores the user's access and refresh tokens
    if os.path.exists('token.pickle'):
        with open('token.pickle', 'rb') as token:
            creds = pickle.load(token)
    
    # If there are no (valid) credentials, let the user log in
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(
                'credentials.json', SCOPES)
            creds = flow.run_local_server(port=0)
        # Save the credentials for the next run
        with open('token.pickle', 'wb') as token:
            pickle.dump(creds, token)
    
    return creds

def send_test_email():
    try:
        email_from = os.getenv('ALERT_EMAIL_FROM')
        email_to = os.getenv('ALERT_EMAIL_TO')
        
        if not email_from or not email_to:
            raise ValueError("ALERT_EMAIL_FROM and ALERT_EMAIL_TO must be set in .env")

        # Create message
        msg = MIMEMultipart()
        msg['From'] = email_from
        msg['To'] = email_to
        msg['Subject'] = 'Vybe AI - Test Email Configuration (OAuth2)'

        # Email body
        body = """
        <h2>🎉 Vybe AI Email Test Successful!</h2>
        <p>This is a test email to verify your OAuth2 configuration is working correctly.</p>
        <p>If you're seeing this email, your email configuration is working correctly! 🎉</p>
        """
        
        msg.attach(MIMEText(body, 'html'))

        # Get credentials and send email
        creds = get_gmail_credentials()
        service = build('gmail', 'v1', credentials=creds)
        
        # Encode the message
        raw_message = base64.urlsafe_b64encode(msg.as_bytes()).decode()
        message = service.users().messages().send(
            userId="me",
            body={'raw': raw_message}
        ).execute()
        
        print("✅ Test email sent successfully!")
        print(f"📨 Check your inbox (and spam folder) at: {email_to}")
        
    except HttpError as error:
        print(f"❌ Gmail API error: {error}")
    except Exception as e:
        print(f"❌ Failed to send test email: {str(e)}")

def setup_oauth():
    """Run the OAuth flow to get credentials."""
    flow = InstalledAppFlow.from_client_secrets_file(
        'credentials.json',
        scopes=['https://www.googleapis.com/auth/gmail.send']
    )
    creds = flow.run_local_server(port=0)
    
    # Save the credentials for the next run
    with open('token.pickle', 'wb') as token:
        pickle.dump(creds, token)
    
    print("✅ OAuth2 setup completed successfully!")

if __name__ == "__main__":
    print("🚀 Testing Gmail API configuration...")
    print(f"📧 Will send test email to: {os.getenv('ALERT_EMAIL_TO')}")
    
    if not os.path.exists('credentials.json'):
        print("\n❌ 'credentials.json' not found. Please follow these steps:")
        print("1. Go to https://console.cloud.google.com/")
        print("2. Create a new project")
        print("3. Enable Gmail API")
        print("4. Create OAuth 2.0 credentials")
        print("5. Download the credentials and save as 'credentials.json' in this directory")
    elif not os.path.exists('token.pickle'):
        print("\n🔑 Running OAuth2 setup...")
        setup_oauth()
    
    # Now try to send the test email
    if os.path.exists('token.pickle'):
        send_test_email()
