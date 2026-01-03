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
    def __init__(self, base_url="https://festival-orders-1.preview.emergentagent.com/api"):
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
        
        success, created_order = self.run_test("Create Order", "POST", "orders", 201, test_order)
        
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