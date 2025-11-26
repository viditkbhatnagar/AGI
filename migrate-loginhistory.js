import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

/**
 * PRODUCTION-SAFE MIGRATION SCRIPT
 * 
 * This script converts existing lastLogin field to loginHistory array format.
 * It initializes loginHistory with the existing lastLogin value if present.
 * 
 * SAFETY FEATURES:
 * - Only updates users who don't have loginHistory field
 * - Uses bulk operations for efficiency
 * - Provides detailed logging
 * - Doesn't overwrite existing loginHistory values
 * 
 * HOW TO RUN:
 * node migrate-loginhistory.js
 */

async function migrateLoginHistory() {
    let client;

    try {
        console.log('🔄 Starting loginHistory migration...');
        console.log('📊 This will convert lastLogin to loginHistory array format\n');

        // Connect to MongoDB using the same URI as the application
        const mongoUri = process.env.MONGO_URI || "mongodb+srv://agi_admin:X7UJ82nzrrtORPNM@dev.gdddmth.mongodb.net/agi_student_platform_dev?retryWrites=true&w=majority&appName=dev";
        client = new MongoClient(mongoUri);
        await client.connect();
        console.log('✅ Connected to MongoDB');

        const db = client.db();
        const usersCollection = db.collection('users');

        // Find users without loginHistory field
        const usersWithoutHistory = await usersCollection.countDocuments({
            loginHistory: { $exists: false }
        });

        console.log(`📈 Found ${usersWithoutHistory} users without loginHistory field`);

        if (usersWithoutHistory === 0) {
            console.log('✅ All users already have loginHistory field. No migration needed.');
            return;
        }

        // Update users: if they have lastLogin, convert it to loginHistory array
        const bulkOps = [];

        // Users with lastLogin value - convert to loginHistory
        const usersWithLastLogin = await usersCollection.find({
            loginHistory: { $exists: false },
            lastLogin: { $exists: true, $ne: null }
        }).toArray();

        usersWithLastLogin.forEach(user => {
            bulkOps.push({
                updateOne: {
                    filter: { _id: user._id },
                    update: {
                        $set: {
                            loginHistory: [{
                                timestamp: user.lastLogin
                            }]
                        }
                    }
                }
            });
        });

        // Users without lastLogin - initialize with empty loginHistory
        const usersWithoutLastLogin = await usersCollection.find({
            loginHistory: { $exists: false },
            $or: [
                { lastLogin: { $exists: false } },
                { lastLogin: null }
            ]
        }).toArray();

        usersWithoutLastLogin.forEach(user => {
            bulkOps.push({
                updateOne: {
                    filter: { _id: user._id },
                    update: {
                        $set: {
                            loginHistory: []
                        }
                    }
                }
            });
        });

        if (bulkOps.length > 0) {
            const result = await usersCollection.bulkWrite(bulkOps);
            console.log(`\n✅ Migration completed successfully!`);
            console.log(`📝 Updated ${result.modifiedCount} user records`);
            console.log(`   - ${usersWithLastLogin.length} users with existing lastLogin converted`);
            console.log(`   - ${usersWithoutLastLogin.length} users initialized with empty loginHistory`);
        } else {
            console.log('\n✅ No updates needed');
        }

        console.log(`\nℹ️  Note: loginHistory will be populated with new logins going forward.`);

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
migrateLoginHistory()
    .then(() => {
        console.log('\n✨ Migration script finished successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Migration script failed:', error);
        process.exit(1);
    });
