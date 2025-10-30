# Gmail OAuth2 Setup Guide for Vybe AI

This guide will help you set up Gmail OAuth2 for sending emails from the Vybe AI application.

## Prerequisites
- A Google Cloud Project
- Gmail API enabled
- Python 3.7+ installed
- Required Python packages: `google-auth`, `google-auth-oauthlib`, `google-auth-httplib2`, `google-api-python-client`

## Step 1: Set Up OAuth Consent Screen

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. In the left sidebar, click on "APIs & Services" > "OAuth consent screen"
4. Select "External" user type and click "Create"
5. Fill in the required information:
   - App name: `Vybe AI`
   - User support email: `your-email@gmail.com`
   - Developer contact information: `your-email@gmail.com`
6. Click "Save and Continue"
7. In the Scopes section, click "Add or Remove Scopes"
   - Search for and add: `.../auth/gmail.send`
8. Click "Update" then "Save and Continue"
9. In the Test Users section, add your email address
10. Click "Save and Continue"

## Step 2: Create OAuth Credentials

1. In the left sidebar, click on "Credentials"
2. Click "+ CREATE CREDENTIALS" > "OAuth client ID"
3. Select "Desktop app" as the application type
4. Name it "Vybe AI Email"
5. Click "Create"
6. Click the download button (↓) to download the credentials as `credentials.json`
7. Place the `credentials.json` file in your `backend` folder

## Step 3: Run the Setup Script

1. Make sure you have the required Python packages installed:
   ```bash
   pip install google-auth google-auth-oauthlib google-auth-httplib2 google-api-python-client
   ```

2. Run the setup script:
   ```bash
   python test_email.py
   ```

3. This will open a browser window asking you to sign in with your Google account
4. After signing in, you'll see a message that the OAuth2 setup is complete
5. A `token.pickle` file will be created in your backend directory

## Step 4: Test Email Sending

1. The script will automatically attempt to send a test email
2. Check your inbox (and spam folder) for the test email
3. If successful, you'll see a confirmation message in the terminal

## Troubleshooting

- If you get an error about the redirect URI, make sure you've added your email as a test user
- If the email goes to spam, mark it as "Not spam" in Gmail
- If you need to reset the OAuth flow, delete the `token.pickle` file and run the script again

## Notes
- The first time you run the script, you'll need to go through the OAuth consent flow
- The `token.pickle` file stores your credentials for future use
- Never commit `credentials.json` or `token.pickle` to version control
