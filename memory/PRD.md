# Festival Order Management System (FESTIVAL_OS)
## PRD - Product Requirements Document

### Datum: 2025-01-03 (Final Update)

---

## Implementierte Features

### 1. WebSockets für Echtzeit-Updates
- Alle Rollen verbinden sich per WebSocket
- Bei neuer Bestellung/Status-Änderung: Sofortige Benachrichtigung
- Keine Verzögerung mehr (vorher 3s Polling)

### 2. Pfandsystem
- **Pfandgruppen** (Admin): Glas 0,5l (2.00€), Glas 0,3l (1.50€), Becher (1.00€)
- **Artikel-Zuweisung**: Jeder Artikel kann optional eine Pfandgruppe haben
- **Pfand zurück Button**: In Sidebar (Desktop) oder als Buttons (Mobile)
- **Berechnung**: Artikel + Pfand - Pfand zurück = Zu kassieren

### 3. Swipe zum Löschen
- Im Warenkorb: Artikel nach links wischen zum Entfernen
- Pro Wisch: 1 Stück wird entfernt
- Funktioniert in Rolle 1 (Bestellung) und Rolle 4 (OneManShow)

### 4. OneManShow - Direktmodus
- Kein Küchen-Workflow
- Direkt: Tippen → Kassieren → Fertig
- Order geht direkt auf Status "completed"

### 5. Statistik mit Stunden-Übersicht
- **Bestellungen pro Stunde**: Tabelle mit Uhrzeit, Anzahl, Umsatz, Ø pro Bestellung
- **Gesamt-Zeile** am Ende
- Filter: Startdatum, Enddatum, Stand, Status

### 6. UI-Änderungen
- **Rollenauswahl zuerst**: 4 Kacheln (Bestellung, Küche, Ausgabe, OneManShow)
- **Dann Standauswahl**: Stände als Kacheln (nicht Dropdown)
- **Kein Dropdown mehr**: Besser für Handy-Bedienung

---

## Workflow-Übersicht

### Rolle 1 (Bestellung)
1. Artikel tippen (Pfand wird automatisch addiert)
2. Pfand zurück tippen wenn Gäste Gläser bringen
3. Swipe zum Korrigieren
4. "Bestellung aufgeben" → Geht an Küche

### Rolle 2 (Küche)
1. Sieht eingehende Bestellungen (älteste zuerst)
2. "Zubereitung starten" oder "Direkt fertig" (wenn Schnellmodus)
3. "Fertig melden" → Geht an Ausgabe
4. Rechts: Gesamt-Übersicht aller offenen Artikel

### Rolle 3 (Ausgabe)
1. Sieht fertige Bestellungen
2. Klick auf Bestellung → Übergeben
3. Status wird "completed"

### Rolle 4 (OneManShow)
1. Wie Rolle 1, aber Button heißt "Kassieren & Fertig"
2. Order geht direkt auf "completed"
3. Kein Küchen-Workflow nötig

---

## Admin-Funktionen

| Bereich | Funktionen |
|---------|------------|
| Stände | Hinzufügen, Bearbeiten, Löschen, Typ ändern, Schnellmodus |
| Artikel | CRUD, Pfandgruppe zuweisen |
| Pfandgruppen | Erstellen, Bearbeiten, Löschen |
| Statistiken | Filter, Stunden-Übersicht, CSV Export |

---

## Tech Stack
- Backend: FastAPI, Motor, WebSockets
- Frontend: React, Tailwind CSS, Shadcn UI
- Database: MongoDB
- Auth: Basic Auth für Admin

---

## Next Tasks (Optional)
1. Sound bei neuen Bestellungen
2. Druckfunktion für Bons
3. Offline-Modus mit Sync
