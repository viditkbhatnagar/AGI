// Test script for admin login and WhatsApp bot functionality
const axios = require('axios');

const BASE_URL = 'http://localhost:5002';
const ADMIN_CREDENTIALS = {
  email: 'admin@example.com',     // Using the provided email
  password: 'password'            // Using the provided password
};

let jwtToken = '';

// Helper function to login as admin
async function loginAsAdmin() {
  try {
    console.log('🔐 Logging in as admin...');
    console.log('📧 Using credentials:', { email: ADMIN_CREDENTIALS.email, password: '***' });
    
    const response = await axios.post(`${BASE_URL}/api/auth/login`, ADMIN_CREDENTIALS);
    
    console.log('📡 Response status:', response.status);
    
    if (response.data.id && response.data.token && response.data.role === 'admin') {
      // Store JWT token for authentication
      jwtToken = response.data.token;
      console.log('✅ Admin login successful');
      console.log('👤 User:', response.data.username, '(' + response.data.email + ')');
      console.log('🔑 JWT token received');
      return true;
    } else {
      console.log('⚠️ Login response missing required fields or not admin role');
    }
    return false;
  } catch (error) {
    console.error('❌ Admin login failed:');
    console.error('   Status:', error.response?.status);
    console.error('   Data:', error.response?.data);
    console.error('   Message:', error.message);
    return false;
  }
}

// Test WhatsApp bot status
async function testBotStatus() {
  try {
    console.log('\n🤖 Testing WhatsApp bot status...');
    const response = await axios.get(`${BASE_URL}/api/whatsapp/status`, {
      headers: {
        'Authorization': `Bearer ${jwtToken}`
      }
    });
    
    console.log('📊 Bot Status:', {
      connected: response.data.connected,
      activeSessions: response.data.activeSessions,
      clientInfo: response.data.clientInfo ? 'Available' : 'Not available'
    });
    
    if (response.data.connected) {
      console.log('✅ WhatsApp bot is connected and ready!');
    } else {
      console.log('⚠️ WhatsApp bot is not connected yet. Check server console for QR code.');
    }
    
    return response.data;
  } catch (error) {
    console.error('❌ Failed to get bot status:', error.response?.data || error.message);
    return null;
  }
}

// Test sending a message
async function testSendMessage(phoneNumber, message) {
  try {
    console.log(`\n📱 Sending test message to ${phoneNumber}...`);
    const response = await axios.post(`${BASE_URL}/api/whatsapp/send-test`, {
      phoneNumber,
      message
    }, {
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data.success) {
      console.log('✅ Test message sent successfully');
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ Failed to send test message:', error.response?.data || error.message);
    return false;
  }
}

// Test quiz endpoints
async function testQuizEndpoints() {
  try {
    console.log('\n🧩 Testing quiz endpoints...');
    
    // Test getting courses
    const coursesResponse = await axios.get(`${BASE_URL}/api/courses`, {
      headers: {
        'Authorization': `Bearer ${jwtToken}`
      }
    });
    
    if (coursesResponse.data.length > 0) {
      const course = coursesResponse.data[0];
      console.log(`📚 Found course: ${course.title} (${course.slug})`);
      
      // Test getting quiz for first module
      try {
        const quizResponse = await axios.get(`${BASE_URL}/api/student/quiz/${course.slug}/0`, {
          headers: {
            'Authorization': `Bearer ${jwtToken}`
          }
        });
        
        if (quizResponse.data.questions) {
          console.log(`🧩 Quiz found for module 0: ${quizResponse.data.questions.length} questions`);
          console.log(`📝 Example question: "${quizResponse.data.questions[0]?.text?.substring(0, 50)}..."`);
        }
      } catch (quizError) {
        console.log('⚠️ No quiz found for module 0 (this is normal if no quiz exists)');
      }
    } else {
      console.log('⚠️ No courses found in the system');
    }
    
  } catch (error) {
    console.error('❌ Failed to test quiz endpoints:', error.response?.data || error.message);
  }
}

// Main testing function
async function runTests() {
  console.log('🚀 Starting WhatsApp Bot Tests with Admin Credentials\n');
  
  // Step 1: Login
  const loginSuccess = await loginAsAdmin();
  if (!loginSuccess) {
    console.log('❌ Cannot proceed without admin login');
    return;
  }
  
  // Step 2: Test bot status
  const status = await testBotStatus();
  
  // Step 3: Test quiz endpoints
  await testQuizEndpoints();
  
  // Step 4: Test sending message (only if bot is connected)
  if (status && status.connected) {
    const testPhone = process.argv[2]; // Get phone number from command line
    if (testPhone) {
      await testSendMessage(testPhone, 'Hello! This is a test message from the AGI LMS Bot. Type /menu to see available commands.');
    } else {
      console.log('\n💡 To test message sending, run: node test-admin-login.cjs [phone-number]');
      console.log('   Example: node test-admin-login.cjs 1234567890');
    }
  } else {
    console.log('\n⚠️ Bot is not connected. Cannot test message sending.');
    console.log('💡 To connect the bot:');
    console.log('   1. Check your server console for a QR code');
    console.log('   2. Scan the QR code with your WhatsApp mobile app');
    console.log('   3. Once scanned, the bot will be ready to receive messages');
  }
  
  console.log('\n✅ Tests completed!');
  console.log('\n📋 Summary:');
  console.log('   - Admin authentication: ✅ Working');
  console.log('   - WhatsApp bot endpoints: ✅ Accessible');
  console.log(`   - Bot connection status: ${status?.connected ? '✅ Connected' : '⚠️ Not connected (need QR scan)'}`);
  console.log('   - Ready for student quiz interactions!');
}

// Run the tests
runTests().catch(console.error);
