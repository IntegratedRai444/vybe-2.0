#!/bin/bash

# Exit on error
set -e

# Configuration
CLUSTER_NAME="vybe-cluster"
NODES=2
INGRESS="traefik"
REGISTRY_NAME="registry.localhost"
REGISTRY_PORT=5000

# Check if k3d is installed
if ! command -v k3d &> /dev/null; then
    echo "k3d is not installed. Please install it first."
    echo "Visit https://k3d.io/v5.4.6/#installation for installation instructions."
    exit 1
fi

# Create local registry
if ! k3d registry list | grep -q $REGISTRY_NAME; then
    echo "Creating local registry..."
    k3d registry create $REGISTRY_NAME --port $REGISTRY_PORT
else
    echo "Registry already exists, skipping..."
fi

# Create cluster
if ! k3d cluster list | grep -q $CLUSTER_NAME; then
    echo "Creating k3d cluster..."
    k3d cluster create $CLUSTER_NAME \
        --servers 1 \
        --agents $NODES \
        --k3s-arg "--disable=traefik@server:0" \
        --registry-use k3d-$REGISTRY_NAME:$REGISTRY_PORT \
        --volume "$(pwd)/k8s:/var/lib/rancher/k3s/server/manifests"
else
    echo "Cluster already exists, skipping..."
fi

# Install NGINX Ingress
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.5.1/deploy/static/provider/cloud/deploy.yaml

# Install Cert-Manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/latest/download/cert-manager.yaml

# Wait for pods to be ready
echo "Waiting for pods to be ready..."
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=90s

kubectl -n cert-manager wait --for=condition=ready pod -l app.kubernetes.io/instance=cert-manager --timeout=90s

echo "Cluster setup complete!"
echo "To access the cluster, run: kubectl cluster-info"
