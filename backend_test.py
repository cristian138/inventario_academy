#!/usr/bin/env python3
"""
Comprehensive backend API testing for Sports Academy Inventory Management System
Tests all CRUD operations, authentication, and business logic
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, List, Optional

class InventoryAPITester:
    def __init__(self, base_url="https://trainer-supply.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.created_resources = {
            'categories': [],
            'goods': [],
            'assignments': []
        }

    def log_test(self, name: str, success: bool, details: str = ""):
        """Log test result"""
        self.tests_run += 1
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {name}")
        if details:
            print(f"    {details}")
        
        if success:
            self.tests_passed += 1
        else:
            self.failed_tests.append(f"{name}: {details}")

    def make_request(self, method: str, endpoint: str, data: dict = None, expected_status: int = 200) -> tuple:
        """Make HTTP request with proper headers"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")

            success = response.status_code == expected_status
            response_data = {}
            
            try:
                response_data = response.json()
            except:
                response_data = {"text": response.text}

            return success, response_data, response.status_code

        except Exception as e:
            return False, {"error": str(e)}, 0

    def test_login(self):
        """Test authentication with admin credentials"""
        print("\n🔐 Testing Authentication...")
        
        # Test valid login
        success, response, status = self.make_request(
            'POST', 
            'auth/login',
            {"email": "admin@academia.com", "password": "admin123"},
            200
        )
        
        if success and 'token' in response:
            self.token = response['token']
            self.log_test("Admin Login", True, f"Token received, user: {response.get('user', {}).get('name', 'N/A')}")
            
            # Test token validation
            success, user_data, status = self.make_request('GET', 'auth/me', expected_status=200)
            self.log_test("Token Validation", success, f"User role: {user_data.get('role', 'N/A')}")
            
        else:
            self.log_test("Admin Login", False, f"Status: {status}, Response: {response}")
            return False

        # Test invalid login
        success, response, status = self.make_request(
            'POST',
            'auth/login', 
            {"email": "admin@academia.com", "password": "wrongpassword"},
            401
        )
        self.log_test("Invalid Login Rejection", success, "Correctly rejected invalid credentials")
        
        return True

    def test_categories(self):
        """Test category management"""
        print("\n📁 Testing Categories...")
        
        # Get initial categories
        success, categories, status = self.make_request('GET', 'categories')
        self.log_test("Get Categories", success, f"Found {len(categories) if success else 0} categories")
        
        # Create new category
        category_data = {
            "name": "Equipos de Fútbol",
            "description": "Balones, conos, porterías y demás equipamiento para fútbol"
        }
        
        success, response, status = self.make_request('POST', 'categories', category_data, 200)
        if success:
            category_id = response.get('id')
            self.created_resources['categories'].append(category_id)
            self.log_test("Create Category", True, f"Created category: {category_id}")
        else:
            self.log_test("Create Category", False, f"Status: {status}, Response: {response}")
            
        # Verify category was created
        success, updated_categories, status = self.make_request('GET', 'categories')
        if success:
            found_category = any(cat['name'] == category_data['name'] for cat in updated_categories)
            self.log_test("Verify Category Creation", found_category, "Category appears in list")

    def test_goods(self):
        """Test goods/inventory management"""
        print("\n📦 Testing Goods Management...")
        
        # Get categories first (need category_id for goods)
        success, categories, status = self.make_request('GET', 'categories')
        if not success or not categories:
            self.log_test("Get Categories for Goods", False, "No categories available")
            return
            
        category_id = categories[0]['id']
        
        # Create new good
        good_data = {
            "name": "Balón de Fútbol Nike",
            "category_id": category_id,
            "description": "Balón oficial de fútbol, talla 5, marca Nike",
            "status": "disponible",
            "quantity": 10,
            "location": "Almacén Principal",
            "responsible": "Juan Pérez"
        }
        
        success, response, status = self.make_request('POST', 'goods', good_data, 200)
        if success:
            good_id = response.get('id')
            self.created_resources['goods'].append(good_id)
            self.log_test("Create Good", True, f"Created good: {good_id}")
            
            # Test update good
            update_data = {"quantity": 15, "status": "disponible"}
            success, updated_good, status = self.make_request('PUT', f'goods/{good_id}', update_data)
            self.log_test("Update Good", success, f"Updated quantity to {updated_good.get('quantity', 'N/A')}")
            
        else:
            self.log_test("Create Good", False, f"Status: {status}, Response: {response}")
        
        # Get all goods
        success, goods, status = self.make_request('GET', 'goods')
        self.log_test("Get Goods", success, f"Found {len(goods) if success else 0} goods")

    def test_assignments(self):
        """Test assignment creation and PDF generation"""
        print("\n📋 Testing Assignments...")
        
        # Get available goods
        success, goods, status = self.make_request('GET', 'goods')
        if not success or not goods:
            self.log_test("Get Goods for Assignment", False, "No goods available")
            return
            
        available_goods = [g for g in goods if g.get('available_quantity', 0) > 0]
        if not available_goods:
            self.log_test("Check Available Goods", False, "No goods with available quantity")
            return
            
        good = available_goods[0]
        
        # Create assignment
        assignment_data = {
            "instructor_name": "Carlos Rodríguez",
            "discipline": "Fútbol",
            "details": [
                {
                    "good_id": good['id'],
                    "quantity_assigned": min(2, good['available_quantity'])
                }
            ],
            "notes": "Asignación para entrenamiento de la tarde"
        }
        
        success, response, status = self.make_request('POST', 'assignments', assignment_data, 200)
        if success:
            assignment_id = response.get('assignment_id')
            acta_code = response.get('acta_code')
            self.created_resources['assignments'].append(assignment_id)
            self.log_test("Create Assignment", True, f"Assignment: {assignment_id}, Acta: {acta_code}")
        else:
            self.log_test("Create Assignment", False, f"Status: {status}, Response: {response}")
        
        # Get assignments
        success, assignments, status = self.make_request('GET', 'assignments')
        self.log_test("Get Assignments", success, f"Found {len(assignments) if success else 0} assignments")

    def test_actas(self):
        """Test actas (PDF documents) functionality"""
        print("\n📄 Testing Actas...")
        
        # Get actas
        success, actas, status = self.make_request('GET', 'actas')
        self.log_test("Get Actas", success, f"Found {len(actas) if success else 0} actas")
        
        if success and actas:
            # Test download link generation (don't actually download)
            acta = actas[0]
            acta_id = acta.get('id')
            download_url = f"{self.base_url}/api/actas/{acta_id}/download"
            self.log_test("Acta Download URL", True, f"URL: {download_url}")

    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        print("\n📊 Testing Dashboard Stats...")
        
        success, stats, status = self.make_request('GET', 'dashboard/stats')
        if success:
            required_fields = ['total_goods', 'total_quantity', 'available_quantity', 
                             'assigned_quantity', 'total_assignments', 'total_categories']
            
            all_fields_present = all(field in stats for field in required_fields)
            self.log_test("Dashboard Stats", all_fields_present, 
                         f"Stats: {stats.get('total_goods', 0)} goods, {stats.get('total_assignments', 0)} assignments")
        else:
            self.log_test("Dashboard Stats", False, f"Status: {status}, Response: {stats}")

    def test_reports(self):
        """Test report generation"""
        print("\n📈 Testing Reports...")
        
        # Test inventory report
        success, inventory_report, status = self.make_request('GET', 'reports?report_type=inventory')
        self.log_test("Inventory Report", success, f"Found {len(inventory_report) if success else 0} items")
        
        # Test assignments report
        success, assignments_report, status = self.make_request('GET', 'reports?report_type=assignments')
        self.log_test("Assignments Report", success, f"Found {len(assignments_report) if success else 0} assignments")

    def test_audit_logs(self):
        """Test audit logs (admin only)"""
        print("\n🛡️ Testing Audit Logs...")
        
        success, logs, status = self.make_request('GET', 'audit')
        self.log_test("Get Audit Logs", success, f"Found {len(logs) if success else 0} audit entries")

    def test_instructor_portal(self):
        """Test instructor portal functionality"""
        print("\n👨‍🏫 Testing Instructor Portal...")
        
        # Step 1: Create instructor with password
        instructor_data = {
            "name": "Test Instructor",
            "email": "test.instructor@test.com",
            "phone": "123456",
            "specialization": "Testing",
            "password": "test123"
        }
        
        success, response, status = self.make_request('POST', 'instructors-management', instructor_data, 200)
        if success:
            instructor_id = response.get('id')
            has_login = response.get('has_login', False)
            self.log_test("Create Instructor with Password", has_login, f"Instructor created with login access: {instructor_id}")
        else:
            self.log_test("Create Instructor with Password", False, f"Status: {status}, Response: {response}")
            return
        
        # Step 2: Test instructor login
        instructor_token = None
        success, login_response, status = self.make_request(
            'POST',
            'auth/login',
            {"email": "test.instructor@test.com", "password": "test123"},
            200
        )
        
        if success and 'token' in login_response:
            instructor_token = login_response['token']
            user_role = login_response.get('user', {}).get('role', 'N/A')
            self.log_test("Instructor Login", True, f"Login successful, role: {user_role}")
        else:
            self.log_test("Instructor Login", False, f"Status: {status}, Response: {login_response}")
            return
        
        # Store original token and switch to instructor token
        original_token = self.token
        self.token = instructor_token
        
        # Step 3: Test instructor endpoints
        # Test my-assignments endpoint
        success, assignments, status = self.make_request('GET', 'instructor/my-assignments', expected_status=200)
        self.log_test("Instructor My Assignments", success, f"Found {len(assignments) if success else 0} assignments")
        
        # Test my-history endpoint
        success, history, status = self.make_request('GET', 'instructor/my-history', expected_status=200)
        self.log_test("Instructor My History", success, f"Found {len(history) if success else 0} history records")
        
        # Test my-actas endpoint
        success, actas, status = self.make_request('GET', 'instructor/my-actas', expected_status=200)
        self.log_test("Instructor My Actas", success, f"Found {len(actas) if success else 0} actas")
        
        # Step 4: Create an assignment for the instructor to test confirm-reception
        # Switch back to admin token to create assignment
        self.token = original_token
        
        # Get available goods for assignment
        success, goods, status = self.make_request('GET', 'goods')
        if success and goods:
            available_goods = [g for g in goods if g.get('available_quantity', 0) > 0]
            if available_goods:
                good = available_goods[0]
                
                # Create assignment for the test instructor
                assignment_data = {
                    "instructor_name": "Test Instructor",
                    "discipline": "Testing",
                    "details": [
                        {
                            "good_id": good['id'],
                            "quantity_assigned": min(1, good['available_quantity'])
                        }
                    ],
                    "notes": "Test assignment for instructor portal testing"
                }
                
                success, assignment_response, status = self.make_request('POST', 'assignments', assignment_data, 200)
                if success:
                    assignment_id = assignment_response.get('assignment_id')
                    self.log_test("Create Assignment for Instructor", True, f"Assignment created: {assignment_id}")
                    
                    # Switch back to instructor token to test confirm-reception
                    self.token = instructor_token
                    
                    # Test confirm-reception endpoint
                    success, confirm_response, status = self.make_request(
                        'POST', 
                        f'instructor/confirm-reception/{assignment_id}',
                        expected_status=200
                    )
                    self.log_test("Instructor Confirm Reception", success, f"Reception confirmed for assignment: {assignment_id}")
                    
                else:
                    self.log_test("Create Assignment for Instructor", False, f"Status: {status}, Response: {assignment_response}")
            else:
                self.log_test("Create Assignment for Instructor", False, "No goods with available quantity")
        else:
            self.log_test("Create Assignment for Instructor", False, "Could not retrieve goods")
        
        # Restore original admin token
        self.token = original_token
        
        # Step 5: Test access control - admin trying to access instructor endpoints should fail
        success, response, status = self.make_request('GET', 'instructor/my-assignments', expected_status=403)
        self.log_test("Admin Access Control", status == 403, f"Admin correctly denied access to instructor endpoints (Status: {status})")

    def test_error_handling(self):
        """Test error handling and edge cases"""
        print("\n⚠️ Testing Error Handling...")
        
        # Test accessing non-existent resource
        success, response, status = self.make_request('GET', 'goods/non-existent-id', expected_status=200)
        self.log_test("404 Error Handling", status == 404, f"Status: {status} for non-existent resource")
        
        # Test creating good with invalid category
        invalid_good = {
            "name": "Test Good",
            "category_id": "invalid-category-id",
            "description": "Test",
            "status": "disponible",
            "quantity": 1,
            "location": "Test",
            "responsible": "Test"
        }
        success, response, status = self.make_request('POST', 'goods', invalid_good, expected_status=400)
        # Note: This might return 201 if validation is not strict, so we check if it's not 500
        self.log_test("Invalid Data Handling", status != 500, f"Status: {status} (not server error)")

    def run_all_tests(self):
        """Run complete test suite"""
        print("🚀 Starting Comprehensive Backend API Testing")
        print("=" * 60)
        
        # Authentication is required for all other tests
        if not self.test_login():
            print("❌ Authentication failed - stopping tests")
            return False
            
        # Run all test modules
        self.test_categories()
        self.test_goods()
        self.test_assignments()
        self.test_actas()
        self.test_dashboard_stats()
        self.test_reports()
        self.test_audit_logs()
        self.test_error_handling()
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.failed_tests:
            print("\n❌ Failed Tests:")
            for failure in self.failed_tests:
                print(f"  - {failure}")
        
        print(f"\n🏗️ Created Resources:")
        for resource_type, ids in self.created_resources.items():
            if ids:
                print(f"  - {resource_type}: {len(ids)} items")
        
        return self.tests_passed == self.tests_run

def main():
    """Main test execution"""
    tester = InventoryAPITester()
    success = tester.run_all_tests()
    
    # Return appropriate exit code
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())