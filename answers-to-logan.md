Hi Logan,

Thank you for your follow-up questions. Here are the detailed answers:

---

## 1. Quiz Pass Thresholds

**Are all the quizzes set at the same 60% to pass?**

No, not all quizzes use the same pass threshold. Here's how it works:

- **Module Quizzes:** Module quizzes (quizzes within course modules) require a **70% score** to pass. This is the standard threshold used across all module quizzes in the platform.

- **Final Examinations:** Final exams have a different system:
  - For auto-graded multiple-choice questions (MCQ), the default passing score is **70%**
  - However, **certificates are issued when students achieve 60% or higher** on the final exam after manual grading by instructors
  - This means a student can pass the exam with 70% automatically, but certificates are awarded at the 60% threshold

So to summarize: Module quizzes = 70% pass, Final exams = 70% auto-pass, but certificates issued at 60%+.

---

## 2. MongoDB GDPR Compliance

**Can you confirm if MongoDB is GDPR compliant?**

Yes, MongoDB Atlas (the cloud database service we use) is GDPR compliant. Here's what this means:

- **Data Processing Agreement:** MongoDB Atlas provides GDPR-compliant data processing agreements for customers in the European Union and other regions requiring GDPR compliance.

- **Data Residency:** MongoDB Atlas allows you to choose the geographic region where your data is stored, which helps comply with data residency requirements.

- **Security Measures:** MongoDB Atlas implements industry-standard security measures including:
  - Encryption at rest (data stored encrypted)
  - Encryption in transit (data transmitted securely)
  - Access controls and authentication
  - Regular security audits

- **Data Protection:** MongoDB provides tools and features to help with GDPR compliance, including data deletion capabilities and access controls.

However, it's important to note that **GDPR compliance is a shared responsibility**:
- MongoDB provides the compliant infrastructure and tools
- We (AgiOnline) are responsible for:
  - How we collect and use student data
  - Obtaining proper consent from students
  - Implementing data retention policies
  - Responding to data subject requests (like requests to delete data)
  - Ensuring our privacy policies and practices comply with GDPR

Our platform stores student data securely in MongoDB Atlas, and we follow data protection best practices. If you need specific documentation about our data handling procedures for the CPD accreditation, I can provide that separately.

---

## 3. Feedback Survey Form

**Can you send me a copy of the feedback survey as a PDF?**

I've created a detailed document describing our feedback survey form (attached as `feedback-survey-form.md`). The feedback form includes:

**Section 1: Student Information**
- Full Name (required)
- Email Address (required)
- Phone Number (required)

**Section 2: Course Ratings (5-star system)**
- Overall Course Rating (1-5 stars)
- Content Rating (1-5 stars)

**Section 3: Teacher Ratings**
- Individual rating for each instructor (1-5 stars per teacher)

**Section 4: Written Feedback**
- Free-form text field (maximum 2000 words)
- Students can share their learning experience, what they found valuable, suggestions, etc.

The form is completed online through the student dashboard after course completion. All feedback is stored securely in our database.

If you need this converted to a PDF format or need screenshots of the actual form interface, please let me know and I can provide that.

---

## 4. Student Feedback Data

**Download the data of feedbacks given by students and place them in a .md file with detailed explanation**

I've exported all student feedback data from our live database. The file `student-feedback-export-2025-11-10.md` contains:

- **Summary Statistics:**
  - Total number of feedbacks received
  - Average ratings across all courses
  - Course-wise breakdown of feedback statistics

- **Detailed Feedback Records:**
  - Complete student information (name, email, phone)
  - Course details
  - All ratings (overall, content, teacher ratings)
  - Full written feedback text
  - Submission timestamps
  - Unique feedback IDs for reference

**Current Statistics from Live Data:**
- **Total Feedbacks:** 5 completed feedbacks
- **Average Overall Rating:** 5.00 / 5.00
- **Average Content Rating:** 4.40 / 5.00
- **Average Teacher Rating:** 4.67 / 5.00

The feedback covers multiple courses including:
- Certified Sustainability Leadership And Management
- Certified Human Resource Manager
- Accounting and Finance
- Certified Training and Development Professional

All feedback data is real and comes directly from our production database. The file includes detailed explanations of each section and provides a comprehensive view of student satisfaction and feedback.

---

If you need any additional information or clarification for the CPD accreditation documentation, please don't hesitate to ask.

Best regards,
Vidit

