# Data Handling Procedures for CPD Accreditation
## AgiOnline Platform - Student Data Management

**Document Version:** 1.0  
**Last Updated:** November 2025  
**Prepared For:** CPD Accreditation Documentation

---

## 1. Overview

This document outlines the comprehensive data handling procedures implemented by AgiOnline for managing student data in compliance with data protection regulations, including GDPR requirements. Our platform collects, stores, processes, and protects student information throughout their learning journey.

---

## 2. Data Collection Methods

### 2.1 Student Registration and Account Creation

When a student registers or is enrolled in a course, we collect the following information:

**Personal Information:**
- Full name
- Email address (used as primary login credential)
- Phone number
- Date of birth (optional)
- Physical address (optional)
- Pathway selection (standalone course or with MBA)

**Account Information:**
- Username (derived from email)
- Password (encrypted using bcrypt hashing algorithm)
- Role assignment (student, teacher, admin)

### 2.2 Course Enrollment Data

Upon enrollment, we collect:
- Course selection (course slug and title)
- Enrollment date
- Course validity period (typically 12 months from enrollment)
- Payment and transaction records (if applicable)

### 2.3 Learning Activity Data

During the course, we automatically collect:
- **Module Completion:** Which modules students complete and completion timestamps
- **Quiz Attempts:** All quiz attempts including scores, answers, pass/fail status, and attempt dates
- **Final Exam Attempts:** All final examination attempts including scores, answers, grading status, and feedback
- **Video Watch Time:** Detailed tracking of video viewing including date, module index, video index, and duration watched
- **Document Views:** Records of which course documents students access, including date and module information
- **Live Class Attendance:** Participation in scheduled live classes
- **Certificate Issuance:** Digital certificate details including certificate ID, URL, issuance date, and verification information

### 2.4 Feedback and Communication Data

- **Course Feedback:** Student feedback forms including ratings (overall, content, teacher ratings) and written comments (up to 2000 words)
- **Email Communications:** Records of automated emails sent (course reminders, exam notifications, certificate notifications)
- **Support Interactions:** Any support tickets or communications with administrators

---

## 3. Data Storage Infrastructure

### 3.1 Primary Database: MongoDB Atlas

**Service Provider:** MongoDB Atlas (Cloud Database Service)  
**Database Type:** MongoDB (NoSQL document database)  
**Data Residency:** Data is stored in MongoDB Atlas cloud infrastructure with configurable geographic regions

**Database Collections:**
- **Users Collection:** User account information, authentication credentials
- **Students Collection:** Student profiles, personal information, learning preferences, notification settings
- **Enrollments Collection:** Course enrollments, progress tracking, quiz attempts, exam attempts, certificates
- **Courses Collection:** Course content, modules, structure
- **Feedback Collection:** Student feedback submissions with ratings and comments
- **Live Classes Collection:** Scheduled live class sessions and attendance records
- **Recordings Collection:** Class recording metadata and access information

### 3.2 File Storage: Cloudinary

**Service Provider:** Cloudinary (Cloud-based Media Management)  
**Storage Type:** Cloud storage for course materials and documents

**Stored Content:**
- Course documents (PDFs, Word documents, presentations)
- Quiz question documents
- Course images and media files
- Certificate templates and assets

**Security Features:**
- Server-side encryption
- Secure API access with authentication keys
- Private cloud storage with restricted access

### 3.3 Certificate Management: Certifier.io

**Service Provider:** Certifier.io (Digital Certificate Platform)  
**Purpose:** Issuance and verification of digital certificates

**Stored Data:**
- Certificate IDs and verification URLs
- Student information linked to certificates
- Course completion records
- Certificate metadata and status

---

## 4. Data Security Measures

### 4.1 Encryption

**Data at Rest:**
- MongoDB Atlas provides encryption at rest for all stored data
- Cloudinary implements server-side encryption for stored files
- Database backups are encrypted

**Data in Transit:**
- All data transmission uses TLS/SSL encryption
- HTTPS protocol enforced for all web communications
- Secure API connections with authentication tokens

### 4.2 Authentication and Access Control

**Password Security:**
- Passwords are hashed using bcrypt algorithm with salt rounds
- Passwords are never stored in plain text
- Password change functionality requires current password verification

**Access Control:**
- Role-based access control (RBAC) system:
  - **Students:** Access limited to their own data and enrolled courses
  - **Teachers:** Access to assigned courses, student progress, and grading capabilities
  - **Administrators:** Full system access with audit logging
- JWT (JSON Web Tokens) used for session management
- Token expiration and refresh mechanisms implemented

**API Security:**
- Bearer token authentication required for all API endpoints
- CORS (Cross-Origin Resource Sharing) policies configured
- Rate limiting implemented to prevent abuse

### 4.3 Network Security

- Firewall rules configured to restrict database access
- IP whitelisting for administrative access
- Secure connection strings stored as environment variables
- No hardcoded credentials in source code

---

## 5. Data Access Controls

### 5.1 Student Access

Students can access:
- Their own profile information
- Their enrolled courses and progress
- Their quiz and exam results
- Their certificates
- Their submitted feedback

Students cannot access:
- Other students' data
- Administrative system settings
- Teacher or admin accounts

### 5.2 Teacher Access

Teachers can access:
- Courses assigned to them
- Student progress for their courses
- Quiz and exam submissions for grading
- Student feedback related to their courses

Teachers cannot access:
- Student personal information beyond course context
- Other teachers' courses
- Administrative functions

### 5.3 Administrator Access

Administrators have:
- Full system access for platform management
- Ability to view all student data for support purposes
- Access to system logs and audit trails
- Certificate issuance capabilities

**Administrative Oversight:**
- All administrative actions are logged
- Access is restricted to authorized personnel only
- Regular access reviews conducted

---

## 6. Data Retention Policies

### 6.1 Active Student Data

**Retention Period:** Data is retained while the student account is active and for the duration of course validity (typically 12 months from enrollment).

**Active Data Includes:**
- Student profile information
- Course enrollments
- Learning progress and activity logs
- Quiz and exam attempts
- Certificates

### 6.2 Completed Course Data

**Retention Period:** After course completion, data is retained for a minimum of 7 years for accreditation and verification purposes.

**Retained Data:**
- Final exam scores and attempts
- Issued certificates and verification records
- Course completion records
- Student feedback submissions

### 6.3 Inactive Account Data

**Retention Period:** If a student account becomes inactive (no login for 3+ years), data may be archived but retained for legal and accreditation requirements.

**Archival Process:**
- Data moved to archived storage
- Access restricted to administrative purposes only
- Can be restored upon student request

### 6.4 Deleted Account Data

**Retention Period:** Upon account deletion request, data is permanently deleted within 30 days, except:
- Certificate records (retained for verification purposes)
- Aggregated anonymized statistics (no personal identifiers)
- Legal compliance records (if required by law)

---

## 7. Data Subject Rights (GDPR Compliance)

### 7.1 Right to Access

Students can request access to their personal data by:
- Logging into their dashboard to view their information
- Contacting support to request a complete data export
- We provide data in a structured, commonly used format (JSON/CSV)

**Response Time:** Data access requests are fulfilled within 30 days.

### 7.2 Right to Rectification

Students can:
- Update their profile information directly through the dashboard
- Request corrections to their data by contacting support
- We verify and update incorrect information promptly

### 7.3 Right to Erasure (Right to be Forgotten)

Students can request deletion of their data by:
- Submitting a deletion request through their account settings
- Contacting support with a formal deletion request
- We verify identity before processing deletion requests

**Deletion Process:**
1. Verify student identity
2. Export data for student records (if requested)
3. Delete personal information from active databases
4. Retain only legally required records (certificates, compliance)
5. Confirm deletion completion within 30 days

### 7.4 Right to Data Portability

Students can:
- Export their learning data (progress, quiz scores, certificates)
- Request data in machine-readable format
- Transfer data to another service provider

**Export Format:** JSON or CSV format with all personal and learning data.

### 7.5 Right to Object to Processing

Students can:
- Opt-out of marketing communications
- Adjust notification preferences in account settings
- Request limitation of data processing for specific purposes

### 7.6 Right to Restrict Processing

If a student objects to data processing, we can:
- Temporarily suspend processing while investigating the request
- Maintain data but limit its use
- Continue processing only with student consent or legal requirement

---

## 8. Data Deletion Procedures

### 8.1 Student-Initiated Deletion

**Process:**
1. Student submits deletion request through account or support
2. System verifies student identity
3. Data export provided (if requested) before deletion
4. Personal information removed from active databases:
   - User account deleted
   - Student profile deleted
   - Enrollment records anonymized or deleted
   - Learning activity logs deleted
5. Certificate records retained (for verification purposes)
6. Confirmation sent to student

**Timeline:** 30 days from request receipt

### 8.2 Administrative Deletion

**Reasons for Administrative Deletion:**
- Account inactivity beyond retention period
- Violation of terms of service
- Legal requirement

**Process:**
1. Review and approval by authorized administrator
2. Notification sent to student (if contactable)
3. Data deletion following same procedures as student-initiated deletion
4. Audit log entry created

### 8.3 Certificate Record Retention

**Exception:** Certificate records are retained even after account deletion because:
- Certificates serve as proof of completion for accreditation
- Third-party verification may be required
- Legal and compliance requirements

**Retained Certificate Data:**
- Certificate ID and verification URL
- Student name and course completion date
- Final exam score
- Certificate issuance date

**Personal Identifiers:** Email addresses and other personal data are removed from certificate records where possible, maintaining only verification-essential information.

---

## 9. Backup and Recovery Procedures

### 9.1 Database Backups

**MongoDB Atlas Backups:**
- Automated daily backups performed
- Backup retention: 30 days of daily backups
- Point-in-time recovery available
- Backups stored in encrypted format
- Geographic redundancy for disaster recovery

**Backup Schedule:**
- Full database backup: Daily at 2:00 AM UTC
- Incremental backups: Every 6 hours
- Backup verification: Automated integrity checks

### 9.2 File Storage Backups

**Cloudinary Backups:**
- Automatic versioning of uploaded files
- Deleted files retained for 30 days before permanent deletion
- Geographic distribution across multiple data centers

### 9.3 Disaster Recovery Plan

**Recovery Objectives:**
- Recovery Time Objective (RTO): 4 hours
- Recovery Point Objective (RPO): 24 hours (maximum data loss)

**Recovery Procedures:**
1. Assess damage and identify affected systems
2. Restore from most recent verified backup
3. Verify data integrity
4. Resume service operations
5. Notify affected users if necessary

**Testing:** Disaster recovery procedures are tested quarterly.

---

## 10. Third-Party Service Providers

### 10.1 MongoDB Atlas

**Purpose:** Primary database hosting  
**Data Processing:** Stores all student and course data  
**Location:** Cloud-based, configurable geographic regions  
**GDPR Compliance:** MongoDB Atlas provides GDPR-compliant infrastructure and data processing agreements  
**Data Transfer:** Data transfer agreements in place

### 10.2 Cloudinary

**Purpose:** File and media storage  
**Data Processing:** Stores course documents and media files  
**Location:** Cloud-based, global distribution  
**GDPR Compliance:** Cloudinary complies with GDPR requirements  
**Data Transfer:** Secure API transfers with encryption

### 10.3 Certifier.io

**Purpose:** Digital certificate issuance and verification  
**Data Processing:** Processes student information for certificate generation  
**Location:** Cloud-based service  
**GDPR Compliance:** Certifier.io maintains GDPR compliance  
**Data Transfer:** Secure API integration

### 10.4 Email Service Providers

**Purpose:** Automated email notifications  
**Data Processing:** Student email addresses for course communications  
**Location:** Cloud-based email service  
**GDPR Compliance:** Email providers maintain GDPR compliance

**Data Sharing Agreements:** All third-party providers have data processing agreements in place that comply with GDPR requirements.

---

## 11. Privacy Policy and Consent

### 11.1 Privacy Policy

Our privacy policy outlines:
- What data we collect and why
- How data is used and processed
- Data sharing practices
- Student rights and how to exercise them
- Contact information for privacy inquiries

**Access:** Privacy policy is accessible on our website and within the student dashboard.

### 11.2 Consent Management

**Explicit Consent:**
- Students provide consent during account registration
- Consent is required for data processing activities
- Students can withdraw consent at any time

**Consent Withdrawal:**
- Students can update consent preferences in account settings
- Withdrawal of consent may limit certain platform features
- Data processing stops upon consent withdrawal (except legal requirements)

### 11.3 Cookie and Tracking

**Cookies Used:**
- Authentication cookies (session management)
- Preference cookies (user settings)
- Analytics cookies (anonymized usage statistics)

**Tracking:**
- Learning activity tracking for progress monitoring
- No third-party advertising tracking
- Analytics are anonymized and aggregated

---

## 12. Data Breach Procedures

### 12.1 Breach Detection

**Monitoring:**
- Automated security monitoring systems
- Regular security audits
- Intrusion detection systems
- Log analysis and anomaly detection

### 12.2 Breach Response

**Immediate Actions:**
1. Contain the breach and prevent further access
2. Assess the scope and impact of the breach
3. Document all details of the breach
4. Notify relevant authorities (within 72 hours if required by GDPR)
5. Notify affected students (if high risk to their rights)
6. Implement remediation measures
7. Review and update security measures

**Notification Requirements:**
- Regulatory authorities: Within 72 hours of discovery
- Affected students: Without undue delay if high risk
- Notification includes: Nature of breach, data affected, potential consequences, mitigation measures

### 12.3 Post-Breach Review

- Conduct thorough investigation
- Identify root cause
- Implement additional security measures
- Update procedures and policies
- Provide training if needed

---

## 13. Data Processing for Accreditation

### 13.1 CPD Accreditation Requirements

**Data Used for Accreditation:**
- Student enrollment records
- Course completion records
- Final examination scores
- Certificate issuance records
- Student feedback and evaluations

**Purpose:** Demonstrate course delivery, student progress, and completion rates for CPD accreditation compliance.

### 13.2 Reporting and Analytics

**Aggregated Reports:**
- Course completion statistics
- Average scores and pass rates
- Student feedback summaries
- Certificate issuance records

**Data Anonymization:**
- Personal identifiers removed from aggregate reports
- Only statistical data shared for accreditation
- Individual student data remains confidential

### 13.3 Audit Trail

**Maintained Records:**
- All administrative actions logged
- Student progress tracking
- Certificate issuance history
- System access logs

**Retention:** Audit trails retained for 7 years for accreditation and compliance purposes.

---

## 14. Contact Information

**Data Protection Officer / Privacy Inquiries:**
- Email: [Privacy Email Address]
- Support Portal: Available through student dashboard

**Data Access Requests:**
- Submit through student dashboard
- Contact support for assistance

**Data Deletion Requests:**
- Submit through account settings
- Contact support for immediate processing

---

## 15. Document Control

**Version History:**
- Version 1.0 - November 2025 - Initial document for CPD accreditation

**Review Schedule:** This document is reviewed annually or when significant changes to data handling procedures occur.

**Approval:** This document has been reviewed and approved by AgiOnline management and technical team.

---

## Appendix A: Technical Specifications

**Database:** MongoDB Atlas (MongoDB version 8.x)  
**Application Framework:** Node.js with Express  
**Authentication:** JWT tokens with bcrypt password hashing  
**File Storage:** Cloudinary cloud storage  
**Certificate Service:** Certifier.io API integration  
**Email Service:** SMTP-based email delivery  
**Backup System:** MongoDB Atlas automated backups  
**Monitoring:** Application and database monitoring systems

---

## Appendix B: Compliance Certifications

- **MongoDB Atlas:** SOC 2 Type II, ISO 27001, GDPR compliant
- **Cloudinary:** SOC 2, GDPR compliant
- **Certifier.io:** GDPR compliant, secure certificate issuance

---

**End of Document**

