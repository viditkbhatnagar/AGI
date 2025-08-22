// Check if there are quizzes available for testing
const axios = require('axios');

const BASE_URL = 'http://localhost:5002';
const ADMIN_CREDENTIALS = {
  email: 'admin@example.com',
  password: 'password'
};

async function checkQuizzes() {
  try {
    // Login
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, ADMIN_CREDENTIALS);
    const token = loginResponse.data.token;
    
    // Get courses
    const coursesResponse = await axios.get(`${BASE_URL}/api/courses`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('🧩 Checking for available quizzes...\n');
    
    for (const course of coursesResponse.data) {
      console.log(`📚 Course: ${course.title}`);
      console.log(`   🔗 Slug: ${course.slug}`);
      console.log(`   📝 Modules: ${course.modules.length}`);
      
      // Check each module for quizzes
      for (let i = 0; i < course.modules.length; i++) {
        try {
          const quizResponse = await axios.get(`${BASE_URL}/api/courses/${course.slug}/quizzes`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          const moduleQuizzes = quizResponse.data.filter(q => q.moduleIndex === i);
          if (moduleQuizzes.length > 0) {
            console.log(`   ✅ Module ${i + 1}: ${moduleQuizzes[0].questions.length} questions`);
            console.log(`      🎯 Test command: /quiz ${course.slug} ${i}`);
          } else {
            console.log(`   ❌ Module ${i + 1}: No quiz`);
          }
        } catch (error) {
          console.log(`   ❌ Module ${i + 1}: No quiz`);
        }
      }
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

checkQuizzes();
