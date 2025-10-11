#!/bin/bash

# Notification Script
# Usage: ./scripts/notify.sh [deployment|release|failure] [environment] [version]

set -e

EVENT_TYPE=${1:-deployment}
ENVIRONMENT=${2:-staging}
VERSION=${3:-latest}

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}[NOTIFICATION]${NC} Sending $EVENT_TYPE notification for $ENVIRONMENT ($VERSION)..."

# Slack notification (if webhook is configured)
if [ ! -z "$SLACK_WEBHOOK_URL" ]; then
    case $EVENT_TYPE in
        deployment)
            MESSAGE="🚀 Deployment successful to $ENVIRONMENT environment (v$VERSION)"
            COLOR="good"
            ;;
        release)
            MESSAGE="🎉 New release $VERSION deployed to $ENVIRONMENT"
            COLOR="good"
            ;;
        failure)
            MESSAGE="❌ Deployment failed for $ENVIRONMENT environment (v$VERSION)"
            COLOR="danger"
            ;;
    esac
    
    curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"$MESSAGE\",\"attachments\":[{\"color\":\"$COLOR\",\"fields\":[{\"title\":\"Environment\",\"value\":\"$ENVIRONMENT\",\"short\":true},{\"title\":\"Version\",\"value\":\"$VERSION\",\"short\":true}]}]}" \
        $SLACK_WEBHOOK_URL
fi

# Discord notification (if webhook is configured)
if [ ! -z "$DISCORD_WEBHOOK_URL" ]; then
    case $EVENT_TYPE in
        deployment)
            MESSAGE="🚀 **Deployment Successful**\nEnvironment: $ENVIRONMENT\nVersion: $VERSION"
            ;;
        release)
            MESSAGE="🎉 **New Release**\nVersion: $VERSION\nEnvironment: $ENVIRONMENT"
            ;;
        failure)
            MESSAGE="❌ **Deployment Failed**\nEnvironment: $ENVIRONMENT\nVersion: $VERSION"
            ;;
    esac
    
    curl -X POST -H 'Content-type: application/json' \
        --data "{\"content\":\"$MESSAGE\"}" \
        $DISCORD_WEBHOOK_URL
fi

# Email notification (if SMTP is configured)
if [ ! -z "$SMTP_SERVER" ] && [ ! -z "$NOTIFICATION_EMAIL" ]; then
    case $EVENT_TYPE in
        deployment)
            SUBJECT="Deployment Successful - $ENVIRONMENT ($VERSION)"
            BODY="Deployment to $ENVIRONMENT environment completed successfully.\nVersion: $VERSION\nTime: $(date)"
            ;;
        release)
            SUBJECT="New Release - $VERSION"
            BODY="New release $VERSION has been deployed to $ENVIRONMENT environment.\nTime: $(date)"
            ;;
        failure)
            SUBJECT="Deployment Failed - $ENVIRONMENT ($VERSION)"
            BODY="Deployment to $ENVIRONMENT environment failed.\nVersion: $VERSION\nTime: $(date)"
            ;;
    esac
    
    echo -e "$BODY" | mail -s "$SUBJECT" "$NOTIFICATION_EMAIL"
fi

echo "Notification sent for $EVENT_TYPE event"
