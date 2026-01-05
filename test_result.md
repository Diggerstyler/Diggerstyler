# Test Result

## Testing Protocol (Do not modify)
- Test authentication before admin operations
- Verify all CRUD operations
- Check error handling
- Test edge cases

## Current Testing Focus
Testing the new Stock/Inventory Management feature:

### Feature Overview
1. **Stock Units (Einheiten-Vorlagen)**: Define reusable unit templates like "Kiste 24x0,5l" or "Fass 30l"
2. **Article Stock Tracking**: Enable stock tracking per article with configurable warning thresholds
3. **Automatic Stock Reduction**: Stock is reduced when orders are placed
4. **Stock Warnings**: Display warnings when stock is low or sold out in Bestellung/OneManShow pages

### Test Scenarios to Execute

#### Backend Tests
1. Stock Units CRUD:
   - GET /api/stock-units - list all units
   - POST /api/stock-units - create new unit (test both container and barrel types)
   - PUT /api/stock-units/{id} - update unit
   - DELETE /api/stock-units/{id} - delete unit (should fail if in use)

2. Article Stock Management:
   - PUT /api/articles/{id} - enable track_stock, set stock_unit_id, warning_threshold
   - PUT /api/articles/{id}/stock - adjust stock levels (large_units, small_units)
   - GET /api/admin/stock-overview - get all articles with stock tracking

3. Stock Reduction on Order:
   - POST /api/orders - verify stock is reduced for articles with track_stock=true
   - Test with both Bestellung and OneManShow (direct_complete)

4. Stock Info in Stand Articles:
   - GET /api/stands/{id}/articles - verify stock_info is included for articles with track_stock=true

#### Frontend Tests
1. Admin Articles Page (/admin/articles):
   - Verify 3 tabs: Artikel, Einheiten, Pfand
   - Test creating/editing stock units
   - Test editing article with stock settings enabled
   - Test stock adjustment dialog

2. Bestellung Page:
   - Verify low stock warning display (yellow border, "Noch X Flaschen")
   - Verify sold out display (red border, "Ausverkauft")
   - Test that disabled articles cannot be clicked (stock_sold_out_behavior="disable")
   - Verify stock updates after placing order

3. OneManShow Page:
   - Same stock warnings as Bestellung page
   - Verify stock refresh after order

### Test Credentials
- Admin: admin/admin
- Reset PIN: 200183

### Existing Test Data
- Stock Units:
  - "Kiste 24x0,5l" (container, 24 units per container)
  - "Fass 30l" (barrel, ~56 glasses with 7% loss)
- Articles: Various drinks and food items without stock tracking yet

## Incorporate User Feedback
None yet - this is initial testing.
