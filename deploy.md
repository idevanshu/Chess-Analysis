# Deploying Chess Legends on AWS EC2 (Ubuntu + Nginx + Let's Encrypt)

This guide walks you through deploying the Chess Legends app on an **AWS EC2** instance with **Nginx** as a reverse proxy, your **custom domain**, and **HTTPS via Let's Encrypt**.

---

## Prerequisites

- An AWS account
- A registered domain name (e.g. `chesslegends.com`)
- Access to your domain's DNS settings (Cloudflare, Route 53, GoDaddy, etc.)
- Your MongoDB Atlas cluster running and accessible

---

## 1. Launch an EC2 Instance

1. Go to **AWS Console → EC2 → Launch Instance**
2. Configure:
   - **Name**: `chess-legends-server`
   - **AMI**: Ubuntu Server 24.04 LTS (64-bit x86)
   - **Instance type**: `t3.small` (2 vCPU, 2 GB RAM) — minimum recommended due to Stockfish WASM size
   - **Key pair**: Create or select an existing `.pem` key pair
   - **Storage**: 20 GB gp3 (default 8 GB is too small for node_modules + Stockfish)
3. Under **Network settings → Security Group**, allow:
   | Type  | Port | Source    |
   |-------|------|-----------|
   | SSH   | 22   | Your IP   |
   | HTTP  | 80   | 0.0.0.0/0 |
   | HTTPS | 443  | 0.0.0.0/0 |
4. Click **Launch Instance**

> **Tip**: After launch, go to **EC2 → Elastic IPs**, allocate a new IP, and associate it with your instance. This gives you a static IP that won't change on reboot.

---

## 2. Point Your Domain to the EC2 Instance

Go to your DNS provider and add these records:

| Type | Name              | Value              | TTL  |
|------|-------------------|--------------------|------|
| A    | `@`               | `<your-elastic-ip>` | 300  |
| A    | `www`             | `<your-elastic-ip>` | 300  |

Replace `<your-elastic-ip>` with the Elastic IP from step 1.

Wait a few minutes for DNS propagation. Verify with:

```bash
ping yourdomain.com
```

---

## 3. SSH into Your EC2 Instance

```bash
chmod 400 your-key.pem
ssh -i your-key.pem ubuntu@<your-elastic-ip>
```

---

## 4. Install System Dependencies

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node -v   # should show v20.x.x
npm -v    # should show 10.x.x

# Install Nginx
sudo apt install -y nginx

# Install Certbot (Let's Encrypt)
sudo apt install -y certbot python3-certbot-nginx

# Install PM2 (process manager for Node.js)
sudo npm install -g pm2

# Install Git
sudo apt install -y git
```

---

## 5. Clone and Set Up the Project

```bash
# Create app directory
sudo mkdir -p /var/www/chess-legends
sudo chown ubuntu:ubuntu /var/www/chess-legends

# Clone your repository
cd /var/www/chess-legends
git clone <your-repo-url> .

# Install dependencies
npm install

# Build the frontend
npm run build
```

---

## 6. Configure Environment Variables

Create the production `.env` file:

```bash
nano /var/www/chess-legends/.env
```

Paste the following (replace placeholder values):

```env
NODE_ENV=production
PORT=3001
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<dbname>?retryWrites=true&w=majority
JWT_SECRET=<generate-a-strong-random-string-at-least-32-chars>
OPENAI_API_KEY=sk-proj-your-production-key-here
OPENAI_MODEL=gpt-3.5-turbo
```

Generate a strong JWT secret:

```bash
openssl rand -base64 48
```

Save and exit (`Ctrl+X`, `Y`, `Enter`).

### MongoDB Atlas: Whitelist Your EC2 IP

1. Go to [MongoDB Atlas](https://cloud.mongodb.com) → **Network Access**
2. Click **Add IP Address**
3. Enter your EC2 Elastic IP
4. Click **Confirm**

---

## 7. Configure Nginx

Remove the default config and create one for your app:

```bash
sudo rm /etc/nginx/sites-enabled/default
sudo nano /etc/nginx/sites-available/chess-legends
```

Paste the following (replace `yourdomain.com` with your actual domain):

```nginx
server {
    listen 80;
    server_name chesslegends.devhomes.xyz;

    # Frontend - serve Vite build output
    root /var/www/chess-legends/dist;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/wasm;
    gzip_min_length 1000;

    # Cache static assets (JS, CSS, images) - Vite adds hashes to filenames
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Stockfish WASM files
    location /js/ {
        expires 7d;
        add_header Cache-Control "public";
        # Required MIME type for WASM
        types {
            application/wasm wasm;
        }
    }

    # API requests → Node.js backend
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # SSE support (for AI chat streaming)
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 300s;
    }

    # Socket.io → Node.js backend (WebSocket upgrade)
    location /socket.io/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    # Health/metrics endpoints → Node.js backend
    location ~ ^/(health|ready|metrics)$ {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # SPA fallback - serve index.html for all frontend routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Increase max upload size (for potential future features)
    client_max_body_size 10M;
}
```

Enable the site and test the config:

```bash
sudo ln -s /etc/nginx/sites-available/chess-legends /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 8. Set Up HTTPS with Let's Encrypt

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Certbot will:
1. Ask for your email address (for renewal notices)
2. Ask you to agree to the Terms of Service
3. Automatically obtain the SSL certificate
4. Modify your Nginx config to redirect HTTP → HTTPS

Verify auto-renewal works:

```bash
sudo certbot renew --dry-run
```

Certbot automatically sets up a systemd timer for renewals. Certificates renew every 60-90 days.

---

## 9. Start the Backend with PM2

```bash
cd /var/www/chess-legends

# Start the Node.js server
pm2 start server.js --name chess-legends --env production

# Save the PM2 process list so it restarts on reboot
pm2 save

# Set PM2 to start on system boot
pm2 startup systemd
# Run the command it outputs (starts with sudo env ...)
```

Useful PM2 commands:

```bash
pm2 status              # Check if app is running
pm2 logs chess-legends   # View live logs
pm2 restart chess-legends # Restart the app
pm2 monit               # Real-time monitoring dashboard
```

---

## 10. Update CORS for Production

Your `server.js` currently allows all origins (`*`). For production, restrict it to your domain. SSH into your server and edit:

```bash
nano /var/www/chess-legends/server.js
```

Find the CORS configuration and update it:

```javascript
// Before
app.use(cors());

// After
app.use(cors({
  origin: ['https://yourdomain.com', 'https://www.yourdomain.com'],
  credentials: true
}));
```

Also update the Socket.io CORS:

```javascript
// Find the io initialization and update cors
const io = new Server(server, {
  cors: {
    origin: ['https://yourdomain.com', 'https://www.yourdomain.com'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});
```

Then restart:

```bash
pm2 restart chess-legends
```

---

## 11. Verify the Deployment

Run through this checklist:

```bash
# 1. Check Nginx is running
sudo systemctl status nginx

# 2. Check Node.js backend is running
pm2 status

# 3. Test the API
curl https://yourdomain.com/health

# 4. Test SSL certificate
curl -vI https://yourdomain.com 2>&1 | grep "SSL certificate"
```

Then open `https://yourdomain.com` in your browser and verify:
- [ ] Page loads with HTTPS (padlock icon)
- [ ] Login/signup works
- [ ] Chess game starts and Stockfish engine works
- [ ] AI commentary works (if OpenAI key is valid)
- [ ] Multiplayer room creation/joining works

---

## 12. Deploying Updates

When you push new code and want to update the server:

```bash
ssh -i your-key.pem ubuntu@<your-elastic-ip>
cd /var/www/chess-legends

# Pull latest code
git pull origin master

# Install any new dependencies
npm install

# Rebuild the frontend
npm run build

# Restart the backend
pm2 restart chess-legends
```

You can also create a deploy script at `/var/www/chess-legends/deploy.sh`:

```bash
#!/bin/bash
set -e

echo "Pulling latest code..."
git pull origin master

echo "Installing dependencies..."
npm install

echo "Building frontend..."
npm run build

echo "Restarting backend..."
pm2 restart chess-legends

echo "Deployment complete!"
```

Make it executable: `chmod +x deploy.sh`, then run `./deploy.sh`.

---

## Troubleshooting

### App not loading

```bash
# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Check Node.js logs
pm2 logs chess-legends --lines 50
```

### WebSocket connection failing

If multiplayer doesn't work, check that the Nginx WebSocket config is correct:

```bash
# Test WebSocket upgrade header
curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: test" \
  https://yourdomain.com/socket.io/?EIO=4&transport=websocket
```

### SSL certificate not renewing

```bash
# Check certbot timer
sudo systemctl status certbot.timer

# Force renewal
sudo certbot renew --force-renewal
sudo systemctl reload nginx
```

### 502 Bad Gateway

This means Nginx can't reach the Node.js backend:

```bash
# Check if Node.js is running
pm2 status

# Check if port 3001 is in use
sudo lsof -i :3001

# Restart everything
pm2 restart chess-legends
sudo systemctl restart nginx
```

### Out of memory

If the server crashes or becomes unresponsive:

```bash
# Check memory usage
free -h

# Add swap space (2GB)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## Architecture Overview

```
Client Browser
    │
    │  HTTPS (port 443)
    ▼
┌─────────┐
│  Nginx  │── Serves static files (dist/)
│         │── Terminates SSL
│         │── Reverse proxy
└────┬────┘
     │  HTTP (port 3001)
     ▼
┌──────────┐      ┌──────────────┐
│ Node.js  │─────▶│ MongoDB Atlas│
│ Express  │      └──────────────┘
│ Socket.io│
└──────────┘      ┌──────────────┐
     │───────────▶│  OpenAI API  │
                  └──────────────┘
```
