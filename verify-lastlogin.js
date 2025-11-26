import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

/**
 * VERIFICATION SCRIPT - Check lastLogin Field
 * 
 * This script checks if the lastLogin field is present in the users collection
 * 
 * HOW TO RUN:
 * node verify-lastlogin.js
 */

async function verifyLastLogin() {
    let client;

    try {
        console.log('🔍 Verifying lastLogin field in database...\n');

        // Connect to MongoDB using the same URI as the application
        const mongoUri = process.env.MONGO_URI || "mongodb+srv://agi_admin:X7UJ82nzrrtORPNM@dev.gdddmth.mongodb.net/agi_student_platform_dev?retryWrites=true&w=majority&appName=dev";
        client = new MongoClient(mongoUri);
        await client.connect();
        console.log('✅ Connected to MongoDB\n');

        const db = client.db();
        const usersCollection = db.collection('users');

        // Get total user count
        const totalUsers = await usersCollection.countDocuments();
        console.log(`📊 Total users: ${totalUsers}`);

        // Count users with lastLogin field
        const usersWithLastLogin = await usersCollection.countDocuments({
            lastLogin: { $exists: true }
        });
        console.log(`✓ Users with lastLogin field: ${usersWithLastLogin}`);
        console.log(`✗ Users without lastLogin field: ${totalUsers - usersWithLastLogin}\n`);

        // Show sample users with lastLogin
        if (usersWithLastLogin > 0) {
            console.log('📝 Sample users with lastLogin (showing first 5):');
            const samples = await usersCollection.find(
                { lastLogin: { $exists: true, $ne: null } },
                { projection: { email: 1, role: 1, lastLogin: 1 } }
            ).limit(5).toArray();

            if (samples.length > 0) {
                samples.forEach(user => {
                    console.log(`  - ${user.email} (${user.role}): ${user.lastLogin ? new Date(user.lastLogin).toISOString() : 'null'}`);
                });
            } else {
                console.log('  No users have logged in yet (all lastLogin values are null)');
            }
        }

        console.log('\n✅ Verification complete!');

    } catch (error) {
        console.error('❌ Verification failed:', error);
        throw error;
    } finally {
        if (client) {
            await client.close();
            console.log('\n🔌 Disconnected from MongoDB');
        }
    }
}

// Run verification
verifyLastLogin()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('\n💥 Script failed:', error);
        process.exit(1);
    });
