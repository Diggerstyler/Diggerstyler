import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, FileText, Download, Book, Code, Palette, Database, 
  Settings, Users, ShoppingCart, Hammer, Package, Zap, Box,
  BarChart3, Clock, Globe, Smartphone, Monitor, Server
} from "lucide-react";
import LiveClock from "@/components/LiveClock";
import AppFooter from "@/components/AppFooter";
import AdminNavBar from "@/components/AdminNavBar";
import { useAdminSwipe } from "@/components/AdminSwipe";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Complete documentation content
const DOCUMENTATION = {
  overview: {
    title: "Karnbachs Event OS - Übersicht",
    content: `
KARNBACHS EVENT OS
==================

Eine vollständige Event- und Festival-Bestellmanagement-Lösung.

ZWECK DER APP
-------------
Diese App wurde entwickelt, um den gesamten Bestell- und Ausgabeprozess auf Festivals, 
Vereinsfesten und Events zu digitalisieren. Sie ersetzt traditionelle Papier-Bons durch 
ein effizientes, echtzeitfähiges System.

HAUPTFUNKTIONEN
---------------
• Digitale Bestellaufnahme mit automatischer Preisberechnung
• Echtzeit-Synchronisation zwischen allen Geräten (WebSockets)
• Rollenbasierter Workflow (Bestellung → Macher → Ausgabe)
• Automatische Pfandberechnung
• Bestandsverwaltung mit Nachverfolgung
• Umfassende Statistiken und Export-Funktionen
• Anpassbares Design (Logo, Farben)
• PWA-fähig (installierbar auf Smartphones)

ZIELGRUPPE
----------
• Festivalorganisatoren
• Vereinsveranstaltungen
• Gastronomiebetriebe bei Events
• Catering-Unternehmen

TECHNISCHE HIGHLIGHTS
---------------------
• Echtzeit-Updates ohne Seitenaktualisierung
• Optimiert für Touch-Bedienung
• Responsive Design für alle Bildschirmgrößen
• Offline-tolerant (PWA)
• Skalierbar für 20+ gleichzeitige Benutzer
`
  },
  
  workflow: {
    title: "Workflow & Rollen",
    content: `
WORKFLOW & ROLLENKONZEPT
========================

ÜBERSICHT DES BESTELLPROZESSES
------------------------------

Standard-Prozess (3 Stufen):
  [Gast] → [Besteller] → [Macher] → [Ausgabe] → [Gast]
      1        2            3          4           5

  1. Gast bestellt beim Besteller
  2. Besteller tippt Artikel ein, erstellt Bon
  3. Macher sieht Bon, bereitet Bestellung zu
  4. Ausgabe ruft Bonnummer aus
  5. Gast holt Bestellung ab

Kurzer Prozess (2 Stufen):
  [Gast] → [Besteller] → [Ausgabe] → [Gast]
      1        2            3           4

  - Überspringt den Macher (z.B. bei Getränken)
  - Aktivierbar pro Stand


DIE 4 ROLLEN IM DETAIL
======================

🛒 BESTELLER (Bestellung)
-------------------------
Aufgaben:
• Nimmt Bestellungen der Gäste entgegen
• Wählt Artikel durch Antippen aus
• Pfand wird automatisch berechnet
• Kann Wechselgeld berechnen (Restgeldrechner)
• Gibt Bonnummer an Gast weiter

Funktionen:
• Artikel nach Kategorie filtern
• Warenkorb mit Mengenanpassung
• Wischen zum Entfernen von Artikeln
• Archiv aller bisherigen Bestellungen
• Bestandswarnung bei knappen Artikeln

Tastenkürzel/Gesten:
• Tippen = Artikel hinzufügen
• Langes Drücken = Menge direkt eingeben
• Wischen im Warenkorb = Artikel entfernen


🔨 MACHER (Küche/Bar)
---------------------
Aufgaben:
• Sieht eingehende Bestellungen in Echtzeit
• Bereitet Bestellungen zu
• Markiert fertige Bestellungen

Funktionen:
• Echtzeit-Benachrichtigung bei neuen Bestellungen
• Sound-Benachrichtigung (optional)
• "Gesamt Offen" zeigt kumulierte Artikelliste
• Unterstützung für Stationen (bei großen Küchen)
• Zeitanzeige pro Bestellung

Stationen:
• Bei komplexen Ständen können Stationen definiert werden
• Jede Station sieht nur ihre zugewiesenen Artikel
• Hauptstation sieht alles


📦 AUSGABE
----------
Aufgaben:
• Sieht alle fertigen Bestellungen
• Ruft Bonnummern aus
• Übergibt Bestellungen an Gäste

Funktionen:
• Große, gut lesbare Bonnummern
• Swipe-Navigation zwischen Bestellungen
• Rückgängig-Funktion (letzte Ausgabe zurückholen)
• Archiv ausgebebener Bestellungen


⚡ ONEMANSHOW
-------------
Aufgaben:
• Kombiniert alle Rollen in einer Ansicht
• Für einfache Stände ohne Arbeitsteilung

Ideal für:
• Kleine Getränkestände
• Einfache Snack-Stände
• Verkaufsstände mit sofortiger Ausgabe

Ablauf:
• Artikel auswählen
• Kassieren
• Sofort übergeben (kein separater Macher/Ausgabe)


BONNUMMERN-SYSTEM
=================
• Nummern von 01 bis 25 pro Stand
• Nach 25 beginnt es wieder bei 01
• Jeder Stand hat eigenen Nummernkreis
• Große Anzeige nach Bestellaufgabe
• Automatische Synchronisation
`
  },

  admin: {
    title: "Admin-Bereich",
    content: `
ADMIN-BEREICH - VOLLSTÄNDIGE DOKUMENTATION
==========================================

ZUGANG
------
• URL: /admin/login
• Standard-Zugangsdaten: admin / admin
• Änderbar über Umgebungsvariablen

DASHBOARD ÜBERSICHT
-------------------
Das Admin-Dashboard zeigt:
• Anzahl der Stände
• Anzahl der Artikel
• Anzahl der Pfandgruppen
• Anzahl der Bestellungen

Navigation (alle Bereiche):
• Events - Event-Verwaltung (NEU)
• Stände - Standverwaltung
• Artikel - Artikelverwaltung
• Bestand - Bestandsübersicht
• Stationen - Stationsverwaltung
• Statistik - Auswertungen
• Einstellungen - App-Konfiguration
• Bestellungen - Bestellübersicht
• Export - Datenexport
• Reset - Daten zurücksetzen
• Hilfe - Diese Anleitung
• Dokumentation - Vollständige App-Doku


EVENT-VERWALTUNG (/admin/events) - NEU
======================================

ÜBERBLICK
---------
Die Event-Verwaltung ermöglicht die Definition und Auswertung 
einzelner Veranstaltungen. Jede Bestellung wird automatisch 
dem aktuell aktiven Event zugeordnet.

VORTEILE
--------
• Saubere Trennung der Daten zwischen Events
• Detaillierte Statistiken pro Veranstaltung
• Vergleichbarkeit zwischen Events
• Automatische Event-Zuordnung

EVENTS ERSTELLEN
----------------
1. Im Admin-Dashboard auf "Events" klicken
2. Button "Neues Event" klicken
3. Pflichtfelder ausfüllen:
   - Name (z.B. "Sommerfest 2025")
   - Startdatum
   - Enddatum
4. Optional: Beschreibung hinzufügen
5. "Erstellen" klicken

EVENT-STATUS
------------
Der Status wird automatisch basierend auf dem Datum gesetzt:

• Geplant (blau):
  - Startdatum liegt in der Zukunft
  - Bestellungen können noch nicht zugeordnet werden
  
• Aktiv (grün):
  - Heutiges Datum liegt zwischen Start und Ende
  - Alle neuen Bestellungen werden diesem Event zugeordnet
  - WICHTIG: Nur EIN Event kann gleichzeitig aktiv sein!
  
• Abgeschlossen (grau):
  - Enddatum liegt in der Vergangenheit
  - Keine neuen Bestellungen werden zugeordnet
  - Statistiken sind weiterhin abrufbar

AUTOMATISCHE ZUORDNUNG
----------------------
Wenn eine Bestellung erstellt wird:
1. System prüft: Gibt es ein aktives Event?
2. Falls JA: event_id wird automatisch gesetzt
3. Falls NEIN: event_id bleibt leer ("ohne Event")

Alte Bestellungen (vor Event-System):
• Werden als "ohne Event" geführt
• Sind über Filter "Ohne Event" abrufbar

EVENT-STATISTIKEN (/admin/events/{id}/stats)
============================================
Detaillierte Auswertung für ein spezifisches Event.

ZUSAMMENFASSUNG
---------------
• Gesamtzahl Bestellungen
• Abgeschlossene Bestellungen + Quote
• Gesamtumsatz in Euro
• Pfand erhalten / zurückgegeben
• Netto-Umsatz
• Durchschnittlicher Bestellwert

TABS IN DER STATISTIK
---------------------

Tab "Übersicht":
• Top 5 meistverkaufte Artikel
• Top 5 umsatzstärkste Stände
• Grafische Übersicht

Tab "Artikel":
• Alle verkauften Artikel
• Sortiert nach Menge
• Umsatz pro Artikel
• Durchschnittspreis

Tab "Pro Stunde":
• Bestellungen pro Stunde
• Umsatz pro Stunde
• Durchschnittlicher Bestellwert
• Ideal zur Identifikation der Stoßzeiten

Tab "Pro Tag":
• Bestellungen pro Tag
• Umsatz pro Tag
• Bei mehrtägigen Events sehr hilfreich

Tab "Pro Stand":
• Vergleich aller Stände
• Bestellungen und Umsatz
• Prozentualer Anteil am Gesamtumsatz

EXPORT
------
• Button "Export" erstellt CSV-Datei
• Enthält alle Statistikdaten
• Kann in Excel geöffnet werden

EVENT-FILTER IN ANDEREN BEREICHEN
=================================

STATISTIK-SEITE (/admin/stats)
------------------------------
Neuer Filter: "Event"
• "Alle Events" - Alle Daten (Standard)
• "Ohne Event" - Nur nicht zugeordnete
• [Event-Name] - Nur dieses Event

BESTELLUNGEN (/admin/orders)
-----------------------------
Neuer Filter: "Event"
• Funktioniert wie oben
• Kombinierbar mit Stand-Filter

WICHTIG: Wenn kein Filter gesetzt ist, 
werden IMMER alle Daten angezeigt!


STÄNDE VERWALTEN (/admin/stands)
================================
Standtypen:
• Speisestand - für Essensverkauf
• Getränkestand - für Getränkeverkauf
• Gemischt - für beides

Einstellungen pro Stand:
• Name
• Typ
• Kurzer Prozess (AN/AUS)
• Zugewiesene Artikel

Kurzer Prozess:
• AN = Bestellung geht direkt zur Ausgabe
• AUS = Bestellung geht erst zum Macher


ARTIKEL VERWALTEN (/admin/articles)
===================================
Tab: Artikel
• Name
• Preis
• Kategorie (Speise/Getränk)
• Pfandgruppe (optional)
• Bestandsverwaltung (optional)

Tab: Bestandseinheiten
• Einheiten für Bestandsverwaltung
• z.B. "Kiste 24x0.5l", "Fass 30l"
• Schankverlust pro Einheit

Tab: Pfandgruppen
• Name der Pfandgruppe
• Pfandbetrag
• Zuordnung zu Artikeln

Bestandsverwaltung:
• Aktivierbar pro Artikel
• Anfangsbestand setzen
• Warnschwelle definieren
• Automatische Reduktion bei Verkauf


BESTANDSÜBERSICHT (/admin/stock)
================================
Zeigt für alle Artikel mit Bestandsverwaltung:
• Anfangsbestand
• Verkaufte Menge
• Restbestand
• Umsatz
• Status (OK/Knapp/Ausverkauft)

Aktionen:
• Bestand aufstocken (+ Button)
• Reset (nur Verkäufe oder komplett)


STATIONEN (/admin/stations)
===========================
Für große Küchen mit Arbeitsteilung:
• Station erstellen
• Artikel zuweisen
• Hauptstation festlegen

Beispiel:
• Station "Grill" → Burger, Steaks
• Station "Pommes" → Pommes, Wedges
• Hauptstation → Sieht alles


STATISTIKEN (/admin/stats)
==========================
Auswertungen:
• Gesamtumsatz
• Anzahl Bestellungen
• Bestellungen pro Stunde (Chart)
• Top-Artikel
• Umsatz pro Artikel

Zeitraum: Gesamter Eventzeitraum


EINSTELLUNGEN (/admin/settings)
===============================
Event-Name:
• Wird auf Startseite angezeigt
• Format: "Name_Event"

Logo:
• Upload möglich (PNG, JPG, SVG, WebP)
• Max. 2MB
• Wird auf Startseite angezeigt

Farbschema:
• 6 vordefinierte Themes
• Individuelle Farbanpassung möglich
• Primärfarbe (Buttons, Akzente)
• Sekundärfarbe (Bestätigungen)
• Akzentfarbe (Highlights)

Zeitzone:
• Für alle Uhren in der App
• Standard: Europe/Berlin


BESTELLUNGEN (/admin/orders)
============================
Übersicht aller Bestellungen:
• Bonnummer
• Stand
• Status
• Zeitstempel
• Artikel
• Summe

Filter nach Status:
• Offen
• In Bearbeitung
• Fertig
• Ausgegeben

Aktionen:
• Status ändern
• Bestellung löschen


EXPORT
======
Exportiert alle Daten als JSON:
• Bestellungen
• Artikel
• Stände
• Statistiken

Format: JSON-Datei zum Download


RESET
=====
Löscht Bestellungen und Zähler.
PIN erforderlich (Standard: 200183)

Optionen im Bestandsbereich:
• Nur Verkäufe zurücksetzen
• Bestand und Verkäufe zurücksetzen
`
  },

  technical: {
    title: "Technische Architektur",
    content: `
TECHNISCHE ARCHITEKTUR
======================

STACK ÜBERSICHT
---------------
Frontend:  React 18 + Tailwind CSS + Shadcn/UI
Backend:   FastAPI (Python) + Motor (Async MongoDB)
Datenbank: MongoDB
Echtzeit:  WebSockets


FRONTEND-ARCHITEKTUR
====================

Framework & Libraries:
• React 18 mit funktionalen Komponenten
• React Router für Navigation
• Axios für HTTP-Requests
• Tailwind CSS für Styling
• Shadcn/UI für UI-Komponenten
• Lucide React für Icons

Verzeichnisstruktur:
/app/frontend/src/
├── components/
│   ├── ui/              # Shadcn UI Komponenten
│   ├── LiveClock.jsx    # Echtzeit-Uhr
│   ├── ThemeProvider.jsx # Farbschema-Provider
│   └── ErrorBoundary.jsx # Fehlerbehandlung
├── pages/
│   ├── LandingPage.jsx      # Startseite
│   ├── BestellungPage.jsx   # Bestellansicht
│   ├── KuechePage.jsx       # Macher-Ansicht
│   ├── AusgabePage.jsx      # Ausgabe-Ansicht
│   ├── OneManShowPage.jsx   # Kombinierte Ansicht
│   ├── AdminDashboard.jsx   # Admin-Übersicht
│   ├── ArticleManagement.jsx # Artikelverwaltung
│   ├── StandManagement.jsx  # Standverwaltung
│   ├── StationManagement.jsx # Stationsverwaltung
│   ├── StockOverview.jsx    # Bestandsübersicht
│   ├── StatsPage.jsx        # Statistiken (mit Event-Filter)
│   ├── SettingsPage.jsx     # Einstellungen
│   ├── OrdersManagement.jsx # Bestellübersicht (mit Event-Filter)
│   ├── EventManagement.jsx  # Event-Verwaltung (NEU)
│   ├── EventStatsPage.jsx   # Event-Statistiken (NEU)
│   └── DocumentationPage.jsx # Diese Dokumentation
├── App.js               # Routing & Provider
├── index.js             # Entry Point
└── index.css            # Globale Styles

State Management:
• React useState für lokalen State
• React Context für globale Einstellungen (Theme)
• WebSocket für Echtzeit-Updates

PWA Features:
• Service Worker für Caching
• Manifest für Installation
• Offline-Fallback (geplant)


BACKEND-ARCHITEKTUR
===================

Framework:
• FastAPI (async Python)
• Motor für async MongoDB
• WebSockets für Echtzeit

Hauptdatei: /app/backend/server.py

API-Struktur:
/api/
├── /stands          # CRUD für Stände
├── /articles        # CRUD für Artikel
├── /orders          # CRUD für Bestellungen
├── /events          # CRUD für Events (NEU)
│   ├── GET /         # Alle Events abrufen
│   ├── GET /active   # Aktuell aktives Event
│   ├── GET /{id}     # Einzelnes Event
│   ├── GET /{id}/stats # Detaillierte Statistiken
│   ├── POST /        # Event erstellen (Admin)
│   ├── PUT /{id}     # Event bearbeiten (Admin)
│   └── DELETE /{id}  # Event löschen (Admin)
├── /stock-units     # CRUD für Bestandseinheiten
├── /deposit-groups  # CRUD für Pfandgruppen
├── /stations        # CRUD für Stationen
├── /settings        # App-Einstellungen
├── /stats           # Statistik-Endpoints (mit Event-Filter)
├── /admin/          # Admin-Funktionen
│   ├── /login       # Authentifizierung
│   ├── /orders      # Bestellverwaltung (mit Event-Filter)
│   ├── /reset       # Daten zurücksetzen
│   └── /stock/reset # Bestand zurücksetzen
├── /ws              # WebSocket-Endpoint
└── /health          # Health-Check

Authentifizierung:
• Basic Auth für Admin-Bereich
• Credentials in Umgebungsvariablen

WebSocket:
• Broadcast bei neuen Bestellungen
• Broadcast bei Statusänderungen
• Optimiert für <30ms Latenz


DATENBANK-SCHEMA
================

Collection: stands
{
  id: string,
  name: string,
  stand_type: "speisestand" | "getraenkestand" | "gemischt",
  short_process: boolean,
  created_at: datetime
}

Collection: articles
{
  id: string,
  name: string,
  price: number,
  category: "speise" | "getraenk",
  deposit_group_id: string | null,
  stand_ids: string[],
  track_stock: boolean,
  stock_unit_id: string | null,
  stock_large_units: number,
  stock_small_units: number,
  stock_initial_large: number,
  stock_initial_small: number,
  stock_alert_threshold: number
}

Collection: orders
{
  id: string,
  stand_id: string,
  order_number: number,
  items: [{ article_id, article_name, quantity, price }],
  total: number,
  status: "pending" | "in_progress" | "ready" | "delivered",
  event_id: string | null,  // NEU: Zugehöriges Event
  created_at: datetime,
  updated_at: datetime
}

Collection: events (NEU)
{
  id: string,
  name: string,
  description: string,
  start_date: string,      // ISO Datum
  end_date: string,        // ISO Datum
  status: "planned" | "active" | "completed",
  created_at: datetime,
  updated_at: datetime
}

Collection: deposit_groups
{
  id: string,
  name: string,
  amount: number
}

Collection: stock_units
{
  id: string,
  name: string,
  type: "crate" | "keg" | "custom",
  large_unit_name: string,
  small_unit_name: string,
  container_size: number,
  serving_size: number,
  wastage_percentage: number,
  sales_units_per_large: number
}

Collection: stations
{
  id: string,
  name: string,
  stand_id: string,
  is_main: boolean,
  article_ids: string[]
}

Collection: settings
{
  id: "global",
  timezone: string,
  event_name: string,
  logo_url: string | null,
  primary_color: string,
  secondary_color: string,
  accent_color: string
}

Collection: order_counters
{
  stand_id: string,
  counter: number
}


PERFORMANCE-OPTIMIERUNGEN
=========================

Frontend:
• Memoization mit useMemo/useCallback
• Lazy Loading (geplant)
• Optimistic Updates

Backend:
• MongoDB Connection Pooling
• Async Background Tasks für WebSocket
• Indexed Queries

WebSocket:
• Debounced Broadcasts
• Targeted Updates (nicht global)
• Reconnection-Logik im Frontend


UMGEBUNGSVARIABLEN
==================

Backend (/app/backend/.env):
• MONGO_URL - MongoDB Verbindung
• DB_NAME - Datenbankname
• ADMIN_USERNAME - Admin-Benutzername
• ADMIN_PASSWORD - Admin-Passwort
• RESET_PIN - PIN für Reset-Funktionen

Frontend (/app/frontend/.env):
• REACT_APP_BACKEND_URL - Backend-URL
`
  },

  design: {
    title: "Design & Styling",
    content: `
DESIGN-SYSTEM
=============

DESIGN-PHILOSOPHIE
------------------
• Dark Mode als Standard (bessere Lesbarkeit bei Events)
• Neon-Akzente für wichtige Elemente
• Große Touch-Targets für mobile Bedienung
• Klare visuelle Hierarchie
• Konsistente Abstände und Größen


FARBSYSTEM
==========

Standard-Farbpalette:
• Primary (Lila): #a855f7 - Hauptaktionen, Buttons
• Secondary (Grün): #22c55e - Bestätigungen, Erfolg
• Accent (Gelb): #eab308 - Highlights, Warnungen
• Destructive (Rot): #ef4444 - Fehler, Löschen
• Background (Dunkel): #09090b - Hintergrund
• Card (Dunkelgrau): #18181b - Karten-Hintergrund
• Muted: Gedämpfte Texte und Borders

Vordefinierte Themes:
1. Neon Lila (Standard)
   - Primary: #a855f7
   - Secondary: #22c55e
   - Accent: #eab308

2. Ocean Blau
   - Primary: #3b82f6
   - Secondary: #06b6d4
   - Accent: #f59e0b

3. Sunset Orange
   - Primary: #f97316
   - Secondary: #ec4899
   - Accent: #fbbf24

4. Forest Grün
   - Primary: #22c55e
   - Secondary: #84cc16
   - Accent: #14b8a6

5. Royal Rot
   - Primary: #ef4444
   - Secondary: #f97316
   - Accent: #fbbf24

6. Elegant Gold
   - Primary: #eab308
   - Secondary: #a855f7
   - Accent: #f59e0b


TYPOGRAFIE
==========

Schriftfamilien:
• Display: "Unbounded" - Überschriften, Logo
• Body: "Manrope" - Fließtext
• Mono: "JetBrains Mono" - Zahlen, Preise, Code

Größenhierarchie:
• H1: text-4xl bis text-6xl (responsive)
• H2: text-lg bis text-xl
• Body: text-base (mobile: text-sm)
• Small: text-sm oder text-xs

Besonderheiten:
• Überschriften: UPPERCASE, tracking-tight
• Zahlen/Preise: font-mono für Ausrichtung
• Badges: text-xs bis text-sm


KOMPONENTEN-DESIGN
==================

Buttons:
• Primär: Gefüllt mit Primary-Farbe, Neon-Glow
• Sekundär: Outline mit Hover-Effekt
• Ghost: Transparent, nur Hover-Hintergrund
• Größen: sm, default, lg, icon

Karten:
• Dunkler Hintergrund (bg-card)
• Subtiler Border
• Hover-Effekt bei interaktiven Karten
• Neon-Glow bei ausgewählten Karten

Dialoge:
• Zentriert mit Overlay
• Max-Width für Lesbarkeit
• ScrollArea bei langem Inhalt
• Klare Header-Struktur

Badges:
• Farbcodiert nach Bedeutung
• Outline-Stil für Status
• Filled für Kategorien

Inputs:
• Dunkler Hintergrund
• Subtiler Border
• Focus-Ring in Primary-Farbe


NEON-EFFEKTE
============

CSS-Klassen:
• neon-primary - Lila Glow
• neon-secondary - Grüner Glow
• neon-accent - Gelber Glow
• neon-success - Grüner Erfolgs-Glow

Anwendung:
• Aktive Buttons
• Ausgewählte Karten
• Wichtige Badges
• Hervorhebungen


RESPONSIVE DESIGN
=================

Breakpoints (Tailwind):
• sm: 640px - Kleine Tablets
• md: 768px - Tablets
• lg: 1024px - Laptops
• xl: 1280px - Desktops

Mobile-First Ansatz:
• Basis-Styles für Mobile
• Erweiterungen für größere Screens

Navigation:
• Mobile: Nur Icons
• Tablet: Icons + wichtige Labels
• Desktop: Icons + alle Labels


ANIMATIONEN
===========

Verwendete Animationen:
• Fade-In für Dialoge
• Slide für Seitenübergänge
• Pulse für Lade-Indikatoren
• Scale für Button-Hover

Performance:
• transform und opacity bevorzugt
• will-change für komplexe Animationen
• Reduced-Motion Support


GLASSMORPHISM
=============

Header-Effekt:
• Backdrop-blur für Transparenz
• Subtiler Border
• Sticky positioning

CSS:
.glass {
  background: rgba(24, 24, 27, 0.8);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}


BARRIEREFREIHEIT
================

Implementiert:
• Ausreichende Farbkontraste
• Focus-Indikatoren
• Touch-Target-Größen (min. 44px)
• Semantisches HTML
• ARIA-Labels wo nötig
`
  },

  api: {
    title: "API-Referenz",
    content: `
API-REFERENZ
============

BASE URL: /api

AUTHENTIFIZIERUNG
-----------------
Admin-Endpoints benötigen Basic Auth:
Authorization: Basic base64(username:password)


STÄNDE
======

GET /api/stands
  → Liste aller Stände

GET /api/stands/{stand_id}
  → Einzelner Stand

POST /api/stands
  Body: { name, stand_type, short_process }
  → Neuer Stand erstellen

PUT /api/stands/{stand_id}
  Body: { name?, stand_type?, short_process? }
  → Stand aktualisieren

DELETE /api/stands/{stand_id}
  → Stand löschen

PUT /api/stands/{stand_id}/toggle-short-process
  → Kurzer Prozess umschalten


ARTIKEL
=======

GET /api/articles
  → Liste aller Artikel

GET /api/stands/{stand_id}/articles
  → Artikel eines Stands

POST /api/articles
  Body: { name, price, category, deposit_group_id?, stand_ids }
  → Neuer Artikel

PUT /api/articles/{article_id}
  Body: { ... }
  → Artikel aktualisieren

DELETE /api/articles/{article_id}
  → Artikel löschen

PUT /api/articles/{article_id}/stock
  Body: { large_units?, small_units?, mode, set_as_initial }
  mode: "set" | "add"
  → Bestand anpassen


BESTELLUNGEN
============

GET /api/stands/{stand_id}/orders
  → Bestellungen eines Stands

GET /api/stands/{stand_id}/orders?status=pending
  → Gefiltert nach Status

POST /api/orders
  Body: { stand_id, items: [{ article_id, quantity }] }
  → Neue Bestellung

PUT /api/orders/{order_id}/status
  Body: { status }
  status: "pending" | "in_progress" | "ready" | "delivered"
  → Status ändern

DELETE /api/orders/{order_id}
  → Bestellung löschen


PFANDGRUPPEN
============

GET /api/deposit-groups
  → Liste aller Pfandgruppen

POST /api/deposit-groups
  Body: { name, amount }
  → Neue Pfandgruppe

PUT /api/deposit-groups/{group_id}
  Body: { name?, amount? }
  → Aktualisieren

DELETE /api/deposit-groups/{group_id}
  → Löschen


BESTANDSEINHEITEN
=================

GET /api/stock-units
  → Liste aller Einheiten

POST /api/stock-units
  Body: { name, type, large_unit_name, small_unit_name, 
          container_size, serving_size, wastage_percentage }
  → Neue Einheit

PUT /api/stock-units/{unit_id}
  → Aktualisieren

DELETE /api/stock-units/{unit_id}
  → Löschen


STATIONEN
=========

GET /api/stations
  → Liste aller Stationen

GET /api/stands/{stand_id}/stations
  → Stationen eines Stands

POST /api/stations
  Body: { name, stand_id, is_main, article_ids }
  → Neue Station

PUT /api/stations/{station_id}
  → Aktualisieren

DELETE /api/stations/{station_id}
  → Löschen


EINSTELLUNGEN
=============

GET /api/settings
  → Globale Einstellungen

PUT /api/settings (Auth required)
  Body: { timezone?, event_name?, primary_color?, ... }
  → Einstellungen speichern

POST /api/settings/logo (Auth required)
  Body: FormData mit file
  → Logo hochladen

DELETE /api/settings/logo (Auth required)
  → Logo löschen


STATISTIKEN
===========

GET /api/stats
  → Statistik-Übersicht

GET /api/stats/orders-by-hour
  → Bestellungen pro Stunde

GET /api/admin/stock-overview (Auth required)
  → Bestandsübersicht


ADMIN
=====

POST /api/admin/login
  Body: { username, password }
  → Login (gibt Token zurück)

POST /api/admin/reset (Auth required)
  Body: { pin }
  → Alle Bestellungen zurücksetzen

POST /api/admin/stock/reset (Auth required)
  Body: { pin, reset_type }
  reset_type: "sales" | "all"
  → Bestand zurücksetzen


WEBSOCKET
=========

WS /api/ws
  Events:
  • new_order: Neue Bestellung
  • order_status_changed: Status geändert
  • order_deleted: Bestellung gelöscht


SONSTIGE
========

GET /api/timezones
  → Liste verfügbarer Zeitzonen

GET /api/server-time
  → Aktuelle Serverzeit

GET /api/health
  → Health-Check für Deployment

POST /api/seed
  → Initiale Testdaten erstellen
`
  }
};

// Generate full text documentation
const generateFullDocumentation = (settings) => {
  const divider = "=".repeat(80);
  const date = new Date().toLocaleDateString('de-DE', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
  
  let doc = `
${"=".repeat(80)}
                    ${settings?.event_name || 'KARNBACHS EVENT OS'}
                         VOLLSTÄNDIGE DOKUMENTATION
${"=".repeat(80)}

Erstellt am: ${date}
Version: 1.0

${divider}
                              INHALTSVERZEICHNIS
${divider}

1. ÜBERSICHT
2. WORKFLOW & ROLLEN
3. ADMIN-BEREICH
4. TECHNISCHE ARCHITEKTUR
5. DESIGN & STYLING
6. API-REFERENZ

${divider}

`;

  // Add all sections
  Object.values(DOCUMENTATION).forEach((section, index) => {
    doc += `\n${"=".repeat(80)}\n`;
    doc += `${index + 1}. ${section.title.toUpperCase()}\n`;
    doc += `${"=".repeat(80)}\n`;
    doc += section.content;
    doc += `\n`;
  });

  // Add footer
  doc += `
${divider}
                              AKTUELLE KONFIGURATION
${divider}

Event-Name: ${settings?.event_name || 'Karnbachs Event OS'}
Zeitzone: ${settings?.timezone || 'Europe/Berlin'}
Primärfarbe: ${settings?.primary_color || '#a855f7'}
Sekundärfarbe: ${settings?.secondary_color || '#22c55e'}
Akzentfarbe: ${settings?.accent_color || '#eab308'}
Logo: ${settings?.logo_url ? 'Hochgeladen' : 'Nicht gesetzt'}

${divider}
                                    ENDE
${divider}

Diese Dokumentation wurde automatisch generiert.
© ${new Date().getFullYear()} ${settings?.event_name || 'Karnbachs Event OS'}
`;

  return doc;
};

export default function DocumentationPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  const auth = sessionStorage.getItem("adminAuth");

  useEffect(() => {
    if (!auth) {
      navigate("/admin/login");
      return;
    }
    fetchSettings();
  }, [auth, navigate]);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API}/settings`);
      setSettings(response.data);
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    const content = generateFullDocumentation(settings);
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(settings?.event_name || 'EventOS').replace(/\s+/g, '_')}_Dokumentation.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Dokumentation heruntergeladen!");
  };

  const renderContent = (content) => {
    return content.split('\n').map((line, i) => {
      // Headers
      if (line.match(/^={3,}$/)) return null;
      if (line.match(/^-{3,}$/)) return <hr key={i} className="border-border my-2" />;
      
      // Section headers (all caps with multiple words)
      if (line.match(/^[A-ZÄÖÜ\s&-]{5,}$/) && line.trim().length > 0) {
        return <h3 key={i} className="font-display text-lg font-bold text-primary mt-6 mb-2 uppercase">{line}</h3>;
      }
      
      // Sub-headers (Title Case with colon or specific patterns)
      if (line.match(/^[A-ZÄÖÜ][a-zäöüß\s&-]+:$/) || line.match(/^[•●]\s[A-ZÄÖÜ]/)) {
        return <h4 key={i} className="font-bold text-foreground mt-4 mb-1">{line}</h4>;
      }
      
      // Bullet points
      if (line.match(/^[•●]\s/)) {
        return <p key={i} className="text-muted-foreground ml-4 text-sm">{line}</p>;
      }
      
      // Code/paths
      if (line.match(/^\/app\/|^\s+[a-z_]+:/)) {
        return <code key={i} className="block text-xs font-mono text-secondary bg-muted/30 px-2 py-0.5 rounded">{line}</code>;
      }
      
      // Empty lines
      if (line.trim() === '') return <br key={i} />;
      
      // Regular text
      return <p key={i} className="text-muted-foreground text-sm">{line}</p>;
    });
  };

  const tabs = [
    { id: "overview", label: "Übersicht", icon: Book },
    { id: "workflow", label: "Workflow", icon: Users },
    { id: "admin", label: "Admin", icon: Settings },
    { id: "technical", label: "Technik", icon: Code },
    { id: "design", label: "Design", icon: Palette },
    { id: "api", label: "API", icon: Server },
  ];

  const { swipeHandlers } = useAdminSwipe();

  return (
    <div className="min-h-screen bg-background flex flex-col" {...swipeHandlers}>
      <header className="glass sticky top-0 z-50 px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <BookOpen className="w-5 h-5 text-primary" />
            <h1 className="font-display text-base sm:text-lg font-bold uppercase tracking-tight">
              Dokumentation
            </h1>
          </div>
          
          <div className="flex-1 overflow-x-auto scrollbar-hide">
            <AdminNavBar />
          </div>
          
          <Button 
            onClick={handleDownload}
            size="sm"
            className="shrink-0 neon-primary"
          >
            <Download className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Download</span>
          </Button>
        </div>
      </header>

      <main className="p-4 sm:p-6 max-w-6xl mx-auto flex-1">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Laden...</div>
        ) : (
          <div className="space-y-6">
            {/* Info Card */}
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center gap-4">
                  <Badge variant="outline" className="border-primary text-primary">
                    {settings?.event_name || 'Karnbachs Event OS'}
                  </Badge>
                  <Badge variant="outline" className="border-secondary text-secondary">
                    <Clock className="w-3 h-3 mr-1" />
                    {settings?.timezone || 'Europe/Berlin'}
                  </Badge>
                  <Badge variant="outline">
                    <Palette className="w-3 h-3 mr-1" />
                    <span className="w-3 h-3 rounded-full mr-1" style={{ backgroundColor: settings?.primary_color || '#a855f7' }} />
                    <span className="w-3 h-3 rounded-full mr-1" style={{ backgroundColor: settings?.secondary_color || '#22c55e' }} />
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: settings?.accent_color || '#eab308' }} />
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Documentation Tabs */}
            <Card className="bg-card border-border">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <CardHeader className="pb-0">
                  <TabsList className="w-full flex-wrap h-auto gap-1 bg-muted/50 p-1">
                    {tabs.map(tab => (
                      <TabsTrigger 
                        key={tab.id} 
                        value={tab.id}
                        className="flex items-center gap-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                      >
                        <tab.icon className="w-4 h-4" />
                        <span className="hidden sm:inline">{tab.label}</span>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </CardHeader>
                <CardContent className="pt-4">
                  {tabs.map(tab => (
                    <TabsContent key={tab.id} value={tab.id} className="mt-0">
                      <ScrollArea className="h-[60vh] pr-4">
                        <div className="space-y-1">
                          {renderContent(DOCUMENTATION[tab.id].content)}
                        </div>
                      </ScrollArea>
                    </TabsContent>
                  ))}
                </CardContent>
              </Tabs>
            </Card>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-card border-border">
                <CardContent className="p-4 text-center">
                  <Monitor className="w-8 h-8 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold font-mono">4</p>
                  <p className="text-xs text-muted-foreground">Benutzer-Rollen</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardContent className="p-4 text-center">
                  <Server className="w-8 h-8 mx-auto mb-2 text-secondary" />
                  <p className="text-2xl font-bold font-mono">30+</p>
                  <p className="text-xs text-muted-foreground">API Endpoints</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardContent className="p-4 text-center">
                  <Database className="w-8 h-8 mx-auto mb-2 text-accent" />
                  <p className="text-2xl font-bold font-mono">7</p>
                  <p className="text-xs text-muted-foreground">DB Collections</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardContent className="p-4 text-center">
                  <Smartphone className="w-8 h-8 mx-auto mb-2 text-green-500" />
                  <p className="text-2xl font-bold font-mono">PWA</p>
                  <p className="text-xs text-muted-foreground">Installierbar</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>

      <AppFooter />
    </div>
  );
}
