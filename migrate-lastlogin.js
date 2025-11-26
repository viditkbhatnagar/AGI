import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

/**
 * PRODUCTION-SAFE MIGRATION SCRIPT
 * 
 * This script initializes the lastLogin field for existing users who don't have it.
 * It sets lastLogin to null for all users without this field.
 * 
 * SAFETY FEATURES:
 * - Only updates users who don't have lastLogin field
 * - Uses bulk operations for efficiency
 * - Provides detailed logging
 * - Doesn't overwrite existing lastLogin values
 * 
 * HOW TO RUN:
 * node migrate-lastlogin.js
 */

async function migrateLastLogin() {
    let client;

    try {
        console.log('🔄 Starting lastLogin migration...');
        console.log('📊 This will add lastLogin field to users who don\'t have it\n');

        // Connect to MongoDB using the same URI as the application
        const mongoUri = process.env.MONGO_URI || "mongodb+srv://agi_admin:X7UJ82nzrrtORPNM@dev.gdddmth.mongodb.net/agi_student_platform_dev?retryWrites=true&w=majority&appName=dev";
        client = new MongoClient(mongoUri);
        await client.connect();
        console.log('✅ Connected to MongoDB');

        const db = client.db();
        const usersCollection = db.collection('users');

        // Find users without lastLogin field
        const usersWithoutLastLogin = await usersCollection.countDocuments({
            lastLogin: { $exists: false }
        });

        console.log(`📈 Found ${usersWithoutLastLogin} users without lastLogin field`);

        if (usersWithoutLastLogin === 0) {
            console.log('✅ All users already have lastLogin field. No migration needed.');
            return;
        }

        // Update users without lastLogin (set to null initially)
        const result = await usersCollection.updateMany(
            { lastLogin: { $exists: false } },
            { $set: { lastLogin: null } }
        );

        console.log(`\n✅ Migration completed successfully!`);
        console.log(`📝 Updated ${result.modifiedCount} user records`);
        console.log(`\nℹ️  Note: lastLogin is set to null for existing users.`);
        console.log(`   It will be populated when they log in next time.`);

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        if (client) {
            await client.close();
            console.log('\n🔌 Disconnected from MongoDB');
        }
    }
}

// Run migration with proper error handling
migrateLastLogin()
    .then(() => {
        console.log('\n✨ Migration script finished successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Migration script failed:', error);
        process.exit(1);
    });
