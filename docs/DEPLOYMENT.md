# Deployment Guide — Production VPS

Target: Ubuntu 22.04 LTS dengan Postgres 16 lokal + Node 20 LTS + Nginx + PM2.

## 1. Server setup

```bash
# Install Node via NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20
nvm alias default 20

# Install pnpm
npm install -g pnpm@10

# Install Postgres 16
sudo apt update
sudo apt install -y postgresql-16

# Install Nginx + Certbot
sudo apt install -y nginx certbot python3-certbot-nginx
```

## 2. Database

```bash
sudo -u postgres psql
CREATE USER grosir WITH PASSWORD 'STRONG_RANDOM_PASSWORD';
CREATE DATABASE grosir OWNER grosir;
\c grosir
CREATE EXTENSION IF NOT EXISTS pg_trgm;
\q
```

## 3. App deploy

```bash
git clone <repo> /opt/grosir
cd /opt/grosir
pnpm install --frozen-lockfile

cp .env.example .env
# Edit .env:
#   DATABASE_URL="postgresql://grosir:STRONG_PASSWORD@localhost:5432/grosir?schema=public"
#   NEXTAUTH_SECRET="$(openssl rand -base64 32)"
#   NEXTAUTH_URL="https://grosir.example.com"
#   APP_TIMEZONE="Asia/Jakarta"
#   LOG_LEVEL="info"

pnpm prisma migrate deploy
pnpm db:seed
pnpm build
```

## 4. PM2

```bash
npm install -g pm2
pm2 start pnpm --name grosir -- start
pm2 startup
pm2 save
```

## 5. Nginx + SSL

```nginx
# /etc/nginx/sites-available/grosir
server {
  listen 80;
  server_name grosir.example.com;

  location / {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
  client_max_body_size 10M;
}
```

```bash
sudo ln -s /etc/nginx/sites-available/grosir /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d grosir.example.com
```

## 6. Backup

```bash
# /etc/cron.d/grosir-backup
0 2 * * * postgres pg_dump -U grosir grosir | gzip > /backup/grosir-$(date +\%Y\%m\%d).sql.gz
0 3 * * * postgres find /backup -name "grosir-*.sql.gz" -mtime +30 -delete
```

## 7. Initial login

SSH ke server, browse https://grosir.example.com. Login `owner / changeme123`. Buka Profil dan ganti password segera.

## Update deployment

```bash
cd /opt/grosir
git pull
pnpm install --frozen-lockfile
pnpm prisma migrate deploy
pnpm build
pm2 reload grosir
```

## Rollback

- App: `git checkout <last-good-tag> && pnpm install && pnpm build && pm2 reload grosir`
- DB: restore dari pg_dump backup terdekat (`gunzip -c /backup/grosir-YYYYMMDD.sql.gz | psql -U grosir grosir`)

## Catatan keamanan

- `NEXTAUTH_SECRET` minimal 32 byte random — generate fresh per environment.
- `DATABASE_URL` password jangan di-commit; gunakan secret manager kalau punya akses.
- Buka firewall hanya port 80/443; Postgres tetap di localhost.
- Backup database harian + offsite copy mingguan (rsync ke S3/storage lain).
- Audit log table `AuditLog` jangan dibersihkan tanpa policy retention yang jelas.
