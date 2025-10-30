# Vybe 2.0 Infrastructure Setup

This document provides instructions for setting up the Kubernetes infrastructure for Vybe 2.0.

## Prerequisites

1. **Local Development**
   - [Docker Desktop](https://www.docker.com/products/docker-desktop)
   - [kubectl](https://kubernetes.io/docs/tasks/tools/)
   - [k3d](https://k3d.io/v5.4.6/#installation) (for local development)
   - [Helm](https://helm.sh/docs/intro/install/)
   - [GitHub CLI](https://cli.github.com/)

2. **Production Requirements**
   - Kubernetes cluster (v1.21+)
   - External DNS configured
   - Load balancer (e.g., AWS ELB, GCP Load Balancer)
   - Persistent storage (e.g., AWS EBS, GCP Persistent Disk)

## 1. Local Development Setup

### Start Local Cluster

```bash
# Make scripts executable
chmod +x scripts/cluster/setup-k3d.sh
chmod +x scripts/monitoring/setup-monitoring.sh

# Start local cluster
./scripts/cluster/setup-k3d.sh

# Set up monitoring and logging
./scripts/monitoring/setup-monitoring.sh
```

### Access Dashboards

```bash
# Grafana (username: admin, password: admin)
kubectl port-forward -n monitoring svc/kube-prometheus-stack-grafana 3000:80

# Prometheus
kubectl port-forward -n monitoring svc/kube-prometheus-stack-prometheus 9090

# AlertManager
kubectl port-forward -n monitoring svc/kube-prometheus-stack-alertmanager 9093
```

## 2. Production Setup

### 1. Set Up Cluster

For production, use a managed Kubernetes service:
- [Amazon EKS](https://aws.amazon.com/eks/)
- [Google GKE](https://cloud.google.com/kubernetes-engine)
- [Azure AKS](https://azure.microsoft.com/en-us/services/kubernetes-service/)

### 2. Configure GitHub Secrets

```bash
# Make the script executable
chmod +x scripts/setup-github-secrets.sh

# Run the setup script
./scripts/setup-github-secrets.sh
```

### 3. Set Up DNS

1. Point your domain to the load balancer IP
2. Create the following DNS records:
   - `vybe.yourdomain.com`
   - `staging.vybe.yourdomain.com`
   - `monitoring.vybe.yourdomain.com`

### 4. Deploy to Production

1. Push to `main` branch for production deployment
2. Or create a release to trigger production deployment

## 3. Monitoring and Logging

### Metrics Collection
- Prometheus collects metrics from all services
- Grafana dashboards for visualization
- AlertManager for notifications

### Logging
- Loki for log aggregation
- Promtail for log collection
- Grafana for log visualization

## 4. Backup and Recovery

### Database Backups
```bash
# Example backup command
kubectl exec -n production <postgres-pod> -- pg_dump -U postgres vybe > backup.sql
```

### Velero for Cluster Backup
1. Install Velero
2. Configure backup location (S3, GCS, etc.)
3. Set up scheduled backups

## 5. Scaling

### Horizontal Pod Autoscaling
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: vybe-backend
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: vybe-backend
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

## 6. Security

- Network policies
- Pod security policies
- RBAC configuration
- Regular security scans

## 7. Maintenance

### Upgrading
1. Check for new versions of dependencies
2. Test in staging
3. Deploy to production

### Monitoring
- Set up alerts for critical metrics
- Regular log reviews
- Performance monitoring
