#!/bin/bash

# Monitoring Update Script
# Usage: ./scripts/update-monitoring.sh [staging|production]

set -e

ENVIRONMENT=${1:-staging}

echo "Updating monitoring for $ENVIRONMENT environment..."

# Update Prometheus configuration
if [ -f "monitoring/prometheus.yml" ]; then
    echo "Updating Prometheus configuration..."
    # Add environment-specific targets
    case $ENVIRONMENT in
        staging)
            echo "  - targets: ['vybe-staging:8000']" >> monitoring/prometheus.yml
            ;;
        production)
            echo "  - targets: ['vybe-production:8000']" >> monitoring/prometheus.yml
            ;;
    esac
fi

# Update Grafana dashboards
if [ -f "monitoring/grafana-dashboard.json" ]; then
    echo "Updating Grafana dashboard..."
    # Update dashboard with environment-specific data sources
    sed -i "s/ENVIRONMENT_PLACEHOLDER/$ENVIRONMENT/g" monitoring/grafana-dashboard.json
fi

echo "Monitoring updated for $ENVIRONMENT"
