// Test script to check students in database
const axios = require('axios');

const BASE_URL = 'http://localhost:5002';
const ADMIN_CREDENTIALS = {
  email: 'admin@example.com',
  password: 'password'
};

async function loginAndGetStudents() {
  try {
    // Login as admin
    console.log('🔐 Logging in as admin...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, ADMIN_CREDENTIALS);
    
    if (!loginResponse.data.token) {
      throw new Error('Login failed');
    }
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful');
    
    // Get all students
    console.log('\n👥 Fetching students...');
    const studentsResponse = await axios.get(`${BASE_URL}/api/admin/students`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const students = studentsResponse.data;
    console.log(`📊 Found ${students.length} students in database\n`);
    
    if (students.length === 0) {
      console.log('❌ No students found. You need to create a student first.');
      console.log('💡 Go to /admin/students/new in your admin panel to add a student');
      return;
    }
    
    // Display student information
    students.forEach((student, index) => {
      console.log(`👤 Student ${index + 1}:`);
      console.log(`   📧 Email: ${student.email}`);
      console.log(`   👤 Name: ${student.name}`);
      console.log(`   📱 Phone: ${student.phone || 'NOT SET'}`);
      console.log(`   🎯 Pathway: ${student.pathway}`);
      console.log('');
    });
    
    // Check for students without phone numbers
    const studentsWithoutPhone = students.filter(s => !s.phone);
    if (studentsWithoutPhone.length > 0) {
      console.log(`⚠️ ${studentsWithoutPhone.length} students don't have phone numbers set.`);
      console.log('💡 Add phone numbers in admin panel for WhatsApp bot to work.');
    }
    
    // Show testing instructions
    const studentsWithPhone = students.filter(s => s.phone);
    if (studentsWithPhone.length > 0) {
      console.log('\n🎯 Testing Instructions:');
      console.log('1. Use your student\'s WhatsApp to message your bot number');
      console.log('2. Your bot number is the WhatsApp account you connected');
      console.log('3. Student should send: /start');
      console.log('4. Bot will recognize them by their registered phone number');
      console.log('\n📱 Students with phone numbers ready for testing:');
      studentsWithPhone.forEach(s => {
        console.log(`   - ${s.name}: ${s.phone}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

loginAndGetStudents();
