# Vybe AI OS - Production Deployment Guide

## Prerequisites

1. **Server Requirements**:

   - Linux server (Ubuntu 22.04 LTS recommended)
   - Docker 20.10+ and Docker Compose v2.0+
   - Minimum 8GB RAM (16GB recommended for production)
   - Minimum 4 vCPUs
   - 50GB+ free disk space
   - Domain name with DNS configured

2. **Required Environment Variables**:

   ```bash
   # Database
   POSTGRES_DB=vybe
   POSTGRES_USER=vybe_user
   POSTGRES_PASSWORD=your_secure_password
   DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}

   # Redis
   REDIS_URL=redis://redis:6379/0

   # Application
   SECRET_KEY=your-secret-key-here
   ENVIRONMENT=production
   LOG_LEVEL=WARNING

   # AI Providers (configure as needed)
   OPENAI_API_KEY=your_openai_key
   ANTHROPIC_API_KEY=your_anthropic_key
   GROQ_API_KEY=your_groq_key
   ```

## Deployment Steps

### 1. Server Setup

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Docker
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add current user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

### 2. Deploy with Docker Compose

1. Clone your repository:

   ```bash
   git clone https://github.com/your-org/vybe-2.0.git
   cd vybe-2.0
   ```

2. Create a `.env` file with your production variables:

   ```bash
   cp .env.example .env
   nano .env  # Edit with your production values
   ```

3. Start the services:

   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

4. Verify the deployment:
   ```bash
   docker-compose -f docker-compose.prod.yml ps
   docker-compose -f docker-compose.prod.yml logs -f
   ```

### 3. Configure Nginx as Reverse Proxy (Recommended)

1. Install Nginx:

   ```bash
   sudo apt install -y nginx
   ```

2. Create a new Nginx configuration:

   ```bash
   sudo nano /etc/nginx/sites-available/vybe
   ```

3. Add the following configuration (adjust domain names as needed):

   ```nginx
   server {
       listen 80;
       server_name your-domain.com www.your-domain.com;

       location / {
           proxy_pass http://localhost:8000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }

       location /ws/ {
           proxy_pass http://localhost:8000/ws/;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
           proxy_read_timeout 86400;
       }
   }
   ```

4. Enable the site and restart Nginx:
   ```bash
   sudo ln -s /etc/nginx/sites-available/vybe /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

### 4. Set Up SSL with Let's Encrypt

1. Install Certbot:

   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   ```

2. Obtain and install the certificate:

   ```bash
   sudo certbot --nginx -d your-domain.com -d www.your-domain.com
   ```

3. Set up automatic renewal:
   ```bash
   sudo systemctl status certbot.timer
   ```

## Maintenance

### Updating the Application

```bash
# Pull the latest changes
git pull

# Rebuild and restart the services
docker-compose -f docker-compose.prod.yml up -d --build

# Run database migrations (if any)
docker-compose -f docker-compose.prod.yml exec vybe-production python manage.py migrate
```

### Backups

1. Database backup:

   ```bash
   # Create a daily backup
   docker-compose -f docker-compose.prod.yml exec -T db pg_dump -U $POSTGRES_USER $POSTGRES_DB > backup_$(date +%Y%m%d).sql

   # Restore from backup
   cat backup_file.sql | docker-compose -f docker-compose.prod.yml exec -T db psql -U $POSTGRES_USER $POSTGRES_DB
   ```

2. Volume backup:
   ```bash
   # Create a backup of the data volume
   docker run --rm -v vybe_data:/source -v $(pwd):/backup busybox tar czf /backup/data_backup_$(date +%Y%m%d).tar.gz -C /source .
   ```

## Monitoring

1. View logs:

   ```bash
   docker-compose -f docker-compose.prod.yml logs -f
   ```

2. Check resource usage:

   ```bash
   docker stats
   ```

3. Set up monitoring (optional):
   - Prometheus + Grafana
   - Datadog
   - New Relic

## Troubleshooting

1. **Port Conflicts**: Ensure ports 80, 443, and 8000 are not in use by other services.
2. **Permission Issues**: Run `sudo chown -R $USER:$USER .` in the project directory.
3. **Database Connection**: Verify database credentials and connection string.
4. **Logs**: Check container logs with `docker-compose -f docker-compose.prod.yml logs`.

## Security Considerations

1. **Firewall**: Configure UFW or iptables to allow only necessary ports.
2. **Secrets**: Never commit `.env` files to version control.
3. **Updates**: Regularly update Docker images and system packages.
4. **Backups**: Set up automated backups for both database and volumes.
5. **Monitoring**: Implement proper monitoring and alerting.

## Scaling

To scale the application:

1. **Horizontal Scaling**:

   ```bash
   docker-compose -f docker-compose.prod.yml up -d --scale vybe-production=3
   ```

2. **Load Balancing**: Use a load balancer like Traefik or Nginx in front of your services.

3. **Database**: Consider using a managed database service for production.

## Support

For support, please contact [your-support-email@example.com] or open an issue in the GitHub repository.
