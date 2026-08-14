#!/bin/bash

# This script helps you set up GitHub repository secrets
# Run this with appropriate values for your environment

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "GitHub CLI (gh) is not installed. Please install it first."
    echo "Visit https://cli.github.com/ for installation instructions."
    exit 1
fi

# Authenticate with GitHub
gh auth login

# Function to securely set a secret
set_secret() {
    local secret_name=$1
    local prompt_message=$2
    local is_password=$3

    echo -n "$prompt_message: "
    if [ "$is_password" = true ]; then
        read -s secret_value
        echo
    else
        read secret_value
    fi

    if [ -z "$secret_value" ]; then
        echo "Value cannot be empty. Skipping $secret_name."
        return 1
    fi

    echo -n "Setting $secret_name... "
    echo "$secret_value" | gh secret set "$secret_name" --app actions
    echo "Done!"
}

# Set Kubernetes configs
echo "=== Setting up Kubernetes Configs ==="
echo "Paste your kubeconfig for staging (press Ctrl+D when done):"
temp_staging=$(mktemp)
cat > "$temp_staging"
gh secret set KUBE_CONFIG_STAGING < "$temp_staging"
rm -f "$temp_staging"

echo "Paste your kubeconfig for production (press Ctrl+D when done):"
temp_prod=$(mktemp)
cat > "$temp_prod"
gh secret set KUBE_CONFIG_PRODUCTION < "$temp_prod"
rm -f "$temp_prod"

# Set other required secrets
set_secret "DOCKER_USERNAME" "Enter your Docker Hub username" false
set_secret "DOCKER_PASSWORD" "Enter your Docker Hub password" true
set_secret "SLACK_WEBHOOK_URL" "(Optional) Enter your Slack webhook URL for notifications" false

# Set domain and certificate info
set_secret "DOMAIN" "Enter your base domain (e.g., vybe.ai)" false
set_secret "EMAIL" "Enter your email for Let's Encrypt" false

echo "=== Secret Setup Complete ==="
echo "All secrets have been configured in your GitHub repository."
