# Test Result

## Testing Protocol (Do not modify)
- Test authentication before admin operations
- Verify all CRUD operations
- Check error handling
- Test edge cases

## Current Testing Focus
Testing the new features:
1. Live Clock on all pages
2. Timezone settings in Admin
3. Stock Overview statistics page
4. Adjustable loss percent for barrels

### Test Scenarios

#### 1. Live Clock
- Verify clock appears on Landing Page header
- Verify clock appears on Bestellung, Küche, Ausgabe, OneManShow headers
- Verify clock appears in Admin Dashboard

#### 2. Timezone Settings
- Navigate to /admin/settings
- Verify timezone dropdown works
- Change timezone and verify preview updates
- Save settings and verify clock updates

#### 3. Stock Overview (/admin/stock)
- Verify summary cards show: Anfangsbestand, Verkauft, Restbestand, Umsatz, Knapp, Ausverkauft
- Verify table shows articles with stock tracking
- Verify progress bar shows fill level
- Verify status badges (OK, Knapp, Ausverkauft)

#### 4. Barrel Loss Percent
- Navigate to /admin/articles -> Einheiten tab
- Edit a barrel (Fass) unit
- Verify Schankverlust (%) field exists and is editable
- Change loss percent and verify calculation updates

### Test Credentials
- Admin: admin/admin

## Incorporate User Feedback
None yet.
