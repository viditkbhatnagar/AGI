const { MongoClient } = require('mongodb');

async function checkDB() {
  const client = new MongoClient('mongodb://localhost:27017');
  await client.connect();
  console.log('Connected to MongoDB');
  
  const db = client.db('agionlinedashboard');
  const course = await db.collection('courses').findOne(
    { slug: 'Certified-Training-and-Development-Professional' },
    { projection: { 'modules.title': 1, 'modules.description': 1, 'modules': { $slice: 1 } } }
  );
  
  console.log('🔍 DIRECT DB CHECK:');
  console.log('Course found:', !!course);
  
  if (course && course.modules && course.modules[0]) {
    console.log('First module keys:', Object.keys(course.modules[0]));
    console.log('First module title:', course.modules[0].title);
    console.log('First module description:', course.modules[0].description);
    console.log('Description type:', typeof course.modules[0].description);
    console.log('Description exists:', 'description' in course.modules[0]);
  } else {
    console.log('No modules found or course not found');
  }
  
  await client.close();
}

checkDB().catch(console.error);
