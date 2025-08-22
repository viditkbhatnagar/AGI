// WhatsApp Bot Testing Script
// This script helps test the WhatsApp bot functionality

const axios = require('axios');

const BASE_URL = 'http://localhost:5002';
const ADMIN_CREDENTIALS = {
  username: 'admin',  // Replace with your admin username
  password: 'admin123'  // Replace with your admin password
};

let authCookie = '';

// Helper function to login as admin
async function loginAsAdmin() {
  try {
    console.log('🔐 Logging in as admin...');
    const response = await axios.post(`${BASE_URL}/api/auth/login`, ADMIN_CREDENTIALS, {
      withCredentials: true
    });
    
    if (response.data.success) {
      // Extract session cookie
      const cookies = response.headers['set-cookie'];
      if (cookies) {
        authCookie = cookies.join('; ');
        console.log('✅ Admin login successful');
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('❌ Admin login failed:', error.response?.data || error.message);
    return false;
  }
}

// Test WhatsApp bot status
async function testBotStatus() {
  try {
    console.log('\n🤖 Testing WhatsApp bot status...');
    const response = await axios.get(`${BASE_URL}/api/whatsapp/status`, {
      headers: {
        'Cookie': authCookie
      }
    });
    
    console.log('📊 Bot Status:', {
      connected: response.data.connected,
      activeSessions: response.data.activeSessions,
      clientInfo: response.data.clientInfo ? 'Available' : 'Not available'
    });
    
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
        'Cookie': authCookie,
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

// Test quiz API endpoints
async function testQuizEndpoints() {
  try {
    console.log('\n🧩 Testing quiz endpoints...');
    
    // Test getting courses
    const coursesResponse = await axios.get(`${BASE_URL}/api/courses`, {
      headers: {
        'Cookie': authCookie
      }
    });
    
    if (coursesResponse.data.length > 0) {
      const course = coursesResponse.data[0];
      console.log(`📚 Found course: ${course.title} (${course.slug})`);
      
      // Test getting quiz for first module
      try {
        const quizResponse = await axios.get(`${BASE_URL}/api/student/quiz/${course.slug}/0`, {
          headers: {
            'Cookie': authCookie
          }
        });
        
        if (quizResponse.data.questions) {
          console.log(`🧩 Quiz found for module 0: ${quizResponse.data.questions.length} questions`);
        }
      } catch (quizError) {
        console.log('⚠️ No quiz found for module 0 (this is normal if no quiz exists)');
      }
    }
    
  } catch (error) {
    console.error('❌ Failed to test quiz endpoints:', error.response?.data || error.message);
  }
}

// Main testing function
async function runTests() {
  console.log('🚀 Starting WhatsApp Bot Tests\n');
  
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
      console.log('\n💡 To test message sending, run: node test-whatsapp.js [phone-number]');
      console.log('   Example: node test-whatsapp.js 1234567890');
    }
  } else {
    console.log('\n⚠️ Bot is not connected. Cannot test message sending.');
    console.log('💡 To connect the bot:');
    console.log('   1. Set ENABLE_WHATSAPP_BOT=true in your .env file');
    console.log('   2. Restart your server');
    console.log('   3. Scan the QR code in the console with WhatsApp');
  }
  
  console.log('\n✅ Tests completed!');
}

// Run the tests
runTests().catch(console.error);
