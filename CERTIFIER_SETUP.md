# Certifier.io Integration Setup Guide

This guide explains how to set up the Certifier.io integration for automatic digital certificate issuance when students pass their final exams with 60% or higher.

## 🎓 **Overview**

When a student scores ≥60% on their final exam and receives a "passed" status from a teacher/admin, the system automatically issues a digital certificate via [Certifier.io](https://certifier.io).

## 📋 **Setup Steps**

### 1. Create Certifier.io Account

1. Visit [Certifier.io](https://certifier.io) and create an account
2. Complete the onboarding process

### 2. Generate API Access Token

1. Go to your Certifier account settings
2. Navigate to **API** section
3. Click **"Generate API Access Token"**
4. Copy the token securely

### 3. Design Certificate Templates

1. Go to **Certificate Builder** in Certifier
2. Create certificate templates with dynamic attributes:
   - `[recipient.name]` - Student's name
   - `[recipient.email]` - Student's email
   - `[course.title]` - Course title
   - `[completion.date]` - Certificate issue date
   - `[score]` - Final exam score

### 4. Create Groups for Each Course

1. Go to **Groups** section in Certifier
2. Create a group for each course that should issue certificates
3. Link each group to the appropriate certificate template
4. Note down the **Group IDs** for each course

### 5. Configure Environment Variables

Add the following to your `.env` file:

```bash
# Certifier.io Configuration
CERTIFIER_API_KEY=your_api_key_here
CERTIFIER_API_VERSION=2023-01-01
CERTIFIER_BASE_URL=https://api.certifier.io/v1

# Frontend URL (for email links)
FRONTEND_URL=http://localhost:5173
```

### 6. Map Courses to Certifier Groups

Update the course mapping in `/server/controllers/certificate-controller.ts`:

```typescript
const COURSE_CERTIFIER_GROUPS: Record<string, string> = {
  'certified-investment-associate': 'your_group_id_1',
  'certified-supply-chain-professional': 'your_group_id_2',
  // Add your course mappings here
};
```

## 🔧 **API Endpoints**

### Student Endpoints
- `GET /api/student/certificates` - Get all student's certificates
- `GET /api/student/certificates/:courseSlug` - Get certificates for specific course

### Admin Endpoints  
- `GET /api/admin/certificates` - Get all issued certificates
- `GET /api/admin/certifier/test` - Test Certifier connection and view groups

## 🔄 **Certification Flow**

1. **Student takes final exam** → Stored in database
2. **Teacher/Admin grades exam** → Updates score and pass/fail status
3. **System checks**: `score ≥ 60%` AND `passed = true`
4. **Certificate issued** via Certifier.io API automatically
5. **Certificate stored** in student's enrollment record
6. **Student notified** via email about both grading and certificate

## ✅ **Testing the Integration**

1. Test the API connection:
   ```bash
   GET /api/admin/certifier/test
   ```

2. Check if your API key works and groups are accessible

3. Create a test final exam attempt with >60% score and mark as passed

4. Verify certificate is issued and stored in the database

## 📊 **Certificate Data Structure**

Each issued certificate contains:

```typescript
{
  certificateId: string;        // Certifier.io certificate ID
  certificateUrl: string;       // Direct URL to view certificate
  issuedAt: Date;              // When certificate was issued
  issuedBy: string;            // Who triggered the issuance
  courseSlug: string;          // Course identifier
  courseName: string;          // Course title at time of issuance
  studentName: string;         // Student name
  studentEmail: string;        // Student email
  finalScore: number;          // Exam score that earned the certificate
  attemptNumber: number;       // Which attempt earned it
  certifierGroupId: string;    // Certifier group used
  status: 'issued' | 'revoked' | 'expired';
}
```

## 🚨 **Important Notes**

- **60% Passing Threshold**: Certificates are only issued for scores ≥60%
- **Single Certificate per Attempt**: Only one certificate per successful exam attempt
- **Automatic Process**: No manual intervention required after setup
- **Error Handling**: Certificate failures don't break the grading process
- **Security**: Keep your API key secure and never commit it to version control

## 🛠️ **Troubleshooting**

### Common Issues:

1. **API Key Invalid**:
   - Verify the token is correct in environment variables
   - Check token hasn't expired in Certifier

2. **Group Not Found**:
   - Ensure Group IDs are correctly mapped in the controller
   - Verify groups exist in your Certifier account

3. **Template Issues**:
   - Check dynamic attributes are properly configured
   - Ensure template is linked to the correct group

4. **Certificate Not Issuing**:
   - Verify student score is ≥60% AND passed=true
   - Check server logs for specific error messages

## 🔗 **Resources**

- [Certifier.io Documentation](https://developers.certifier.io)
- [Certifier.io API Reference](https://developers.certifier.io/reference/authentication)
- [Certificate Template Design Guide](https://support.certifier.io/how-to-use-certifier)

---

**Need help?** Check the server logs for detailed error messages when certificates fail to issue.
