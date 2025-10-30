#!/bin/bash

# Exit on error
set -e

# Create monitoring namespace if it doesn't exist
kubectl create namespace monitoring --dry-run=client -o yaml | kubectl apply -f -

# Install kube-prometheus-stack
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm upgrade --install kube-prometheus-stack \
  prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --set prometheus.prometheusSpec.serviceMonitorSelectorNilUsesHelmValues=false \
  --set prometheus.prometheusSpec.podMonitorSelectorNilUsesHelmValues=false \
  --set grafana.enabled=true \
  --set grafana.service.type=LoadBalancer \
  --set grafana.adminPassword=admin \
  --set grafana.service.port=3000 \
  --set grafana.ingress.enabled=true \
  --set grafana.ingress.hosts[0]=grafana.vybe.local \
  --set grafana.ingress.tls[0].hosts[0]=grafana.vybe.local \
  --set prometheus.service.type=LoadBalancer \
  --set alertmanager.service.type=LoadBalancer

# Install Loki for logging
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update

helm upgrade --install loki grafana/loki-stack \
  --namespace monitoring \
  --set promtail.enabled=true \
  --set loki.persistence.enabled=true \
  --set loki.persistence.size=10Gi

# Create Grafana data source for Loki
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-datasources
  namespace: monitoring
data:
  loki-datasource.yaml: |-
    apiVersion: 1
    datasources:
      - name: Loki
        type: loki
        access: proxy
        url: http://loki:3100
        version: 1
        editable: true
EOF

# Get Grafana admin password
echo "Grafana admin password: admin"
echo "To access Grafana, run: kubectl port-forward -n monitoring svc/kube-prometheus-stack-grafana 3000:80"
echo "Then open: http://localhost:3000"
