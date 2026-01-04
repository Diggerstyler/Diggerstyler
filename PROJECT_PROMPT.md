# 🎪 Karnbachs Event OS - Vollständiger Projekt-Prompt

> **Dieses Dokument beschreibt alle Funktionen, Datenmodelle und technischen Details, um das Projekt vollständig zu reproduzieren.**

---

## 📋 Projektübersicht

**Name:** Karnbachs Event OS  
**Zweck:** Vollständiges Bestellmanagement-System für Festivals und Events  
**Tech-Stack:** FastAPI (Python) + React + MongoDB  
**Sprache:** Deutsch (UI und alle Texte)

### Kernkonzept
Ein PWA-fähiges Kassensystem mit **rollenbasiertem Workflow** für Festivalstände. Mehrere Geräte können gleichzeitig an einem Stand arbeiten. Die App unterstützt verschiedene Workflows (Standard, Kurzer Prozess, OneManShow) und komplexe Artikelverknüpfungen für Stationen.

---

## 🎭 Benutzerrollen & Workflows

### 1. **Bestellung** (📱 `/bestellung/:standId/:standType`)
- Nimmt Bestellungen von Gästen auf
- Artikel antippen = zum Warenkorb hinzufügen
- Pfand wird automatisch berechnet
- Pfand-Rückgabe möglich
- Nach Bestellung: Große Bonnummer-Anzeige mit "Weiter"-Button
- **Restgeldrechner:** Berechnet Wechselgeld
- **Archiv:** Zeigt alle bisherigen Bestellungen des Stands

### 2. **Macher/Küche** (🔨 `/kueche/:standId/:standType` oder `/kueche/:standId/:standType/:stationId`)
- Sieht eingehende Bestellungen mit großer Bonnummer
- Artikel können als "erledigt" markiert werden (nur visuell, Hilfsfunktion)
- "Fertig"-Button markiert Bestellung als bereit zur Ausgabe
- **Gesamt Offen:** Kumulierte Übersicht aller offenen Artikel
- **Stationen-Modus:** Bei verknüpften Artikeln werden Stationen angezeigt
- **Sound-Benachrichtigung:** "Bing" bei neuer Bestellung (wenn Queue vorher leer war)
- **Sound-Toggle:** Ein/Aus-Schalter für Benachrichtigungen
- **Wake Lock:** Bildschirm bleibt im Vollbildmodus aktiv

### 3. **Ausgabe** (📦 `/ausgabe/:standId/:standType`)
- Zeigt alle fertigen Bestellungen (max. 2 gleichzeitig, Pagination)
- Bonnummer aufrufen und an Gast übergeben
- "Übergeben"-Button schließt Bestellung ab
- **Letzte Bestellung zurückholen:** Undo für versehentlich abgeschlossene Bestellungen
- **Archiv:** Übersicht aller abgeschlossenen Bestellungen

### 4. **OneManShow** (⚡ `/onemanshow/:standId/:standType`)
- Alles in einem: Bestellen + Kassieren + Ausgeben
- Bestellung wird sofort als "completed" markiert
- Kein Küchen-Workflow

---

## 🔄 Workflow-Typen

### Standard-Workflow
```
Bestellung → Macher/Küche → Ausgabe → Abgeschlossen
   (created)   (in_progress)   (ready)   (completed)
```

### Kurzer Prozess (Toggle pro Stand)
```
Bestellung → Ausgabe → Abgeschlossen
   (created)   (ready)   (completed)
```
- Macher-Rolle wird übersprungen
- Ideal für Getränkestände

### Stationen-Workflow (für verknüpfte Artikel)
```
Bestellung → [Station A: Fertig] + [Station B: Fertig] → Ausgabe
```
- Mehrere Stationen müssen jeweils "Fertig" klicken
- Erst wenn alle Stationen fertig sind, geht die Bestellung zur Ausgabe

---

## 📊 Datenmodelle

### Stand
```javascript
{
  id: "uuid",
  name: "Getränkestand",
  stand_type: "getraenkestand" | "speisestand" | "gemischt",
  articles: ["article_id_1", "article_id_2"],  // Optional: Spezifische Artikel
  short_process: false,  // Kurzer Prozess aktiv?
  active: true,
  created_at: "ISO-DateTime"
}
```

### Stand-Typen (Hardcoded)
```javascript
[
  { id: "speisestand", name: "Speisestand", categories: ["speisen"] },
  { id: "getraenkestand", name: "Getränkestand", categories: ["getraenke"] },
  { id: "gemischt", name: "Gemischter Stand", categories: ["speisen", "getraenke"] }
]
```

### Artikel
```javascript
{
  id: "uuid",
  name: "Bier 0,5l",
  price: 4.50,
  category: "getraenke" | "speisen",
  deposit_group_id: "uuid" | null,  // Optional: Pfandgruppe
  active: true,
  created_at: "ISO-DateTime"
}
```

### Pfandgruppe
```javascript
{
  id: "uuid",
  name: "Glas 0,5l",
  amount: 2.00,
  active: true,
  created_at: "ISO-DateTime"
}
```

### Station (für Multi-Stationen-Workflow)
```javascript
{
  id: "uuid",
  stand_id: "uuid",
  name: "Küche",
  is_main: true,  // Hauptstation für Hauptartikel
  active: true,
  created_at: "ISO-DateTime"
}
```

### Verknüpfter Artikel (Linked Article)
```javascript
{
  id: "uuid",
  main_article_id: "uuid",      // z.B. Bratwurst
  linked_article_id: "uuid",    // z.B. Beilagensalat
  linked_article_name: "Beilagensalat",  // Cache
  station_id: "uuid",           // Station für den verknüpften Artikel
  station_name: "Salat",        // Cache
  created_at: "ISO-DateTime"
}
```

### Bestellung (Order)
```javascript
{
  id: "uuid",
  order_number: 1-25,  // Zyklisch: nach 25 wieder 1
  stand_id: "uuid",
  stand_name: "Getränkestand",
  items: [
    {
      article_id: "uuid",
      article_name: "Bier 0,5l",
      quantity: 2,
      price: 4.50,
      deposit_amount: 2.00,
      is_deposit_return: false,
      is_linked_article: false,
      linked_to_article_id: null,
      station_id: null,
      station_completed: false
    }
  ],
  subtotal: 9.00,
  deposit_total: 4.00,
  deposit_return_total: 0,
  total: 13.00,
  status: "created" | "in_progress" | "ready" | "completed",
  created_by: "Bestellung" | "OneManShow",
  created_at: "ISO-DateTime",
  updated_at: "ISO-DateTime",
  processed_by: null,  // Wer hat "Fertig" geklickt
  completed_by: null,  // Wer hat "Übergeben" geklickt
  station_status: { "station_id": true/false },  // Pro Station
  has_linked_articles: false
}
```

---

## 🔌 API-Endpunkte

### Authentifizierung
- **Basic Auth:** `admin:admin`
- **Reset PIN:** `200183`

### Stände
| Methode | Endpunkt | Beschreibung |
|---------|----------|--------------|
| GET | `/api/stands` | Alle Stände |
| GET | `/api/stands/:id` | Einzelner Stand |
| POST | `/api/stands` | Stand erstellen (Auth) |
| PUT | `/api/stands/:id` | Stand aktualisieren (Auth) |
| PUT | `/api/stands/:id/toggle-short-process` | Kurzen Prozess umschalten |
| DELETE | `/api/stands/:id` | Stand löschen (Auth) |

### Artikel
| Methode | Endpunkt | Beschreibung |
|---------|----------|--------------|
| GET | `/api/articles` | Alle Artikel |
| GET | `/api/stands/:standId/articles` | Artikel für Stand (mit Pfand-Info) |
| POST | `/api/articles` | Artikel erstellen (Auth) |
| PUT | `/api/articles/:id` | Artikel aktualisieren (Auth) |
| DELETE | `/api/articles/:id` | Artikel löschen (Auth) |

### Pfandgruppen
| Methode | Endpunkt | Beschreibung |
|---------|----------|--------------|
| GET | `/api/deposit-groups` | Alle Pfandgruppen |
| POST | `/api/deposit-groups` | Pfandgruppe erstellen (Auth) |
| PUT | `/api/deposit-groups/:id` | Pfandgruppe aktualisieren (Auth) |
| DELETE | `/api/deposit-groups/:id` | Pfandgruppe löschen (Auth) |

### Stationen
| Methode | Endpunkt | Beschreibung |
|---------|----------|--------------|
| GET | `/api/stations` | Alle Stationen |
| GET | `/api/stands/:standId/stations` | Stationen eines Stands |
| POST | `/api/stations` | Station erstellen (Auth) |
| PUT | `/api/stations/:id` | Station aktualisieren (Auth) |
| DELETE | `/api/stations/:id` | Station löschen (Auth) |

### Verknüpfte Artikel
| Methode | Endpunkt | Beschreibung |
|---------|----------|--------------|
| GET | `/api/linked-articles` | Alle Verknüpfungen |
| GET | `/api/articles/:id/linked` | Verknüpfungen eines Artikels |
| GET | `/api/stands/:standId/linked-articles` | Verknüpfungen eines Stands |
| GET | `/api/stands/:standId/has-linked-articles` | Prüft ob Stand Verknüpfungen hat |
| POST | `/api/linked-articles` | Verknüpfung erstellen (Auth) |
| DELETE | `/api/linked-articles/:id` | Verknüpfung löschen (Auth) |

### Bestellungen
| Methode | Endpunkt | Beschreibung |
|---------|----------|--------------|
| GET | `/api/orders` | Alle Bestellungen (Filter: stand_id, status) |
| GET | `/api/orders/:id` | Einzelne Bestellung |
| POST | `/api/orders` | Bestellung erstellen |
| PUT | `/api/orders/:id/status` | Status aktualisieren |
| PUT | `/api/orders/:id/station-complete` | Station als fertig markieren |
| PUT | `/api/orders/:id/reclaim` | Abgeschlossene Bestellung zurückholen |
| GET | `/api/stands/:standId/archive` | Bestellungsarchiv |
| GET | `/api/stands/:standId/completed-orders` | Letzte abgeschlossene Bestellungen |
| GET | `/api/stands/:standId/kitchen-summary` | Kumulierte offene Artikel |
| GET | `/api/stands/:standId/station/:stationId/orders` | Bestellungen für Station |

### Admin
| Methode | Endpunkt | Beschreibung |
|---------|----------|--------------|
| POST | `/api/auth/login` | Admin-Login prüfen |
| GET | `/api/admin/orders` | Alle Bestellungen (Pagination) |
| DELETE | `/api/admin/orders/:id` | Bestellung löschen |
| GET | `/api/admin/export` | Alle Daten exportieren (JSON) |
| POST | `/api/admin/verify-pin` | Reset-PIN verifizieren |
| POST | `/api/admin/reset` | Alle Bestellungen löschen |

### Statistiken
| Methode | Endpunkt | Beschreibung |
|---------|----------|--------------|
| POST | `/api/stats/overview` | Statistik-Übersicht |
| GET | `/api/stats/orders` | Gefilterte Bestellungsliste |

### WebSocket
- **Endpunkt:** `/ws/:standId`
- **Events:** `new_order`, `order_updated`

---

## 🎨 UI/UX Design-Spezifikationen

### Farbschema (Dark Mode)
```css
--background: 240 10% 3.9%;     /* Fast Schwarz */
--foreground: 0 0% 98%;         /* Fast Weiß */
--card: 240 10% 9%;             /* Dunkles Grau */
--primary: 292 84% 61%;         /* Magenta/Pink */
--secondary: 187 92% 43%;       /* Cyan */
--accent: 48 96% 53%;           /* Gelb/Gold */
--destructive: 0 84% 60%;       /* Rot */
```

### Typografie
- **Headlines:** `Unbounded` (Google Font, Bold/Black)
- **Body:** `Manrope` (Google Font)
- **Monospace:** `JetBrains Mono` (für Preise, Bonnummern)

### Besondere UI-Elemente
- **Neon-Glow Effekte:** `.neon-primary`, `.neon-secondary`, `.neon-success`, `.neon-accent`
- **Glass Effect:** `.glass` - Transparenter Header mit Blur
- **Pulse Animation:** `.pulse-ready` für fertige Bestellungen

### Mobile-Optimierungen
- **Bestellseite:** Kompakter zusammenklappbarer Warenkorb-Footer
- **Prominenter "Bestellen"-Button:** Immer sichtbar, große Touch-Fläche
- **Landscape-Modus:** 4-Spalten-Grid für Artikel
- **Swipe-to-Delete:** Im Warenkorb

### Bonnummern
- Format: 2-stellig mit führender Null (01-25)
- Große, prominente Anzeige in der Macher- und Ausgabe-Ansicht
- Zyklisch: Nach 25 wieder 1

---

## 📱 Seiten-Struktur

### Public Pages
| Route | Komponente | Beschreibung |
|-------|------------|--------------|
| `/` | `LandingPage` | Stand- und Rollenauswahl |
| `/bestellung/:standId/:standType` | `BestellungPage` | Bestellungen aufnehmen |
| `/kueche/:standId/:standType` | `KuechePage` | Macher-Ansicht |
| `/kueche/:standId/:standType/:stationId` | `KuechePage` | Stations-Ansicht |
| `/ausgabe/:standId/:standType` | `AusgabePage` | Ausgabe-Ansicht |
| `/onemanshow/:standId/:standType` | `OneManShowPage` | Alles-in-einem |

### Admin Pages (Auth Required)
| Route | Komponente | Beschreibung |
|-------|------------|--------------|
| `/admin/login` | `AdminLoginPage` | Admin-Login |
| `/admin` | `AdminDashboard` | Dashboard mit Statistiken |
| `/admin/articles` | `ArticleManagement` | Artikel & Pfandgruppen |
| `/admin/stands` | `StandManagement` | Stände verwalten |
| `/admin/stations` | `StationManagement` | Stationen & Verknüpfungen |
| `/admin/orders` | `OrdersManagement` | Alle Bestellungen |
| `/admin/stats` | `StatsPage` | Detaillierte Statistiken |

---

## 🔧 Technische Features

### Real-Time Updates
- **WebSocket:** Für Live-Updates zwischen Bestellung, Macher und Ausgabe
- **Fallback Polling:** Alle 10 Sekunden wenn WebSocket fehlschlägt

### Browser APIs
- **Wake Lock API:** Bildschirm bleibt im Vollbildmodus aktiv (Macher-Ansicht)
- **Web Audio API:** Sound-Benachrichtigungen (iOS-kompatibel)
- **Fullscreen API:** Vollbildmodus auf allen Seiten

### iOS-Kompatibilität
- **Audio Unlock:** Erfordert User-Geste zum Aktivieren von Sound
- **AudioContext:** Statt HTML5 Audio für zuverlässige Wiedergabe

### Performance
- **MongoDB Indizes:** Auf häufig abgefragten Feldern
- **Pagination:** Für Admin-Bestellungsübersicht
- **Caching:** Artikelnamen in verknüpften Artikeln

---

## 🛠️ Admin-Funktionen

### Dashboard
- Gesamtübersicht: Bestellungen, Umsatz, offene Bestellungen
- Top-Artikel nach Verkaufszahl
- Bestellungen pro Stand
- Bestellungen pro Stunde (Diagramm)

### Daten-Reset
1. PIN-Dialog öffnen
2. PIN `200183` eingeben
3. Bestätigen
4. Alle Bestellungen und Counter werden gelöscht
5. Stände, Artikel, Pfandgruppen bleiben erhalten

### Daten-Export
- JSON-Export aller Daten
- Enthält: Bestellungen, Artikel, Stände, Pfandgruppen, Statistiken

---

## 🧪 Test-Credentials

| Rolle | Username | Password |
|-------|----------|----------|
| Admin | `admin` | `admin` |
| Reset PIN | - | `200183` |

---

## 📂 Dateistruktur

```
/app/
├── backend/
│   ├── server.py           # Gesamter Backend-Code
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/ui/  # Shadcn UI Components
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx
│   │   │   ├── BestellungPage.jsx
│   │   │   ├── KuechePage.jsx
│   │   │   ├── AusgabePage.jsx
│   │   │   ├── OneManShowPage.jsx
│   │   │   ├── AdminLoginPage.jsx
│   │   │   ├── AdminDashboard.jsx
│   │   │   ├── ArticleManagement.jsx
│   │   │   ├── StandManagement.jsx
│   │   │   ├── StationManagement.jsx
│   │   │   ├── OrdersManagement.jsx
│   │   │   └── StatsPage.jsx
│   │   ├── App.js
│   │   ├── index.js
│   │   └── index.css
│   ├── package.json
│   └── .env
└── ...
```

---

## 🚀 Geplante Features (noch nicht implementiert)

1. **🗣️ Sprachausgabe:** TTS-Ansage wenn Bestellung fertig ("Bon 12 ist fertig!")
2. **🎨 Anpassbares Design:** Logo-Upload und Theme-Farben im Admin
3. **📊 Live-Dashboard:** Echtzeit-Statistiken für Event-Organisatoren
4. **🍺 Bestandsverwaltung:** Lagerbestand mit automatischer "Ausverkauft"-Markierung
5. **📶 Offline-Modus:** Service Worker + IndexedDB für Offline-Funktionalität

---

## 📝 Wichtige Hinweise

1. **Bonnummern sind pro Stand und Tag:** Zähler wird täglich zurückgesetzt
2. **Pfand-Rückgabe:** Erscheint nur wenn Stand Pfand-Artikel hat
3. **Stationen-Workflow:** Aktiviert sich automatisch wenn verknüpfte Artikel existieren
4. **Kurzer Prozess:** Kann pro Stand ein-/ausgeschaltet werden
5. **Sound auf iOS:** Muss durch User-Interaktion aktiviert werden

---

*Dieses Dokument wurde automatisch generiert und enthält alle Details zur vollständigen Reproduktion des Projekts.*
