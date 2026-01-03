# Festival Order Management System (FESTIVAL_OS)
## PRD - Product Requirements Document

### Datum: 2025-01-03 (Update)

---

## Original Problem Statement
Bestellmanagement-App für ein Stadtfest mit:
- Konfigurierbare Stände (hinzufügen, löschen, umbenennen)
- 3 Standtypen: Speisestand, Getränkestand, Gemischter Stand
- 4 Rollen: Bestellung, Küche, Ausgabe, OneManShow
- Artikel-Zuweisung pro Stand
- Küchen-Einstellung: Zubereitung überspringen ja/nein
- Küche mit Gesamt-Übersicht aller offenen Artikel
- Admin-Bereich mit Statistiken

---

## Aktualisierungen/Erweiterungen

### Echtzeit-Aktualisierung
- Polling alle 3 Sekunden zwischen Rollen
- Wenn Rolle 1 bestellt → Rolle 2 sieht es nach max. 3 Sekunden
- Küchen-Summary aktualisiert sich automatisch

### Sortierung
- Bestellungen werden nach Eingang sortiert (FIFO - First In, First Out)
- Älteste Bestellung ist immer oben/vorn

---

## Implementierte Features

### Backend (FastAPI + MongoDB)
- [x] `/api/stands` - CRUD für Stände
- [x] `/api/stands/{id}/articles` - Artikel für einen Stand (gefiltert)
- [x] `/api/stands/{id}/kitchen-summary` - Gesamt offene Artikel
- [x] `/api/stand-types` - Standtypen
- [x] `/api/roles` - 4 Rollen inkl. OneManShow
- [x] `/api/articles` - CRUD für Artikel
- [x] `/api/orders` - CRUD, sortiert nach Eingang (FIFO)
- [x] `skip_preparation` - Bestellungen direkt auf "Fertig"
- [x] Admin Auth für geschützte Endpoints

### Frontend (React + Shadcn UI) - RESPONSIVE
- [x] Landing Page - Stand + Rolle Auswahl
- [x] Bestellungs-Seite (POS) - Artikelfilter nach Stand
- [x] Küche-Seite mit "GESAMT OFFEN" Übersicht
- [x] Ausgabe-Seite
- [x] OneManShow (alles in einer Ansicht)
- [x] Admin Dashboard
- [x] **Standverwaltung** (NEU) - Stände CRUD
- [x] **Artikel-Zuweisung** (NEU) - Artikel zu Ständen
- [x] **Zubereitung überspringen** (NEU) - Pro Stand einstellbar
- [x] Artikelverwaltung
- [x] Statistiken mit Filtern

### Admin-Funktionen
| Feature | Beschreibung |
|---------|-------------|
| Stände verwalten | Hinzufügen, Bearbeiten, Löschen von Ständen |
| Standtyp ändern | Speisestand, Getränkestand, Gemischt |
| Artikel zuweisen | Welche Artikel an welchem Stand |
| Zubereitung | Normal oder Überspringen (direkt fertig) |

---

## Küchen-Übersicht "GESAMT OFFEN"

Die Küche zeigt rechts eine Zusammenfassung aller offenen Artikel:
```
ZU PRODUZIEREN
- Bratwurst    4x
- Pommes       2x
- Bier 0,5l   3x
```
Diese Übersicht aktualisiert sich alle 3 Sekunden.

---

## Polling/Updates zwischen Rollen

| Aktion | Update-Zeit |
|--------|------------|
| Neue Bestellung | ~3 Sekunden bis Küche sieht |
| Küche → Fertig | ~3 Sekunden bis Ausgabe sieht |
| Ausgabe → Übergeben | ~3 Sekunden bis Summary aktualisiert |

Für echte Echtzeit wären WebSockets nötig.

---

## Tech Stack
- Backend: FastAPI, Motor (async MongoDB)
- Frontend: React, Tailwind CSS, Shadcn UI
- Database: MongoDB
- Auth: Basic Auth für Admin

---

## Next Tasks (Optional)
1. WebSockets für echte Echtzeit-Updates
2. Druckfunktion für Bons
3. Sound bei neuen Bestellungen
4. Mitarbeiter-Namen bei Rollenauswahl
