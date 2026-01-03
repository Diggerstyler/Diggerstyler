# Karnbachs Event OS - Lokales Hosting auf VMware Server

Diese Anleitung erklärt, wie du die App auf deinem eigenen Server hosten kannst.

## 1. Voraussetzungen

Dein VMware-Server benötigt:

### Software-Anforderungen:
- **Betriebssystem:** Ubuntu 22.04 LTS (empfohlen) oder Debian 12
- **Docker & Docker Compose** (für einfachste Installation)
- ODER manuell:
  - **Python 3.11+** 
  - **Node.js 18+ und Yarn**
  - **MongoDB 6+**

### Hardware-Mindestanforderungen:
- 2 CPU Kerne
- 4 GB RAM
- 20 GB Festplatte

---

## 2. Code von Emergent herunterladen

### Option A: Via GitHub (empfohlen)
1. In Emergent: Klicke auf "Save to GitHub" Button
2. Wähle deinen Branch und pushe den Code
3. Auf deinem Server:
```bash
git clone https://github.com/DEIN_USERNAME/DEIN_REPO.git
cd DEIN_REPO
```

### Option B: Via VS Code Editor
1. In Emergent: Klicke auf das VS Code Icon
2. Navigiere durch die Dateien und kopiere sie manuell
3. Alternativ: Nutze das Terminal im Editor für `zip` Befehle

---

## 3. Installation mit Docker (EMPFOHLEN)

### 3.1 Docker installieren
```bash
# Docker installieren
curl -fsSL https://get.docker.com | sh

# Docker Compose installieren
sudo apt install docker-compose-plugin
```

### 3.2 docker-compose.yml erstellen
Erstelle diese Datei im Projektordner:

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:6
    container_name: eventOS_mongo
    volumes:
      - mongo_data:/data/db
    restart: always
    networks:
      - app_network

  backend:
    build: ./backend
    container_name: eventOS_backend
    environment:
      - MONGO_URL=mongodb://mongodb:27017
      - DB_NAME=eventOS
    ports:
      - "8001:8001"
    depends_on:
      - mongodb
    restart: always
    networks:
      - app_network

  frontend:
    build: ./frontend
    container_name: eventOS_frontend
    environment:
      - REACT_APP_BACKEND_URL=http://DEINE_SERVER_IP:8001
    ports:
      - "3000:80"
    depends_on:
      - backend
    restart: always
    networks:
      - app_network

volumes:
  mongo_data:

networks:
  app_network:
    driver: bridge
```

### 3.3 Dockerfiles erstellen

**backend/Dockerfile:**
```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
EXPOSE 8001
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001"]
```

**frontend/Dockerfile:**
```dockerfile
FROM node:18-alpine as build

WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install

COPY . .
ARG REACT_APP_BACKEND_URL
ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL
RUN yarn build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**frontend/nginx.conf:**
```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### 3.4 App starten
```bash
# WICHTIG: Ersetze DEINE_SERVER_IP in docker-compose.yml mit der IP deines Servers

docker compose build
docker compose up -d

# Status prüfen
docker compose ps

# Logs anschauen
docker compose logs -f
```

### 3.5 Zugriff
- **App:** http://DEINE_SERVER_IP:3000
- **API:** http://DEINE_SERVER_IP:8001/api/docs

---

## 4. Manuelle Installation (ohne Docker)

### 4.1 MongoDB installieren
```bash
# MongoDB Repository hinzufügen
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# Installieren und starten
sudo apt update
sudo apt install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod
```

### 4.2 Backend einrichten
```bash
cd backend

# Virtual Environment erstellen
python3 -m venv venv
source venv/bin/activate

# Dependencies installieren
pip install -r requirements.txt

# .env Datei anpassen
cat > .env << EOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=eventOS
EOF

# Backend starten (für Test)
uvicorn server:app --host 0.0.0.0 --port 8001

# ODER als Hintergrund-Service mit systemd (siehe Abschnitt 5)
```

### 4.3 Frontend einrichten
```bash
cd frontend

# Node.js 18 installieren (falls nicht vorhanden)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Yarn installieren
npm install -g yarn

# .env Datei anpassen
cat > .env << EOF
REACT_APP_BACKEND_URL=http://DEINE_SERVER_IP:8001
EOF

# Dependencies installieren
yarn install

# Für Produktion: Build erstellen
yarn build

# Build mit nginx oder serve ausliefern
npm install -g serve
serve -s build -l 3000
```

---

## 5. Systemd Services (für dauerhaften Betrieb)

### Backend Service
```bash
sudo cat > /etc/systemd/system/eventos-backend.service << EOF
[Unit]
Description=Karnbachs Event OS Backend
After=network.target mongod.service

[Service]
User=www-data
WorkingDirectory=/pfad/zu/backend
Environment="PATH=/pfad/zu/backend/venv/bin"
ExecStart=/pfad/zu/backend/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001
Restart=always

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable eventos-backend
sudo systemctl start eventos-backend
```

### Frontend Service
```bash
sudo cat > /etc/systemd/system/eventos-frontend.service << EOF
[Unit]
Description=Karnbachs Event OS Frontend
After=network.target

[Service]
User=www-data
WorkingDirectory=/pfad/zu/frontend
ExecStart=/usr/bin/serve -s build -l 3000
Restart=always

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable eventos-frontend
sudo systemctl start eventos-frontend
```

---

## 6. Nginx Reverse Proxy (für Produktion)

Für einen sauberen Produktionsbetrieb mit einer Domain:

```bash
sudo apt install nginx

sudo cat > /etc/nginx/sites-available/eventos << EOF
server {
    listen 80;
    server_name event.deine-domain.de;  # Deine Domain hier

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8001/api;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }

    # WebSocket für Real-Time Updates
    location /ws {
        proxy_pass http://localhost:8001/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/eventos /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### SSL mit Let's Encrypt (optional aber empfohlen)
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d event.deine-domain.de
```

---

## 7. Backup & Wartung

### MongoDB Backup
```bash
# Backup erstellen
mongodump --db eventOS --out /backup/$(date +%Y%m%d)

# Backup wiederherstellen
mongorestore --db eventOS /backup/20240101/eventOS
```

### Logs prüfen
```bash
# Backend Logs
sudo journalctl -u eventos-backend -f

# Frontend Logs
sudo journalctl -u eventos-frontend -f

# Nginx Logs
sudo tail -f /var/log/nginx/error.log
```

---

## 8. Fehlerbehebung

### Problem: Backend startet nicht
```bash
# Prüfe MongoDB Verbindung
mongosh --eval "db.adminCommand('ping')"

# Prüfe Backend Logs
sudo journalctl -u eventos-backend -n 50
```

### Problem: Frontend zeigt Fehler
```bash
# Prüfe ob Backend erreichbar ist
curl http://localhost:8001/api/stands

# Prüfe .env Konfiguration
cat frontend/.env
```

### Problem: WebSocket funktioniert nicht
- Stelle sicher, dass der Nginx WebSocket Proxy korrekt konfiguriert ist
- Prüfe Firewall-Einstellungen (Ports 80, 443, 8001 müssen offen sein)

---

## Zusammenfassung

1. **Code von GitHub klonen**
2. **Docker-Compose installieren und starten** (einfachste Methode)
3. **Server-IP in .env anpassen**
4. **App unter http://DEINE_IP:3000 aufrufen**

Bei Fragen wende dich an die Community oder erstelle ein Issue auf GitHub.

---

*Erstellt für Karnbachs Event OS - Version Januar 2026*
