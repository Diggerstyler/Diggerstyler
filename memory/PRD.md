# Festival Order Management System (FESTIVAL_OS)
## PRD - Product Requirements Document

### Datum: 2025-01-03

---

## Original Problem Statement
Bestellmanagement-App für ein Stadtfest mit:
- 10 Stände
- 3 Rollen pro Stand: Bestellung, Küche, Ausgabe
- Admin-Bereich mit Artikelverwaltung und Statistiken
- Filter nach Tag, Stunde, Stand, Rolle

---

## User Personas

### 1. Mitarbeiter "Bestellung" (Rolle 1)
- Bucht Artikel für Gäste
- Erstellt Bestellungen
- Verrechnet mit Gast

### 2. Mitarbeiter "Küche" (Rolle 2)  
- Sieht eingehende Bestellungen
- Markiert Bestellungen als "In Bearbeitung"
- Meldet fertige Bestellungen

### 3. Mitarbeiter "Ausgabe" (Rolle 3)
- Sieht fertige Bestellungen
- Übergibt Bestellung an Gast
- Markiert als "Abgeholt"

### 4. Administrator
- Verwaltet Artikel (CRUD)
- Sieht Statistiken mit Filtern
- Login erforderlich (admin/admin)

---

## Core Requirements (Static)

### Must Have
- [x] 10 Stände konfiguriert
- [x] 3 Rollen ohne Authentifizierung
- [x] Artikelverwaltung im Admin-Bereich
- [x] Order-Status-Flow: Created → In Progress → Ready → Completed
- [x] Order-Nummer pro Stand/Tag
- [x] Deutsche Benutzeroberfläche
- [x] Admin-Authentifizierung

### Nice to Have
- [x] Statistiken mit Filtern
- [x] CSV-Export
- [x] Top-Artikel-Ranking
- [x] Bestellungen pro Stunde

---

## What's Been Implemented

### Backend (FastAPI + MongoDB)
- [x] `/api/stands` - Liste aller 10 Stände
- [x] `/api/roles` - Liste aller 3 Rollen
- [x] `/api/articles` - CRUD für Artikel
- [x] `/api/orders` - CRUD für Bestellungen
- [x] `/api/orders/{id}/status` - Status-Updates
- [x] `/api/auth/login` - Admin-Login (Basic Auth)
- [x] `/api/stats/overview` - Übersichts-Statistiken
- [x] `/api/stats/orders` - Gefilterte Bestellliste
- [x] `/api/seed` - Initial-Daten (17 Artikel)

### Frontend (React + Shadcn UI)
- [x] Landing Page mit Stand- und Rollen-Auswahl
- [x] Bestellungs-Seite (POS-System)
- [x] Küche-Seite (Kanban-Board)
- [x] Ausgabe-Seite (Grid mit fertigen Bestellungen)
- [x] Admin-Login
- [x] Admin-Dashboard
- [x] Artikelverwaltung
- [x] Statistik-Seite mit Filtern und CSV-Export

### Design
- Dark Theme mit Neon-Akzenten
- Festival-Hintergrund auf Landing Page
- Responsives Layout
- Sonner Toasts für Feedback

---

## Prioritized Backlog

### P0 (Kritisch) - Erledigt
- Alle Kernfunktionen implementiert

### P1 (Wichtig) - Für Zukunft
- [ ] Echtzeit-Updates via WebSockets
- [ ] Sound-Benachrichtigungen für neue Bestellungen
- [ ] Druckfunktion für Bon/Ticket

### P2 (Nice to Have)
- [ ] Offline-Modus mit Sync
- [ ] Tischzuordnung zu Bestellungen
- [ ] Mitarbeiter-Namen bei Rollenauswahl

---

## Tech Stack
- Backend: FastAPI, Motor (async MongoDB)
- Frontend: React, Tailwind CSS, Shadcn UI
- Database: MongoDB
- Auth: Basic Auth für Admin

---

## Next Tasks
1. Optional: WebSocket für Live-Updates
2. Optional: Druckfunktion für Bons
3. Optional: Mitarbeiter-Tracking
