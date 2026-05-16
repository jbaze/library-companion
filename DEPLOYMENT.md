# Deployment

Self-hosted Supabase + SPA on a single Linux VPS. Caddy terminates TLS and reverse-proxies API requests to the Supabase Kong gateway; nginx serves the built SPA.

```
/opt/library/
├── docker-compose.yml         # caddy + web (this repo)
├── Caddyfile
├── web/                       # nginx Dockerfile + config
├── dist/                      # built SPA (copied by `npm run build` + rsync)
├── supabase-stack/            # official Supabase docker compose, see below
│   └── volumes/               # persistent data (excluded from rsync)
├── supabase/migrations/       # schema, applied once on first boot
└── .env                       # DOMAIN=library.example.edu
```

## Phase 2 — Self-hosted Supabase setup (one-time)

### 2.1 Clone the official Supabase docker setup

From the project root:

```bash
git clone --depth 1 https://github.com/supabase/supabase
cp -r supabase/docker ./supabase-stack
rm -rf supabase     # this only removes the upstream clone, NOT this repo's supabase/migrations/
cd supabase-stack
cp .env.example .env
```

### 2.2 Trim unused services

In `supabase-stack/docker-compose.yml`, comment out (or remove) these service blocks plus any `depends_on` entries referencing them:

- `realtime`, `functions`, `vector`, `analytics`, `imgproxy`

Keep: `db`, `auth`, `rest`, `storage`, `meta`, `studio`, `kong`.

### 2.3 Generate fresh secrets

In `supabase-stack/.env`:

```bash
POSTGRES_PASSWORD=$(openssl rand -hex 32)
JWT_SECRET=$(openssl rand -hex 32)
DASHBOARD_PASSWORD=$(openssl rand -hex 24)
```

Set `DASHBOARD_USERNAME` to whatever you like.

### 2.3a Generate the JWT API keys

`scripts/generate-supabase-keys.mjs` in this repo does this. Copy it next to your supabase-stack and run:

```bash
cd supabase-stack
npm install jsonwebtoken
JWT_SECRET=<the-secret-you-generated> node ../scripts/generate-supabase-keys.mjs
```

Paste the two output lines into `supabase-stack/.env`.

### 2.4 Public URL config in `supabase-stack/.env`

Local dev:
```
SITE_URL=http://localhost:5173
API_EXTERNAL_URL=http://localhost:8000
SUPABASE_PUBLIC_URL=http://localhost:8000
```

Production (replace with your domain):
```
SITE_URL=https://library.example.edu
API_EXTERNAL_URL=https://library.example.edu
SUPABASE_PUBLIC_URL=https://library.example.edu
ADDITIONAL_REDIRECT_URLS=https://library.example.edu/admin,https://library.example.edu/login
```

### 2.5 Disable email confirmation (single-admin setup)

```
ENABLE_EMAIL_AUTOCONFIRM=true
ENABLE_EMAIL_SIGNUP=true
ENABLE_ANONYMOUS_USERS=false
```

Set `DISABLE_SIGNUP=true` later, after the first admin exists.

### 2.6 Wire Supabase into the same docker network as Caddy

In `supabase-stack/docker-compose.yml`, give the `kong` service access to `library_net`:

```yaml
kong:
  # ... existing config ...
  networks:
    - default
    - library_net
```

At the bottom of `supabase-stack/docker-compose.yml`:

```yaml
networks:
  default:
    driver: bridge
  library_net:
    external: true
    name: library_net
```

### 2.7 Bring up Supabase and apply the schema

```bash
cd supabase-stack
docker compose up -d
docker compose ps          # wait until 'db' is healthy

# From the project root:
cd ..
for f in supabase/migrations/*.sql; do
  echo "Applying $f"
  docker exec -i supabase-db psql -U postgres -d postgres < "$f"
done
```

If a migration fails because `supabase_auth_admin` or `authenticator` roles don't exist yet, the stack is still initializing — `docker compose logs db` and retry.

### 2.8 Verify

```bash
docker exec -it supabase-db psql -U postgres -d postgres -c "\dt public.*"
# Expected: books, user_roles

docker exec -it supabase-db psql -U postgres -d postgres -c "\df public.*"
# Expected: borrow_book, return_book, has_role, set_updated_at, bootstrap_first_admin

docker exec -it supabase-db psql -U postgres -d postgres -c "SELECT * FROM storage.buckets WHERE id = 'book-covers';"
# Expected: one row
```

### 2.9 Local-dev frontend env

```bash
# .env (repo root)
VITE_SUPABASE_URL=http://localhost:8000
VITE_SUPABASE_PUBLISHABLE_KEY=<ANON_KEY from supabase-stack/.env>
```

Then `npm run dev` and register the first admin via `/login` → "Create account".

---

## Phase 4 — VPS deployment

### 4.1 VPS prep (one-time)

```bash
sudo apt update && sudo apt install -y docker.io docker-compose-plugin git curl jq
sudo systemctl enable --now docker
sudo usermod -aG docker $USER   # log out and back in

sudo mkdir -p /opt/library
sudo chown $USER:$USER /opt/library
```

Point the DNS A record at the VPS public IP. Open ports 80 and 443.

### 4.2 First deploy

From a local machine:

```bash
# 1. Set production frontend env
cp .env.production.example .env.production
# Edit .env.production with your real domain + ANON_KEY

# 2. Build the SPA locally
npm run build

# 3. Sync everything to the VPS
rsync -avz --delete \
  --exclude node_modules \
  --exclude supabase-stack/volumes \
  ./ user@vps:/opt/library/

# 4. On the VPS:
ssh user@vps
cd /opt/library
cp .env.example .env && nano .env   # set DOMAIN

# Start Supabase first
cd supabase-stack
docker compose up -d
sleep 30
docker compose ps

# Apply migrations (only first time)
for f in ../supabase/migrations/*.sql; do
  docker exec -i supabase-db psql -U postgres -d postgres < "$f"
done

# Start the web + Caddy
cd ..
docker compose up -d
```

### 4.3 Create the first admin

Open `https://yourdomain/login`, switch to "Create account", register with email + password ≥ 8 chars. The `bootstrap_first_admin` SQL trigger grants admin role to the first signup. Confirm `/admin` is accessible.

### 4.4 Lock down further signups

Edit `supabase-stack/.env`:

```
DISABLE_SIGNUP=true
```

```bash
cd /opt/library/supabase-stack
docker compose up -d auth
```

### 4.5 Backups

`/etc/cron.daily/library-backup` (chmod +x):

```sh
#!/bin/sh
BACKUP_DIR=/opt/library/backups
mkdir -p "$BACKUP_DIR"
DATE=$(date +%F)
docker exec supabase-db pg_dump -U postgres -d postgres -F c -f /tmp/db.dump
docker cp supabase-db:/tmp/db.dump "$BACKUP_DIR/db-$DATE.dump"
tar -czf "$BACKUP_DIR/storage-$DATE.tar.gz" -C /opt/library/supabase-stack/volumes storage
find "$BACKUP_DIR" -type f -mtime +30 -delete
```

---

## Smoke test

- Public catalog renders at `https://yourdomain/`.
- Admin signs in → `/admin` loads.
- Add a book with a cover → it appears publicly.
- Borrow / return updates counts on refresh.
- Sign out → admin routes redirect to `/login`.
