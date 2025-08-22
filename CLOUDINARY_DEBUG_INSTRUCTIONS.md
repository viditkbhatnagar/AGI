# 🔧 Cloudinary Debug Instructions

## 🚨 **Current Issue**
Files are not uploading to Cloudinary (showing 0 usage in dashboard). The download issues are secondary - we need to fix uploads first.

## 🧪 **Debug Steps**

### **1. Test Upload Functionality**
I've added a **Cloudinary Test Component** to your Edit Course page:

1. Go to `/admin/courses/edit/any-course-slug`
2. You'll see a "🧪 Cloudinary Connection Test" card at the top
3. Click "🧪 Test Connection" button
4. Try uploading a small file using the file input
5. **Check your browser console** for detailed logs

### **2. Expected Console Output**
If uploads are working, you should see:
```
🚀 Starting Cloudinary upload: {fileName, fileSize, etc.}
📤 FormData prepared: {resourceType, folder, uploadPreset}
🌐 Upload URL: https://api.cloudinary.com/v1_1/dz4tvlaqo/raw/upload
📡 Response status: 200
✅ Upload successful: {secure_url, public_id, etc.}
```

### **3. Common Issues to Check**

#### **A. CORS Issues (Most Likely)**
If you see CORS errors in console:

1. Go to [Cloudinary Security Settings](https://cloudinary.com/console/c-8ca2f54e8ef3a7bb51c39a/settings/security)
2. Under **"Allowed fetch domains"** add:
   ```
   https://elearning.globalagi.org/
   localhost:5002
   localhost:3000
   127.0.0.1:5002
   127.0.0.1:3000
   ```
3. Click **Save**

#### **B. Upload Preset Issues**
Your `unsigned_uploads` preset should have:
- ✅ **Signing Mode**: `Unsigned`
- ✅ **Asset folder**: `agi-online`
- ✅ **Allowed formats**: `pdf,doc,docx,xls,xlsx,ppt,pptx,csv,jpg,jpeg,png,gif,webp`

#### **C. File Size Issues**
Check if files are larger than 10MB (free tier limit).

#### **D. Network Issues**
Try a very small file first (like a .txt file under 1KB).

## 🔍 **What to Look For**

### **Success Indicators:**
- ✅ Console shows "✅ Upload successful"
- ✅ Files appear in [Cloudinary Media Library](https://cloudinary.com/console/c-8ca2f54e8ef3a7bb51c39a/media_library)
- ✅ Usage stats increase in dashboard

### **Failure Indicators:**
- ❌ CORS errors in console
- ❌ 400/401/403 HTTP errors
- ❌ "Upload preset not found" errors
- ❌ Still showing 0 usage in dashboard

## 🛠 **Quick Fixes to Try**

### **Fix 1: Update Cloudinary Settings**
1. Go to **Settings** → **Security**
2. Add all localhost variations to **Allowed fetch domains**
3. Set **Allowed strict referral domains** (if required)

### **Fix 2: Verify Upload Preset**
1. Go to **Settings** → **Upload** → **Upload presets**
2. Click on `unsigned_uploads`
3. Verify **Signing Mode** = `Unsigned`
4. Save if any changes made

### **Fix 3: Test with Postman/Curl**
Try this curl command to test directly:
```bash
curl -X POST \
  https://api.cloudinary.com/v1_1/dz4tvlaqo/raw/upload \
  -F "upload_preset=unsigned_uploads" \
  -F "folder=agi-online/test" \
  -F "file=@/path/to/test-file.txt"
```

## 📋 **Action Plan**

1. **Run the test component** and check console logs
2. **Share the console output** with me (copy exact error messages)
3. **Check Cloudinary security settings** for CORS
4. **Verify upload preset configuration**
5. **Test with a tiny file** first (like 1KB text file)

## 🎯 **Expected Result**
Once uploads work:
- Files will appear in Cloudinary dashboard
- Usage stats will increase
- Download functionality will work properly
- Both localhost and production will work

---

**Run the test and share the console output - that will tell us exactly what's wrong! 🚀**
