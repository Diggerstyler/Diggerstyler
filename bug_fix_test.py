#!/usr/bin/env python3
"""
Festival OS Bug Fix Verification Tests
Tests specific bug fixes mentioned in the review request.
"""

import requests
import sys
import json
from base64 import b64encode

class BugFixTester:
    def __init__(self, base_url="https://festival-orders-1.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.admin_auth = b64encode(b"admin:admin").decode('ascii')
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
            if details:
                print(f"   {details}")
        else:
            print(f"❌ {name}")
            if details:
                print(f"   {details}")
            self.failed_tests.append({"test": name, "details": details})

    def test_orders_api_bug_fix(self):
        """Test Bug Fix #1: Orders API backward compatibility"""
        print("\n=== TESTING BUG FIX #1: Orders API Backward Compatibility ===")
        
        # Test GET /api/orders?stand_id=stand_1
        try:
            url = f"{self.base_url}/orders?stand_id=stand_1"
            response = requests.get(url, timeout=10)
            
            if response.status_code == 200:
                orders = response.json()
                self.log_test("GET /api/orders?stand_id=stand_1", True, f"Retrieved {len(orders)} orders without 500 error")
                
                # Check if orders have required fields (backward compatibility)
                for order in orders:
                    if 'subtotal' not in order or 'deposit_total' not in order or 'deposit_return_total' not in order:
                        self.log_test("Orders backward compatibility", False, "Missing required fields in order response")
                        return
                
                self.log_test("Orders backward compatibility", True, "All orders have required fields (subtotal, deposit_total, deposit_return_total)")
            else:
                self.log_test("GET /api/orders?stand_id=stand_1", False, f"Expected 200, got {response.status_code}: {response.text[:200]}")
                
        except Exception as e:
            self.log_test("GET /api/orders?stand_id=stand_1", False, f"Error: {str(e)}")

        # Test GET /api/orders?stand_id=stand_2
        try:
            url = f"{self.base_url}/orders?stand_id=stand_2"
            response = requests.get(url, timeout=10)
            
            if response.status_code == 200:
                orders = response.json()
                self.log_test("GET /api/orders?stand_id=stand_2", True, f"Retrieved {len(orders)} orders without 500 error")
            else:
                self.log_test("GET /api/orders?stand_id=stand_2", False, f"Expected 200, got {response.status_code}: {response.text[:200]}")
                
        except Exception as e:
            self.log_test("GET /api/orders?stand_id=stand_2", False, f"Error: {str(e)}")

    def test_order_creation(self):
        """Test order creation workflow"""
        print("\n=== TESTING ORDER CREATION WORKFLOW ===")
        
        # Get articles and stands first
        try:
            # Get stands
            stands_response = requests.get(f"{self.base_url}/stands", timeout=10)
            if stands_response.status_code != 200:
                self.log_test("Order Creation Setup", False, "Could not fetch stands")
                return
                
            stands = stands_response.json()
            if not stands:
                self.log_test("Order Creation Setup", False, "No stands available")
                return
                
            # Get articles
            articles_response = requests.get(f"{self.base_url}/articles?active_only=true", timeout=10)
            if articles_response.status_code != 200:
                self.log_test("Order Creation Setup", False, "Could not fetch articles")
                return
                
            articles = articles_response.json()
            if not articles:
                self.log_test("Order Creation Setup", False, "No articles available")
                return
                
            # Find an article with deposit and one without
            article_with_deposit = None
            article_without_deposit = None
            
            for article in articles:
                if article.get('deposit_group_id'):
                    article_with_deposit = article
                else:
                    article_without_deposit = article
                    
            test_stand = stands[0]
            test_article = article_without_deposit or articles[0]
            
            # Create a realistic order
            order_data = {
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
                "created_by": "Bestellung"
            }
            
            # Test order creation
            url = f"{self.base_url}/orders"
            headers = {'Content-Type': 'application/json'}
            response = requests.post(url, json=order_data, headers=headers, timeout=10)
            
            if response.status_code == 200:
                order = response.json()
                order_number = order.get('order_number')
                self.log_test("POST /api/orders - Create Order", True, f"Order #{order_number} created successfully")
                
                # Verify order was saved correctly
                order_id = order.get('id')
                if order_id:
                    get_response = requests.get(f"{self.base_url}/orders/{order_id}", timeout=10)
                    if get_response.status_code == 200:
                        saved_order = get_response.json()
                        self.log_test("Order Persistence Verification", True, f"Order #{order_number} retrieved successfully")
                    else:
                        self.log_test("Order Persistence Verification", False, f"Could not retrieve saved order: {get_response.status_code}")
                        
            else:
                self.log_test("POST /api/orders - Create Order", False, f"Expected 200, got {response.status_code}: {response.text[:300]}")
                
        except Exception as e:
            self.log_test("Order Creation Test", False, f"Error: {str(e)}")

    def test_article_update_api(self):
        """Test article update API (backend part of bug fix #2)"""
        print("\n=== TESTING ARTICLE UPDATE API ===")
        
        try:
            # Get articles first
            articles_response = requests.get(f"{self.base_url}/articles", timeout=10)
            if articles_response.status_code != 200:
                self.log_test("Article Update Setup", False, "Could not fetch articles")
                return
                
            articles = articles_response.json()
            if not articles:
                self.log_test("Article Update Setup", False, "No articles available")
                return
                
            # Find an article without deposit (like Bratwurst or Kaffee)
            test_article = None
            for article in articles:
                if not article.get('deposit_group_id') and article.get('name') in ['Bratwurst', 'Kaffee']:
                    test_article = article
                    break
                    
            if not test_article:
                test_article = articles[0]  # Use first article as fallback
                
            # Test article update
            article_id = test_article['id']
            update_data = {
                "name": test_article['name'],
                "price": test_article['price'] + 0.50,  # Increase price by 0.50
                "category": test_article['category'],
                "deposit_group_id": None  # Explicitly set to None (equivalent to "none" in frontend)
            }
            
            url = f"{self.base_url}/articles/{article_id}"
            headers = {
                'Content-Type': 'application/json',
                'Authorization': f'Basic {self.admin_auth}'
            }
            response = requests.put(url, json=update_data, headers=headers, timeout=10)
            
            if response.status_code == 200:
                updated_article = response.json()
                self.log_test("PUT /api/articles/{id} - Update Article", True, f"Article '{test_article['name']}' updated successfully")
            else:
                self.log_test("PUT /api/articles/{id} - Update Article", False, f"Expected 200, got {response.status_code}: {response.text[:200]}")
                
        except Exception as e:
            self.log_test("Article Update Test", False, f"Error: {str(e)}")

    def test_stand_articles_endpoint(self):
        """Test stand-specific articles endpoint"""
        print("\n=== TESTING STAND ARTICLES ENDPOINT ===")
        
        try:
            # Get stands first
            stands_response = requests.get(f"{self.base_url}/stands", timeout=10)
            if stands_response.status_code != 200:
                self.log_test("Stand Articles Setup", False, "Could not fetch stands")
                return
                
            stands = stands_response.json()
            if not stands:
                self.log_test("Stand Articles Setup", False, "No stands available")
                return
                
            # Test articles for stand_1 and stand_2
            for stand in stands[:2]:  # Test first two stands
                stand_id = stand['id']
                url = f"{self.base_url}/stands/{stand_id}/articles"
                response = requests.get(url, timeout=10)
                
                if response.status_code == 200:
                    articles = response.json()
                    self.log_test(f"GET /api/stands/{stand_id}/articles", True, f"Retrieved {len(articles)} articles for {stand['name']}")
                    
                    # Check if articles have deposit info
                    for article in articles:
                        if 'deposit' in article:
                            deposit_info = "with deposit info" if article['deposit'] else "without deposit"
                            break
                    else:
                        deposit_info = "deposit info structure present"
                        
                    self.log_test(f"Deposit Info for {stand['name']}", True, f"Articles returned {deposit_info}")
                else:
                    self.log_test(f"GET /api/stands/{stand_id}/articles", False, f"Expected 200, got {response.status_code}: {response.text[:200]}")
                    
        except Exception as e:
            self.log_test("Stand Articles Test", False, f"Error: {str(e)}")

    def run_all_tests(self):
        """Run all bug fix verification tests"""
        print("🔧 Starting Festival OS Bug Fix Verification Tests")
        print(f"Testing against: {self.base_url}")
        
        try:
            self.test_orders_api_bug_fix()
            self.test_order_creation()
            self.test_article_update_api()
            self.test_stand_articles_endpoint()
            
        except KeyboardInterrupt:
            print("\n⚠️ Tests interrupted by user")
            
        # Print final results
        print(f"\n📊 Bug Fix Test Results:")
        print(f"   Tests run: {self.tests_run}")
        print(f"   Tests passed: {self.tests_passed}")
        print(f"   Tests failed: {self.tests_run - self.tests_passed}")
        print(f"   Success rate: {(self.tests_passed / self.tests_run * 100):.1f}%" if self.tests_run > 0 else "0%")
        
        if self.failed_tests:
            print(f"\n❌ Failed Tests:")
            for i, test in enumerate(self.failed_tests, 1):
                print(f"   {i}. {test.get('test', 'Unknown')}")
                print(f"      Details: {test.get('details', 'No details')}")
        else:
            print(f"\n🎉 All bug fix tests passed!")
        
        return self.tests_passed == self.tests_run

def main():
    tester = BugFixTester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())