import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { 
  ArrowLeft, FileText, Download, Book, Code, Palette, Database, 
  Settings, Users, ShoppingCart, Hammer, Package, Zap, Box,
  BarChart3, Clock, Globe, Smartphone, Monitor, Server, BookOpen, 
  Image, Loader2, Workflow, GitBranch, Layers, CheckCircle, 
  AlertTriangle, Lightbulb, ExternalLink, Cpu, Network
} from "lucide-react";
import LiveClock from "@/components/LiveClock";
import AppFooter from "@/components/AppFooter";
import AdminNavBar from "@/components/AdminNavBar";
import { useAdminSwipe } from "@/components/AdminSwipe";
import { jsPDF } from "jspdf";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// ============================================================================
// VOLLSTÄNDIGE APP-DOKUMENTATION - KARNBACHS EVENT OS
// ============================================================================

const FULL_DOCUMENTATION = {
  // -------------------------------------------------------------------------
  // 1. APP-IDEE & VISION
  // -------------------------------------------------------------------------
  idea: {
    title: "🎪 App-Idee & Vision",
    icon: Lightbulb,
    content: `
═══════════════════════════════════════════════════════════════════════════════
                        KARNBACHS EVENT OS - DIE VISION
═══════════════════════════════════════════════════════════════════════════════

▸ PROBLEMSTELLUNG
─────────────────────────────────────────────────────────────────────────────
Auf Festivals, Vereinsfesten und Events werden traditionell Papier-Bons verwendet:
• Handschriftliche Bestellungen sind fehleranfällig und schlecht lesbar
• Keine Echtzeit-Übersicht über Bestellstatus
• Schwierige Koordination zwischen Bestellannahme, Küche und Ausgabe
• Keine Statistiken oder Auswertungsmöglichkeiten
• Pfandverwaltung ist manuell und ungenau
• Bestandsverwaltung erfordert ständiges Nachzählen

▸ UNSERE LÖSUNG
─────────────────────────────────────────────────────────────────────────────
Karnbachs Event OS ist eine vollständig digitale Bestell- und Ausgabelösung:

┌─────────────────────────────────────────────────────────────────────────────┐
│  GAST bestellt → BESTELLER tippt → MACHER bereitet → AUSGABE ruft auf      │
│                                                                             │
│  Alles in Echtzeit synchronisiert über WebSockets!                         │
└─────────────────────────────────────────────────────────────────────────────┘

▸ KERNFEATURES
─────────────────────────────────────────────────────────────────────────────
✓ Digitale Bestellaufnahme mit automatischer Preisberechnung
✓ Echtzeit-Synchronisation zwischen allen Geräten (< 30ms Latenz)
✓ Rollenbasierter Workflow: Bestellung → Macher → Ausgabe
✓ Automatische Pfandberechnung und -verwaltung
✓ Intelligente Bestandsverwaltung mit Warnungen
✓ Event-Management mit Statistiken pro Veranstaltung
✓ Anpassbares Design (Logo, Farben, Themes)
✓ PWA-fähig (installierbar auf Smartphones)
✓ Optimiert für 20-30 gleichzeitige Benutzer

▸ ZIELGRUPPE
─────────────────────────────────────────────────────────────────────────────
• Festivalorganisatoren
• Vereine bei Festen (Schützenfest, Sommerfest, Weihnachtsmarkt)
• Gastronomiebetriebe bei Open-Air-Events
• Catering-Unternehmen
• Foodtrucks und mobile Verkaufsstände

▸ WARUM DIESE APP?
─────────────────────────────────────────────────────────────────────────────
ENTSCHEIDUNG: Wir haben uns für eine Web-App (PWA) entschieden, weil:
  → Keine Installation nötig - funktioniert auf jedem Gerät mit Browser
  → Keine App-Store-Gebühren oder Freigabeprozesse
  → Sofortige Updates ohne Benutzeraktion
  → Funktioniert auf Android, iOS, Windows, macOS gleichermaßen
  → Offline-fähig durch Service Worker (geplant)
`
  },

  // -------------------------------------------------------------------------
  // 2. ARCHITEKTUR & TECHNOLOGIE
  // -------------------------------------------------------------------------
  architecture: {
    title: "🏗️ Architektur & Technologie",
    icon: Layers,
    content: `
═══════════════════════════════════════════════════════════════════════════════
                           SYSTEM-ARCHITEKTUR
═══════════════════════════════════════════════════════════════════════════════

▸ TECHNOLOGIE-STACK
─────────────────────────────────────────────────────────────────────────────

┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  React 18          │ Funktionale Komponenten mit Hooks                      │
│  Tailwind CSS      │ Utility-First CSS Framework                            │
│  Shadcn/UI         │ Accessible, customizable UI-Komponenten                │
│  Axios             │ HTTP-Client für API-Kommunikation                      │
│  React Router      │ Client-seitiges Routing                                │
│  Sonner            │ Toast-Notifications                                    │
│  html2pdf.js       │ PDF-Generierung im Browser                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                              BACKEND                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  FastAPI           │ Async Python Web-Framework (hohe Performance)          │
│  Motor             │ Async MongoDB-Treiber                                  │
│  WebSockets        │ Echtzeit-Kommunikation                                 │
│  Pydantic          │ Datenvalidierung und Serialisierung                    │
│  Python-dotenv     │ Umgebungsvariablen-Management                          │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                              DATENBANK                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│  MongoDB           │ NoSQL-Datenbank für flexible Dokumente                 │
│  Connection Pool   │ 100 max, 20 min Connections für Skalierung             │
│  Indexes           │ Optimiert für häufige Queries                          │
└─────────────────────────────────────────────────────────────────────────────┘

▸ ARCHITEKTUR-DIAGRAMM
─────────────────────────────────────────────────────────────────────────────

    ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
    │  Besteller  │     │   Macher    │     │   Ausgabe   │
    │   (Tablet)  │     │   (Tablet)  │     │   (Tablet)  │
    └──────┬──────┘     └──────┬──────┘     └──────┬──────┘
           │                   │                   │
           │    HTTP/WS        │    HTTP/WS        │    HTTP/WS
           │                   │                   │
           └───────────────────┼───────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │    NGINX/Ingress    │
                    │   (Load Balancer)   │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
     ┌────────▼────────┐       │       ┌────────▼────────┐
     │    Frontend     │       │       │    Backend      │
     │  React (3000)   │       │       │ FastAPI (8001)  │
     └─────────────────┘       │       └────────┬────────┘
                               │                │
                               │       ┌────────▼────────┐
                               │       │    MongoDB      │
                               │       │   (Database)    │
                               │       └─────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │    WebSocket Hub    │
                    │  (Echtzeit-Updates) │
                    └─────────────────────┘

▸ ENTSCHEIDUNGSBEGRÜNDUNGEN
─────────────────────────────────────────────────────────────────────────────

WARUM REACT?
  → Große Community und Ökosystem
  → Komponentenbasierte Architektur für Wiederverwendbarkeit
  → Virtual DOM für performante UI-Updates
  → Hooks ermöglichen sauberen, funktionalen Code

WARUM FASTAPI?
  → Native async/await Unterstützung
  → Automatische API-Dokumentation (OpenAPI/Swagger)
  → Pydantic-Integration für Typsicherheit
  → Hohe Performance (vergleichbar mit NodeJS/Go)

WARUM MONGODB?
  → Flexible Schema für sich ändernde Anforderungen
  → Gute Performance bei Reads und Writes
  → Einfache horizontale Skalierung
  → JSON-natives Format passt zu JavaScript/Python

WARUM WEBSOCKETS?
  → Echtzeit-Updates ohne Polling
  → Geringe Latenz (< 30ms)
  → Bidirektionale Kommunikation
  → Effizient für viele gleichzeitige Verbindungen
`
  },

  // -------------------------------------------------------------------------
  // 3. DATENBANK-SCHEMA
  // -------------------------------------------------------------------------
  database: {
    title: "🗄️ Datenbank-Schema",
    icon: Database,
    content: `
═══════════════════════════════════════════════════════════════════════════════
                           MONGODB COLLECTIONS
═══════════════════════════════════════════════════════════════════════════════

▸ COLLECTION: stands (Verkaufsstände)
─────────────────────────────────────────────────────────────────────────────
{
  "id": "uuid-string",
  "name": "Essensstand",
  "stand_type": "speisestand | getraenkestand | gemischt",
  "short_process": false,        // Überspringt Macher-Schritt
  "created_at": "2025-01-07T12:00:00Z"
}

ERKLÄRUNG:
  • stand_type bestimmt welche Artikel-Kategorien angezeigt werden
  • short_process: Wenn true, geht Bestellung direkt zur Ausgabe (für Getränke)

▸ COLLECTION: articles (Artikel)
─────────────────────────────────────────────────────────────────────────────
{
  "id": "uuid-string",
  "name": "Schnitzel",
  "price": 8.00,
  "category": "speisen | getraenke",
  "deposit_group_id": "uuid-string | null",
  "stand_ids": ["stand-uuid-1", "stand-uuid-2"],
  "track_stock": true,
  "stock_unit_id": "uuid-string | null",
  "stock_large_units": 5,        // z.B. 5 Kisten
  "stock_small_units": 10,       // z.B. 10 einzelne Flaschen
  "stock_initial_large": 10,
  "stock_initial_small": 0,
  "stock_alert_threshold": 20    // Warnung bei < 20 Einheiten
}

ERKLÄRUNG:
  • Ein Artikel kann mehreren Ständen zugewiesen sein
  • Bestandsverwaltung ist optional pro Artikel
  • Pfandgruppe verlinkt zu deposit_groups Collection

▸ COLLECTION: orders (Bestellungen)
─────────────────────────────────────────────────────────────────────────────
{
  "id": "uuid-string",
  "stand_id": "stand-uuid",
  "stand_name": "Essensstand",
  "order_number": 1,             // 1-25, dann wieder von vorn
  "items": [
    {
      "article_id": "article-uuid",
      "article_name": "Schnitzel",
      "quantity": 2,
      "price": 8.00,
      "deposit_amount": 0,
      "is_deposit_return": false
    }
  ],
  "subtotal": 16.00,
  "deposit_total": 2.00,
  "deposit_return_total": 0,
  "total": 18.00,
  "status": "created | in_progress | ready | completed",
  "event_id": "event-uuid | null",
  "created_by": "Bestellung | OneManShow",
  "created_at": "2025-01-07T12:00:00Z",
  "updated_at": "2025-01-07T12:05:00Z",
  "request_id": "unique-request-id"  // Für Duplikat-Erkennung
}

STATUS-FLOW:
  created → in_progress → ready → completed
     │                              │
     └──────── (OneManShow) ────────┘

▸ COLLECTION: events (Veranstaltungen)
─────────────────────────────────────────────────────────────────────────────
{
  "id": "uuid-string",
  "name": "Sommerfest 2025",
  "description": "Jährliches Vereinsfest",
  "start_date": "2025-07-01",
  "end_date": "2025-07-03",
  "status": "planned | active | completed",
  "created_at": "2025-01-07T12:00:00Z"
}

ERKLÄRUNG:
  • Status wird automatisch basierend auf Datum berechnet
  • Nur EIN Event kann gleichzeitig "active" sein
  • Alle Bestellungen werden automatisch dem aktiven Event zugeordnet

▸ COLLECTION: deposit_groups (Pfandgruppen)
─────────────────────────────────────────────────────────────────────────────
{
  "id": "uuid-string",
  "name": "Becher 0.5L",
  "amount": 2.00,
  "active": true
}

▸ COLLECTION: stock_units (Bestandseinheiten)
─────────────────────────────────────────────────────────────────────────────
{
  "id": "uuid-string",
  "name": "Bierkiste 24x0.5L",
  "type": "crate | keg | custom",
  "large_unit_name": "Kisten",
  "small_unit_name": "Flaschen",
  "container_size": 24,
  "serving_size": 1,
  "wastage_percentage": 5,        // Schankverlust
  "sales_units_per_large": 24
}

▸ COLLECTION: stations (Küchen-Stationen)
─────────────────────────────────────────────────────────────────────────────
{
  "id": "uuid-string",
  "name": "Grill-Station",
  "stand_id": "stand-uuid",
  "is_main": false,
  "article_ids": ["article-uuid-1", "article-uuid-2"]
}

ERKLÄRUNG:
  • Für große Küchen mit Arbeitsteilung
  • Hauptstation sieht alle Artikel
  • Nebenstationen sehen nur zugewiesene Artikel

▸ COLLECTION: settings (Globale Einstellungen)
─────────────────────────────────────────────────────────────────────────────
{
  "id": "global",
  "event_name": "Karnbachs Event OS",
  "timezone": "Europe/Berlin",
  "logo_url": "/uploads/logo.png | null",
  "primary_color": "#a855f7",
  "secondary_color": "#22c55e",
  "accent_color": "#eab308"
}

▸ COLLECTION: order_counters (Bonnummern-Zähler)
─────────────────────────────────────────────────────────────────────────────
{
  "stand_id": "stand-uuid",
  "counter": 15                   // Nächste Nummer: 16
}

ERKLÄRUNG:
  • Pro Stand ein separater Zähler
  • Zählt von 1-25, dann wieder von vorn
  • Atomic Updates verhindern Duplikate
`
  },

  // -------------------------------------------------------------------------
  // 4. API-REFERENZ
  // -------------------------------------------------------------------------
  api: {
    title: "🔌 API-Referenz",
    icon: Server,
    content: `
═══════════════════════════════════════════════════════════════════════════════
                              REST API ENDPOINTS
═══════════════════════════════════════════════════════════════════════════════

BASE URL: /api

▸ AUTHENTIFIZIERUNG
─────────────────────────────────────────────────────────────────────────────
Admin-Endpoints erfordern HTTP Basic Auth:
  Authorization: Basic base64(username:password)

Standard-Credentials (in .env konfigurierbar):
  Username: admin
  Password: admin
  Reset-PIN: 200183

▸ STÄNDE (CRUD)
─────────────────────────────────────────────────────────────────────────────
GET    /api/stands              → Liste aller Stände
GET    /api/stands/{id}         → Einzelner Stand
POST   /api/stands              → Stand erstellen
PUT    /api/stands/{id}         → Stand aktualisieren
DELETE /api/stands/{id}         → Stand löschen

POST   /api/stands/{id}/toggle-short-process
  → Kurzer Prozess umschalten (ohne Macher)

▸ ARTIKEL (CRUD)
─────────────────────────────────────────────────────────────────────────────
GET    /api/articles                    → Alle Artikel
GET    /api/stands/{id}/articles        → Artikel eines Stands
POST   /api/articles                    → Artikel erstellen
PUT    /api/articles/{id}               → Artikel aktualisieren
DELETE /api/articles/{id}               → Artikel löschen

PUT    /api/articles/{id}/stock
  Body: { large_units, small_units, mode: "set"|"add", set_as_initial }
  → Bestand anpassen

▸ BESTELLUNGEN
─────────────────────────────────────────────────────────────────────────────
GET    /api/stands/{id}/orders          → Bestellungen eines Stands
GET    /api/stands/{id}/orders?status=pending
  → Gefiltert nach Status

POST   /api/orders
  Body: {
    stand_id, stand_name, items: [{article_id, quantity}],
    subtotal, deposit_total, deposit_return_total, total,
    created_by, direct_complete, request_id
  }
  → Neue Bestellung erstellen

PUT    /api/orders/{id}/status
  Body: { status: "in_progress"|"ready"|"completed" }
  → Status ändern (löst WebSocket-Event aus)

DELETE /api/orders/{id}
  → Bestellung löschen

GET    /api/stands/{id}/archive?limit=50
  → Archivierte (abgeschlossene) Bestellungen

▸ EVENTS
─────────────────────────────────────────────────────────────────────────────
GET    /api/events                      → Alle Events
GET    /api/events/active               → Aktuell aktives Event
GET    /api/events/{id}                 → Einzelnes Event
GET    /api/events/{id}/stats           → Detaillierte Event-Statistiken
POST   /api/events                      → Event erstellen (Admin)
PUT    /api/events/{id}                 → Event bearbeiten (Admin)
DELETE /api/events/{id}                 → Event löschen (Admin)

▸ STATISTIKEN
─────────────────────────────────────────────────────────────────────────────
GET    /api/stats                       → Übersicht (Umsatz, Bestellungen)
GET    /api/stats/orders-by-hour        → Bestellungen pro Stunde
GET    /api/admin/stock-overview        → Bestandsübersicht (Admin)

▸ EINSTELLUNGEN
─────────────────────────────────────────────────────────────────────────────
GET    /api/settings                    → Globale Einstellungen
PUT    /api/settings                    → Einstellungen speichern (Admin)
POST   /api/settings/logo               → Logo hochladen (Admin)
DELETE /api/settings/logo               → Logo löschen (Admin)

▸ ADMIN-FUNKTIONEN
─────────────────────────────────────────────────────────────────────────────
POST   /api/admin/login
  Body: { username, password }
  → Login prüfen

POST   /api/admin/reset
  Body: { pin }
  → Alle Bestellungen zurücksetzen

POST   /api/admin/stock/reset
  Body: { pin, reset_type: "sales"|"all" }
  → Bestand zurücksetzen

▸ WEBSOCKET
─────────────────────────────────────────────────────────────────────────────
WS     /api/ws

Events (Server → Client):
  • new_order          → Neue Bestellung erstellt
  • order_status_changed → Status geändert
  • order_deleted      → Bestellung gelöscht
  • stock_update       → Bestand geändert

Format:
{
  "type": "new_order",
  "data": { /* Order-Objekt */ }
}

▸ HEALTH CHECK
─────────────────────────────────────────────────────────────────────────────
GET    /api/health
  → { status: "healthy", timestamp, database: "connected", ... }
`
  },

  // -------------------------------------------------------------------------
  // 5. FRONTEND-SEITEN
  // -------------------------------------------------------------------------
  pages: {
    title: "📱 Frontend-Seiten",
    icon: Monitor,
    content: `
═══════════════════════════════════════════════════════════════════════════════
                         FRONTEND-SEITEN ÜBERSICHT
═══════════════════════════════════════════════════════════════════════════════

▸ ÖFFENTLICHE SEITEN (Ohne Login)
─────────────────────────────────────────────────────────────────────────────

┌─────────────────────────────────────────────────────────────────────────────┐
│ 🏠 LANDING PAGE (/)                                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│ Datei: /src/pages/LandingPage.jsx                                           │
│                                                                             │
│ Funktion:                                                                   │
│ • Stand-Auswahl (zeigt alle konfigurierten Stände)                          │
│ • Rollen-Auswahl (Besteller, Macher, Ausgabe, OneManShow)                   │
│ • Kurzprozess-Toggle (für Stände ohne Küche)                                │
│ • Hilfe-Dialog mit Erklärungen                                              │
│                                                                             │
│ Design: Hintergrundbild mit Glassmorphism-Header                            │
│ Verbindungsstatus: Grüner Punkt + WiFi-Icon oben rechts                     │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ 🛒 BESTELLUNG (/bestellung/:standId/:standType)                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ Datei: /src/pages/BestellungPage.jsx                                        │
│                                                                             │
│ Funktion:                                                                   │
│ • Artikel-Grid nach Kategorien (Speisen/Getränke)                           │
│ • Warenkorb mit Mengenänderung                                              │
│ • Pfand-Rücknahme (falls konfiguriert)                                      │
│ • Bestellung aufgeben → Zeigt Bonnummer                                     │
│ • Restgeldrechner (Wechselgeld berechnen)                                   │
│ • Archiv der letzten Bestellungen                                           │
│                                                                             │
│ Features:                                                                   │
│ • Swipe-to-Delete im Warenkorb                                              │
│ • Bestandswarnung bei knappen Artikeln                                      │
│ • Offline-Unterstützung (Bestellungen werden gequeued)                      │
│ • Vollbildmodus                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ 🔨 MACHER/KÜCHE (/kueche/:standId/:standType/:stationId?)                   │
├─────────────────────────────────────────────────────────────────────────────┤
│ Datei: /src/pages/KuechePage.jsx                                            │
│                                                                             │
│ Funktion:                                                                   │
│ • Zeigt eingehende Bestellungen in Echtzeit                                 │
│ • "Gesamt Offen" - Kumulierte Liste aller offenen Artikel                   │
│ • Bestellung als "Fertig" markieren                                         │
│ • Sound-Benachrichtigung bei neuen Bestellungen                             │
│ • Zeitanzeige pro Bestellung                                                │
│                                                                             │
│ Stations-Modus:                                                             │
│ • Optional können Stationen definiert werden                                │
│ • Jede Station sieht nur ihre zugewiesenen Artikel                          │
│ • Hauptstation sieht alles                                                  │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ 📦 AUSGABE (/ausgabe/:standId/:standType)                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│ Datei: /src/pages/AusgabePage.jsx                                           │
│                                                                             │
│ Funktion:                                                                   │
│ • Zeigt fertige Bestellungen mit großer Bonnummer                           │
│ • Tippen = Bestellung übergeben (Status → completed)                        │
│ • "Zurückholen" Button für letzte übergebene Bestellung                     │
│ • Archiv der ausgegebenen Bestellungen                                      │
│                                                                             │
│ Design: Große, gut lesbare Karten für schnelles Erkennen                    │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ ⚡ ONEMANSHOW (/onemanshow/:standId/:standType)                              │
├─────────────────────────────────────────────────────────────────────────────┤
│ Datei: /src/pages/OneManShowPage.jsx                                        │
│                                                                             │
│ Funktion:                                                                   │
│ • Kombiniert Bestellung + Macher + Ausgabe                                  │
│ • Ideal für einfache Stände ohne Arbeitsteilung                             │
│ • Bestellung wird sofort als "completed" markiert                           │
│ • Gleiche Features wie Bestellung (Pfand, Restgeldrechner)                  │
│                                                                             │
│ Use Cases:                                                                  │
│ • Getränkestand mit sofortiger Ausgabe                                      │
│ • Kleine Snack-Stände                                                       │
│ • Verkaufsstände ohne Zubereitung                                           │
└─────────────────────────────────────────────────────────────────────────────┘

▸ ADMIN-BEREICH (Login erforderlich: admin/admin)
─────────────────────────────────────────────────────────────────────────────

┌─────────────────────────────────────────────────────────────────────────────┐
│ 🔐 ADMIN LOGIN (/admin/login)                                               │
├─────────────────────────────────────────────────────────────────────────────┤
│ Datei: /src/pages/AdminLoginPage.jsx                                        │
│ Credentials: admin / admin (konfigurierbar in .env)                         │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ 📊 DASHBOARD (/admin)                                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│ Datei: /src/pages/AdminDashboard.jsx                                        │
│                                                                             │
│ Zeigt:                                                                      │
│ • Anzahl Bestellungen, Umsatz, Abschlussrate                                │
│ • Top-Artikel (meistverkauft)                                               │
│ • Bestellungen pro Stand                                                    │
│ • Export-Button (JSON)                                                      │
│ • Reset-Button (löscht alle Bestellungen)                                   │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ 📅 EVENTS (/admin/events)                                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│ Datei: /src/pages/EventManagement.jsx                                       │
│                                                                             │
│ Funktion:                                                                   │
│ • Events erstellen/bearbeiten/löschen                                       │
│ • Status-Anzeige (Geplant/Aktiv/Abgeschlossen)                              │
│ • Klick auf Event → Event-Statistiken                                       │
│                                                                             │
│ Event-Statistiken (/admin/events/:id/stats):                                │
│ • Zusammenfassung (Umsatz, Bestellungen)                                    │
│ • Top-Artikel                                                               │
│ • Bestellungen pro Stunde/Tag/Stand                                         │
│ • CSV-Export                                                                │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ 🏪 STÄNDE (/admin/stands)                                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│ Datei: /src/pages/StandManagement.jsx                                       │
│                                                                             │
│ Funktion:                                                                   │
│ • Stände erstellen/bearbeiten/löschen                                       │
│ • Typ wählen (Speisestand/Getränkestand/Gemischt)                           │
│ • Kurzprozess aktivieren (überspringt Macher)                               │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ 📦 ARTIKEL (/admin/articles)                                                │
├─────────────────────────────────────────────────────────────────────────────┤
│ Datei: /src/pages/ArticleManagement.jsx                                     │
│                                                                             │
│ Tabs:                                                                       │
│ • Artikel: Erstellen, Preise, Kategorien, Stand-Zuordnung                   │
│ • Bestandseinheiten: Kisten, Fässer, etc. definieren                        │
│ • Pfandgruppen: Pfandbeträge verwalten                                      │
│                                                                             │
│ Bestandsverwaltung pro Artikel:                                             │
│ • Anfangsbestand setzen                                                     │
│ • Warnschwelle definieren                                                   │
│ • Automatische Reduktion bei Verkauf                                        │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ 📊 BESTAND (/admin/stock)                                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│ Datei: /src/pages/StockOverview.jsx                                         │
│                                                                             │
│ Zeigt für alle Artikel mit Bestandsverwaltung:                              │
│ • Anfangsbestand vs. Restbestand                                            │
│ • Verkaufte Menge                                                           │
│ • Status (OK/Knapp/Ausverkauft)                                             │
│ • Bestand aufstocken (+Button)                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ 🔧 STATIONEN (/admin/stations)                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│ Datei: /src/pages/StationManagement.jsx                                     │
│                                                                             │
│ Für große Küchen:                                                           │
│ • Stationen pro Stand erstellen                                             │
│ • Artikel zuweisen                                                          │
│ • Hauptstation festlegen (sieht alles)                                      │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ 📈 STATISTIK (/admin/stats)                                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│ Datei: /src/pages/StatsPage.jsx                                             │
│                                                                             │
│ Filter: Event, Stand                                                        │
│ Zeigt: Umsatz, Bestellungen, Charts, Top-Artikel                            │
│ Export: CSV                                                                 │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ 📋 BESTELLUNGEN (/admin/orders)                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ Datei: /src/pages/OrdersManagement.jsx                                      │
│                                                                             │
│ Übersicht aller Bestellungen mit:                                           │
│ • Filter nach Status, Stand, Event                                          │
│ • Status ändern                                                             │
│ • Bestellung löschen                                                        │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ ⚙️ EINSTELLUNGEN (/admin/settings)                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│ Datei: /src/pages/SettingsPage.jsx                                          │
│                                                                             │
│ • Event-Name (wird auf Startseite angezeigt)                                │
│ • Logo hochladen                                                            │
│ • Farbschema wählen (6 Themes + Custom)                                     │
│ • Zeitzone                                                                  │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ 📚 DOKUMENTATION (/admin/docs)                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│ Datei: /src/pages/DocumentationPage.jsx                                     │
│                                                                             │
│ Diese Seite! Vollständige App-Dokumentation mit:                            │
│ • Export als TXT, HTML, PDF                                                 │
└─────────────────────────────────────────────────────────────────────────────┘
`
  },

  // -------------------------------------------------------------------------
  // 6. KOMPONENTEN & SERVICES
  // -------------------------------------------------------------------------
  components: {
    title: "🧩 Komponenten & Services",
    icon: Code,
    content: `
═══════════════════════════════════════════════════════════════════════════════
                        WIEDERVERWENDBARE KOMPONENTEN
═══════════════════════════════════════════════════════════════════════════════

▸ LAYOUT-KOMPONENTEN
─────────────────────────────────────────────────────────────────────────────

AdminNavBar.jsx
  Einheitlicher Header für alle Admin-Seiten
  • Navigation in 2 Reihen (10 Buttons)
  • Verbindungsstatus (Grün/Gelb)
  • Hilfe + Logout rechts

AppFooter.jsx
  Footer mit Branding
  • Zeigt Event-Namen
  • Fixed am unteren Rand

LiveClock.jsx
  Echtzeit-Uhr
  • Zeigt aktuelle Uhrzeit
  • Aktualisiert jede Sekunde
  • Zeitzone aus Einstellungen

▸ FUNKTIONALE KOMPONENTEN
─────────────────────────────────────────────────────────────────────────────

ConnectionStatus.jsx
  Verbindungsstatus-Anzeige
  • ConnectionStatus - Vollständig mit Tooltip
  • ConnectionStatusDot - Kompakt (nur Punkt + Icon)
  • OfflineBanner - Banner wenn offline

  Logik:
  • Basiert auf navigator.onLine (Browser-Status)
  • Zeigt grün wenn online, gelb wenn offline
  • Zeigt Anzahl wartender Bestellungen

ThemeProvider.jsx
  Farbschema-Management
  • Lädt Einstellungen vom Backend
  • Setzt CSS-Variablen dynamisch
  • Ermöglicht Live-Theme-Wechsel

AdminSwipe.jsx (Hook: useAdminSwipe)
  Swipe-Navigation im Admin-Bereich
  • Links/Rechts wischen zwischen Seiten
  • Touch-Support für Tablets

ErrorBoundary.jsx
  Fehlerbehandlung
  • Fängt React-Fehler ab
  • Zeigt benutzerfreundliche Fehlermeldung
  • Verhindert kompletten App-Absturz

▸ UI-KOMPONENTEN (Shadcn/UI)
─────────────────────────────────────────────────────────────────────────────

Alle unter /src/components/ui/:
  Button, Card, Dialog, Badge, Input, ScrollArea,
  Tabs, Select, Switch, Slider, Table, Tooltip,
  Alert, Avatar, Dropdown, Popover, etc.

Diese sind vorkonfiguriert und folgen dem Design-System.

═══════════════════════════════════════════════════════════════════════════════
                              FRONTEND-SERVICES
═══════════════════════════════════════════════════════════════════════════════

▸ OrderService.js
─────────────────────────────────────────────────────────────────────────────
Zweck: Zuverlässige Bestellübermittlung

Features:
  • Automatische Retry-Logik bei Fehlern
  • Request-Deduplication (verhindert Duplikate)
  • Offline-Queue (speichert Bestellungen lokal)
  • Sendet automatisch wenn wieder online

Verwendung:
  import { submitOrder } from '@/services/OrderService';
  const result = await submitOrder(orderData);

▸ WebSocketService.js
─────────────────────────────────────────────────────────────────────────────
Zweck: Echtzeit-Kommunikation

Features:
  • Singleton-Pattern (eine Verbindung pro Stand)
  • Automatische Reconnection bei Verbindungsverlust
  • Event-basierte Architektur

Events:
  • connected - Verbindung hergestellt
  • disconnected - Verbindung verloren
  • new_order - Neue Bestellung
  • order_status_changed - Status geändert
  • stock_update - Bestand geändert

Verwendung:
  import wsService from '@/services/WebSocketService';
  wsService.connect(standId);
  wsService.on(standId, 'new_order', (data) => { ... });

▸ useConnectionStatus.js (Hook)
─────────────────────────────────────────────────────────────────────────────
Zweck: Verbindungsstatus überwachen

Rückgabewerte:
  • isOnline - Browser online?
  • status - 'connected' | 'offline'
  • statusText - 'Verbunden' | 'Offline'
  • statusColor - CSS-Klasse
  • pendingOrders - Anzahl wartender Bestellungen

Verwendung:
  const { status, statusColor } = useConnectionStatus(standId);
`
  },

  // -------------------------------------------------------------------------
  // 7. DESIGN-SYSTEM
  // -------------------------------------------------------------------------
  design: {
    title: "🎨 Design-System",
    icon: Palette,
    content: `
═══════════════════════════════════════════════════════════════════════════════
                              DESIGN-SYSTEM
═══════════════════════════════════════════════════════════════════════════════

▸ DESIGN-PHILOSOPHIE
─────────────────────────────────────────────────────────────────────────────
• Dark Mode als Standard (bessere Lesbarkeit bei Events, auch nachts)
• Neon-Akzente für wichtige Elemente (auffällig, modern)
• Große Touch-Targets für mobile Bedienung (min. 44px)
• Klare visuelle Hierarchie
• Konsistente Abstände (4px-Grid)

▸ FARBPALETTE
─────────────────────────────────────────────────────────────────────────────

Standard-Theme (Neon Lila):
┌──────────────┬──────────────┬────────────────────────────────────────────┐
│ Farbe        │ Hex          │ Verwendung                                 │
├──────────────┼──────────────┼────────────────────────────────────────────┤
│ Primary      │ #a855f7      │ Hauptaktionen, Buttons, Akzente            │
│ Secondary    │ #22c55e      │ Bestätigungen, Erfolg, Fertig-Status       │
│ Accent       │ #eab308      │ Highlights, Warnungen, Ausgabe-Rolle       │
│ Destructive  │ #ef4444      │ Fehler, Löschen, Ausverkauft               │
│ Background   │ #09090b      │ Seiten-Hintergrund                         │
│ Card         │ #18181b      │ Karten-Hintergrund                         │
│ Muted        │ #71717a      │ Gedämpfte Texte, Borders                   │
└──────────────┴──────────────┴────────────────────────────────────────────┘

Weitere Themes:
  • Ocean Blau: #3b82f6 / #06b6d4 / #f59e0b
  • Sunset Orange: #f97316 / #ec4899 / #fbbf24
  • Forest Grün: #22c55e / #84cc16 / #14b8a6
  • Royal Rot: #ef4444 / #f97316 / #fbbf24
  • Elegant Gold: #eab308 / #a855f7 / #f59e0b

▸ TYPOGRAFIE
─────────────────────────────────────────────────────────────────────────────

Schriftfamilien:
  • Display: "Unbounded" - Überschriften, Logo, Bonnummern
  • Body: "Manrope" - Fließtext, Labels
  • Mono: "JetBrains Mono" - Zahlen, Preise, Bonnummern

Größenhierarchie:
  • H1: text-4xl bis text-6xl (responsive)
  • H2: text-lg bis text-xl
  • Body: text-base (mobile: text-sm)
  • Small: text-sm oder text-xs

▸ NEON-EFFEKTE
─────────────────────────────────────────────────────────────────────────────

CSS-Klassen:
  .neon-primary   → box-shadow: 0 0 20px rgba(168, 85, 247, 0.5)
  .neon-secondary → box-shadow: 0 0 20px rgba(34, 197, 94, 0.5)
  .neon-accent    → box-shadow: 0 0 20px rgba(234, 179, 8, 0.5)
  .neon-success   → box-shadow: 0 0 20px rgba(34, 197, 94, 0.5)

Anwendung: Aktive Buttons, ausgewählte Karten, Hervorhebungen

▸ GLASSMORPHISM
─────────────────────────────────────────────────────────────────────────────

Header-Effekt:
  .glass {
    background: rgba(24, 24, 27, 0.8);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

▸ RESPONSIVE BREAKPOINTS
─────────────────────────────────────────────────────────────────────────────

Tailwind Breakpoints:
  • sm: 640px  - Kleine Tablets
  • md: 768px  - Tablets
  • lg: 1024px - Laptops
  • xl: 1280px - Desktops

Mobile-First Ansatz: Basis-Styles für Mobile, Erweiterungen für größer

▸ KOMPONENTEN-DESIGN
─────────────────────────────────────────────────────────────────────────────

Buttons:
  • Primär: Gefüllt mit Primary-Farbe, Neon-Glow bei Hover
  • Sekundär: Outline-Stil
  • Ghost: Transparent, nur Hover-Hintergrund
  • Größen: sm (h-8), default (h-10), lg (h-12), icon (h-10 w-10)

Karten:
  • bg-card (dunkelgrau)
  • Subtiler Border
  • Hover-Effekt bei interaktiven Karten
  • Neon-Glow bei ausgewählten Karten

Badges:
  • Farbcodiert nach Status
  • variant="outline" für Status
  • variant="default" für Kategorien

Inputs:
  • Dunkler Hintergrund
  • Focus-Ring in Primary-Farbe
  • Platzhalter in muted-foreground
`
  },

  // -------------------------------------------------------------------------
  // 8. N8N INTEGRATION
  // -------------------------------------------------------------------------
  n8n: {
    title: "🔗 n8n Integration",
    icon: Network,
    content: `
═══════════════════════════════════════════════════════════════════════════════
                         N8N WORKFLOW-INTEGRATION
═══════════════════════════════════════════════════════════════════════════════

n8n ist eine Workflow-Automatisierungsplattform. Hier sind Möglichkeiten,
Karnbachs Event OS mit n8n zu verbinden:

▸ WEBHOOK-INTEGRATION
─────────────────────────────────────────────────────────────────────────────

Die App sendet bereits WebSocket-Events bei wichtigen Aktionen.
Für n8n können Webhooks implementiert werden:

EMPFOHLENE WEBHOOKS:

1. Neue Bestellung
   POST /api/webhooks/new-order
   Payload: { order_id, stand_name, items, total, timestamp }
   
   n8n Use Cases:
   • Slack-Benachrichtigung an Event-Manager
   • Eintrag in Google Sheets zur Dokumentation
   • SMS an Kunden wenn Bestellung fertig

2. Bestellung fertig
   POST /api/webhooks/order-ready
   Payload: { order_id, order_number, stand_name }
   
   n8n Use Cases:
   • Push-Notification an Kunden-App
   • Display-Anzeige aktualisieren
   • Sprachausgabe triggern

3. Bestand niedrig
   POST /api/webhooks/stock-low
   Payload: { article_name, current_stock, threshold }
   
   n8n Use Cases:
   • E-Mail an Lagerverwalter
   • Automatische Nachbestellung
   • Dashboard-Warnung

4. Tages-Abschluss
   POST /api/webhooks/daily-summary
   Payload: { date, total_orders, total_revenue, top_items }
   
   n8n Use Cases:
   • Automatischer Report per E-Mail
   • Daten an Buchhaltungssystem
   • Archivierung in Cloud

▸ IMPLEMENTIERUNG (Backend-Erweiterung)
─────────────────────────────────────────────────────────────────────────────

In server.py hinzufügen:

# Webhook-Konfiguration aus Umgebungsvariablen
WEBHOOK_URLS = {
    "new_order": os.environ.get("WEBHOOK_NEW_ORDER"),
    "order_ready": os.environ.get("WEBHOOK_ORDER_READY"),
    "stock_low": os.environ.get("WEBHOOK_STOCK_LOW"),
}

async def send_webhook(event_type: str, data: dict):
    url = WEBHOOK_URLS.get(event_type)
    if url:
        async with aiohttp.ClientSession() as session:
            await session.post(url, json={
                "event": event_type,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "data": data
            })

# Bei neuer Bestellung aufrufen:
await send_webhook("new_order", {
    "order_id": order["id"],
    "stand_name": order["stand_name"],
    "items": order["items"],
    "total": order["total"]
})

▸ N8N WORKFLOW-BEISPIELE
─────────────────────────────────────────────────────────────────────────────

BEISPIEL 1: Slack-Benachrichtigung bei neuer Bestellung

┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Webhook   │ ──▶ │  Transform  │ ──▶ │    Slack    │
│   Trigger   │     │    Data     │     │   Message   │
└─────────────┘     └─────────────┘     └─────────────┘

Webhook Trigger:
  Path: /webhook/new-order
  Method: POST

Transform:
  Message: "🎉 Neue Bestellung #{{order_number}} 
            Stand: {{stand_name}}
            Summe: {{total}}€"

BEISPIEL 2: Google Sheets Logging

┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Webhook   │ ──▶ │   Format    │ ──▶ │   Google    │
│   Trigger   │     │    Date     │     │   Sheets    │
└─────────────┘     └─────────────┘     └─────────────┘

Fügt jede Bestellung als neue Zeile ein:
  Datum | Uhrzeit | Stand | Bonnummer | Artikel | Summe

BEISPIEL 3: Bestandswarnung per E-Mail

┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Webhook   │ ──▶ │    Filter   │ ──▶ │    Email    │
│   Trigger   │     │  < 10 Stk   │     │    Send     │
└─────────────┘     └─────────────┘     └─────────────┘

Filter: stock < threshold
E-Mail: "⚠️ Artikel {{name}} hat nur noch {{stock}} Einheiten!"

▸ REST-API FÜR N8N
─────────────────────────────────────────────────────────────────────────────

n8n kann auch direkt die REST-API nutzen:

HTTP Request Node:
  Method: GET
  URL: https://your-domain.com/api/stats
  Authentication: Basic Auth (admin/admin)

Mögliche Abfragen:
  • GET /api/orders - Alle Bestellungen
  • GET /api/stats - Statistiken
  • GET /api/events/{id}/stats - Event-Statistiken
  • POST /api/orders - Bestellung erstellen (für Automationen)

▸ SCHEDULE-BASIERTE WORKFLOWS
─────────────────────────────────────────────────────────────────────────────

Mit n8n Schedule Trigger:

Täglich um 23:00: Tagesabschluss-Report
  1. GET /api/stats (mit Datumsfilter)
  2. Format als PDF
  3. Per E-Mail versenden

Stündlich: Bestandscheck
  1. GET /api/admin/stock-overview
  2. Filter: stock < threshold
  3. Slack-Warnung wenn nötig
`
  },

  // -------------------------------------------------------------------------
  // 9. WEITERENTWICKLUNG
  // -------------------------------------------------------------------------
  future: {
    title: "🚀 Weiterentwicklung",
    icon: GitBranch,
    content: `
═══════════════════════════════════════════════════════════════════════════════
                      WEITERENTWICKLUNGSMÖGLICHKEITEN
═══════════════════════════════════════════════════════════════════════════════

▸ KURZFRISTIG (Nächste Features)
─────────────────────────────────────────────────────────────────────────────

🗣️ SPRACHAUSGABE (Text-to-Speech)
   Ansage wenn Bestellung fertig: "Bon 12 ist fertig!"
   
   Implementierung:
   • Web Speech API (window.speechSynthesis)
   • Konfigurierbare Stimme/Lautstärke
   • Toggle in Einstellungen

📊 LIVE-DASHBOARD
   Echtzeit-Statistiken auf großem Monitor
   
   Features:
   • Auto-Refresh alle 30 Sekunden
   • Bestellungen pro Stunde (Chart)
   • Aktuelle offene Bestellungen
   • Top-Artikel des Tages
   • Umsatz-Ticker

▸ MITTELFRISTIG
─────────────────────────────────────────────────────────────────────────────

📶 OFFLINE-MODUS
   App funktioniert ohne Internet
   
   Technologie:
   • Service Worker für Caching
   • IndexedDB für lokale Datenspeicherung
   • Background Sync für spätere Übertragung
   • Konfliktauflösung bei Reconnect

🖨️ BON-DRUCK
   Automatischer Druck auf Thermodrucker
   
   Optionen:
   • Web Bluetooth API (direkte Verbindung)
   • Print-Server (Raspberry Pi + CUPS)
   • Cloud-Print-Service
   
   Bon-Format:
   ┌─────────────────────────┐
   │    KARNBACHS EVENT      │
   │        Bon #12          │
   │─────────────────────────│
   │ 2x Schnitzel    16.00€  │
   │ 1x Pommes        3.50€  │
   │─────────────────────────│
   │ Gesamt:         19.50€  │
   │ + Pfand:         2.00€  │
   │─────────────────────────│
   │ ZU ZAHLEN:      21.50€  │
   └─────────────────────────┘

📱 KUNDEN-APP / SELF-ORDER
   Gäste bestellen selbst per QR-Code
   
   Flow:
   1. QR-Code am Stand scannen
   2. Artikel auswählen
   3. Bezahlen (Stripe/PayPal)
   4. Bonnummer erhalten
   5. Benachrichtigung wenn fertig

▸ LANGFRISTIG
─────────────────────────────────────────────────────────────────────────────

💳 PAYMENT-INTEGRATION
   Bargeldlose Zahlung
   
   Optionen:
   • Stripe Terminal (Kartenleser)
   • PayPal QR-Code
   • Wero (Deutschland)
   • Prepaid-Guthaben-System

📈 ERWEITERTE ANALYTICS
   Machine Learning für Vorhersagen
   
   Features:
   • Verkaufsprognose pro Stunde
   • Optimale Personalplanung
   • Preisoptimierung
   • Bestandsprognose

🌐 MULTI-TENANT
   Mehrere Veranstalter auf einer Instanz
   
   Features:
   • Mandantentrennung
   • Eigene Domains/Branding
   • Abrechnung pro Veranstaltung

📊 BI-INTEGRATION
   Export zu Business Intelligence Tools
   
   Formate:
   • CSV/Excel für manuelle Analyse
   • API für Power BI / Tableau
   • Webhook zu Data Warehouse

▸ TECHNISCHE VERBESSERUNGEN
─────────────────────────────────────────────────────────────────────────────

PERFORMANCE
  • Redis-Cache für häufige Queries
  • CDN für statische Assets
  • WebSocket-Clustering für > 100 Geräte
  • Datenbanksharding bei großen Datenmengen

SICHERHEIT
  • JWT statt Basic Auth
  • Rate Limiting
  • HTTPS erzwingen
  • Input-Sanitization
  • OWASP Best Practices

TESTING
  • Unit Tests (Jest/Pytest)
  • E2E Tests (Playwright)
  • Load Testing (k6)
  • CI/CD Pipeline

MONITORING
  • Sentry für Error Tracking
  • Prometheus/Grafana für Metriken
  • Health Checks für Kubernetes
  • Log-Aggregation (ELK Stack)

▸ MÖGLICHE ERWEITERUNGEN
─────────────────────────────────────────────────────────────────────────────

KASSENBUCH
  • Automatische Buchungen
  • TSE-Anbindung (Deutschland)
  • DATEV-Export

PERSONALVERWALTUNG
  • Schichtplanung
  • Zeiterfassung
  • Provisionsabrechnung

LIEFERANTEN-PORTAL
  • Automatische Nachbestellung
  • Bestellhistorie
  • Preisvergleich

KUNDEN-LOYALTY
  • Stempelkarten digital
  • Punktesystem
  • Rabattaktionen
`
  },

  // -------------------------------------------------------------------------
  // 10. INSTALLATION & DEPLOYMENT
  // -------------------------------------------------------------------------
  deployment: {
    title: "⚙️ Installation & Deployment",
    icon: Settings,
    content: `
═══════════════════════════════════════════════════════════════════════════════
                        INSTALLATION & DEPLOYMENT
═══════════════════════════════════════════════════════════════════════════════

▸ LOKALE ENTWICKLUNG
─────────────────────────────────────────────────────────────────────────────

Voraussetzungen:
  • Node.js 18+
  • Python 3.10+
  • MongoDB 6+

Backend starten:
  cd /app/backend
  pip install -r requirements.txt
  uvicorn server:app --host 0.0.0.0 --port 8001 --reload

Frontend starten:
  cd /app/frontend
  yarn install
  yarn start

▸ UMGEBUNGSVARIABLEN
─────────────────────────────────────────────────────────────────────────────

Backend (.env):
  MONGO_URL=mongodb://localhost:27017
  DB_NAME=event_os
  ADMIN_USERNAME=admin
  ADMIN_PASSWORD=admin
  RESET_PIN=200183

Frontend (.env):
  REACT_APP_BACKEND_URL=http://localhost:8001

▸ DOCKER DEPLOYMENT
─────────────────────────────────────────────────────────────────────────────

docker-compose.yml:

version: '3.8'
services:
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - REACT_APP_BACKEND_URL=http://api:8001
    depends_on:
      - api

  api:
    build: ./backend
    ports:
      - "8001:8001"
    environment:
      - MONGO_URL=mongodb://mongo:27017
      - DB_NAME=event_os
    depends_on:
      - mongo

  mongo:
    image: mongo:6
    volumes:
      - mongo_data:/data/db

volumes:
  mongo_data:

▸ KUBERNETES DEPLOYMENT
─────────────────────────────────────────────────────────────────────────────

Die App läuft bereits in einem Kubernetes-Cluster mit:
  • Ingress für Routing (/api → Backend, / → Frontend)
  • Service für interne Kommunikation
  • ConfigMap für Umgebungsvariablen
  • PersistentVolume für MongoDB

▸ PRODUCTION CHECKLIST
─────────────────────────────────────────────────────────────────────────────

□ HTTPS aktivieren (SSL-Zertifikat)
□ Admin-Passwort ändern
□ Reset-PIN ändern
□ MongoDB-Authentifizierung aktivieren
□ Firewall konfigurieren
□ Backup-Strategie implementieren
□ Monitoring einrichten
□ Log-Rotation konfigurieren

▸ BACKUP & RESTORE
─────────────────────────────────────────────────────────────────────────────

Backup erstellen:
  mongodump --uri="mongodb://localhost:27017" --db=event_os --out=/backup

Backup wiederherstellen:
  mongorestore --uri="mongodb://localhost:27017" /backup/event_os

Automatisches Backup (Cron):
  0 3 * * * /usr/bin/mongodump --uri="..." --out=/backup/$(date +%Y%m%d)
`
  }
};

// ============================================================================
// KOMPONENTE
// ============================================================================

export default function DocumentationPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("idea");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);

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

  // Generiere vollständigen Dokumentationstext
  const generateFullText = () => {
    const date = new Date().toLocaleDateString('de-DE', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    
    let doc = `
${"═".repeat(80)}
                    KARNBACHS EVENT OS
                 VOLLSTÄNDIGE DOKUMENTATION
${"═".repeat(80)}

Erstellt am: ${date}
Version: 1.0.0
Event: ${settings?.event_name || 'Karnbachs Event OS'}

${"═".repeat(80)}
                         INHALTSVERZEICHNIS
${"═".repeat(80)}

1. App-Idee & Vision
2. Architektur & Technologie
3. Datenbank-Schema
4. API-Referenz
5. Frontend-Seiten
6. Komponenten & Services
7. Design-System
8. n8n Integration
9. Weiterentwicklung
10. Installation & Deployment

`;

    // Alle Sektionen hinzufügen
    Object.values(FULL_DOCUMENTATION).forEach((section, index) => {
      doc += `\n${"═".repeat(80)}\n`;
      doc += `KAPITEL ${index + 1}: ${section.title.replace(/[🎪🏗️🗄️🔌📱🧩🎨🔗🚀⚙️]/g, '').trim().toUpperCase()}\n`;
      doc += `${"═".repeat(80)}\n`;
      doc += section.content;
      doc += `\n`;
    });

    doc += `
${"═".repeat(80)}
                              ENDE DER DOKUMENTATION
${"═".repeat(80)}

© ${new Date().getFullYear()} ${settings?.event_name || 'Karnbachs Event OS'}
Diese Dokumentation wurde automatisch generiert.
`;

    return doc;
  };

  // Export Funktion
  const handleExport = async (format) => {
    const timestamp = new Date().toISOString().split('T')[0];
    const fileName = `karnbachs-event-os-dokumentation_${timestamp}`;
    const fullText = generateFullText();
    
    if (format === 'txt') {
      const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Dokumentation als TXT heruntergeladen');
      setShowExportDialog(false);
      
    } else if (format === 'html') {
      const htmlContent = generateHtmlDocument(fullText, timestamp, false);
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName}.html`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Dokumentation als HTML heruntergeladen');
      setShowExportDialog(false);
      
    } else if (format === 'pdf') {
      setIsGeneratingPdf(true);
      setShowExportDialog(false);
      toast.info('PDF wird generiert mit Screenshots... Bitte warten.');
      
      try {
        // Screenshot-Definitionen
        const screenshots = [
          { file: '01_landing.png', title: 'Landing Page', desc: 'Startseite mit Stand-Auswahl und Rollen-Buttons' },
          { file: '02_admin_login.png', title: 'Admin Login', desc: 'Sicherer Zugang zum Verwaltungsbereich' },
          { file: '03_admin_dashboard.png', title: 'Admin Dashboard', desc: 'Übersicht mit Statistiken und Top-Artikeln' },
          { file: '04_events.png', title: 'Event-Verwaltung', desc: 'Events erstellen, bearbeiten und Statistiken abrufen' },
          { file: '05_stands.png', title: 'Stand-Verwaltung', desc: 'Verkaufsstände konfigurieren' },
          { file: '06_articles.png', title: 'Artikel-Verwaltung', desc: 'Artikel, Preise, Pfand und Bestand verwalten' },
          { file: '07_stats.png', title: 'Statistiken', desc: 'Detaillierte Auswertungen und Diagramme' },
          { file: '08_orders.png', title: 'Bestellungen', desc: 'Alle Bestellungen einsehen und verwalten' },
          { file: '09_settings.png', title: 'Einstellungen', desc: 'Logo, Farben und globale Konfiguration' },
          { file: '10_stock.png', title: 'Bestandsübersicht', desc: 'Lagerbestand aller Artikel auf einen Blick' },
        ];
        
        // Lade alle Screenshots als Base64
        const loadImage = (src) => {
          return new Promise((resolve, reject) => {
            const img = new window.Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
              const canvas = document.createElement('canvas');
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0);
              resolve(canvas.toDataURL('image/jpeg', 0.85));
            };
            img.onerror = () => resolve(null);
            img.src = src;
          });
        };
        
        // Erstelle PDF mit jsPDF
        const doc = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        });
        
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 15;
        const maxWidth = pageWidth - (margin * 2);
        let y = margin;
        
        // Helper: Neue Seite wenn nötig
        const checkNewPage = (neededHeight = 10) => {
          if (y + neededHeight > pageHeight - margin) {
            doc.addPage();
            y = margin;
            return true;
          }
          return false;
        };
        
        // Helper: Text mit Zeilenumbruch
        const addWrappedText = (text, fontSize = 10, color = [30, 30, 30], isBold = false) => {
          doc.setFontSize(fontSize);
          doc.setTextColor(...color);
          if (isBold) {
            doc.setFont('helvetica', 'bold');
          } else {
            doc.setFont('helvetica', 'normal');
          }
          
          const lines = doc.splitTextToSize(text, maxWidth);
          lines.forEach(line => {
            checkNewPage(fontSize * 0.4);
            doc.text(line, margin, y);
            y += fontSize * 0.4;
          });
          y += 2;
        };
        
        // Titelseite
        doc.setFillColor(124, 58, 237); // Primary purple
        doc.rect(0, 0, pageWidth, 60, 'F');
        
        doc.setFontSize(28);
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.text('Karnbachs Event OS', pageWidth / 2, 25, { align: 'center' });
        
        doc.setFontSize(16);
        doc.setFont('helvetica', 'normal');
        doc.text('Vollständige Dokumentation', pageWidth / 2, 38, { align: 'center' });
        
        doc.setFontSize(12);
        doc.text('Stand: ' + timestamp, pageWidth / 2, 50, { align: 'center' });
        
        y = 75;
        
        // Inhaltsverzeichnis
        doc.setFontSize(18);
        doc.setTextColor(124, 58, 237);
        doc.setFont('helvetica', 'bold');
        doc.text('Inhaltsverzeichnis', margin, y);
        y += 12;
        
        const chapters = [
          '1. App-Idee & Vision',
          '2. Architektur & Technologie',
          '3. Datenbank-Schema',
          '4. API-Referenz',
          '5. Frontend-Seiten',
          '6. Komponenten & Services',
          '7. Design-System',
          '8. n8n Integration',
          '9. Weiterentwicklung',
          '10. Installation & Deployment'
        ];
        
        doc.setFontSize(11);
        doc.setTextColor(50, 50, 50);
        doc.setFont('helvetica', 'normal');
        chapters.forEach(chapter => {
          doc.text(chapter, margin + 5, y);
          y += 7;
        });
        
        // Workflow-Diagramm als Text-Box
        y += 10;
        doc.setFillColor(245, 245, 250);
        doc.rect(margin, y, maxWidth, 35, 'F');
        doc.setDrawColor(124, 58, 237);
        doc.rect(margin, y, maxWidth, 35, 'S');
        
        y += 8;
        doc.setFontSize(12);
        doc.setTextColor(124, 58, 237);
        doc.setFont('helvetica', 'bold');
        doc.text('Workflow: Besteller -> Macher -> Ausgabe -> Fertig', pageWidth / 2, y, { align: 'center' });
        y += 8;
        doc.setFontSize(10);
        doc.setTextColor(80, 80, 80);
        doc.setFont('helvetica', 'normal');
        doc.text('Echtzeit-Synchronisation ueber WebSockets (< 30ms Latenz)', pageWidth / 2, y, { align: 'center' });
        
        y += 30;
        
        // =====================================================
        // SCREENSHOT-GALERIE
        // =====================================================
        doc.addPage();
        y = margin;
        
        // Screenshots-Überschrift
        doc.setFillColor(124, 58, 237);
        doc.rect(0, 0, pageWidth, 20, 'F');
        doc.setFontSize(16);
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.text('Screenshots aller Seiten', pageWidth / 2, 13, { align: 'center' });
        y = 30;
        
        // Lade und füge Screenshots ein
        for (let i = 0; i < screenshots.length; i++) {
          const ss = screenshots[i];
          
          try {
            const imgData = await loadImage(`/screenshots/${ss.file}`);
            
            if (imgData) {
              // Prüfe ob neue Seite nötig (für Bild + Beschriftung)
              if (y + 85 > pageHeight - margin) {
                doc.addPage();
                y = margin;
              }
              
              // Titel über dem Bild
              doc.setFontSize(12);
              doc.setTextColor(124, 58, 237);
              doc.setFont('helvetica', 'bold');
              doc.text(`${i + 1}. ${ss.title}`, margin, y);
              y += 5;
              
              // Beschreibung
              doc.setFontSize(9);
              doc.setTextColor(100, 100, 100);
              doc.setFont('helvetica', 'normal');
              doc.text(ss.desc, margin, y);
              y += 6;
              
              // Bild einfügen (skaliert auf Seitenbreite)
              const imgWidth = maxWidth;
              const imgHeight = 60; // Feste Höhe für konsistentes Layout
              
              // Rahmen um Bild
              doc.setDrawColor(200, 200, 200);
              doc.setLineWidth(0.3);
              doc.rect(margin, y, imgWidth, imgHeight, 'S');
              
              doc.addImage(imgData, 'JPEG', margin, y, imgWidth, imgHeight);
              y += imgHeight + 10;
            }
          } catch (imgError) {
            console.log(`Screenshot ${ss.file} nicht verfügbar`);
          }
        }
        
        // Neue Seite für Textdokumentation
        doc.addPage();
        y = margin;
        
        // Dokumentations-Überschrift
        doc.setFillColor(22, 163, 94);
        doc.rect(0, 0, pageWidth, 20, 'F');
        doc.setFontSize(16);
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.text('Technische Dokumentation', pageWidth / 2, 13, { align: 'center' });
        y = 30;
        
        // Dokumentationsinhalt
        const lines = fullText.split('\n');
        
        for (const line of lines) {
          // Skip leere Linien am Anfang einer Seite
          if (y === margin && line.trim() === '') continue;
          
          // Trennlinien
          if (line.match(/^[═]+$/)) {
            checkNewPage(15);
            doc.setDrawColor(124, 58, 237);
            doc.setLineWidth(0.5);
            doc.line(margin, y, pageWidth - margin, y);
            y += 8;
            continue;
          }
          
          if (line.match(/^[─]+$/)) {
            checkNewPage(8);
            doc.setDrawColor(180, 180, 180);
            doc.setLineWidth(0.2);
            doc.line(margin, y, pageWidth - margin, y);
            y += 5;
            continue;
          }
          
          // Hauptüberschriften (KAPITEL)
          if (line.includes('KAPITEL') || line.match(/^[A-ZÄÖÜ\s]{20,}$/)) {
            checkNewPage(20);
            doc.setFillColor(124, 58, 237, 20);
            doc.rect(margin - 2, y - 5, maxWidth + 4, 12, 'F');
            addWrappedText(line, 14, [124, 58, 237], true);
            y += 5;
            continue;
          }
          
          // Unterüberschriften (▸)
          if (line.startsWith('▸')) {
            checkNewPage(15);
            addWrappedText(line.replace('▸ ', ''), 12, [22, 163, 94], true);
            continue;
          }
          
          // Code-Blöcke (┌│└)
          if (line.match(/^[┌│└├┐┤┘┬┴┼]/)) {
            doc.setFont('courier', 'normal');
            addWrappedText(line, 8, [100, 100, 100], false);
            doc.setFont('helvetica', 'normal');
            continue;
          }
          
          // Aufzählungszeichen
          if (line.match(/^[•✓✗□]/)) {
            addWrappedText('  ' + line, 9, [70, 70, 70], false);
            continue;
          }
          
          // Leere Zeilen
          if (line.trim() === '') {
            y += 3;
            continue;
          }
          
          // Normaler Text
          addWrappedText(line, 9, [50, 50, 50], false);
        }
        
        // Footer auf jeder Seite
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          doc.setFontSize(8);
          doc.setTextColor(150, 150, 150);
          doc.text(
            `Karnbachs Event OS - Dokumentation | Seite ${i} von ${pageCount}`,
            pageWidth / 2,
            pageHeight - 8,
            { align: 'center' }
          );
        }
        
        // PDF speichern
        doc.save(`${fileName}.pdf`);
        toast.success('PDF erfolgreich heruntergeladen! (' + pageCount + ' Seiten)');
        
      } catch (error) {
        console.error('PDF Export error:', error);
        toast.error('PDF-Export fehlgeschlagen: ' + error.message);
      } finally {
        setIsGeneratingPdf(false);
      }
    }
  };

  // HTML-Dokument generieren
  const generateHtmlDocument = (content, timestamp, forPdf) => {
    const bg = forPdf ? '#ffffff' : '#0a0a0b';
    const text = forPdf ? '#1a1a1a' : '#e5e5e5';
    const primary = forPdf ? '#7c3aed' : '#a855f7';
    const secondary = forPdf ? '#16a34a' : '#22c55e';
    const accent = forPdf ? '#ca8a04' : '#eab308';
    const codeBg = forPdf ? '#f3f4f6' : '#1f1f23';
    const borderColor = forPdf ? '#e5e7eb' : '#333';
    
    return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Karnbachs Event OS - Vollständige Dokumentation</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono&display=swap');
    
    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    body { 
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      max-width: 800px; 
      margin: 0 auto; 
      padding: 40px 30px; 
      line-height: 1.7; 
      background: ${bg}; 
      color: ${text};
      font-size: 14px;
    }
    
    .header {
      text-align: center;
      padding: 40px 20px;
      margin-bottom: 40px;
      background: linear-gradient(135deg, ${primary}22, ${secondary}22);
      border-radius: 16px;
      border: 2px solid ${borderColor};
    }
    
    .header h1 {
      font-size: 32px;
      font-weight: 700;
      color: ${primary};
      margin-bottom: 10px;
    }
    
    .header p {
      font-size: 18px;
      color: ${text};
      opacity: 0.8;
    }
    
    .badge {
      display: inline-block;
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      margin: 5px;
    }
    
    .badge-primary { background: ${primary}22; border: 2px solid ${primary}; color: ${primary}; }
    .badge-secondary { background: ${secondary}22; border: 2px solid ${secondary}; color: ${secondary}; }
    
    .toc {
      background: ${codeBg};
      padding: 25px;
      border-radius: 12px;
      margin-bottom: 40px;
      border: 1px solid ${borderColor};
    }
    
    .toc h2 {
      color: ${primary};
      margin-bottom: 15px;
      font-size: 18px;
    }
    
    .toc ol {
      padding-left: 25px;
    }
    
    .toc li {
      padding: 5px 0;
      color: ${text};
    }
    
    pre {
      background: ${codeBg};
      padding: 20px;
      border-radius: 8px;
      overflow-x: auto;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      line-height: 1.5;
      border: 1px solid ${borderColor};
      white-space: pre-wrap;
      word-wrap: break-word;
      margin: 20px 0;
    }
    
    .section {
      margin-bottom: 50px;
      page-break-inside: avoid;
    }
    
    .section-header {
      background: linear-gradient(90deg, ${primary}33, transparent);
      padding: 15px 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      border-left: 4px solid ${primary};
    }
    
    .section-header h2 {
      color: ${primary};
      font-size: 22px;
      font-weight: 700;
    }
    
    .screenshot {
      margin: 30px 0;
      padding: 20px;
      background: ${codeBg};
      border-radius: 12px;
      border: 2px solid ${borderColor};
      text-align: center;
    }
    
    .screenshot img {
      max-width: 100%;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    }
    
    .screenshot-caption {
      margin-top: 15px;
      font-size: 13px;
      color: ${text};
      opacity: 0.7;
      font-style: italic;
    }
    
    .footer {
      margin-top: 60px;
      padding: 30px;
      text-align: center;
      border-top: 2px solid ${borderColor};
      color: ${text};
      opacity: 0.7;
      font-size: 12px;
    }
    
    .diagram {
      margin: 20px 0;
      padding: 15px;
      background: ${forPdf ? '#f9fafb' : '#111'};
      border-radius: 8px;
      text-align: center;
    }
    
    .diagram svg {
      max-width: 100%;
      height: auto;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🎪 Karnbachs Event OS</h1>
    <p>Vollständige Dokumentation</p>
    <div style="margin-top: 20px;">
      <span class="badge badge-primary">Version 1.0.0</span>
      <span class="badge badge-secondary">Stand: ${timestamp}</span>
    </div>
  </div>
  
  <div class="toc">
    <h2>📚 Inhaltsverzeichnis</h2>
    <ol>
      <li>App-Idee & Vision</li>
      <li>Architektur & Technologie</li>
      <li>Datenbank-Schema</li>
      <li>API-Referenz</li>
      <li>Frontend-Seiten</li>
      <li>Komponenten & Services</li>
      <li>Design-System</li>
      <li>n8n Integration</li>
      <li>Weiterentwicklung</li>
      <li>Installation & Deployment</li>
    </ol>
  </div>
  
  <div class="screenshot">
    <svg xmlns="http://www.w3.org/2000/svg" width="700" height="200" viewBox="0 0 700 200">
      <rect fill="${forPdf ? '#f0f0f5' : '#0a0a0b'}" width="700" height="200" rx="12"/>
      <text x="350" y="40" text-anchor="middle" fill="${primary}" font-family="Arial" font-size="20" font-weight="bold">Karnbachs Event OS - Workflow</text>
      
      <!-- Workflow boxes -->
      <rect x="20" y="70" width="140" height="70" rx="10" fill="${primary}22" stroke="${primary}" stroke-width="2"/>
      <text x="90" y="100" text-anchor="middle" fill="${primary}" font-family="Arial" font-size="14" font-weight="bold">🛒 Besteller</text>
      <text x="90" y="125" text-anchor="middle" fill="${text}" font-family="Arial" font-size="11">Bestellung aufnehmen</text>
      
      <path d="M160 105 L200 105" stroke="${secondary}" stroke-width="3" marker-end="url(#arrow)"/>
      
      <rect x="200" y="70" width="140" height="70" rx="10" fill="${secondary}22" stroke="${secondary}" stroke-width="2"/>
      <text x="270" y="100" text-anchor="middle" fill="${secondary}" font-family="Arial" font-size="14" font-weight="bold">🔨 Macher</text>
      <text x="270" y="125" text-anchor="middle" fill="${text}" font-family="Arial" font-size="11">Zubereiten</text>
      
      <path d="M340 105 L380 105" stroke="${accent}" stroke-width="3"/>
      
      <rect x="380" y="70" width="140" height="70" rx="10" fill="${accent}22" stroke="${accent}" stroke-width="2"/>
      <text x="450" y="100" text-anchor="middle" fill="${accent}" font-family="Arial" font-size="14" font-weight="bold">📦 Ausgabe</text>
      <text x="450" y="125" text-anchor="middle" fill="${text}" font-family="Arial" font-size="11">Übergeben</text>
      
      <path d="M520 105 L560 105" stroke="${forPdf ? '#16a34a' : '#22c55e'}" stroke-width="3"/>
      
      <rect x="560" y="70" width="120" height="70" rx="10" fill="${forPdf ? '#16a34a' : '#22c55e'}22" stroke="${forPdf ? '#16a34a' : '#22c55e'}" stroke-width="2"/>
      <text x="620" y="100" text-anchor="middle" fill="${forPdf ? '#16a34a' : '#22c55e'}" font-family="Arial" font-size="14" font-weight="bold">✅ Fertig</text>
      <text x="620" y="125" text-anchor="middle" fill="${text}" font-family="Arial" font-size="11">Abgeschlossen</text>
      
      <text x="350" y="175" text-anchor="middle" fill="${text}" font-family="Arial" font-size="12" opacity="0.7">Echtzeit-Synchronisation über WebSockets</text>
    </svg>
    <p class="screenshot-caption">Abbildung: Bestellungs-Workflow mit den vier Hauptrollen</p>
  </div>

  <pre>${content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
  
  <div class="screenshot">
    <svg xmlns="http://www.w3.org/2000/svg" width="700" height="300" viewBox="0 0 700 300">
      <rect fill="${forPdf ? '#f0f0f5' : '#0a0a0b'}" width="700" height="300" rx="12"/>
      <text x="350" y="30" text-anchor="middle" fill="${primary}" font-family="Arial" font-size="18" font-weight="bold">System-Architektur</text>
      
      <!-- Frontend -->
      <rect x="50" y="60" width="180" height="60" rx="8" fill="${primary}22" stroke="${primary}" stroke-width="2"/>
      <text x="140" y="85" text-anchor="middle" fill="${primary}" font-family="Arial" font-size="12" font-weight="bold">Frontend</text>
      <text x="140" y="105" text-anchor="middle" fill="${text}" font-family="Arial" font-size="10">React + Tailwind</text>
      
      <!-- Backend -->
      <rect x="260" y="60" width="180" height="60" rx="8" fill="${secondary}22" stroke="${secondary}" stroke-width="2"/>
      <text x="350" y="85" text-anchor="middle" fill="${secondary}" font-family="Arial" font-size="12" font-weight="bold">Backend</text>
      <text x="350" y="105" text-anchor="middle" fill="${text}" font-family="Arial" font-size="10">FastAPI + WebSocket</text>
      
      <!-- Database -->
      <rect x="470" y="60" width="180" height="60" rx="8" fill="${accent}22" stroke="${accent}" stroke-width="2"/>
      <text x="560" y="85" text-anchor="middle" fill="${accent}" font-family="Arial" font-size="12" font-weight="bold">Datenbank</text>
      <text x="560" y="105" text-anchor="middle" fill="${text}" font-family="Arial" font-size="10">MongoDB</text>
      
      <!-- Arrows -->
      <path d="M230 90 L260 90" stroke="${text}" stroke-width="2" marker-end="url(#arrow2)"/>
      <path d="M440 90 L470 90" stroke="${text}" stroke-width="2"/>
      
      <!-- Devices -->
      <rect x="100" y="160" width="100" height="50" rx="6" fill="${forPdf ? '#e5e7eb' : '#222'}" stroke="${borderColor}" stroke-width="1"/>
      <text x="150" y="190" text-anchor="middle" fill="${text}" font-family="Arial" font-size="10">📱 Besteller</text>
      
      <rect x="220" y="160" width="100" height="50" rx="6" fill="${forPdf ? '#e5e7eb' : '#222'}" stroke="${borderColor}" stroke-width="1"/>
      <text x="270" y="190" text-anchor="middle" fill="${text}" font-family="Arial" font-size="10">📱 Macher</text>
      
      <rect x="340" y="160" width="100" height="50" rx="6" fill="${forPdf ? '#e5e7eb' : '#222'}" stroke="${borderColor}" stroke-width="1"/>
      <text x="390" y="190" text-anchor="middle" fill="${text}" font-family="Arial" font-size="10">📱 Ausgabe</text>
      
      <rect x="460" y="160" width="100" height="50" rx="6" fill="${forPdf ? '#e5e7eb' : '#222'}" stroke="${borderColor}" stroke-width="1"/>
      <text x="510" y="190" text-anchor="middle" fill="${text}" font-family="Arial" font-size="10">💻 Admin</text>
      
      <!-- Connection lines -->
      <path d="M150 160 L150 130 L140 120" stroke="${text}" stroke-width="1" fill="none" stroke-dasharray="3,3"/>
      <path d="M270 160 L270 130 L350 120" stroke="${text}" stroke-width="1" fill="none" stroke-dasharray="3,3"/>
      <path d="M390 160 L390 130 L350 120" stroke="${text}" stroke-width="1" fill="none" stroke-dasharray="3,3"/>
      <path d="M510 160 L510 130 L350 120" stroke="${text}" stroke-width="1" fill="none" stroke-dasharray="3,3"/>
      
      <text x="350" y="250" text-anchor="middle" fill="${text}" font-family="Arial" font-size="11">Alle Geräte synchronisieren in Echtzeit über WebSocket</text>
      <text x="350" y="275" text-anchor="middle" fill="${secondary}" font-family="Arial" font-size="12" font-weight="bold">Latenz &lt; 30ms</text>
    </svg>
    <p class="screenshot-caption">Abbildung: System-Architektur mit Frontend, Backend und Datenbank</p>
  </div>
  
  <div class="footer">
    <p>📄 Karnbachs Event OS - Vollständige Dokumentation</p>
    <p>Generiert am ${timestamp}</p>
    <p>© ${new Date().getFullYear()} Karnbachs Event OS</p>
  </div>
</body>
</html>`;
  };

  const handleLogout = () => {
    sessionStorage.removeItem("adminAuth");
    navigate("/");
  };

  const { swipeHandlers } = useAdminSwipe();

  const tabs = [
    { id: "idea", label: "Idee", icon: Lightbulb },
    { id: "architecture", label: "Architektur", icon: Layers },
    { id: "database", label: "Datenbank", icon: Database },
    { id: "api", label: "API", icon: Server },
    { id: "pages", label: "Seiten", icon: Monitor },
    { id: "components", label: "Code", icon: Code },
    { id: "design", label: "Design", icon: Palette },
    { id: "n8n", label: "n8n", icon: Network },
    { id: "future", label: "Zukunft", icon: GitBranch },
    { id: "deployment", label: "Deploy", icon: Settings },
  ];

  const renderContent = (content) => {
    return content.split('\n').map((line, i) => {
      if (line.match(/^═+$/)) return <hr key={i} className="border-primary/30 my-4" />;
      if (line.match(/^─+$/)) return <hr key={i} className="border-border my-2" />;
      if (line.match(/^▸\s/)) return <h3 key={i} className="font-display text-lg font-bold text-primary mt-6 mb-2">{line.replace('▸ ', '')}</h3>;
      if (line.match(/^\s{2,}[A-ZÄÖÜ][A-ZÄÖÜ\s&-]+:?\s*$/)) return <h4 key={i} className="font-bold text-secondary mt-4 mb-1 text-sm">{line.trim()}</h4>;
      if (line.match(/^[•✓✗□]\s/)) return <p key={i} className="text-muted-foreground ml-4 text-sm">{line}</p>;
      if (line.match(/^\d+\.\s/)) return <p key={i} className="text-muted-foreground ml-4 text-sm font-medium">{line}</p>;
      if (line.trim() === '') return <br key={i} />;
      if (line.match(/^┌|^│|^└|^├/)) return <code key={i} className="block text-xs font-mono text-green-400">{line}</code>;
      return <p key={i} className="text-muted-foreground text-sm leading-relaxed">{line}</p>;
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col" {...swipeHandlers}>
      <header className="glass sticky top-0 z-50 px-3 sm:px-6 py-2">
        <AdminNavBar 
          onHelp={() => toast.info("Vollständige App-Dokumentation mit Export-Funktion")}
          onLogout={handleLogout}
        />
      </header>

      <main className="p-4 sm:p-6 flex-1">
        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 mb-6">
          <Button onClick={() => setShowExportDialog(true)} className="neon-primary">
            <Download className="w-4 h-4 mr-2" />
            Dokumentation exportieren
          </Button>
        </div>

        {/* Export Dialog */}
        <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Download className="w-5 h-5 text-primary" />
                Dokumentation exportieren
              </DialogTitle>
              <DialogDescription>
                Wählen Sie das gewünschte Format. PDF enthält alle Diagramme und Bilder.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-4">
              <Button onClick={() => handleExport('txt')} variant="outline" className="justify-start h-auto py-4">
                <FileText className="w-8 h-8 mr-4 text-muted-foreground" />
                <div className="text-left">
                  <div className="font-bold">TXT (Textdatei)</div>
                  <div className="text-xs text-muted-foreground">Reiner Text, ~100 Seiten</div>
                </div>
              </Button>
              <Button onClick={() => handleExport('html')} variant="outline" className="justify-start h-auto py-4">
                <Code className="w-8 h-8 mr-4 text-green-500" />
                <div className="text-left">
                  <div className="font-bold">HTML (Webseite)</div>
                  <div className="text-xs text-muted-foreground">Mit Styling, Diagrammen und Inhaltsverzeichnis</div>
                </div>
              </Button>
              <Button onClick={() => handleExport('pdf')} variant="outline" className="justify-start h-auto py-4" disabled={isGeneratingPdf}>
                {isGeneratingPdf ? (
                  <Loader2 className="w-8 h-8 mr-4 text-red-500 animate-spin" />
                ) : (
                  <Image className="w-8 h-8 mr-4 text-red-500" />
                )}
                <div className="text-left">
                  <div className="font-bold">PDF (vollständig)</div>
                  <div className="text-xs text-muted-foreground">
                    {isGeneratingPdf ? 'PDF wird generiert...' : 'Direkter PDF-Download mit allen Kapiteln'}
                  </div>
                </div>
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Laden...</div>
        ) : (
          <div className="space-y-6">
            {/* Info Card */}
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="border-primary text-primary">
                    {settings?.event_name || 'Karnbachs Event OS'}
                  </Badge>
                  <Badge variant="outline" className="border-secondary text-secondary">
                    Version 1.0.0
                  </Badge>
                  <Badge variant="outline">
                    <CheckCircle className="w-3 h-3 mr-1 text-green-500" />
                    100% Vollständig
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
                        className="flex items-center gap-1 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                      >
                        <tab.icon className="w-3 h-3" />
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
                          {renderContent(FULL_DOCUMENTATION[tab.id].content)}
                        </div>
                      </ScrollArea>
                    </TabsContent>
                  ))}
                </CardContent>
              </Tabs>
            </Card>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              <Card className="bg-card border-border">
                <CardContent className="p-3 text-center">
                  <Monitor className="w-6 h-6 mx-auto mb-1 text-primary" />
                  <p className="text-xl font-bold font-mono">12</p>
                  <p className="text-xs text-muted-foreground">Seiten</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardContent className="p-3 text-center">
                  <Server className="w-6 h-6 mx-auto mb-1 text-secondary" />
                  <p className="text-xl font-bold font-mono">40+</p>
                  <p className="text-xs text-muted-foreground">API Endpoints</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardContent className="p-3 text-center">
                  <Database className="w-6 h-6 mx-auto mb-1 text-accent" />
                  <p className="text-xl font-bold font-mono">8</p>
                  <p className="text-xs text-muted-foreground">Collections</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardContent className="p-3 text-center">
                  <Code className="w-6 h-6 mx-auto mb-1 text-blue-500" />
                  <p className="text-xl font-bold font-mono">25+</p>
                  <p className="text-xs text-muted-foreground">Komponenten</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardContent className="p-3 text-center">
                  <Network className="w-6 h-6 mx-auto mb-1 text-purple-500" />
                  <p className="text-xl font-bold font-mono">n8n</p>
                  <p className="text-xs text-muted-foreground">Ready</p>
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
