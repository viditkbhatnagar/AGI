/**
 * MongoDB Migration: Add Hybrid Document Support to Courses
 * 
 * This migration adds support for hybrid documents (both link and upload types)
 * while maintaining backward compatibility with existing documents.
 * 
 * Run this migration with: node server/migrations/mongodb/001_add_hybrid_document_support.js
 */

const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://agi_admin:X7UJ82nzrrtORPNM@dev.gdddmth.mongodb.net/agi_student_platform_dev?retryWrites=true&w=majority&appName=dev";

async function runMigration() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const coursesCollection = db.collection('courses');

    console.log('Starting migration: Add hybrid document support...');

    // Get all courses
    const courses = await coursesCollection.find({}).toArray();
    console.log(`Found ${courses.length} courses to migrate`);

    let migratedCount = 0;
    let skippedCount = 0;

    for (const course of courses) {
      let needsUpdate = false;
      const updates = {};

      // Process mbaModules
      if (course.mbaModules && Array.isArray(course.mbaModules)) {
        const updatedMbaModules = course.mbaModules.map(module => {
          if (module.documents && Array.isArray(module.documents)) {
            const updatedDocuments = module.documents.map(doc => {
              // If document doesn't have a type field, it's an old format
              if (!doc.type) {
                return {
                  ...doc,
                  type: 'link' // Default to link type for backward compatibility
                };
              }
              return doc;
            });
            return {
              ...module,
              documents: updatedDocuments
            };
          }
          return module;
        });
        
        if (JSON.stringify(updatedMbaModules) !== JSON.stringify(course.mbaModules)) {
          updates.mbaModules = updatedMbaModules;
          needsUpdate = true;
        }
      }

      // Process regular modules
      if (course.modules && Array.isArray(course.modules)) {
        const updatedModules = course.modules.map(module => {
          if (module.documents && Array.isArray(module.documents)) {
            const updatedDocuments = module.documents.map(doc => {
              // If document doesn't have a type field, it's an old format
              if (!doc.type) {
                return {
                  ...doc,
                  type: 'link' // Default to link type for backward compatibility
                };
              }
              return doc;
            });
            return {
              ...module,
              documents: updatedDocuments
            };
          }
          return module;
        });
        
        if (JSON.stringify(updatedModules) !== JSON.stringify(course.modules)) {
          updates.modules = updatedModules;
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        await coursesCollection.updateOne(
          { _id: course._id },
          { $set: updates }
        );
        console.log(`✓ Migrated course: ${course.slug} (${course.title})`);
        migratedCount++;
      } else {
        console.log(`- Skipped course: ${course.slug} (already has type fields or no documents)`);
        skippedCount++;
      }
    }

    console.log('\nMigration completed successfully!');
    console.log(`Migrated: ${migratedCount} courses`);
    console.log(`Skipped: ${skippedCount} courses`);

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { runMigration };