# SIH Internal Hackathon Portal - Production Deployment Guide (Direct / Non-Docker)

This guide provides step-by-step instructions for deploying and running the **SIH Internal Hackathon Portal** directly on a Linux VPS, Dedicated Server, or Cloud VM (Ubuntu/Debian) **without Docker**, utilizing **Node.js LTS**, **PM2 Process Manager**, and **Nginx Reverse Proxy with SSL**.

---

## Table of Contents

1. [System Requirements](#1-system-requirements)
2. [Server Initial Setup (Ubuntu / Debian)](#2-server-initial-setup-ubuntu--debian)
3. [Installing Node.js 20 LTS, npm & Build Tools](#3-installing-nodejs-20-lts-npm--build-tools)
4. [Setting Up Application Code & Directories](#4-setting-up-application-code--directories)
5. [Database Options (PostgreSQL / Supabase / MongoDB / Local)](#5-database-options)
6. [Configuring Environment Variables (.env)](#6-configuring-environment-variables-env)
7. [Building the Application for Production](#7-building-the-application-for-production)
8. [Running with PM2 Process Manager (Auto-Restart on Reboot)](#8-running-with-pm2-process-manager)
9. [Alternative: Running with Systemd Service](#9-alternative-running-with-systemd-service)
10. [Nginx Reverse Proxy & 50MB File Uploads](#10-nginx-reverse-proxy--50mb-file-uploads)
11. [Securing with Free SSL (Let's Encrypt / Certbot)](#11-securing-with-free-ssl-lets-encrypt--certbot)
12. [Firewall Configuration (UFW)](#12-firewall-configuration-ufw)
13. [Routine Maintenance, Logs & Updates](#13-routine-maintenance-logs--updates)
14. [Automated Daily Backups Script](#14-automated-daily-backups-script)

---

## 1. System Requirements

| Component | Minimum Specification | Recommended Specification |
|---|---|---|
| **Operating System** | Ubuntu 22.04 LTS / 24.04 LTS or Debian 12 | Ubuntu 22.04 LTS |
| **CPU** | 1 vCPU (1.5 GHz+) | 2 vCPUs |
| **RAM** | 1 GB RAM (with 2 GB Swap) | 2 GB to 4 GB RAM |
| **Disk** | 10 GB SSD | 25 GB+ NVMe SSD (sized for student PPTs) |
| **Network** | Static Public IPv4, Ports 80 and 443 open | 100 Mbps+ connection |

---

## 2. Server Initial Setup (Ubuntu / Debian)

Log in to your server as `root` via SSH:

```bash
ssh root@your-server-ip
```

Update system packages:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git build-essential ufw unattended-upgrades
```

### Create a Dedicated Service User (Recommended for Security)
Running web applications as root is not advised. Create a non-root user `deploy`:

```bash
sudo adduser --disabled-password --gecos "" deploy
sudo usermod -aG sudo deploy
```

---

## 3. Installing Node.js 20 LTS, npm & Build Tools

Install Node.js 20 (Active LTS) from the official NodeSource repository:

```bash
# Add NodeSource GPG key and repository
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Install Node.js, Nginx, Certbot
sudo apt install -y nodejs nginx certbot python3-certbot-nginx

# Verify versions
node -v   # v20.x.x
npm -v    # v10.x.x

# Install PM2 globally to manage the application process
sudo npm install -g pm2
```

---

## 4. Setting Up Application Code & Directories

Switch to the `deploy` user and create the web directory:

```bash
sudo mkdir -p /var/www/sih-portal
sudo chown -R deploy:deploy /var/www/sih-portal
sudo su - deploy

cd /var/www/sih-portal
```

Clone your repository (or copy your application files into `/var/www/sih-portal`):
```bash
git clone <YOUR_GIT_REPO_URL> .
```

### Install npm dependencies:
```bash
npm ci --omit=dev=false
```
*(We install devDependencies temporarily so `vite` and `esbuild` can compile the production bundle).*

### Prepare Data and Upload Folders:
The application writes configurations and student PPTs to `/var/www/sih-portal/data`. Ensure these folders exist:

```bash
mkdir -p data/uploads/ppts
mkdir -p data/uploads/sample_ppts
mkdir -p data/uploads/images
mkdir -p data/uploads/documents
chmod -R 755 data
```

---

## 5. Database Options

The portal supports 4 persistent storage modes:

### Option A: Local Storage Adapter (Zero Extra Software Needed)
- **No external database required**: By default, if no external database is connected, all data is automatically and safely saved in `/var/www/sih-portal/data/settings.json` and `/var/www/sih-portal/data/registrations.json`.
- The system handles concurrent reads/writes with atomic disk write operations.

### Option B: Local PostgreSQL (On the Same Server)
If you want to run PostgreSQL directly on your server:

```bash
# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Start and enable PostgreSQL
sudo systemctl enable postgresql
sudo systemctl start postgresql

# Create database and user
sudo -u postgres psql -c "CREATE DATABASE sih_db;"
sudo -u postgres psql -c "CREATE USER sih_user WITH ENCRYPTED PASSWORD 'YourStrongPasswordHere';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE sih_db TO sih_user;"
sudo -u postgres psql -c "ALTER DATABASE sih_db OWNER TO sih_user;"
```

### Option C: Supabase (Cloud PostgreSQL)
1. Go to your Supabase Project -> **Settings** -> **Database**.
2. Select **Connection Pooling** (IPv4 Pooler).
3. Use:
   - Host: `aws-0-[region].pooler.supabase.com`
   - Port: `6543` or `5432`
   - User: `postgres.[your-project-ref]`
   - Password: Your project database password

### Option D: MongoDB Atlas
Provide your standard connection string:
```env
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.mongodb.net/sih_db?retryWrites=true&w=majority
```

---

## 6. Configuring Environment Variables (.env)

Create your `.env` file in the root `/var/www/sih-portal`:

```bash
cp .env.example .env
nano .env
```

Here is a recommended production configuration:

```ini
# Core Runtime Configuration
NODE_ENV=production
PORT=3000
APP_URL=https://hackathon.yourdomain.edu

# Security & Authentication (CRITICAL)
# Generate random 64-char key with: openssl rand -base64 48
JWT_SECRET=super_secret_cryptographic_key_replace_this_with_random_string
ADMIN_PASSCODE=Admin@SVEC2026

# Optional: Google Gemini AI (for team proposal analysis)
GEMINI_API_KEY=AIzaSy...

# Optional Database (leave blank to use resilient local storage in ./data)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sih_db
DB_USERNAME=sih_user
DB_PASSWORD=YourStrongPasswordHere

# Optional: Razorpay Payment Gateway (for registration fees)
RAZORPAY_KEY_ID=rzp_live_...
RAZORPAY_KEY_SECRET=...

# Optional: Outgoing Email (SMTP for team registration confirmations)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=sih.portal@yourdomain.edu
SMTP_PASS=your_app_specific_password
SMTP_FROM="SVEC SIH 2026" <sih.portal@yourdomain.edu>

# Optional: SMS Notifications
# TWILIO_ACCOUNT_SID=...
# TWILIO_AUTH_TOKEN=...
# TWILIO_FROM=+1234567890
```

---

## 7. Building the Application for Production

Run the production build:

```bash
npm run build
```

This single command executes:
1. `vite build` - Compiles the React 19 client into optimized, minified static assets in `dist/`.
2. `esbuild server.ts` - Bundles the Express backend into `dist/server.cjs` with sourcemaps and externalized node modules.

---

## 8. Running with PM2 Process Manager

PM2 keeps the application running in the background, restarts it automatically if it crashes, and relaunches it on server reboots.

### Start the application with PM2:
```bash
pm2 start dist/server.cjs --name "sih-portal" --time --max-memory-restart 1G
```

### Configure PM2 to launch on system boot:
```bash
pm2 startup
```
*(Copy and run the command that PM2 outputs if prompted, then save the active list):*

```bash
pm2 save
```

### Useful PM2 commands:
```bash
pm2 status             # View application status, CPU and RAM usage
pm2 logs sih-portal    # Stream live logs
pm2 reload sih-portal  # Zero-downtime reload
pm2 restart sih-portal # Hard restart
pm2 stop sih-portal    # Stop application
```

---

## 9. Alternative: Running with Systemd Service

If you prefer standard Linux `systemd` instead of PM2:

Create the service unit file:
```bash
sudo nano /etc/systemd/system/sih-portal.service
```

Paste the following:
```ini
[Unit]
Description=SIH Internal Hackathon Portal
After=network.target postgresql.service

[Service]
Type=simple
User=deploy
WorkingDirectory=/var/www/sih-portal
ExecStart=/usr/bin/node dist/server.cjs
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=sih-portal
Environment=NODE_ENV=production
Environment=PORT=3000

# Security sandboxing
CapabilityBoundingSet=
NoNewPrivileges=true
ProtectSystem=full
ReadWritePaths=/var/www/sih-portal/data

[Install]
WantedBy=multi-user.target
```

Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable sih-portal
sudo systemctl start sih-portal
sudo systemctl status sih-portal
```

---

## 10. Nginx Reverse Proxy & 50MB File Uploads

Create an Nginx configuration to route public HTTP/HTTPS traffic to the Node.js application on port 3000:

```bash
sudo nano /etc/nginx/sites-available/sih-portal
```

Paste the following configuration:

```nginx
server {
    listen 80;
    server_name hackathon.yourdomain.edu;

    # Redirect all plain HTTP to HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name hackathon.yourdomain.edu;

    # SSL certificates (configured by Certbot in step 11)
    ssl_certificate /etc/letsencrypt/live/hackathon.yourdomain.edu/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/hackathon.yourdomain.edu/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # CRITICAL: Allow student PPT pitch deck and presentation uploads up to 50MB
    client_max_body_size 50M;

    # Proxy headers
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # Proxy to Node application
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_cache_bypass $http_upgrade;

        # Generous timeouts for large PPT uploads
        proxy_connect_timeout 60s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
    }

    # Cache static frontend assets directly
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://127.0.0.1:3000;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }
}
```

Enable the configuration and test Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/sih-portal /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 11. Securing with Free SSL (Let's Encrypt / Certbot)

Ensure your domain name (e.g. `hackathon.yourdomain.edu`) has an **A Record** pointing to your server's IP address.

Obtain and configure the SSL certificate:
```bash
sudo certbot --nginx -d hackathon.yourdomain.edu
```

Certbot will automatically verify the domain, issue the certificate, and update the Nginx configuration.

Test automatic renewal:
```bash
sudo certbot renew --dry-run
```

---

## 12. Firewall Configuration (UFW)

Lock down all ports except SSH, HTTP, and HTTPS:

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh             # Port 22
sudo ufw allow 'Nginx Full'    # Ports 80 and 443
sudo ufw enable
```

Verify firewall status:
```bash
sudo ufw status
```

---

## 13. Routine Maintenance, Logs & Updates

### How to deploy code updates:
```bash
cd /var/www/sih-portal

# 1. Pull latest code
git pull origin main

# 2. Install any updated dependencies
npm ci --omit=dev=false

# 3. Rebuild the application
npm run build

# 4. Zero-downtime reload with PM2
pm2 reload sih-portal
```

### Checking live health:
```bash
curl -I http://127.0.0.1:3000/api/health
# Returns: HTTP/1.1 200 OK
```

---

## 14. Automated Daily Backups Script

Set up an automated daily backup for registration data, settings, and uploaded PPTs:

Create a backup script:
```bash
sudo nano /usr/local/bin/sih-backup.sh
```

Paste:
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/sih-portal"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
mkdir -p "$BACKUP_DIR"

# 1. Backup app data directory (settings, registrations, student PPT uploads)
tar -czf "$BACKUP_DIR/sih_data_$TIMESTAMP.tar.gz" -C /var/www/sih-portal data

# 2. If using local PostgreSQL, dump database
if command -v pg_dump &> /dev/null; then
  sudo -u postgres pg_dump sih_db > "$BACKUP_DIR/sih_db_$TIMESTAMP.sql" 2>/dev/null
fi

# Keep only the last 14 days of backups
find "$BACKUP_DIR" -type f -name "*.tar.gz" -mtime +14 -delete
find "$BACKUP_DIR" -type f -name "*.sql" -mtime +14 -delete
```

Make it executable:
```bash
sudo chmod +x /usr/local/bin/sih-backup.sh
```

Add to cron (`sudo crontab -e`) to run every night at 2:00 AM:
```cron
0 2 * * * /usr/local/bin/sih-backup.sh > /dev/null 2>&1
```

---

## 13. Troubleshooting Image & File Uploads on Linux

If image uploads (logos, gallery, homepage banners, UPI QR, or student PPTs) fail when hosted on Linux, follow these diagnostic steps:

### Diagnostic Step: Check the Error in Browser DevTools
1. Press `F12` in your browser and go to the **Network** tab.
2. Attempt to upload the image and click on the failed `/api/upload` request:
   - **HTTP 413 (Payload Too Large)**: Nginx body size limit is blocking the upload.
   - **HTTP 500 (Internal Server Error)**: Linux directory permissions (`EACCES: permission denied`) or Nginx temp buffer directory permissions.
   - **HTTP 403 (Forbidden)**: Admin passcode or authentication header was stripped or missing.
   - **HTTP 400 (Bad Request)**: Unsupported image format (e.g., `.svg`, `.heic`) or magic byte signature mismatch.

---

### Fix 1: Fix Linux Filesystem Permissions (`data/` Directory)
When running Node.js under a non-root user (e.g., `deploy`, `ubuntu`), the process needs write permissions to the `./data` folder:

```bash
# Navigate to your project directory
cd /var/www/sih-portal

# Create the uploads subdirectories if they don't exist yet
mkdir -p data/uploads/{images,documents,ppts,sample_ppts}

# Grant ownership to your app service user (e.g., deploy or ubuntu)
sudo chown -R $USER:$USER data
sudo chmod -R 775 data
```

If your app runs as a dedicated `deploy` user:
```bash
sudo chown -R deploy:deploy /var/www/sih-portal/data
sudo chmod -R 775 /var/www/sih-portal/data
```

---

### Fix 2: Increase Nginx `client_max_body_size`
By default, Nginx limits file uploads to **1MB**, rejecting most phone photos and documents with `413 Request Entity Too Large`:

1. Edit your Nginx configuration:
   ```bash
   sudo nano /etc/nginx/sites-available/sih-portal
   ```
2. Ensure `client_max_body_size 50M;` is present inside the `server { ... }` block:
   ```nginx
   server {
       listen 443 ssl http2;
       server_name hackathon.yourdomain.edu;

       # Allow file uploads up to 50MB
       client_max_body_size 50M;

       # ... rest of configuration ...
   }
   ```
3. Test and reload Nginx:
   ```bash
   sudo nginx -t && sudo systemctl reload nginx
   ```

---

### Fix 3: Fix Nginx Temporary Buffer Permissions
When uploading files, Nginx buffers multipart chunks into `/var/lib/nginx/body/`. If this directory has incorrect permissions, Nginx logs `open() "/var/lib/nginx/body/..." failed (13: Permission denied)`:

```bash
sudo chown -R www-data:www-data /var/lib/nginx
sudo chmod -R 700 /var/lib/nginx
```
*(On CentOS / RHEL / AlmaLinux, replace `www-data` with `nginx`)*.

---

### Fix 4: Verify Working Directory in PM2 or Systemd
The application stores uploads relative to the working directory (`./data/uploads`). If PM2 or systemd is started without setting the working directory, Node tries to write to the wrong folder:

- **For PM2**:
  ```bash
  pm2 delete sih-portal 2>/dev/null
  pm2 start dist/server.cjs --name "sih-portal" --cwd "/var/www/sih-portal"
  pm2 save
  ```
- **For Systemd (`/etc/systemd/system/sih-portal.service`)**:
  Ensure the unit file has:
  ```ini
  WorkingDirectory=/var/www/sih-portal
  ```

---

### Fix 5: Check Allowed File Formats
The portal uses strict magic-byte security inspection to prevent malware:
- **Allowed Image Formats**: `.png`, `.jpg`, `.jpeg`, `.webp`, `.gif` (up to 5MB).
- **Prohibited Formats**:
  - `.svg` is banned to prevent Stored Cross-Site Scripting (XSS) attacks.
  - `.heic` / `.heif` (Apple iPhone camera format) must be converted to standard `.jpg` or `.png` before uploading.
  - Renamed files (e.g. changing `file.txt` to `file.jpg`) will fail the magic byte check.

---

## Summary Checklist for Non-Docker Production

- [x] Node.js 20 LTS installed
- [x] Application compiled with `npm run build` (`dist/` and `dist/server.cjs` ready)
- [x] Production `.env` configured with unique `JWT_SECRET` and `ADMIN_PASSCODE`
- [x] Application daemonized and enabled on boot with `pm2` or `systemd`
- [x] Nginx reverse proxy configured with `client_max_body_size 50M;`
- [x] HTTPS SSL enabled with Let's Encrypt / Certbot
- [x] Firewall (UFW) active with ports 22, 80, 443 allowed
- [x] Nightly cron backup enabled for `/var/www/sih-portal/data`
