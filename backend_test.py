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
    def __init__(self, base_url="https://festbooth-os.preview.emergentagent.com/api"):
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
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json() if response.content else {}
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}")
                self.failed_tests.append({
                    "test": name,
                    "expected": expected_status,
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
            self.test_new_features_message_456()  # Add new features test
            
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