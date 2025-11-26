# Last Login Migration Guide

## Overview
This guide explains how to safely add the `lastLogin` field to existing user records in your production database.

## What Was Changed

### 1. User Model (`server/models/user.ts`)
- Added `lastLogin?: Date` field to the User interface
- Added `lastLogin: { type: Date }` to the Mongoose schema

### 2. Auth Controller (`server/controllers/auth-controller.ts`)
- Updated login function to record `lastLogin` timestamp on successful authentication
- Timestamp is set right after password validation and before generating the token

### 3. Migration Script (`migrate-lastlogin.js`)
- Safe script to initialize `lastLogin` field for existing users
- Only updates users who don't have this field
- Sets value to `null` initially (will be populated on next login)

## Running the Migration

### ⚠️ IMPORTANT: Review Before Running
1. This script will modify your production database
2. Review the script at `migrate-lastlogin.js` before running
3. Consider testing in a staging environment first if available

### Steps to Run

```bash
# Make sure your .env file has the correct MONGODB_URI
# Then run the migration:
node migrate-lastlogin.js
```

### What the Script Does
- Connects to your MongoDB database
- Finds all users without the `lastLogin` field
- Sets `lastLogin` to `null` for those users
- Provides detailed logging of the operation
- **Does NOT overwrite existing `lastLogin` values** (safe to run multiple times)

### Expected Output
```
🔄 Starting lastLogin migration...
📊 This will add lastLogin field to users who don't have it

✅ Connected to MongoDB
📈 Found X users without lastLogin field

✅ Migration completed successfully!
📝 Updated X user records

ℹ️  Note: lastLogin is set to null for existing users.
   It will be populated when they log in next time.

🔌 Disconnected from MongoDB
✨ Migration script finished successfully
```

## Verification

After running the migration and restarting your server, you can verify it's working:

1. **Test Login**: Log in as any user
2. **Check Database**: The `lastLogin` field should now have a timestamp
3. **Subsequent Logins**: Each login should update the timestamp

### Query to Check in MongoDB
```javascript
// Connect to your MongoDB
db.users.findOne({ email: "test@example.com" }, { lastLogin: 1, email: 1 })

// Should return something like:
// { "_id": ..., "email": "test@example.com", "lastLogin": ISODate("...") }
```

## Safety Features

✅ **Non-destructive**: Only adds new field, doesn't modify existing data  
✅ **Idempotent**: Safe to run multiple times  
✅ **Selective**: Only updates users without the field  
✅ **Logged**: Provides detailed output of what was changed  
✅ **Optional field**: Won't break existing functionality if not populated  

## Rollback (if needed)

If you need to remove the field:
```javascript
db.users.updateMany({}, { $unset: { lastLogin: "" } })
```

## Future Usage

Once deployed, the `lastLogin` field will be automatically populated:
- Every time a user successfully logs in
- Timestamp will be updated to the current time
- You can query this field to see user activity patterns
- Useful for analytics, account security, and user engagement tracking
