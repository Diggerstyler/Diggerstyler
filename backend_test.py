#!/usr/bin/env python3
"""
Festival Order Management System - Backend API Tests
Tests all CRUD operations and workflows for the festival ordering system.
"""

import requests
import sys
import json
from datetime import datetime
from base64 import b64encode

class FestivalAPITester:
    def __init__(self, base_url="https://statflow-9.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.admin_auth = b64encode(b"admin:admin").decode('ascii')
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, method, endpoint, expected_status, data=None, auth=False):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if auth:
            headers['Authorization'] = f'Basic {self.admin_auth}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        # Handle multiple expected status codes
        if isinstance(expected_status, list):
            expected_statuses = expected_status
        else:
            expected_statuses = [expected_status]
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)

            success = response.status_code in expected_statuses
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json() if response.content else {}
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_statuses}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}")
                self.failed_tests.append({
                    "test": name,
                    "expected": expected_statuses,
                    "actual": response.status_code,
                    "response": response.text[:200]
                })
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append({
                "test": name,
                "error": str(e)
            })
            return False, {}

    def test_basic_endpoints(self):
        """Test basic API endpoints"""
        print("\n=== TESTING BASIC ENDPOINTS ===")
        
        # Test root endpoint
        self.run_test("API Root", "GET", "", 200)
        
        # Test stands endpoint
        success, stands = self.run_test("Get Stands", "GET", "stands", 200)
        if success and stands:
            print(f"   Found {len(stands)} stands")
            
        # Test roles endpoint
        success, roles = self.run_test("Get Roles", "GET", "roles", 200)
        if success and roles:
            print(f"   Found {len(roles)} roles")

    def test_article_management(self):
        """Test article CRUD operations"""
        print("\n=== TESTING ARTICLE MANAGEMENT ===")
        
        # Seed initial data
        self.run_test("Seed Initial Data", "POST", "seed", 200)
        
        # Get all articles
        success, articles = self.run_test("Get All Articles", "GET", "articles", 200)
        if success:
            print(f"   Found {len(articles)} articles")
            
        # Get active articles only
        success, active_articles = self.run_test("Get Active Articles", "GET", "articles?active_only=true", 200)
        if success:
            print(f"   Found {len(active_articles)} active articles")

        # Test admin authentication for article creation
        test_article = {
            "name": "Test Artikel",
            "price": 5.50,
            "category": "getraenke",
            "active": True
        }
        
        success, created_article = self.run_test("Create Article (Admin)", "POST", "articles", 200, test_article, auth=True)
        
        if success and created_article:
            article_id = created_article.get('id')
            print(f"   Created article with ID: {article_id}")
            
            # Test article update
            update_data = {"price": 6.00}
            success, updated = self.run_test("Update Article", "PUT", f"articles/{article_id}", 200, update_data, auth=True)
            
            # Test article deletion
            self.run_test("Delete Article", "DELETE", f"articles/{article_id}", 200, auth=True)
        
        # Test unauthorized access
        self.run_test("Create Article (No Auth)", "POST", "articles", 401, test_article)

    def test_order_workflow(self):
        """Test complete order workflow"""
        print("\n=== TESTING ORDER WORKFLOW ===")
        
        # Get stands for testing
        success, stands = self.run_test("Get Stands for Orders", "GET", "stands", 200)
        if not success or not stands:
            print("❌ Cannot test orders without stands")
            return
            
        # Get articles for testing
        success, articles = self.run_test("Get Articles for Orders", "GET", "articles?active_only=true", 200)
        if not success or not articles:
            print("❌ Cannot test orders without articles")
            return
            
        test_stand = stands[0]
        test_article = articles[0] if articles else None
        
        if not test_article:
            print("❌ No articles available for testing")
            return
            
        # Create test order
        test_order = {
            "stand_id": test_stand["id"],
            "stand_name": test_stand["name"],
            "items": [
                {
                    "article_id": test_article["id"],
                    "article_name": test_article["name"],
                    "quantity": 2,
                    "price": test_article["price"],
                    "deposit_amount": 0
                }
            ],
            "subtotal": test_article["price"] * 2,
            "deposit_total": 0,
            "deposit_return_total": 0,
            "total": test_article["price"] * 2,
            "created_by": "Bestellung"
        }
        
        success, created_order = self.run_test("Create Order", "POST", "orders", 200, test_order)
        
        if success and created_order:
            order_id = created_order.get('id')
            order_number = created_order.get('order_number')
            print(f"   Created order #{order_number} with ID: {order_id}")
            
            # Test getting orders
            self.run_test("Get All Orders", "GET", "orders", 200)
            self.run_test("Get Orders by Stand", "GET", f"orders?stand_id={test_stand['id']}", 200)
            self.run_test("Get Orders by Status", "GET", "orders?status=created", 200)
            self.run_test("Get Single Order", "GET", f"orders/{order_id}", 200)
            
            # Test order status updates (Kitchen workflow)
            kitchen_update = {
                "status": "in_progress",
                "updated_by": "Küche"
            }
            success, updated = self.run_test("Update Order to In Progress", "PUT", f"orders/{order_id}/status", 200, kitchen_update)
            
            if success:
                # Test marking as ready
                ready_update = {
                    "status": "ready",
                    "updated_by": "Küche"
                }
                success, updated = self.run_test("Update Order to Ready", "PUT", f"orders/{order_id}/status", 200, ready_update)
                
                if success:
                    # Test completion (Ausgabe workflow)
                    complete_update = {
                        "status": "completed",
                        "updated_by": "Ausgabe"
                    }
                    self.run_test("Complete Order", "PUT", f"orders/{order_id}/status", 200, complete_update)

    def test_admin_authentication(self):
        """Test admin authentication"""
        print("\n=== TESTING ADMIN AUTHENTICATION ===")
        
        # Test valid login
        success, response = self.run_test("Admin Login (Valid)", "POST", "auth/login", 200, auth=True)
        
        # Test invalid login
        headers = {'Authorization': 'Basic ' + b64encode(b"wrong:wrong").decode('ascii')}
        url = f"{self.base_url}/auth/login"
        try:
            response = requests.post(url, headers=headers, timeout=10)
            if response.status_code == 401:
                print("✅ Invalid login correctly rejected")
                self.tests_passed += 1
            else:
                print(f"❌ Expected 401 for invalid login, got {response.status_code}")
                self.failed_tests.append({
                    "test": "Admin Login (Invalid)",
                    "expected": 401,
                    "actual": response.status_code
                })
            self.tests_run += 1
        except Exception as e:
            print(f"❌ Error testing invalid login: {e}")
            self.failed_tests.append({
                "test": "Admin Login (Invalid)",
                "error": str(e)
            })
            self.tests_run += 1

    def test_statistics(self):
        """Test statistics endpoints"""
        print("\n=== TESTING STATISTICS ===")
        
        # Test stats overview
        stats_filter = {
            "start_date": None,
            "end_date": None,
            "stand_id": None,
            "role": None
        }
        
        success, stats = self.run_test("Get Stats Overview", "POST", "stats/overview", 200, stats_filter, auth=True)
        if success and stats:
            print(f"   Total orders: {stats.get('total_orders', 0)}")
            print(f"   Total revenue: {stats.get('total_revenue', 0)}")
            print(f"   Completed orders: {stats.get('completed_orders', 0)}")
            
        # Test stats orders
        self.run_test("Get Stats Orders", "GET", "stats/orders", 200, auth=True)
        
        # Test unauthorized access to stats
        self.run_test("Get Stats (No Auth)", "POST", "stats/overview", 401, stats_filter)

    def test_stock_inventory_management(self):
        """Test Stock/Inventory Management feature"""
        print("\n=== TESTING STOCK/INVENTORY MANAGEMENT ===")
        
        # First, ensure we have test data
        self.run_test("Seed Data for Stock Tests", "POST", "seed", 200)
        
        # TEST 1: Stock Units CRUD
        print("\n--- Testing Stock Units CRUD ---")
        
        # Get existing stock units
        success, stock_units = self.run_test("Get Stock Units", "GET", "stock-units", 200)
        if success:
            print(f"   Found {len(stock_units)} existing stock units")
        
        # Create new stock unit - Container type
        container_unit = {
            "name": "Kiste 12x1l",
            "unit_type": "container",
            "units_per_container": 12,
            "volume_per_unit": 1.0,
            "large_unit_name": "Kiste",
            "small_unit_name": "Flasche"
        }
        
        success, created_container = self.run_test("Create Container Stock Unit", "POST", "stock-units", 200, container_unit, auth=True)
        container_unit_id = None
        if success and created_container:
            container_unit_id = created_container.get('id')
            print(f"   Created container unit with ID: {container_unit_id}")
            
            # Verify calculation
            expected_sales_units = 12
            actual_sales_units = created_container.get('sales_units_per_large', 0)
            if actual_sales_units == expected_sales_units:
                print(f"   ✅ Container calculation correct: {actual_sales_units} units per container")
            else:
                print(f"   ❌ Container calculation wrong: expected {expected_sales_units}, got {actual_sales_units}")
                self.failed_tests.append({
                    "test": "Container Unit Calculation",
                    "expected": expected_sales_units,
                    "actual": actual_sales_units
                })
        
        # Create new stock unit - Barrel type (test the 30l barrel calculation)
        barrel_unit = {
            "name": "Fass 30l",
            "unit_type": "barrel",
            "total_volume_liters": 30,
            "serving_size_liters": 0.5,
            "loss_percent": 7,
            "large_unit_name": "Fass",
            "small_unit_name": "Glas"
        }
        
        success, created_barrel = self.run_test("Create Barrel Stock Unit", "POST", "stock-units", 200, barrel_unit, auth=True)
        barrel_unit_id = None
        if success and created_barrel:
            barrel_unit_id = created_barrel.get('id')
            print(f"   Created barrel unit with ID: {barrel_unit_id}")
            
            # Verify barrel calculation: 30l * (1-0.07) / 0.5l = 55.8 ≈ 56 glasses
            expected_glasses = 30 * (1 - 0.07) / 0.5  # 55.8
            actual_glasses = created_barrel.get('sales_units_per_large', 0)
            if abs(actual_glasses - expected_glasses) < 0.1:
                print(f"   ✅ Barrel calculation correct: {actual_glasses} glasses per barrel")
            else:
                print(f"   ❌ Barrel calculation wrong: expected ~{expected_glasses:.1f}, got {actual_glasses}")
                self.failed_tests.append({
                    "test": "Barrel Unit Calculation",
                    "expected": expected_glasses,
                    "actual": actual_glasses
                })
        
        # Update stock unit
        if container_unit_id:
            update_data = {"name": "Kiste 12x1l (Updated)"}
            success, updated_unit = self.run_test("Update Stock Unit", "PUT", f"stock-units/{container_unit_id}", 200, update_data, auth=True)
            if success and updated_unit:
                if updated_unit.get('name') == "Kiste 12x1l (Updated)":
                    print("   ✅ Stock unit updated successfully")
                else:
                    print("   ❌ Stock unit update failed")
                    self.failed_tests.append({
                        "test": "Stock Unit Update",
                        "error": "Name not updated correctly"
                    })
        
        # TEST 2: Article Stock Management
        print("\n--- Testing Article Stock Management ---")
        
        # Get articles for testing
        success, articles = self.run_test("Get Articles for Stock Testing", "GET", "articles?active_only=true", 200)
        if not success or not articles:
            print("❌ Cannot test article stock without articles")
            return
        
        test_article = articles[0]
        article_id = test_article['id']
        
        # Enable stock tracking on an article
        if container_unit_id:
            stock_settings = {
                "track_stock": True,
                "stock_unit_id": container_unit_id,
                "stock_warning_threshold": 50,
                "stock_sold_out_behavior": "mark"
            }
            
            success, updated_article = self.run_test("Enable Stock Tracking", "PUT", f"articles/{article_id}", 200, stock_settings, auth=True)
            if success and updated_article:
                if updated_article.get('track_stock') == True:
                    print("   ✅ Stock tracking enabled successfully")
                else:
                    print("   ❌ Stock tracking not enabled")
                    self.failed_tests.append({
                        "test": "Enable Stock Tracking",
                        "error": "track_stock not set to true"
                    })
            
            # Set initial stock
            initial_stock = {
                "large_units": 5,
                "small_units": 10,
                "set_as_initial": True
            }
            
            success, stock_updated = self.run_test("Set Initial Stock", "PUT", f"articles/{article_id}/stock", 200, initial_stock, auth=True)
            if success and stock_updated:
                large_units = stock_updated.get('stock_large_units', 0)
                small_units = stock_updated.get('stock_small_units', 0)
                if large_units == 5 and small_units == 10:
                    print(f"   ✅ Initial stock set: {large_units} large units, {small_units} small units")
                else:
                    print(f"   ❌ Initial stock not set correctly: {large_units} large, {small_units} small")
                    self.failed_tests.append({
                        "test": "Set Initial Stock",
                        "expected": "5 large, 10 small",
                        "actual": f"{large_units} large, {small_units} small"
                    })
        
        # Get stock overview
        success, stock_overview = self.run_test("Get Stock Overview", "GET", "admin/stock-overview", 200, auth=True)
        if success and stock_overview:
            print(f"   Found {len(stock_overview)} articles with stock tracking")
            # Find our test article in the overview
            test_article_stock = next((item for item in stock_overview if item['article_id'] == article_id), None)
            if test_article_stock:
                total_stock = test_article_stock.get('total_stock_sales_units', 0)
                print(f"   ✅ Test article found in stock overview with {total_stock} total units")
            else:
                print("   ❌ Test article not found in stock overview")
                self.failed_tests.append({
                    "test": "Stock Overview Contains Test Article",
                    "error": "Test article not found in stock overview"
                })
        
        # TEST 3: Stock Reduction on Order
        print("\n--- Testing Stock Reduction on Order ---")
        
        # Get stands for testing
        success, stands = self.run_test("Get Stands for Stock Order Test", "GET", "stands", 200)
        if not success or not stands:
            print("❌ Cannot test stock reduction without stands")
            return
        
        # Find a stand that includes our test article
        test_stand = None
        stand_id = None
        
        for stand in stands:
            success, stand_articles = self.run_test(f"Check Stand {stand['name']} Articles", "GET", f"stands/{stand['id']}/articles", 200)
            if success and stand_articles:
                # Find our test article in this stand
                test_article_in_stand = next((art for art in stand_articles if art['id'] == article_id), None)
                if test_article_in_stand:
                    test_stand = stand
                    stand_id = stand['id']
                    print(f"   Found test article in stand: {stand['name']}")
                    break
        
        if not test_stand:
            print("   ❌ Test article not found in any stand - checking if it's a category mismatch")
            print(f"   Test article category: {test_article.get('category', 'unknown')}")
            # Try the first stand anyway
            test_stand = stands[0]
            stand_id = test_stand['id']
        
        # Get stand articles to verify stock_info is included
        success, stand_articles = self.run_test("Get Stand Articles (Before Order)", "GET", f"stands/{stand_id}/articles", 200)
        if success and stand_articles:
            # Find our test article
            test_article_in_stand = next((art for art in stand_articles if art['id'] == article_id), None)
            if test_article_in_stand:
                if test_article_in_stand.get('stock_info'):
                    initial_total_units = test_article_in_stand['stock_info'].get('total_units', 0)
                    print(f"   Initial stock for test article: {initial_total_units} units")
                    
                    # Create order to reduce stock
                    test_order = {
                        "stand_id": stand_id,
                        "stand_name": test_stand["name"],
                        "items": [
                            {
                                "article_id": article_id,
                                "article_name": test_article["name"],
                                "quantity": 3,  # Order 3 units
                                "price": test_article["price"],
                                "deposit_amount": 0,
                                "is_deposit_return": False
                            }
                        ],
                        "subtotal": test_article["price"] * 3,
                        "deposit_total": 0,
                        "deposit_return_total": 0,
                        "total": test_article["price"] * 3,
                        "created_by": "StockTestUser"
                    }
                    
                    success, created_order = self.run_test("Create Order for Stock Reduction", "POST", "orders", 200, test_order)
                    if success and created_order:
                        print(f"   Created order with 3 units of test article")
                        
                        # Check stock after order
                        success, stand_articles_after = self.run_test("Get Stand Articles (After Order)", "GET", f"stands/{stand_id}/articles", 200)
                        if success and stand_articles_after:
                            test_article_after = next((art for art in stand_articles_after if art['id'] == article_id), None)
                            if test_article_after and test_article_after.get('stock_info'):
                                final_total_units = test_article_after['stock_info'].get('total_units', 0)
                                expected_final = initial_total_units - 3
                                
                                if final_total_units == expected_final:
                                    print(f"   ✅ Stock reduced correctly: {initial_total_units} → {final_total_units} units")
                                else:
                                    print(f"   ❌ Stock reduction incorrect: expected {expected_final}, got {final_total_units}")
                                    self.failed_tests.append({
                                        "test": "Stock Reduction on Order",
                                        "expected": expected_final,
                                        "actual": final_total_units
                                    })
                            else:
                                print("   ❌ No stock_info found after order")
                                self.failed_tests.append({
                                    "test": "Stock Info After Order",
                                    "error": "stock_info missing from article after order"
                                })
                else:
                    print("   ❌ Test article found but missing stock_info")
                    self.failed_tests.append({
                        "test": "Stock Info in Stand Articles",
                        "error": "Test article found but missing stock_info"
                    })
            else:
                print("   ❌ Test article not found in stand articles")
                print(f"   Available articles in stand: {[art['name'] for art in stand_articles[:5]]}")
                self.failed_tests.append({
                    "test": "Stock Info in Stand Articles",
                    "error": "Test article not found in stand articles"
                })
        
        # TEST 4: Test OneManShow (direct_complete) stock reduction
        print("\n--- Testing OneManShow Stock Reduction ---")
        
        onemanshow_order = {
            "stand_id": stand_id,
            "stand_name": test_stand["name"],
            "items": [
                {
                    "article_id": article_id,
                    "article_name": test_article["name"],
                    "quantity": 2,  # Order 2 more units
                    "price": test_article["price"],
                    "deposit_amount": 0,
                    "is_deposit_return": False
                }
            ],
            "subtotal": test_article["price"] * 2,
            "deposit_total": 0,
            "deposit_return_total": 0,
            "total": test_article["price"] * 2,
            "created_by": "OneManShowUser",
            "direct_complete": True  # This should complete immediately
        }
        
        success, onemanshow_created = self.run_test("Create OneManShow Order", "POST", "orders", 200, onemanshow_order)
        if success and onemanshow_created:
            if onemanshow_created.get('status') == 'completed':
                print("   ✅ OneManShow order completed immediately")
            else:
                print(f"   ❌ OneManShow order status incorrect: {onemanshow_created.get('status')}")
                self.failed_tests.append({
                    "test": "OneManShow Order Status",
                    "expected": "completed",
                    "actual": onemanshow_created.get('status')
                })
        
        # TEST 5: Test delete stock unit that's in use (should fail)
        print("\n--- Testing Stock Unit Deletion Protection ---")
        
        if container_unit_id:
            success, delete_response = self.run_test("Delete Stock Unit In Use", "DELETE", f"stock-units/{container_unit_id}", 400, auth=True)
            if success:
                print("   ✅ Stock unit deletion correctly prevented (unit in use)")
            else:
                print("   ❌ Stock unit deletion should have failed but didn't")
        
        # Clean up - remove stock tracking from test article so we can delete the unit
        if container_unit_id:
            cleanup_settings = {
                "track_stock": False,
                "stock_unit_id": None,
                "stock_large_units": 0,
                "stock_small_units": 0
            }
            success, cleaned_article = self.run_test("Disable Stock Tracking for Cleanup", "PUT", f"articles/{article_id}", 200, cleanup_settings, auth=True)
            if success and cleaned_article:
                print(f"   Cleaned up article: track_stock={cleaned_article.get('track_stock')}, stock_unit_id={cleaned_article.get('stock_unit_id')}")
            
            # Try to delete the stock unit - may fail if other articles still reference it
            success, delete_response = self.run_test("Delete Stock Unit After Cleanup", "DELETE", f"stock-units/{container_unit_id}", [200, 400], auth=True)
            if success:
                print("   ✅ Stock unit deleted successfully or correctly prevented (other articles may still reference it)")
            else:
                print("   ⚠️ Stock unit deletion test failed unexpectedly")
        
        # Also clean up the barrel unit
        if barrel_unit_id:
            success, delete_barrel = self.run_test("Delete Barrel Stock Unit", "DELETE", f"stock-units/{barrel_unit_id}", [200, 400], auth=True)
            if success:
                print("   ✅ Barrel stock unit deletion test completed")
        
        print("   🎯 Stock/Inventory Management testing completed")

    def test_new_features_message_456(self):
        """Test newly implemented features from user message #456"""
        print("\n=== TESTING NEW FEATURES (Message #456) ===")
        
        # First, ensure we have test data
        self.run_test("Seed Data for New Features", "POST", "seed", 200)
        
        # Get stands and articles for testing
        success, stands = self.run_test("Get Stands for New Features", "GET", "stands", 200)
        if not success or not stands:
            print("❌ Cannot test new features without stands")
            return
            
        success, articles = self.run_test("Get Articles for New Features", "GET", "articles?active_only=true", 200)
        if not success or not articles:
            print("❌ Cannot test new features without articles")
            return
            
        test_stand = stands[0]
        test_article = articles[0] if articles else None
        
        if not test_article:
            print("❌ No articles available for testing new features")
            return
        
        # Create a test order that we can complete and then reclaim
        test_order = {
            "stand_id": test_stand["id"],
            "stand_name": test_stand["name"],
            "items": [
                {
                    "article_id": test_article["id"],
                    "article_name": test_article["name"],
                    "quantity": 1,
                    "price": test_article["price"],
                    "deposit_amount": 0,
                    "is_deposit_return": False
                }
            ],
            "subtotal": test_article["price"],
            "deposit_total": 0,
            "deposit_return_total": 0,
            "total": test_article["price"],
            "created_by": "TestUser"
        }
        
        success, created_order = self.run_test("Create Test Order for New Features", "POST", "orders", 200, test_order)
        
        if not success or not created_order:
            print("❌ Cannot test new features without creating test order")
            return
            
        order_id = created_order.get('id')
        print(f"   Created test order with ID: {order_id}")
        
        # Complete the order so we can test reclaim functionality
        complete_update = {
            "status": "completed",
            "updated_by": "TestAusgabe"
        }
        success, completed_order = self.run_test("Complete Test Order", "PUT", f"orders/{order_id}/status", 200, complete_update)
        
        if success:
            print("   Order completed successfully")
            
            # TEST 1: GET /api/stands/{stand_id}/completed-orders
            success, completed_orders = self.run_test(
                "Get Completed Orders for Stand", 
                "GET", 
                f"stands/{test_stand['id']}/completed-orders", 
                200
            )
            
            if success and completed_orders:
                print(f"   Found {len(completed_orders)} completed orders")
                # Verify our test order is in the list
                found_order = any(order.get('id') == order_id for order in completed_orders)
                if found_order:
                    print("   ✅ Test order found in completed orders list")
                else:
                    print("   ❌ Test order not found in completed orders list")
                    self.failed_tests.append({
                        "test": "Verify Test Order in Completed List",
                        "error": "Created order not found in completed orders"
                    })
            
            # TEST 2: PUT /api/orders/{order_id}/reclaim
            success, reclaimed_order = self.run_test(
                "Reclaim Completed Order", 
                "PUT", 
                f"orders/{order_id}/reclaim", 
                200
            )
            
            if success and reclaimed_order:
                if reclaimed_order.get('status') == 'ready':
                    print("   ✅ Order successfully reclaimed (status changed to 'ready')")
                else:
                    print(f"   ❌ Order reclaim failed - status is '{reclaimed_order.get('status')}', expected 'ready'")
                    self.failed_tests.append({
                        "test": "Verify Reclaim Status Change",
                        "expected": "ready",
                        "actual": reclaimed_order.get('status')
                    })
        
        # TEST 3: GET /api/admin/orders (with admin auth)
        success, admin_orders_response = self.run_test(
            "Get Admin Orders (Paginated)", 
            "GET", 
            "admin/orders?limit=10&offset=0", 
            200, 
            auth=True
        )
        
        if success and admin_orders_response:
            orders_list = admin_orders_response.get('orders', [])
            total_count = admin_orders_response.get('total', 0)
            limit = admin_orders_response.get('limit', 0)
            offset = admin_orders_response.get('offset', 0)
            
            print(f"   ✅ Admin orders endpoint returned {len(orders_list)} orders")
            print(f"   Total count: {total_count}, Limit: {limit}, Offset: {offset}")
            
            # Verify pagination structure
            if 'orders' in admin_orders_response and 'total' in admin_orders_response:
                print("   ✅ Pagination structure correct (orders, total, limit, offset)")
            else:
                print("   ❌ Pagination structure incorrect")
                self.failed_tests.append({
                    "test": "Admin Orders Pagination Structure",
                    "error": "Missing required pagination fields"
                })
        
        # Test unauthorized access to admin orders
        self.run_test("Get Admin Orders (No Auth)", "GET", "admin/orders", 401)
        
        # TEST 4: DELETE /api/admin/orders/{order_id} (with admin auth)
        if order_id:
            success, delete_response = self.run_test(
                "Delete Order (Admin)", 
                "DELETE", 
                f"admin/orders/{order_id}", 
                200, 
                auth=True
            )
            
            if success and delete_response:
                if delete_response.get('message') and 'gelöscht' in delete_response.get('message', ''):
                    print("   ✅ Order successfully deleted")
                else:
                    print("   ❌ Order deletion response unexpected")
                    self.failed_tests.append({
                        "test": "Verify Order Deletion Response",
                        "error": "Unexpected deletion response message"
                    })
                
                # Verify order is actually deleted
                success, get_deleted = self.run_test(
                    "Verify Order Deleted", 
                    "GET", 
                    f"orders/{order_id}", 
                    404
                )
                
                if success:
                    print("   ✅ Deleted order correctly returns 404")
        
        # Test unauthorized access to delete orders
        # Create another order for unauthorized delete test
        success, another_order = self.run_test("Create Order for Unauthorized Delete Test", "POST", "orders", 200, test_order)
        if success and another_order:
            another_order_id = another_order.get('id')
            self.run_test("Delete Order (No Auth)", "DELETE", f"admin/orders/{another_order_id}", 401)
        
        print("   🎯 New features testing completed")

    def test_stock_management_features(self):
        """Test new stock management features from review request"""
        print("\n=== TESTING NEW STOCK MANAGEMENT FEATURES ===")
        
        # First, ensure we have test data
        self.run_test("Seed Data for Stock Management", "POST", "seed", 200)
        
        # Get articles to find one with track_stock=true
        success, articles = self.run_test("Get Articles for Stock Management", "GET", "articles", 200)
        if not success or not articles:
            print("❌ Cannot test stock management without articles")
            return
        
        # Find or create an article with stock tracking
        stock_article = None
        for article in articles:
            if article.get("track_stock"):
                stock_article = article
                break
        
        if not stock_article:
            # Enable stock tracking on the first article
            test_article = articles[0]
            article_id = test_article['id']
            
            # First create a stock unit for testing
            test_stock_unit = {
                "name": "Test Kiste 24x0.5l",
                "unit_type": "container",
                "units_per_container": 24,
                "volume_per_unit": 0.5,
                "large_unit_name": "Kiste",
                "small_unit_name": "Flasche"
            }
            
            success, created_unit = self.run_test("Create Stock Unit for Testing", "POST", "stock-units", 200, test_stock_unit, auth=True)
            if not success or not created_unit:
                print("❌ Cannot create stock unit for testing")
                return
            
            unit_id = created_unit.get('id')
            
            # Enable stock tracking
            stock_settings = {
                "track_stock": True,
                "stock_unit_id": unit_id,
                "stock_large_units": 5,
                "stock_small_units": 10,
                "stock_initial_large": 5,
                "stock_initial_small": 10,
                "stock_warning_threshold": 20
            }
            
            success, updated_article = self.run_test("Enable Stock Tracking", "PUT", f"articles/{article_id}", 200, stock_settings, auth=True)
            if success and updated_article:
                stock_article = updated_article
                print(f"   ✅ Enabled stock tracking on article: {stock_article['name']}")
            else:
                print("❌ Failed to enable stock tracking")
                return
        else:
            article_id = stock_article['id']
            print(f"   Found article with stock tracking: {stock_article['name']}")
        
        # TEST 1: Stock Restock API (Add Mode)
        print("\n--- Testing Stock Restock API (Add Mode) ---")
        
        # Get current stock levels
        success, current_article = self.run_test("Get Current Article Stock", "GET", f"articles", 200)
        if success and current_article:
            current_article = next((art for art in current_article if art['id'] == article_id), None)
            if current_article:
                initial_large = current_article.get('stock_large_units', 0)
                initial_small = current_article.get('stock_small_units', 0)
                print(f"   Current stock: {initial_large} large units, {initial_small} small units")
                
                # Test adding stock with mode="add"
                add_stock_data = {
                    "large_units": 2,
                    "small_units": 5,
                    "mode": "add",
                    "set_as_initial": True
                }
                
                success, updated_stock = self.run_test("Add Stock (Add Mode)", "PUT", f"articles/{article_id}/stock", 200, add_stock_data, auth=True)
                if success and updated_stock:
                    new_large = updated_stock.get('stock_large_units', 0)
                    new_small = updated_stock.get('stock_small_units', 0)
                    new_initial_large = updated_stock.get('stock_initial_large', 0)
                    new_initial_small = updated_stock.get('stock_initial_small', 0)
                    
                    expected_large = initial_large + 2
                    expected_small = initial_small + 5
                    
                    if new_large == expected_large and new_small == expected_small:
                        print(f"   ✅ Stock added correctly: {initial_large}+2={new_large} large, {initial_small}+5={new_small} small")
                        if add_stock_data["set_as_initial"]:
                            expected_initial_large = current_article.get('stock_initial_large', 0) + 2
                            expected_initial_small = current_article.get('stock_initial_small', 0) + 5
                            if new_initial_large == expected_initial_large and new_initial_small == expected_initial_small:
                                print(f"   ✅ Initial stock updated correctly: {new_initial_large} large, {new_initial_small} small")
                            else:
                                print(f"   ❌ Initial stock not updated correctly")
                                self.failed_tests.append({
                                    "test": "Stock Add Mode - Initial Stock Update",
                                    "expected": f"{expected_initial_large} large, {expected_initial_small} small",
                                    "actual": f"{new_initial_large} large, {new_initial_small} small"
                                })
                    else:
                        print(f"   ❌ Stock not added correctly: expected {expected_large} large, {expected_small} small, got {new_large} large, {new_small} small")
                        self.failed_tests.append({
                            "test": "Stock Add Mode",
                            "expected": f"{expected_large} large, {expected_small} small",
                            "actual": f"{new_large} large, {new_small} small"
                        })
        
        # TEST 2: Stock Reset API - Sales Only
        print("\n--- Testing Stock Reset API - Sales Only ---")
        
        reset_sales_data = {
            "pin": "200183",
            "reset_type": "sales"
        }
        
        success, reset_response = self.run_test("Reset Stock - Sales Only", "POST", "admin/stock/reset", 200, reset_sales_data, auth=True)
        if success and reset_response:
            articles_reset = reset_response.get('articles_reset', 0)
            message = reset_response.get('message', '')
            
            if articles_reset > 0 and 'Verkäufe zurückgesetzt' in message:
                print(f"   ✅ Sales reset successful: {articles_reset} articles reset")
                
                # Verify that current stock was reset to initial stock
                success, reset_article = self.run_test("Verify Sales Reset", "GET", "articles", 200)
                if success and reset_article:
                    reset_article = next((art for art in reset_article if art['id'] == article_id), None)
                    if reset_article:
                        current_large = reset_article.get('stock_large_units', 0)
                        current_small = reset_article.get('stock_small_units', 0)
                        initial_large = reset_article.get('stock_initial_large', 0)
                        initial_small = reset_article.get('stock_initial_small', 0)
                        
                        if current_large == initial_large and current_small == initial_small:
                            print(f"   ✅ Current stock reset to initial: {current_large} large, {current_small} small")
                        else:
                            print(f"   ❌ Stock not reset correctly: current {current_large}/{current_small}, initial {initial_large}/{initial_small}")
                            self.failed_tests.append({
                                "test": "Stock Reset - Sales Only Verification",
                                "error": "Current stock not reset to initial stock"
                            })
            else:
                print(f"   ❌ Sales reset failed: {articles_reset} articles reset, message: {message}")
                self.failed_tests.append({
                    "test": "Stock Reset - Sales Only",
                    "error": f"Unexpected response: {reset_response}"
                })
        
        # TEST 3: Stock Reset API - All
        print("\n--- Testing Stock Reset API - All ---")
        
        reset_all_data = {
            "pin": "200183",
            "reset_type": "all"
        }
        
        success, reset_all_response = self.run_test("Reset Stock - All", "POST", "admin/stock/reset", 200, reset_all_data, auth=True)
        if success and reset_all_response:
            articles_reset = reset_all_response.get('articles_reset', 0)
            message = reset_all_response.get('message', '')
            
            if articles_reset > 0 and 'komplett zurückgesetzt' in message:
                print(f"   ✅ Complete reset successful: {articles_reset} articles reset")
                
                # Verify that all stock values are now 0
                success, reset_all_article = self.run_test("Verify Complete Reset", "GET", "articles", 200)
                if success and reset_all_article:
                    reset_all_article = next((art for art in reset_all_article if art['id'] == article_id), None)
                    if reset_all_article:
                        current_large = reset_all_article.get('stock_large_units', 0)
                        current_small = reset_all_article.get('stock_small_units', 0)
                        initial_large = reset_all_article.get('stock_initial_large', 0)
                        initial_small = reset_all_article.get('stock_initial_small', 0)
                        
                        if current_large == 0 and current_small == 0 and initial_large == 0 and initial_small == 0:
                            print(f"   ✅ All stock values reset to 0")
                        else:
                            print(f"   ❌ Stock not completely reset: current {current_large}/{current_small}, initial {initial_large}/{initial_small}")
                            self.failed_tests.append({
                                "test": "Stock Reset - All Verification",
                                "error": "Stock values not all reset to 0"
                            })
            else:
                print(f"   ❌ Complete reset failed: {articles_reset} articles reset, message: {message}")
                self.failed_tests.append({
                    "test": "Stock Reset - All",
                    "error": f"Unexpected response: {reset_all_response}"
                })
        
        # Reset stock for next test
        reset_stock_for_admin_test = {
            "large_units": 3,
            "small_units": 7,
            "set_as_initial": True,
            "mode": "set"
        }
        self.run_test("Reset Stock for Admin Test", "PUT", f"articles/{article_id}/stock", 200, reset_stock_for_admin_test, auth=True)
        
        # TEST 4: Admin Reset includes stock reset
        print("\n--- Testing Admin Reset includes stock reset ---")
        
        admin_reset_data = {
            "pin": "200183"
        }
        
        success, admin_reset_response = self.run_test("Admin Reset", "POST", "admin/reset", 200, admin_reset_data, auth=True)
        if success and admin_reset_response:
            orders_deleted = admin_reset_response.get('orders_deleted', 0)
            stock_reset = admin_reset_response.get('stock_reset', 0)
            message = admin_reset_response.get('message', '')
            
            if 'stock_reset' in admin_reset_response and stock_reset > 0:
                print(f"   ✅ Admin reset includes stock reset: {stock_reset} articles reset")
                
                # Verify that current stock was reset to initial stock
                success, admin_reset_article = self.run_test("Verify Admin Reset Stock", "GET", "articles", 200)
                if success and admin_reset_article:
                    admin_reset_article = next((art for art in admin_reset_article if art['id'] == article_id), None)
                    if admin_reset_article:
                        current_large = admin_reset_article.get('stock_large_units', 0)
                        current_small = admin_reset_article.get('stock_small_units', 0)
                        initial_large = admin_reset_article.get('stock_initial_large', 0)
                        initial_small = admin_reset_article.get('stock_initial_small', 0)
                        
                        if current_large == initial_large and current_small == initial_small:
                            print(f"   ✅ Admin reset correctly reset stock to initial values")
                        else:
                            print(f"   ❌ Admin reset did not reset stock correctly")
                            self.failed_tests.append({
                                "test": "Admin Reset - Stock Reset Verification",
                                "error": "Stock not reset to initial values"
                            })
            else:
                print(f"   ❌ Admin reset response missing stock_reset: {admin_reset_response}")
                self.failed_tests.append({
                    "test": "Admin Reset - Stock Reset",
                    "error": "stock_reset field missing or 0 in response"
                })
        
        # TEST 5: Wrong PIN handling
        print("\n--- Testing Wrong PIN handling ---")
        
        wrong_pin_data = {
            "pin": "wrong_pin",
            "reset_type": "sales"
        }
        
        success, wrong_pin_response = self.run_test("Stock Reset with Wrong PIN", "POST", "admin/stock/reset", 403, wrong_pin_data, auth=True)
        if success:
            print("   ✅ Wrong PIN correctly rejected with 403 status")
        else:
            print("   ❌ Wrong PIN should return 403 status")
        
        # Test wrong PIN for admin reset
        wrong_admin_pin_data = {
            "pin": "wrong_pin"
        }
        
        success, wrong_admin_pin_response = self.run_test("Admin Reset with Wrong PIN", "POST", "admin/reset", 403, wrong_admin_pin_data, auth=True)
        if success:
            print("   ✅ Wrong PIN for admin reset correctly rejected with 403 status")
        else:
            print("   ❌ Wrong PIN for admin reset should return 403 status")
        
        print("   🎯 Stock Management Features testing completed")

    def test_event_management_features(self):
        """Test Event Management features from review request"""
        print("\n=== TESTING EVENT MANAGEMENT FEATURES ===")
        
        # First, ensure we have test data
        self.run_test("Seed Data for Event Management", "POST", "seed", 200)
        
        # TEST 1: Event CRUD Operations
        print("\n--- Testing Event CRUD Operations ---")
        
        # Get existing events
        success, events = self.run_test("Get All Events", "GET", "events", 200)
        if success:
            print(f"   Found {len(events)} existing events")
        
        # Create a new event
        from datetime import datetime, timedelta
        today = datetime.now()
        tomorrow = today + timedelta(days=1)
        next_week = today + timedelta(days=7)
        
        test_event = {
            "name": "Oktoberfest München 2024",
            "description": "Das größte Volksfest der Welt",
            "start_date": tomorrow.isoformat(),
            "end_date": next_week.isoformat()
        }
        
        success, created_event = self.run_test("Create Event", "POST", "events", 200, test_event, auth=True)
        event_id = None
        if success and created_event:
            event_id = created_event.get('id')
            event_status = created_event.get('status')
            print(f"   Created event with ID: {event_id}, Status: {event_status}")
            
            # Verify status is calculated correctly (should be 'planned' since start is tomorrow)
            if event_status == 'planned':
                print("   ✅ Event status correctly calculated as 'planned'")
            else:
                print(f"   ❌ Event status incorrect: expected 'planned', got '{event_status}'")
                self.failed_tests.append({
                    "test": "Event Status Calculation",
                    "expected": "planned",
                    "actual": event_status
                })
        
        # Get single event
        if event_id:
            success, single_event = self.run_test("Get Single Event", "GET", f"events/{event_id}", 200)
            if success and single_event:
                if single_event.get('id') == event_id:
                    print("   ✅ Single event retrieved successfully")
                else:
                    print("   ❌ Single event retrieval failed")
                    self.failed_tests.append({
                        "test": "Get Single Event",
                        "error": "Event ID mismatch"
                    })
        
        # Update event
        if event_id:
            update_data = {
                "description": "Das größte Volksfest der Welt - Updated",
                "status": "active"
            }
            success, updated_event = self.run_test("Update Event", "PUT", f"events/{event_id}", 200, update_data, auth=True)
            if success and updated_event:
                if updated_event.get('description') == update_data['description']:
                    print("   ✅ Event updated successfully")
                else:
                    print("   ❌ Event update failed")
                    self.failed_tests.append({
                        "test": "Update Event",
                        "error": "Description not updated"
                    })
        
        # TEST 2: Active Event Detection
        print("\n--- Testing Active Event Detection ---")
        
        # Create an active event (today to next week)
        active_event = {
            "name": "Karnbachs Fest 2024",
            "description": "Aktuelles Event",
            "start_date": today.isoformat(),
            "end_date": next_week.isoformat()
        }
        
        success, created_active = self.run_test("Create Active Event", "POST", "events", 200, active_event, auth=True)
        active_event_id = None
        if success and created_active:
            active_event_id = created_active.get('id')
            print(f"   Created active event with ID: {active_event_id}")
        
        # Get active event
        success, active_response = self.run_test("Get Active Event", "GET", "events/active", 200)
        if success and active_response:
            if active_response.get('event'):
                active_event_data = active_response['event']
                print(f"   ✅ Active event found: {active_event_data.get('name')}")
                if active_event_data.get('id') == active_event_id:
                    print("   ✅ Correct active event returned")
                else:
                    print("   ❌ Wrong active event returned")
                    self.failed_tests.append({
                        "test": "Get Active Event",
                        "error": "Wrong event returned as active"
                    })
            else:
                print("   ❌ No active event found")
                self.failed_tests.append({
                    "test": "Get Active Event",
                    "error": "No active event in response"
                })
        
        # TEST 3: Event Statistics
        print("\n--- Testing Event Statistics ---")
        
        if active_event_id:
            # Create some orders for the active event to generate statistics
            success, stands = self.run_test("Get Stands for Event Orders", "GET", "stands", 200)
            success, articles = self.run_test("Get Articles for Event Orders", "GET", "articles?active_only=true", 200)
            
            if success and stands and articles:
                test_stand = stands[0]
                test_article = articles[0]
                
                # Create test orders that should be assigned to the active event
                for i in range(3):
                    test_order = {
                        "stand_id": test_stand["id"],
                        "stand_name": test_stand["name"],
                        "items": [
                            {
                                "article_id": test_article["id"],
                                "article_name": test_article["name"],
                                "quantity": 2,
                                "price": test_article["price"],
                                "deposit_amount": 0,
                                "is_deposit_return": False
                            }
                        ],
                        "subtotal": test_article["price"] * 2,
                        "deposit_total": 0,
                        "deposit_return_total": 0,
                        "total": test_article["price"] * 2,
                        "created_by": f"EventTestUser{i+1}"
                    }
                    
                    success, created_order = self.run_test(f"Create Event Order {i+1}", "POST", "orders", 200, test_order)
                    if success and created_order:
                        # Verify order has event_id assigned
                        order_event_id = created_order.get('event_id')
                        if order_event_id == active_event_id:
                            print(f"   ✅ Order {i+1} correctly assigned to active event")
                        else:
                            print(f"   ❌ Order {i+1} not assigned to active event: {order_event_id}")
                            self.failed_tests.append({
                                "test": f"Order {i+1} Event Assignment",
                                "expected": active_event_id,
                                "actual": order_event_id
                            })
            
            # Get event statistics
            success, event_stats = self.run_test("Get Event Statistics", "GET", f"events/{active_event_id}/stats", 200, auth=True)
            if success and event_stats:
                summary = event_stats.get('summary', {})
                total_orders = summary.get('total_orders', 0)
                total_revenue = summary.get('total_revenue', 0)
                top_articles = event_stats.get('top_articles', [])
                orders_by_hour = event_stats.get('orders_by_hour', {})
                orders_by_day = event_stats.get('orders_by_day', {})
                orders_by_stand = event_stats.get('orders_by_stand', {})
                
                print(f"   ✅ Event statistics retrieved:")
                print(f"      Total orders: {total_orders}")
                print(f"      Total revenue: {total_revenue}")
                print(f"      Top articles: {len(top_articles)}")
                print(f"      Hourly data points: {len(orders_by_hour)}")
                print(f"      Daily data points: {len(orders_by_day)}")
                print(f"      Stand data points: {len(orders_by_stand)}")
                
                if total_orders >= 3:  # We created 3 orders
                    print("   ✅ Event statistics show expected order count")
                else:
                    print(f"   ❌ Event statistics show unexpected order count: {total_orders}")
                    self.failed_tests.append({
                        "test": "Event Statistics Order Count",
                        "expected": ">=3",
                        "actual": total_orders
                    })
        
        # TEST 4: Event Filters in Stats and Orders
        print("\n--- Testing Event Filters ---")
        
        if active_event_id:
            # Test stats overview with event filter
            stats_filter = {
                "start_date": None,
                "end_date": None,
                "stand_id": None,
                "role": None,
                "event_id": active_event_id
            }
            
            success, filtered_stats = self.run_test("Get Stats Overview with Event Filter", "POST", "stats/overview", 200, stats_filter, auth=True)
            if success and filtered_stats:
                filtered_orders = filtered_stats.get('total_orders', 0)
                print(f"   ✅ Stats overview with event filter: {filtered_orders} orders")
                
                if filtered_orders >= 3:  # Should show our test orders
                    print("   ✅ Event filter working in stats overview")
                else:
                    print(f"   ❌ Event filter not working in stats overview: {filtered_orders}")
                    self.failed_tests.append({
                        "test": "Stats Overview Event Filter",
                        "expected": ">=3",
                        "actual": filtered_orders
                    })
            
            # Test stats orders with event filter
            success, filtered_orders_list = self.run_test("Get Stats Orders with Event Filter", "GET", f"stats/orders?event_id={active_event_id}", 200, auth=True)
            if success and filtered_orders_list:
                print(f"   ✅ Stats orders with event filter: {len(filtered_orders_list)} orders")
                
                # Verify all orders have the correct event_id
                correct_event_orders = [o for o in filtered_orders_list if o.get('event_id') == active_event_id]
                if len(correct_event_orders) == len(filtered_orders_list):
                    print("   ✅ All filtered orders have correct event_id")
                else:
                    print(f"   ❌ Some filtered orders have wrong event_id")
                    self.failed_tests.append({
                        "test": "Stats Orders Event Filter",
                        "error": "Some orders have wrong event_id"
                    })
            
            # Test admin orders with event filter
            success, admin_filtered_orders = self.run_test("Get Admin Orders with Event Filter", "GET", f"admin/orders?event_id={active_event_id}", 200, auth=True)
            if success and admin_filtered_orders:
                admin_orders_list = admin_filtered_orders.get('orders', [])
                print(f"   ✅ Admin orders with event filter: {len(admin_orders_list)} orders")
                
                # Verify all orders have the correct event_id
                correct_admin_orders = [o for o in admin_orders_list if o.get('event_id') == active_event_id]
                if len(correct_admin_orders) == len(admin_orders_list):
                    print("   ✅ All admin filtered orders have correct event_id")
                else:
                    print(f"   ❌ Some admin filtered orders have wrong event_id")
                    self.failed_tests.append({
                        "test": "Admin Orders Event Filter",
                        "error": "Some orders have wrong event_id"
                    })
        
        # TEST 5: Event Deletion
        print("\n--- Testing Event Deletion ---")
        
        if event_id:
            success, delete_response = self.run_test("Delete Event", "DELETE", f"events/{event_id}", 200, auth=True)
            if success and delete_response:
                if 'gelöscht' in delete_response.get('message', ''):
                    print("   ✅ Event deleted successfully")
                    
                    # Verify event is actually deleted
                    success, get_deleted = self.run_test("Verify Event Deleted", "GET", f"events/{event_id}", 404)
                    if success:
                        print("   ✅ Deleted event correctly returns 404")
                    else:
                        print("   ❌ Deleted event still accessible")
                        self.failed_tests.append({
                            "test": "Verify Event Deletion",
                            "error": "Deleted event still accessible"
                        })
                else:
                    print("   ❌ Event deletion response unexpected")
                    self.failed_tests.append({
                        "test": "Event Deletion Response",
                        "error": "Unexpected deletion response"
                    })
        
        # Clean up active event
        if active_event_id:
            self.run_test("Clean Up Active Event", "DELETE", f"events/{active_event_id}", 200, auth=True)
        
        # TEST 6: Unauthorized Access
        print("\n--- Testing Unauthorized Access ---")
        
        # Test creating event without auth
        self.run_test("Create Event (No Auth)", "POST", "events", 401, test_event)
        
        # Test updating event without auth
        if event_id:
            self.run_test("Update Event (No Auth)", "PUT", f"events/{event_id}", 401, {"name": "Unauthorized"})
        
        # Test deleting event without auth
        if event_id:
            self.run_test("Delete Event (No Auth)", "DELETE", f"events/{event_id}", 401)
        
        # Test event stats without auth
        if active_event_id:
            self.run_test("Get Event Stats (No Auth)", "GET", f"events/{active_event_id}/stats", 401)
        
        print("   🎯 Event Management Features testing completed")

    def run_all_tests(self):
        """Run all test suites"""
        print("🚀 Starting Festival Order Management API Tests")
        print(f"Testing against: {self.base_url}")
        
        try:
            self.test_basic_endpoints()
            self.test_article_management()
            self.test_order_workflow()
            self.test_admin_authentication()
            self.test_statistics()
            self.test_stock_inventory_management()  # Add stock inventory management test
            self.test_new_features_message_456()  # Add new features test
            self.test_stock_management_features()  # Add new stock management features test
            self.test_event_management_features()  # Add event management features test
            
        except KeyboardInterrupt:
            print("\n⚠️ Tests interrupted by user")
            
        # Print final results
        print(f"\n📊 Test Results:")
        print(f"   Tests run: {self.tests_run}")
        print(f"   Tests passed: {self.tests_passed}")
        print(f"   Tests failed: {self.tests_run - self.tests_passed}")
        print(f"   Success rate: {(self.tests_passed / self.tests_run * 100):.1f}%" if self.tests_run > 0 else "0%")
        
        if self.failed_tests:
            print(f"\n❌ Failed Tests:")
            for i, test in enumerate(self.failed_tests, 1):
                print(f"   {i}. {test.get('test', 'Unknown')}")
                if 'error' in test:
                    print(f"      Error: {test['error']}")
                else:
                    print(f"      Expected: {test.get('expected')}, Got: {test.get('actual')}")
                    if test.get('response'):
                        print(f"      Response: {test['response']}")
        
        return self.tests_passed == self.tests_run

def main():
    tester = FestivalAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())