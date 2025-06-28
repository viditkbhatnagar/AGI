# Recordings Feature Verification Guide

## Quick Setup Verification

After implementing the recordings feature, follow these steps to verify everything is working correctly:

### 1. Run Database Seeding
```bash
# This will create sample recordings along with existing data
tsx server/seedDb.ts
```

**Expected Output:**
- You should see messages like "Recording created: [Title] for [Course]"
- Sample recordings will be created for existing courses
- If recordings already exist, it will skip creation to preserve data

### 2. Start the Application
```bash
npm run dev
```

### 3. Test Admin Functionality

**Login as Admin:**
- Username: `admin`
- Password: `password`

**Navigate to Recordings:**
1. Go to Admin Dashboard
2. Click "Recordings" in the sidebar
3. You should see the recordings management page

**Test Upload (Optional):**
1. Select a course from dropdown
2. Fill in recording details
3. Upload a video file (MP4 recommended)
4. Click "Upload Recording"

### 4. Test Student Functionality

**Login as Student:**
- Username: `peterparker` or `brucewayne`
- Password: `password`

**Navigate to Recordings:**
1. Go to Student Dashboard
2. Click "Recordings" in the sidebar
3. You should see recordings from enrolled courses only

**Test Video Playback:**
1. Click "Watch Recording" on any recording card
2. Video player should appear with controls
3. Test play/pause functionality

### 5. Verification Checklist

- [ ] Admin can see recordings management page
- [ ] Admin can upload new recordings
- [ ] Admin can edit/delete recordings
- [ ] Student can see recordings page
- [ ] Student sees only recordings from enrolled courses
- [ ] Student can play videos using HTML5 player
- [ ] Navigation menu shows "Recordings" for both admin and student
- [ ] Search and filter functionality works on student page
- [ ] File uploads are stored in `uploads/recordings/` directory

### 6. Sample Data Verification

After seeding, you should have recordings for:
- **Supply Chain Professional**: 3 recordings (modules 0-1)
- **Accounting and Finance**: 2 recordings (modules 0,2)  
- **Logistics Manager**: 2 recordings (modules 0,2)

### 7. Troubleshooting

**If recordings don't appear:**
- Check if courses exist in database
- Verify admin user exists
- Check `uploads/recordings/` directory exists
- Review console logs for error messages

**If student can't see recordings:**
- Verify student is enrolled in the course
- Check recording `isVisible` flag is true
- Ensure student authentication is working

**If video won't play:**
- Check file path in recording document
- Verify file exists in uploads directory
- Test with different video format (MP4 recommended)

### 8. Clean Reset (if needed)

To start fresh with new sample data:
```bash
# This will clear all data including recordings
tsx server/seedDb.ts
```

## Success Indicators

✅ **Feature is working correctly when:**
- Admin dashboard shows recordings management interface
- Student dashboard shows course recordings
- Video playback works smoothly
- Access control prevents students from seeing unauthorized recordings
- File uploads save to correct directory
- Database contains sample recording documents

❌ **Check setup if:**
- Pages show errors or fail to load
- Videos won't play or show 404 errors
- Students see recordings from non-enrolled courses
- Upload functionality fails
- Navigation menu missing recordings links

## Next Steps

Once verified, you can:
1. Upload real course recordings through admin interface
2. Organize recordings by modules for better structure
3. Add duration and file size information during upload
4. Use visibility toggle to control student access
5. Associate recordings with specific live classes 