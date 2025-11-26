# Cloud Migration Analysis: AWS vs Azure (OPTIMIZED)

## E-Learning Platform with HeyGen AI Avatar Integration

**Document Version:** 2.0 (Optimized)  
**Date:** October 31, 2025  
**Current Setup:** Render ($25/month) + MongoDB Atlas (Free)  
**Target:** Cost-optimized cloud migration with HeyGen

---

## Executive Summary

Based on your requirements:

- **Current Users:** 40-50 students (scaling to 500-600 soon)
- **HeyGen Usage:** Real-time interactive avatars with voice communication
- **Simultaneous Sessions:** Multiple students using HeyGen avatars at the same time
- **Storage Needs:** 100-200GB total (modest)
- **Live Classes:** Handled via Google Meet (external)
- **Budget:** Most optimized solution
- **Current Cost:** ~$25/month (Render only)

**Key Finding:** With real-time HeyGen avatar streaming and simultaneous sessions, you need scalable cloud infrastructure (EC2/VMs) that can handle concurrent load. Starting with 40-50 students but architected for 500-600 scale.

---

## Revised Architecture Analysis

### What You Actually Need

| Component              | Current            | Recommended                                            | Why                                  |
| ---------------------- | ------------------ | ------------------------------------------------------ | ------------------------------------ |
| **Web Hosting**        | Render ($25)       | **AWS EC2**                                            | Handle HeyGen load, better control   |
| **Database**           | MongoDB Atlas Free | **Keep MongoDB Atlas (upgrade)** or **AWS DocumentDB** | Atlas easier, DocumentDB if full AWS |
| **File Storage**       | Cloudinary         | **AWS S3**                                             | Better integration, cheaper at scale |
| **Video Storage**      | Google Drive       | Keep Google Drive or S3                                | S3 better for programmatic access    |
| **Live Classes**       | Google Meet        | Keep Google Meet                                       | External system                      |
| **HeyGen Integration** | None               | **NEW: AWS infrastructure**                            | Real-time streaming                  |
| **Email**              | Brevo              | Keep Brevo or **AWS SES**                              | SES cheaper at scale                 |
| **Certificates**       | Certifier.io       | Keep Certifier.io                                      | Specialized service                  |

### Critical Insight

**With simultaneous HeyGen sessions, you need dedicated compute (EC2) and proper infrastructure**. The load from multiple real-time avatar sessions requires more robust hosting than Render's shared environment.

### Scaling Strategy

**Phase 1 (Current): 40-50 Students**

- Start with minimal infrastructure
- 2× EC2 t3.small instances (can handle 20-30 concurrent sessions)
- Lower HeyGen API costs (~$200-400/month)
- **Estimated Cost:** $800-1,200/month

**Phase 2 (Growth): 100-200 Students**

- Scale to 2× EC2 t3.medium instances
- Increase caching and storage
- HeyGen API costs increase (~$400-600/month)
- **Estimated Cost:** $1,000-1,500/month

**Phase 3 (Target): 500-600 Students**

- Auto-scale to 2-4× EC2 t3.medium instances
- Full infrastructure as detailed below
- HeyGen API at scale (~$500-1,000/month)
- **Estimated Cost:** $1,200-1,800/month

**Key Benefit:** Start small, pay only for what you use, scale automatically as students grow.

---

## Recommended Architecture: AWS-Based Approach

```
┌─────────────────────────────────────────────────────────────────┐
│                         AWS CLOUD                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐         ┌──────────────┐                      │
│  │ Route 53     │────────▶│ CloudFront   │                      │
│  │ (DNS)        │         │ (CDN)        │                      │
│  └──────────────┘         └──────┬───────┘                      │
│                                   │                               │
│                    ┌──────────────┼──────────────┐               │
│                    │              │              │               │
│           ┌────────▼─────┐  ┌────▼─────┐  ┌────▼─────┐         │
│           │ ALB          │  │ S3       │  │ S3       │         │
│           │ (Load Bal.)  │  │ (Static) │  │ (Files)  │         │
│           └────────┬─────┘  └──────────┘  └──────────┘         │
│                    │                                              │
│         ┌──────────┼──────────┐                                 │
│         │          │          │                                  │
│    ┌────▼───┐ ┌───▼────┐ ┌───▼────┐                            │
│    │ EC2    │ │ EC2    │ │ Lambda │                            │
│    │ Web 1  │ │ Web 2  │ │ HeyGen │                            │
│    └────┬───┘ └───┬────┘ └───┬────┘                            │
│         │         │          │                                   │
│         └─────────┼──────────┘                                  │
│                   │                                              │
│         ┌─────────┼──────────────────┐                          │
│         │         │          │       │                          │
│    ┌────▼───┐ ┌──▼─────┐ ┌──▼──────┐ ┌──────────┐             │
│    │MongoDB │ │ElastiCache│ S3     │ │ Transcribe│             │
│    │ Atlas  │ │(Redis) │ │(Temp)  │ │ + Polly   │             │
│    │(External)│        │ │        │ │           │             │
│    └─────────┘ └────────┘ └────────┘ └──────────┘             │
│                                                                   │
│  ┌──────────────────────────────────────────────────────┐       │
│  │ Additional Services                                   │       │
│  │ • API Gateway (WebSocket for real-time)              │       │
│  │ • Bedrock/OpenAI (LLM for conversation)              │       │
│  │ • SES (Email - optional)                              │       │
│  │ • CloudWatch (Monitoring & Logs)                     │       │
│  │ • Secrets Manager (API keys)                         │       │
│  │ • Auto Scaling (EC2 scaling)                         │       │
│  └──────────────────────────────────────────────────────┘       │
│                                                                   │
│  ┌──────────────────────────────────────────────────────┐       │
│  │ External Services (Keep)                             │       │
│  │ • Google Meet (Live classes)                         │       │
│  │ • Brevo (Email - optional)                           │       │
│  │ • Certifier.io (Certificates)                        │       │
│  │ • HeyGen API (Avatar generation)                     │       │
│  └──────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

---

## HeyGen Streaming API - What It Includes

### Important: HeyGen Handles Speech Services ✅

**You were RIGHT to question the speech services!**

HeyGen Streaming API is an all-in-one solution that includes:

✅ **Speech-to-Text (STT):** Converts student voice to text  
✅ **Text-to-Speech (TTS):** Generates avatar voice responses  
✅ **Voice Cloning:** Custom voice IDs for different avatars  
✅ **Lip-Sync:** Avatar mouth movements match speech  
✅ **Video Generation:** Real-time avatar video streaming  
✅ **Real-time Streaming:** Low-latency bidirectional communication

**What You DON'T Need:**

- ❌ Amazon Transcribe (HeyGen does STT)
- ❌ Amazon Polly (HeyGen does TTS)
- ❌ Separate voice services

**What You DO Need:**

- ✅ OpenAI/Bedrock LLM (for conversation intelligence)
- ✅ WebSocket infrastructure (for real-time connections)
- ✅ Session management (Redis)
- ✅ HeyGen API integration

### Architecture with HeyGen Streaming API

```
Student speaks → HeyGen API → HeyGen processes:
                                - Speech-to-Text
                                - (Your LLM generates response)
                                - Text-to-Speech
                                - Lip-sync video
                              → Avatar video + voice → Student
```

**Cost Savings:** By using HeyGen's built-in speech services, you save **$185/month** ($2,220/year) on AWS speech services!

---

## Understanding Concurrent HeyGen Sessions

### How Simultaneous Sessions Work

**Scenario:** Multiple students using HeyGen avatars at the same time

**Student Experience:**

1. Student clicks "Talk to AI Teacher"
2. HeyGen avatar video appears in browser
3. Student speaks through microphone
4. Avatar listens and responds with voice + video
5. Real-time conversation continues

**Infrastructure Load per Session:**

- **WebSocket Connection:** 1 persistent connection per student
- **Speech-to-Text:** Continuous audio streaming and transcription
- **LLM Processing:** Real-time conversation AI
- **Text-to-Speech:** Generate avatar voice responses
- **HeyGen API:** Generate lip-synced avatar video
- **Video Streaming:** Stream avatar video back to student

### Concurrent Session Capacity

| Infrastructure                  | Max Concurrent Sessions | Recommended Load | Notes                      |
| ------------------------------- | ----------------------- | ---------------- | -------------------------- |
| **2× t3.small**                 | 20-30 sessions          | 15-20 sessions   | Phase 1 (40-50 students)   |
| **2× t3.medium**                | 40-60 sessions          | 30-40 sessions   | Phase 2 (100-200 students) |
| **2-4× t3.medium (auto-scale)** | 80-120 sessions         | 60-80 sessions   | Phase 3 (500-600 students) |

**Peak Usage Calculation:**

- 500 students total
- 10-15% concurrent usage during peak hours
- Peak concurrent sessions: 50-75 students
- Infrastructure needed: 2-3× t3.medium instances

**Auto-Scaling Triggers:**

- CPU > 70% for 5 minutes → Add 1 instance
- CPU < 30% for 10 minutes → Remove 1 instance
- Min instances: 2
- Max instances: 4

### Real-Time Communication Flow

```
Student 1 (Browser)          Student 2 (Browser)          Student 3 (Browser)
      │                            │                            │
      │ WebSocket                  │ WebSocket                  │ WebSocket
      ▼                            ▼                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              Application Load Balancer                          │
│              (Distributes connections)                          │
└─────────────────────────────────────────────────────────────────┘
      │                            │                            │
      ▼                            ▼                            ▼
┌──────────┐              ┌──────────┐              ┌──────────┐
│ EC2 Web 1│              │ EC2 Web 2│              │ EC2 Web 3│
│ (20 sess)│              │ (20 sess)│              │ (10 sess)│
└──────────┘              └──────────┘              └──────────┘
      │                            │                            │
      └────────────────┬───────────┴────────────────┘
                       │
                       ▼
      ┌────────────────────────────────────┐
      │     Shared Services (All Sessions) │
      │                                     │
      │  • ElastiCache Redis (Sessions)    │
      │  • Bedrock/OpenAI (LLM)            │
      │  • HeyGen API (STT+TTS+Avatar)     │
      │  • S3 (Temporary Storage)          │
      └────────────────────────────────────┘
```

### Session Management

**Redis Cache Structure:**

```
session:{sessionId} → {
  userId: "student123",
  avatarId: "teacher_avatar_1",
  startedAt: "2025-10-31T10:00:00Z",
  conversationHistory: [...],
  connectionId: "abc123"
}

active_sessions → Set of active session IDs
user:{userId}:sessions → List of user's sessions
```

**Session Limits:**

- Max session duration: 30 minutes (auto-terminate)
- Max sessions per student: 2 concurrent
- Max total concurrent sessions: 80 (with 4 instances)
- Session timeout: 5 minutes of inactivity

---

## Cost-Optimized Cloud Options

### Option 1: AWS with EC2 (Recommended for Your Use Case)

**Complete AWS Infrastructure with Detailed Specifications:**

#### Compute Services

| Service                   | Instance Type | Specifications                   | Quantity      | Unit Cost            | Monthly Cost |
| ------------------------- | ------------- | -------------------------------- | ------------- | -------------------- | ------------ |
| **EC2 Web Servers**       | t3.medium     | 2 vCPU, 4GB RAM, EBS 50GB        | 2 instances   | $30.37/instance      | $60.74       |
| **EC2 Reserved (1-year)** | t3.medium     | Same as above (30% savings)      | 2 instances   | $21.26/instance      | $42.52       |
| **EBS Storage**           | gp3           | 50GB per instance                | 2 volumes     | $4.00/volume         | $8.00        |
| **Lambda Functions**      | N/A           | 512MB, 500ms avg, 1M requests    | -             | -                    | $20.00       |
| **Auto Scaling**          | t3.medium     | Additional instances during peak | 0-2 instances | $30.37/instance      | $0-60        |
|                           |               |                                  |               | **Compute Subtotal** | **$131.26**  |

**What This Means (Non-Technical Explanation):**
- **EC2 Instances:** Virtual computers in the cloud that run your website and handle student requests. Think of them as powerful servers that are always on.
- **EBS Storage:** Hard drive space for your EC2 computers to store the application code and temporary files.
- **Lambda Functions:** Small programs that run only when needed (like when a student starts talking to the avatar). You only pay when they run.
- **Auto Scaling:** Automatically adds more computers during busy times (like exam periods) and removes them when quiet. Saves money.
- **Reserved Instances:** Like buying a 1-year subscription - you get 30% discount by committing to use the servers for a year.

#### Networking & Load Balancing

| Service                       | Type         | Specifications            | Quantity | Unit Cost               | Monthly Cost |
| ----------------------------- | ------------ | ------------------------- | -------- | ----------------------- | ------------ |
| **Application Load Balancer** | ALB          | 1 ALB, 730 hours          | 1        | $16.20 + LCU            | $22.00       |
| **ALB Data Processing**       | LCU          | 100GB processed           | -        | $0.008/GB               | $8.00        |
| **Route 53**                  | Hosted Zone  | 1 zone, 10M queries       | 1        | $0.50 + queries         | $1.00        |
| **Data Transfer Out**         | Internet     | First 10TB                | 500GB    | $0.09/GB                | $45.00       |
| **CloudFront CDN**            | Distribution | 1TB transfer, 5M requests | 1        | -                       | $85.00       |
|                               |              |                           |          | **Networking Subtotal** | **$161.00**  |

**What This Means (Non-Technical Explanation):**
- **Application Load Balancer:** Traffic cop that distributes students across multiple servers so no single server gets overloaded.
- **Route 53:** Phone book of the internet - translates your website name (elearning.globalagi.org) to server addresses.
- **Data Transfer Out:** Cost of sending data from AWS to students' browsers (videos, documents, avatar streams).
- **CloudFront CDN:** Copies of your website stored in multiple locations worldwide so students get faster loading times.

#### Database & Caching

| Service                | Instance Type  | Specifications    | Quantity | Unit Cost            | Monthly Cost |
| ---------------------- | -------------- | ----------------- | -------- | -------------------- | ------------ |
| **ElastiCache Redis**  | cache.t3.small | 1.5GB RAM, 1 node | 1        | $0.034/hour          | $24.82       |
| **ElastiCache Backup** | Snapshot       | 2GB daily backup  | 7 days   | $0.085/GB            | $1.19        |
|                        |                |                   |          | **Caching Subtotal** | **$26.01**   |

**What This Means (Non-Technical Explanation):**
- **ElastiCache Redis:** Super-fast memory storage that remembers student sessions, conversation history, and frequently accessed data. Makes the website respond instantly.
- **Backup:** Daily snapshots of the cache data in case something goes wrong.

#### Storage Services

| Service                     | Storage Class | Specifications                   | Volume | Unit Cost              | Monthly Cost |
| --------------------------- | ------------- | -------------------------------- | ------ | ---------------------- | ------------ |
| **S3 Standard**             | Hot storage   | Documents, uploads, active files | 200GB  | $0.023/GB              | $4.60        |
| **S3 Standard Transfer**    | Data out      | File downloads                   | 500GB  | $0.09/GB               | $45.00       |
| **S3 PUT Requests**         | API calls     | File uploads                     | 100K   | $0.005/1K              | $0.50        |
| **S3 GET Requests**         | API calls     | File downloads                   | 500K   | $0.0004/1K             | $0.20        |
| **S3 Intelligent-Tiering**  | Auto-tier     | Video recordings                 | 500GB  | $0.023/GB + $0.0025/1K | $11.50       |
| **S3 Intelligent Transfer** | Data out      | Video streaming                  | 200GB  | $0.09/GB               | $18.00       |
| **S3 Glacier**              | Archive       | Old recordings (optional)        | 1TB    | $0.004/GB              | $4.10        |
|                             |               |                                  |        | **Storage Subtotal**   | **$83.90**   |

**What This Means (Non-Technical Explanation):**
- **S3 Standard:** Cloud storage for documents, student uploads, certificates, and active files. Like Dropbox but for your application.
- **S3 Intelligent-Tiering:** Smart storage that automatically moves old videos to cheaper storage when they're not accessed frequently.
- **S3 Glacier:** Very cheap long-term storage for old recordings you rarely need but must keep.
- **Data Transfer:** Cost of students downloading files and watching videos.
- **API Requests:** Small charges for each time a file is uploaded or downloaded.

#### AI Services (LLM Only - HeyGen Handles Speech)

| Service                        | Type               | Specifications                  | Volume | Unit Cost                | Monthly Cost |
| ------------------------------ | ------------------ | ------------------------------- | ------ | ------------------------ | ------------ |
| **Amazon Bedrock**             | LLM (Claude Haiku) | 1M input, 500K output tokens    | -      | $0.00025 + $0.00125      | $0.88        |
| **OpenAI API (Alternative)**   | GPT-3.5-turbo      | 1M input, 500K output tokens    | -      | $0.0005 + $0.0015        | $1.25        |
| **Bedrock/OpenAI (Realistic)** | Production usage   | Higher volume for conversations | -      | -                        | $50.00       |
|                                |                    |                                 |        | **AI Services Subtotal** | **$50.00**   |

**What This Means (Non-Technical Explanation):**
- **LLM (Large Language Model):** The "brain" that makes avatars have intelligent conversations with students. Like ChatGPT.
- **Bedrock/OpenAI:** AI services that understand questions and generate smart, contextual responses.
- **Why only $50?** HeyGen already includes speech recognition and voice generation in their API!

**Important - HeyGen Handles Speech (Saves $185/month):**
- ✅ **Speech-to-Text:** Converts student voice to text (included in HeyGen)
- ✅ **Text-to-Speech:** Generates avatar voice (included in HeyGen)
- ✅ **Voice Cloning:** Custom voice IDs for different teachers (included in HeyGen)
- ✅ **Lip-Sync:** Avatar mouth movements match speech perfectly (included in HeyGen)
- ❌ **No need for Amazon Transcribe ($144/month) or Polly ($40/month)** - HeyGen does it all!

#### WebSocket & API Services

| Service                    | Type        | Specifications                        | Volume  | Unit Cost        | Monthly Cost |
| -------------------------- | ----------- | ------------------------------------- | ------- | ---------------- | ------------ |
| **API Gateway WebSocket**  | Connections | 500K messages, 30K connection-minutes | -       | $1/1M messages   | $0.50        |
| **API Gateway Connection** | Minutes     | 500 students × 2 sessions × 30 min    | 30K min | $0.25/1M min     | $7.50        |
|                            |             |                                       |         | **API Subtotal** | **$8.00**    |

**What This Means (Non-Technical Explanation):**
- **API Gateway WebSocket:** Enables real-time two-way communication between students and avatars. Like keeping a phone line open during the entire conversation.
- **Connection Minutes:** Charged for how long students stay connected (very cheap - less than $0.01 per student session).

#### Monitoring & Security

| Service                     | Type            | Specifications            | Volume     | Unit Cost               | Monthly Cost |
| --------------------------- | --------------- | ------------------------- | ---------- | ----------------------- | ------------ |
| **CloudWatch Logs**         | Log ingestion   | Application + Lambda logs | 20GB       | $0.50/GB                | $10.00       |
| **CloudWatch Logs Storage** | Retention       | 30 days retention         | 20GB       | $0.03/GB                | $0.60        |
| **CloudWatch Metrics**      | Custom metrics  | 50 custom metrics         | 50         | $0.30/metric            | $15.00       |
| **CloudWatch Alarms**       | Alerts          | 10 alarms                 | 10         | $0.10/alarm             | $1.00        |
| **Secrets Manager**         | Secrets storage | API keys, credentials     | 10 secrets | $0.40/secret            | $4.00        |
| **AWS WAF**                 | Web firewall    | Basic rules               | 1 ACL      | $5 + $1/rule            | $10.00       |
|                             |                 |                           |            | **Monitoring Subtotal** | **$40.60**   |

**What This Means (Non-Technical Explanation):**
- **CloudWatch Logs:** Records everything that happens in your application (like a security camera recording). Helps find and fix problems.
- **CloudWatch Metrics:** Tracks performance numbers (how many students online, server speed, errors). Like a dashboard in your car.
- **CloudWatch Alarms:** Sends alerts when something goes wrong (server overloaded, too many errors). Like a smoke detector.
- **Secrets Manager:** Securely stores passwords and API keys. Like a digital safe.
- **AWS WAF:** Web firewall that blocks hackers and malicious traffic. Like a security guard at the door.

#### Email Service (Optional)

| Service          | Type                | Specifications        | Volume | Unit Cost          | Monthly Cost                          |
| ---------------- | ------------------- | --------------------- | ------ | ------------------ | ------------------------------------- |
| **Amazon SES**   | Transactional email | 50K emails/month      | 50K    | $0.10/1K           | $5.00                                 |
| **Brevo (Keep)** | Alternative         | Current email service | -      | -                  | $25.00                                |
|                  |                     |                       |        | **Email Subtotal** | **$5.00 (SES)** or **$25.00 (Brevo)** |

**What This Means (Non-Technical Explanation):**
- **Amazon SES:** AWS email service for sending transactional emails (enrollment confirmations, password resets, certificates). Very cheap.
- **Brevo (Alternative):** Your current email service. More expensive but has nice templates and analytics. Can keep using it if you prefer.

---

### AWS Total Cost Summary

#### Full Scale (500-600 Students)

| Category                             | Monthly Cost           | Notes                                       |
| ------------------------------------ | ---------------------- | ------------------------------------------- |
| **Compute Services**                 | $131.26                | EC2 instances, Lambda, EBS                  |
| **Networking & Load Balancing**      | $161.00                | ALB, CloudFront, Route 53, Data Transfer    |
| **Database & Caching**               | $26.01                 | ElastiCache Redis                           |
| **Storage Services**                 | $83.90                 | S3 (Standard + Intelligent-Tiering)         |
| **AI Services (LLM Only)**           | $50.00                 | Bedrock/OpenAI for conversation             |
| **WebSocket & API**                  | $8.00                  | API Gateway WebSocket                       |
| **Monitoring & Security**            | $40.60                 | CloudWatch, Secrets Manager, WAF            |
| **Email Service**                    | $5.00                  | Amazon SES (or $25 for Brevo)               |
|                                      |                        |                                             |
| **AWS Infrastructure Total**         | **$505.77**            | **Reduced by $184.88** (no speech services) |
| **With Reserved Instances (1-year)** | **$417.03**            | Save $88.74/month                           |
|                                      |                        |                                             |
| **MongoDB Atlas M10**                | $57.00                 | External (recommended)                      |
| **External Services**                | $75.00                 | Brevo ($25) + Certifier.io ($50)            |
|                                      |                        |                                             |
| **Total Infrastructure**             | **$637.77/month**      | **Reduced by $184.88**                      |
| **With Reserved Instances**          | **$549.03/month**      | **Reduced by $184.88**                      |
|                                      |                        |                                             |
| **HeyGen API (500-600 students)**    | $500-1,000             | Includes STT, TTS, Avatar Video             |
|                                      |                        |                                             |
| **GRAND TOTAL (AWS)**                | **$1,137-1,637/month** | **Saves $185/month**                        |
| **With Reserved Instances**          | **$1,049-1,549/month** | **Saves $185/month**                        |
| **Annual Cost**                      | **$13,644-19,644**     | **Saves $2,220/year**                       |
| **Annual (Reserved)**                | **$12,588-18,588**     | **Saves $2,220/year**                       |

---

## 💰 COMPLETE COST BREAKDOWN FOR STAKEHOLDERS

### What You're Paying For (Simple Explanation)

This section breaks down ALL costs in simple terms for non-technical decision makers.

#### AWS Infrastructure Costs: $505.77/month (or $417.03 with 1-year commitment)

| What It Does | Monthly Cost | Why You Need It |
|--------------|--------------|-----------------|
| **Web Servers (EC2)** | $131 | Computers that run your website 24/7 and handle all student requests |
| **Internet & Speed (Networking)** | $161 | Fast internet connection, traffic distribution, and global content delivery |
| **Quick Memory (Redis Cache)** | $26 | Makes website respond instantly by remembering frequently used data |
| **File Storage (S3)** | $84 | Stores all documents, videos, certificates, and student uploads |
| **Conversation Brain (AI/LLM)** | $50 | Makes avatars have intelligent conversations (like ChatGPT) |
| **Real-time Connections (WebSocket)** | $8 | Keeps students connected to avatars during conversations |
| **Monitoring & Security** | $41 | Tracks performance, stores logs, protects against attacks |
| **Email Service** | $5 | Sends emails to students (or $25 if keeping Brevo) |
| **TOTAL AWS** | **$506/month** | **$6,072/year** |
| **With 1-year commitment** | **$417/month** | **$5,004/year** (saves $1,068) |

#### External Services (Not AWS)

| Service | Monthly Cost | Why You Need It |
|---------|--------------|-----------------|
| **MongoDB Atlas** | $57 | Database that stores all student data, courses, progress |
| **Brevo Email** | $25 | Professional email service for student communications |
| **Certifier.io** | $50 | Generates and manages digital certificates for students |
| **TOTAL External** | **$132/month** | **$1,584/year** |

#### HeyGen Avatar Service

| What It Includes | Monthly Cost | Why You Need It |
|------------------|--------------|-----------------|
| **Speech Recognition** | Included | Understands student voice |
| **Voice Generation** | Included | Makes avatar speak naturally |
| **Avatar Video** | Included | Creates realistic teacher avatar |
| **Lip-Sync** | Included | Avatar mouth matches speech |
| **Real-time Streaming** | Included | Instant responses to students |
| **TOTAL HeyGen** | **$500-1,000/month** | **$6,000-12,000/year** |

**Note:** HeyGen pricing depends on usage (minutes of avatar conversations). More students = higher cost.

---

### 📊 TOTAL MONTHLY COSTS (All Services Combined)

#### Option A: AWS with 1-Year Commitment (Recommended) ✅

| Category | Monthly Cost | Annual Cost | What It Includes |
|----------|--------------|-------------|------------------|
| AWS Infrastructure | $417 | $5,004 | Servers, storage, networking, AI brain |
| MongoDB Database | $57 | $684 | Student data storage |
| Email & Certificates | $75 | $900 | Brevo + Certifier.io |
| **Subtotal (Fixed Costs)** | **$549** | **$6,588** | **Infrastructure that runs 24/7** |
| | | | |
| HeyGen Avatars (Low) | $500 | $6,000 | For ~40-50 students |
| HeyGen Avatars (Medium) | $750 | $9,000 | For ~200-300 students |
| HeyGen Avatars (High) | $1,000 | $12,000 | For ~500-600 students |
| | | | |
| **TOTAL (Low Usage)** | **$1,049/month** | **$12,588/year** | 40-50 students |
| **TOTAL (Medium Usage)** | **$1,299/month** | **$15,588/year** | 200-300 students |
| **TOTAL (High Usage)** | **$1,549/month** | **$18,588/year** | 500-600 students |

#### Option B: AWS without Commitment (Pay-as-you-go)

| Category | Monthly Cost | Annual Cost | What It Includes |
|----------|--------------|-------------|------------------|
| AWS Infrastructure | $506 | $6,072 | Servers, storage, networking, AI brain |
| MongoDB Database | $57 | $684 | Student data storage |
| Email & Certificates | $75 | $900 | Brevo + Certifier.io |
| **Subtotal (Fixed Costs)** | **$638** | **$7,656** | **Infrastructure that runs 24/7** |
| | | | |
| HeyGen Avatars (Low) | $500 | $6,000 | For ~40-50 students |
| HeyGen Avatars (Medium) | $750 | $9,000 | For ~200-300 students |
| HeyGen Avatars (High) | $1,000 | $12,000 | For ~500-600 students |
| | | | |
| **TOTAL (Low Usage)** | **$1,138/month** | **$13,656/year** | 40-50 students |
| **TOTAL (Medium Usage)** | **$1,388/month** | **$16,656/year** | 200-300 students |
| **TOTAL (High Usage)** | **$1,638/month** | **$19,656/year** | 500-600 students |

**Recommendation:** Option A (1-year commitment) saves $1,068/year

---

### 🎯 Cost Comparison: Current vs Future

| Scenario | Monthly Cost | Annual Cost | What You Get |
|----------|--------------|-------------|--------------|
| **Current Setup** | $100-125 | $1,200-1,500 | Render + MongoDB Free + Basic services |
| **With HeyGen (40-50 students)** | $1,049 | $12,588 | Full AWS + Real-time AI avatars |
| **With HeyGen (500-600 students)** | $1,549 | $18,588 | Scaled infrastructure + AI avatars |

**Cost Increase:** ~10x more expensive, but you're adding:
- ✅ Real-time AI avatar teachers
- ✅ Voice conversations with students
- ✅ Scalable infrastructure for 500+ students
- ✅ Professional hosting and security
- ✅ Auto-scaling during peak times

---

### Phased Cost Breakdown (Start Small, Scale Up)

#### Phase 1: Current Scale (40-50 Students)

| Component              | Configuration             | Monthly Cost          | Notes                                     |
| ---------------------- | ------------------------- | --------------------- | ----------------------------------------- |
| **EC2 Instances**      | 2× t3.small (2 vCPU, 2GB) | $30.37                | Smaller instances for current load        |
| **Other AWS Services** | Reduced usage             | $215.00               | Lower data transfer (no speech services)  |
| **MongoDB Atlas**      | M0 Free or M10            | $0-57                 | Can start with free tier                  |
| **External Services**  | Brevo + Certifier.io      | $75.00                | Same as full scale                        |
| **HeyGen API**         | ~10 hours/month           | $200-400              | Includes STT, TTS, Avatar                 |
| **TOTAL (Phase 1)**    | **$520-777/month**        | **$6,240-9,324/year** | **Saves $185/month vs original estimate** |

#### Phase 2: Growth (100-200 Students)

| Component              | Configuration              | Monthly Cost            | Notes                                        |
| ---------------------- | -------------------------- | ----------------------- | -------------------------------------------- |
| **EC2 Instances**      | 2× t3.medium (2 vCPU, 4GB) | $60.74                  | Scale up instances                           |
| **Other AWS Services** | Medium usage               | $365.00                 | Increased data transfer (no speech services) |
| **MongoDB Atlas**      | M10                        | $57.00                  | Upgrade to dedicated                         |
| **External Services**  | Brevo + Certifier.io       | $75.00                  | Same                                         |
| **HeyGen API**         | ~30 hours/month            | $400-600                | Includes STT, TTS, Avatar                    |
| **TOTAL (Phase 2)**    | **$957-1,157/month**       | **$11,484-13,884/year** | **Saves $185/month vs original estimate**    |

#### Phase 3: Target Scale (500-600 Students)

| Component              | Configuration               | Monthly Cost            | Notes                                     |
| ---------------------- | --------------------------- | ----------------------- | ----------------------------------------- |
| **EC2 Instances**      | 2-4× t3.medium (auto-scale) | $60-120                 | Auto-scaling enabled                      |
| **Other AWS Services** | Full usage                  | $505.77                 | As detailed above (no speech services)    |
| **MongoDB Atlas**      | M10 or M20                  | $57-120                 | May need M20 for performance              |
| **External Services**  | Brevo + Certifier.io        | $75.00                  | Same                                      |
| **HeyGen API**         | ~100 hours/month            | $500-1,000              | Includes STT, TTS, Avatar                 |
| **TOTAL (Phase 3)**    | **$1,049-1,549/month**      | **$12,588-18,588/year** | **Saves $185/month vs original estimate** |

---

### HeyGen API Cost Breakdown by Scale

**Assumptions:**

- Average session: 15 minutes per student
- Frequency: 2 sessions per month per student
- HeyGen pricing: ~$0.10-0.20 per minute (enterprise tier)

| Student Count | Monthly Minutes               | HeyGen Cost (Low) | HeyGen Cost (High) | Notes          |
| ------------- | ----------------------------- | ----------------- | ------------------ | -------------- |
| **40-50**     | 600-750 min (10-12.5 hrs)     | $200              | $400               | Starting phase |
| **100-200**   | 1,500-3,000 min (25-50 hrs)   | $400              | $600               | Growth phase   |
| **500-600**   | 7,500-9,000 min (125-150 hrs) | $500              | $1,000             | Target scale   |

**Note:** Contact HeyGen for volume discounts at scale. Enterprise pricing may offer better rates for committed usage.

---

### Database Options Comparison

| Option | Service           | Instance Type  | Specs                                       | Monthly Cost | Migration Effort             | Recommendation       |
| ------ | ----------------- | -------------- | ------------------------------------------- | ------------ | ---------------------------- | -------------------- |
| **A**  | MongoDB Atlas M10 | Shared cluster | 2GB RAM, 10GB storage, 3-node replica       | $57          | ✅ Minimal (upgrade only)    | ✅ **Best Choice**   |
| **B**  | MongoDB Atlas M20 | Dedicated      | 4GB RAM, 20GB storage, 3-node replica       | $120         | ✅ Minimal (upgrade only)    | Good for growth      |
| **C**  | AWS DocumentDB    | db.t3.medium   | 2 vCPU, 4GB RAM, 100GB storage, 1 instance  | $180         | ⚠️ Medium (migration needed) | Full AWS integration |
| **D**  | AWS DocumentDB    | db.r5.large    | 2 vCPU, 16GB RAM, 100GB storage, 1 instance | $350         | ⚠️ Medium (migration needed) | High performance     |

**Recommended: MongoDB Atlas M10 ($57/month)** - Easiest migration, proven reliability, automatic backups

### Option 2: Azure with Virtual Machines (Alternative)

**Complete Azure Infrastructure with Detailed Specifications:**

#### Compute Services

| Service                  | Instance Type | Specifications                    | Quantity | Unit Cost            | Monthly Cost |
| ------------------------ | ------------- | --------------------------------- | -------- | -------------------- | ------------ |
| **Virtual Machines**     | B2s           | 2 vCPU, 4GB RAM, 8GB temp storage | 2 VMs    | $30.37/VM            | $60.74       |
| **VM Reserved (1-year)** | B2s           | Same as above (30% savings)       | 2 VMs    | $21.26/VM            | $42.52       |
| **Managed Disks**        | Premium SSD   | 64GB per VM                       | 2 disks  | $9.60/disk           | $19.20       |
| **Azure Functions**      | Premium Plan  | EP1, 1 vCPU, 3.5GB RAM            | 1 plan   | -                    | $25.00       |
| **Auto Scaling**         | B2s           | Additional VMs during peak        | 0-2 VMs  | $30.37/VM            | $0-60        |
|                          |               |                                   |          | **Compute Subtotal** | **$125.46**  |

#### Networking & Load Balancing

| Service                 | Type               | Specifications            | Quantity | Unit Cost               | Monthly Cost |
| ----------------------- | ------------------ | ------------------------- | -------- | ----------------------- | ------------ |
| **Application Gateway** | Standard v2        | 1 gateway, 730 hours      | 1        | $0.246/hour             | $179.58      |
| **App Gateway Data**    | Processing         | 100GB processed           | -        | $0.008/GB               | $0.80        |
| **Azure DNS**           | Public zone        | 1 zone, 10M queries       | 1        | $0.50 + queries         | $1.00        |
| **Data Transfer Out**   | Internet           | First 5TB                 | 500GB    | $0.087/GB               | $43.50       |
| **Azure CDN**           | Standard Microsoft | 1TB transfer, 5M requests | 1        | -                       | $80.00       |
|                         |                    |                           |          | **Networking Subtotal** | **$304.88**  |

#### Database & Caching

| Service                   | Instance Type | Specifications     | Quantity | Unit Cost            | Monthly Cost |
| ------------------------- | ------------- | ------------------ | -------- | -------------------- | ------------ |
| **Azure Cache for Redis** | Standard C1   | 1GB cache, 1 shard | 1        | $0.075/hour          | $54.75       |
| **Redis Backup**          | Snapshot      | Daily backups      | -        | Included             | $0.00        |
|                           |               |                    |          | **Caching Subtotal** | **$54.75**   |

#### Storage Services

| Service                 | Storage Tier | Specifications                   | Volume | Unit Cost               | Monthly Cost |
| ----------------------- | ------------ | -------------------------------- | ------ | ----------------------- | ------------ |
| **Blob Storage (Hot)**  | Hot tier     | Documents, uploads, active files | 200GB  | $0.0184/GB              | $3.68        |
| **Blob Hot Transfer**   | Data out     | File downloads                   | 500GB  | $0.087/GB               | $43.50       |
| **Blob Transactions**   | Operations   | 100K write, 500K read            | -      | $0.065/10K + $0.004/10K | $2.65        |
| **Blob Storage (Cool)** | Cool tier    | Video recordings                 | 500GB  | $0.01/GB                | $5.00        |
| **Blob Cool Transfer**  | Data out     | Video streaming                  | 200GB  | $0.087/GB               | $17.40       |
| **Blob Archive**        | Archive tier | Old recordings (optional)        | 1TB    | $0.002/GB               | $2.05        |
|                         |              |                                  |        | **Storage Subtotal**    | **$74.28**   |

#### AI & Speech Services

| Service                    | Type             | Specifications                         | Volume    | Unit Cost                | Monthly Cost |
| -------------------------- | ---------------- | -------------------------------------- | --------- | ------------------------ | ------------ |
| **Speech to Text**         | Standard         | Streaming recognition                  | 100 hours | $1.00/hour               | $100.00      |
| **Text to Speech**         | Neural voices    | High-quality synthesis                 | 10M chars | $16/1M chars             | $160.00      |
| **Speech Caching Savings** | Optimization     | Cache common responses (75% reduction) | -         | -                        | -$120.00     |
| **Azure OpenAI**           | GPT-3.5-turbo    | 1M input, 500K output tokens           | -         | $0.0005 + $0.0015        | $1.25        |
| **OpenAI (Realistic)**     | Production usage | Higher volume for conversations        | -         | -                        | $50.00       |
|                            |                  |                                        |           | **AI Services Subtotal** | **$191.25**  |

#### WebSocket & Real-time Services

| Service             | Type     | Specifications                  | Volume | Unit Cost              | Monthly Cost |
| ------------------- | -------- | ------------------------------- | ------ | ---------------------- | ------------ |
| **SignalR Service** | Standard | 1,000 units, unlimited messages | 1      | $49/unit               | $49.00       |
|                     |          |                                 |        | **Real-time Subtotal** | **$49.00**   |

#### Monitoring & Security

| Service                   | Type            | Specifications              | Volume     | Unit Cost               | Monthly Cost |
| ------------------------- | --------------- | --------------------------- | ---------- | ----------------------- | ------------ |
| **Azure Monitor Logs**    | Log ingestion   | Application + Function logs | 20GB       | $0.50/GB                | $10.00       |
| **Log Analytics**         | Retention       | 30 days retention           | 20GB       | $0.12/GB                | $2.40        |
| **Application Insights**  | APM             | Performance monitoring      | 10GB       | $2.30/GB                | $23.00       |
| **Azure Monitor Metrics** | Custom metrics  | 50 custom metrics           | 50         | Included                | $0.00        |
| **Key Vault**             | Secrets storage | API keys, credentials       | 10 secrets | $0.03/10K ops           | $3.00        |
| **Azure Firewall**        | Web protection  | Basic rules                 | 1 policy   | $5 + $1/rule            | $10.00       |
|                           |                 |                             |            | **Monitoring Subtotal** | **$48.40**   |

#### Email Service (Optional)

| Service                          | Type        | Specifications        | Volume | Unit Cost          | Monthly Cost                            |
| -------------------------------- | ----------- | --------------------- | ------ | ------------------ | --------------------------------------- |
| **Azure Communication Services** | Email       | 50K emails/month      | 50K    | $0.10/1K           | $5.00                                   |
| **Brevo (Keep)**                 | Alternative | Current email service | -      | -                  | $25.00                                  |
|                                  |             |                       |        | **Email Subtotal** | **$5.00 (Azure)** or **$25.00 (Brevo)** |

---

### Azure Total Cost Summary

| Category                             | Monthly Cost           | Notes                                           |
| ------------------------------------ | ---------------------- | ----------------------------------------------- |
| **Compute Services**                 | $125.46                | VMs, Functions, Managed Disks                   |
| **Networking & Load Balancing**      | $304.88                | App Gateway, CDN, DNS, Data Transfer            |
| **Database & Caching**               | $54.75                 | Azure Cache for Redis                           |
| **Storage Services**                 | $74.28                 | Blob Storage (Hot + Cool)                       |
| **AI Services (LLM Only)**           | $50.00                 | Azure OpenAI for conversation                   |
| **WebSocket & Real-time**            | $49.00                 | SignalR Service                                 |
| **Monitoring & Security**            | $48.40                 | Monitor, App Insights, Key Vault                |
| **Email Service**                    | $5.00                  | Azure Communication Services (or $25 for Brevo) |
|                                      |                        |                                                 |
| **Azure Infrastructure Total**       | **$711.77**            | **Reduced by $141.25** (no speech services)     |
| **With Reserved Instances (1-year)** | **$693.55**            | Save $18.22/month                               |
|                                      |                        |                                                 |
| **MongoDB Atlas M10**                | $57.00                 | External (recommended)                          |
| **External Services**                | $75.00                 | Brevo ($25) + Certifier.io ($50)                |
|                                      |                        |                                                 |
| **Total Infrastructure**             | **$843.77/month**      | **Reduced by $141.25**                          |
| **With Reserved Instances**          | **$825.55/month**      | **Reduced by $141.25**                          |
|                                      |                        |                                                 |
| **HeyGen API**                       | $500-1,000             | Includes STT, TTS, Avatar Video                 |
|                                      |                        |                                                 |
| **GRAND TOTAL (Azure)**              | **$1,343-1,843/month** | **Saves $142/month**                            |
| **With Reserved Instances**          | **$1,325-1,825/month** | **Saves $142/month**                            |
| **Annual Cost**                      | **$16,116-22,116**     | **Saves $1,704/year**                           |
| **Annual (Reserved)**                | **$15,900-21,900**     | **Saves $1,704/year**                           |

---

## 💰 COMPLETE AZURE COST BREAKDOWN FOR STAKEHOLDERS

### What You're Paying For (Simple Explanation)

#### Azure Infrastructure Costs: $711.77/month (or $693.55 with 1-year commitment)

| What It Does | Monthly Cost | Why You Need It |
|--------------|--------------|-----------------|
| **Web Servers (VMs)** | $125 | Virtual computers that run your website 24/7 |
| **Internet & Speed (Networking)** | $305 | Fast internet, traffic distribution, global content delivery |
| **Quick Memory (Redis Cache)** | $55 | Makes website respond instantly |
| **File Storage (Blob)** | $74 | Stores all documents, videos, certificates |
| **Conversation Brain (AI/LLM)** | $50 | Makes avatars have intelligent conversations |
| **Real-time Connections (SignalR)** | $49 | Keeps students connected to avatars |
| **Monitoring & Security** | $48 | Tracks performance, protects against attacks |
| **Email Service** | $5 | Sends emails to students |
| **TOTAL Azure** | **$712/month** | **$8,544/year** |
| **With 1-year commitment** | **$694/month** | **$8,328/year** (saves $216) |

#### External Services (Same as AWS)

| Service | Monthly Cost | Why You Need It |
|---------|--------------|-----------------|
| **MongoDB Atlas** | $57 | Database for student data |
| **Brevo Email** | $25 | Professional email service |
| **Certifier.io** | $50 | Digital certificates |
| **TOTAL External** | **$132/month** | **$1,584/year** |

#### HeyGen Avatar Service (Same as AWS)

| What It Includes | Monthly Cost | Why You Need It |
|------------------|--------------|-----------------|
| **All Speech & Avatar Services** | $500-1,000 | Real-time AI teacher avatars |
| **TOTAL HeyGen** | **$500-1,000/month** | **$6,000-12,000/year** |

---

### 📊 TOTAL MONTHLY COSTS - AZURE (All Services Combined)

#### Azure with 1-Year Commitment

| Category | Monthly Cost | Annual Cost | What It Includes |
|----------|--------------|-------------|------------------|
| Azure Infrastructure | $694 | $8,328 | Servers, storage, networking, AI brain |
| MongoDB Database | $57 | $684 | Student data storage |
| Email & Certificates | $75 | $900 | Brevo + Certifier.io |
| **Subtotal (Fixed Costs)** | **$826** | **$9,912** | **Infrastructure that runs 24/7** |
| | | | |
| HeyGen Avatars (Low) | $500 | $6,000 | For ~40-50 students |
| HeyGen Avatars (Medium) | $750 | $9,000 | For ~200-300 students |
| HeyGen Avatars (High) | $1,000 | $12,000 | For ~500-600 students |
| | | | |
| **TOTAL (Low Usage)** | **$1,326/month** | **$15,912/year** | 40-50 students |
| **TOTAL (Medium Usage)** | **$1,576/month** | **$18,912/year** | 200-300 students |
| **TOTAL (High Usage)** | **$1,826/month** | **$21,912/year** | 500-600 students |

**Note:** Azure is $277/month more expensive than AWS ($3,324/year difference)

---

### Database Options Comparison (Same for Both Clouds)

| Option | Service           | Instance Type  | Specs                                      | Monthly Cost | Migration Effort             | Recommendation     |
| ------ | ----------------- | -------------- | ------------------------------------------ | ------------ | ---------------------------- | ------------------ |
| **A**  | MongoDB Atlas M10 | Shared cluster | 2GB RAM, 10GB storage, 3-node replica      | $57          | ✅ Minimal (upgrade only)    | ✅ **Best Choice** |
| **B**  | MongoDB Atlas M20 | Dedicated      | 4GB RAM, 20GB storage, 3-node replica      | $120         | ✅ Minimal (upgrade only)    | Good for growth    |
| **C**  | AWS DocumentDB    | db.t3.medium   | 2 vCPU, 4GB RAM, 100GB storage, 1 instance | $180         | ⚠️ Medium (migration needed) | AWS only           |
| **D**  | Azure Cosmos DB   | MongoDB API    | 1000 RU/s, 100GB storage                   | $380         | ⚠️ Medium (migration needed) | Azure only         |

**Recommended: MongoDB Atlas M10 ($57/month)** - Easiest migration, proven reliability, automatic backups, works with both AWS and Azure

### Option 3: Keep Render + External APIs (Not Recommended)

**Why Not Recommended:** Render's shared environment can't handle multiple simultaneous HeyGen sessions efficiently. You'll experience performance issues and potential crashes.

| Service                 | Purpose                              | Monthly Cost           |
| ----------------------- | ------------------------------------ | ---------------------- |
| **Render**              | Upgrade to $85 plan (more resources) | $85                    |
| **MongoDB Atlas**       | Upgrade to M10 Dedicated             | $57                    |
| **Cloudinary**          | Current usage                        | $25                    |
| **Brevo**               | Email                                | $25                    |
| **Certifier.io**        | Certificates                         | $50                    |
| **HeyGen API**          | Avatar streaming                     | $500-1000              |
| **OpenAI API**          | Conversation AI                      | $100                   |
| **Deepgram/AssemblyAI** | Speech-to-text                       | $200                   |
| **ElevenLabs**          | Text-to-speech                       | $100                   |
|                         | **TOTAL**                            | **$1,142-1,642/month** |

**Issues with this approach:**

- ❌ Render can't handle concurrent HeyGen sessions
- ❌ No auto-scaling capability
- ❌ Limited control over resources
- ❌ Higher latency with external APIs
- ❌ More expensive than AWS/Azure

---

## Detailed Cost Comparison

### Current State

| Service       | Monthly Cost |
| ------------- | ------------ |
| Render        | $25          |
| MongoDB Atlas | $0 (Free)    |
| Cloudinary    | $0-25        |
| Brevo         | $25          |
| Certifier.io  | $50          |
| **TOTAL**     | **$100-125** |

### Future State Options (with HeyGen) - Detailed Breakdown

| Option                   | Description                    | Infrastructure | Database | External Services | Subtotal  | HeyGen API | Total/Month  | Annual         |
| ------------------------ | ------------------------------ | -------------- | -------- | ----------------- | --------- | ---------- | ------------ | -------------- |
| **A: AWS EC2 + Atlas**   | AWS with MongoDB Atlas         | $690.65        | $57.00   | $75.00            | $822.65   | $500-1,000 | $1,322-1,822 | $15,864-21,864 |
| **A1: AWS Reserved**     | With 1-year reserved instances | $601.91        | $57.00   | $75.00            | $733.91   | $500-1,000 | $1,233-1,733 | $14,796-20,796 |
| **B: AWS + DocumentDB**  | All-in AWS                     | $690.65        | $180.00  | $75.00            | $945.65   | $500-1,000 | $1,445-1,945 | $17,340-23,340 |
| **C: Azure VMs + Atlas** | Azure with MongoDB Atlas       | $853.02        | $57.00   | $75.00            | $985.02   | $500-1,000 | $1,485-1,985 | $17,820-23,820 |
| **C1: Azure Reserved**   | With 1-year reserved instances | $834.80        | $57.00   | $75.00            | $966.80   | $500-1,000 | $1,466-1,966 | $17,592-23,592 |
| **D: Azure + Cosmos DB** | All-in Azure                   | $853.02        | $380.00  | $75.00            | $1,308.02 | $500-1,000 | $1,808-2,308 | $21,696-27,696 |
| **E: Render + APIs**     | Keep Render (not viable)       | $242.00        | $57.00   | $75.00            | $374.00   | $500-1,000 | $874-1,374   | $10,488-16,488 |

**Detailed Cost Components:**

#### Option A: AWS EC2 + MongoDB Atlas (Recommended) ✅

| Component                    | Monthly Cost     | Details                           |
| ---------------------------- | ---------------- | --------------------------------- |
| EC2 Instances (2× t3.medium) | $60.74           | Web application servers           |
| EBS Storage                  | $8.00            | 50GB per instance                 |
| Lambda Functions             | $20.00           | HeyGen event processing           |
| Application Load Balancer    | $30.00           | Traffic distribution              |
| ElastiCache Redis            | $26.01           | Session management                |
| S3 Storage                   | $83.90           | File storage (documents + videos) |
| CloudFront CDN               | $85.00           | Content delivery                  |
| Amazon Transcribe            | $144.00          | Speech-to-text                    |
| Amazon Polly                 | $40.00           | Text-to-speech (with caching)     |
| Bedrock/OpenAI               | $50.00           | LLM conversation                  |
| API Gateway WebSocket        | $8.00            | Real-time connections             |
| CloudWatch + Security        | $40.60           | Monitoring, logs, secrets         |
| Route 53 + Data Transfer     | $46.00           | DNS + outbound traffic            |
| Amazon SES                   | $5.00            | Email (or $25 for Brevo)          |
| **AWS Infrastructure**       | **$690.65**      |                                   |
| MongoDB Atlas M10            | $57.00           | Database (external)               |
| Brevo Email                  | $25.00           | Transactional emails              |
| Certifier.io                 | $50.00           | Digital certificates              |
| **Total Infrastructure**     | **$822.65**      |                                   |
| **HeyGen API**               | **$500-1,000**   | Avatar generation                 |
| **GRAND TOTAL**              | **$1,322-1,822** |                                   |

**With Reserved Instances (1-year commitment):**

- Save $88.74/month on EC2
- **Total: $1,233-1,733/month**

---

#### Option C: Azure VMs + MongoDB Atlas (Alternative)

| Component                 | Monthly Cost     | Details                     |
| ------------------------- | ---------------- | --------------------------- |
| Virtual Machines (2× B2s) | $60.74           | Web application servers     |
| Managed Disks             | $19.20           | 64GB premium SSD per VM     |
| Azure Functions           | $25.00           | HeyGen event processing     |
| Application Gateway       | $180.38          | Load balancing + WAF        |
| Azure Cache for Redis     | $54.75           | Session management          |
| Blob Storage              | $74.28           | File storage (hot + cool)   |
| Azure CDN                 | $80.00           | Content delivery            |
| Speech Services           | $140.00          | STT + TTS (with caching)    |
| Azure OpenAI              | $50.00           | LLM conversation            |
| SignalR Service           | $49.00           | Real-time WebSocket         |
| Azure Monitor + Security  | $48.40           | Monitoring, logs, Key Vault |
| Azure DNS + Data Transfer | $44.50           | DNS + outbound traffic      |
| Communication Services    | $5.00            | Email (or $25 for Brevo)    |
| **Azure Infrastructure**  | **$853.02**      |                             |
| MongoDB Atlas M10         | $57.00           | Database (external)         |
| Brevo Email               | $25.00           | Transactional emails        |
| Certifier.io              | $50.00           | Digital certificates        |
| **Total Infrastructure**  | **$985.02**      |                             |
| **HeyGen API**            | **$500-1,000**   | Avatar generation           |
| **GRAND TOTAL**           | **$1,485-1,985** |                             |

**With Reserved Instances (1-year commitment):**

- Save $18.22/month on VMs
- **Total: $1,466-1,966/month**

---

### Cost Comparison Summary

| Metric                  | AWS EC2 | AWS Reserved | Azure VMs | Azure Reserved | Difference            |
| ----------------------- | ------- | ------------ | --------- | -------------- | --------------------- |
| **Infrastructure Only** | $822.65 | $733.91      | $985.02   | $966.80        | AWS cheaper by $162   |
| **With HeyGen (Low)**   | $1,322  | $1,233       | $1,485    | $1,466         | AWS cheaper by $163   |
| **With HeyGen (High)**  | $1,822  | $1,733       | $1,985    | $1,966         | AWS cheaper by $163   |
| **Annual (Low)**        | $15,864 | $14,796      | $17,820   | $17,592        | AWS cheaper by $1,956 |
| **Annual (High)**       | $21,864 | $20,796      | $23,820   | $23,592        | AWS cheaper by $1,956 |

**Winner: AWS EC2 with Reserved Instances** ✅

- **$1,233-1,733/month** ($14,796-20,796/year)
- Saves $163/month compared to Azure
- Saves $1,956/year compared to Azure

---

## Recommended Solution: AWS EC2 with MongoDB Atlas

### Why This Approach?

1. **Handles Load:** EC2 instances can handle multiple simultaneous HeyGen sessions
2. **Auto-Scaling:** Can scale up/down based on demand
3. **Full Control:** Complete control over server resources
4. **Cost-Effective:** $857/month base + $500-1,000 HeyGen = $1,432-1,932 total
5. **Easy Database:** Keep MongoDB Atlas (just upgrade to M10) - no migration needed
6. **S3 Integration:** Better file storage than Cloudinary for your scale
7. **Proven Stack:** AWS is battle-tested for high-load applications

### Architecture Details

**AWS EC2 Application:**

- 2× t3.medium instances (auto-scaling to 4 if needed)
- Application Load Balancer for traffic distribution
- Serves React frontend (via CloudFront CDN)
- Manages student/course data
- Handles authentication
- Manages enrollments, quizzes, certificates
- Stores files in S3 (replaces Cloudinary)
- Sends emails via Brevo or SES

**AWS HeyGen Services:**

- Lambda functions for HeyGen event processing
- API Gateway WebSocket for real-time chat
- Amazon Transcribe for speech-to-text
- Amazon Polly for text-to-speech
- Bedrock/OpenAI for LLM conversation
- ElastiCache Redis for session management
- S3 for temporary audio/video storage
- HeyGen API integration

**External Services (Keep):**

- MongoDB Atlas M10 (upgrade from free tier)
- Google Meet (live classes)
- Brevo (email) or migrate to SES
- Certifier.io (certificates)
- Sends emails via Brevo
- Stores files in Cloudinary

**New HeyGen Service (AWS):**

- WebSocket server for real-time chat
- Speech-to-text for student questions
- Text-to-speech for avatar responses
- LLM integration for intelligent conversation
- Session management
- HeyGen API integration

**Communication Flow:**

```
Student Browser
      │
      ├─────────────────────────────────────┐
      │                                      │
      ▼                                      ▼
Render App (Main)                    AWS Lambda (HeyGen)
      │                                      │
      ├─ MongoDB Atlas                       ├─ API Gateway WebSocket
      ├─ Cloudinary                          ├─ Amazon Transcribe (STT)
      ├─ Brevo Email                         ├─ Amazon Polly (TTS)
      ├─ Certifier.io                        ├─ Bedrock/OpenAI (LLM)
      └─ Google Meet                         ├─ ElastiCache (Sessions)
                                             └─ HeyGen API
```

### Implementation Plan

**Phase 1: AWS Setup (1 week)**

- [ ] Create AWS account
- [ ] Set up IAM roles and policies
- [ ] Configure API Gateway WebSocket
- [ ] Set up Lambda functions
- [ ] Configure ElastiCache Redis
- [ ] Set up S3 bucket
- [ ] Configure CloudWatch logging

**Phase 2: HeyGen Integration (2-3 weeks)**

- [ ] Set up HeyGen API account
- [ ] Build WebSocket server (Lambda)
- [ ] Integrate Amazon Transcribe
- [ ] Integrate Amazon Polly
- [ ] Integrate LLM (Bedrock or OpenAI)
- [ ] Build session management
- [ ] Test real-time interactions

**Phase 3: Frontend Integration (1 week)**

- [ ] Build HeyGen avatar UI component
- [ ] Integrate WebSocket client
- [ ] Add voice recording
- [ ] Add text chat interface
- [ ] Test end-to-end flow

**Phase 4: Testing & Launch (1 week)**

- [ ] Load testing
- [ ] User acceptance testing
- [ ] Security testing
- [ ] Documentation
- [ ] Go live

**Total Timeline: 5-6 weeks**

---

## Detailed AWS Services Breakdown

### 1. API Gateway WebSocket

**Purpose:** Real-time bidirectional communication between students and HeyGen avatars

**Configuration:**

- WebSocket API
- 500,000 messages/month (estimated)
- Connection duration: 30 minutes average
- Concurrent connections: 50 peak

**Cost Calculation:**

- $1.00 per million messages
- 500K messages = $0.50
- Connection minutes: 500 students × 2 sessions × 30 min = 30,000 minutes
- $0.25 per million connection minutes = $7.50
- **Total: ~$15/month**

### 2. AWS Lambda

**Purpose:** Serverless compute for handling WebSocket events, processing messages

**Configuration:**

- Memory: 512MB
- Average duration: 500ms
- Requests: 1 million/month
- Concurrent executions: 50

**Cost Calculation:**

- Compute: $0.0000166667 per GB-second
- 1M requests × 0.5s × 0.5GB = 250,000 GB-seconds
- 250,000 × $0.0000166667 = $4.17
- Requests: 1M × $0.20 per 1M = $0.20
- **Total: ~$20/month**

### 3. Amazon Transcribe (Speech-to-Text)

**Purpose:** Convert student voice to text for avatar to understand

**Configuration:**

- Standard model
- 100 hours/month (500 students × 12 minutes avg)
- English language

**Cost Calculation:**

- $0.024 per minute (standard)
- 100 hours = 6,000 minutes
- 6,000 × $0.024 = $144
- Batch discount: ~40% = $96
- **Total: ~$240/month** (conservative estimate)

**Optimization:** Use streaming API with silence detection to reduce billable minutes

### 4. Amazon Polly (Text-to-Speech)

**Purpose:** Convert avatar responses to natural speech

**Configuration:**

- Neural voices (high quality)
- 10 million characters/month

**Cost Calculation:**

- $16.00 per 1 million characters (neural)
- 10M characters = $160
- With caching common responses: ~75% reduction
- **Total: ~$40/month**

### 5. ElastiCache for Redis

**Purpose:** Session management, caching avatar states, conversation history

**Configuration:**

- Instance: cache.t3.micro
- Memory: 0.5GB
- Single node (no replication for cost savings)

**Cost:**

- $0.017 per hour
- 730 hours/month = $12.41
- Data transfer: minimal
- **Total: ~$15/month**

### 6. Amazon S3

**Purpose:** Temporary storage for audio files, session recordings, cache

**Configuration:**

- Standard storage: 50GB
- Data transfer out: 100GB/month
- PUT requests: 100,000/month
- GET requests: 500,000/month

**Cost Calculation:**

- Storage: 50GB × $0.023 = $1.15
- Transfer: 100GB × $0.09 = $9.00 (first 10TB)
- PUT: 100K × $0.005/1000 = $0.50
- GET: 500K × $0.0004/1000 = $0.20
- **Total: ~$11/month**

### 7. Amazon Bedrock or OpenAI API

**Purpose:** LLM for intelligent conversation, context understanding

**Configuration:**

- Model: Claude 3 Haiku or GPT-3.5-turbo
- 1M tokens input, 500K tokens output per month

**Cost Calculation (Bedrock Claude Haiku):**

- Input: 1M tokens × $0.00025 = $0.25
- Output: 500K tokens × $0.00125 = $0.63
- **Total: ~$1/month**

**Alternative (OpenAI GPT-3.5-turbo):**

- Input: 1M tokens × $0.0005 = $0.50
- Output: 500K tokens × $0.0015 = $0.75
- **Total: ~$1.25/month**

**Note:** For more advanced conversations, budget $50-100/month

### 8. CloudWatch

**Purpose:** Logging, monitoring, alarms

**Configuration:**

- Log ingestion: 10GB/month
- Log storage: 10GB
- Metrics: 50 custom metrics
- Alarms: 10 alarms

**Cost Calculation:**

- Ingestion: 10GB × $0.50 = $5.00
- Storage: 10GB × $0.03 = $0.30
- Metrics: 50 × $0.30 = $15.00 (first 10 free)
- Alarms: 10 × $0.10 = $1.00 (first 10 free)
- **Total: ~$10/month**

### AWS Total: $448/month

---

## Azure Alternative (Detailed)

### 1. Azure SignalR Service

**Purpose:** Real-time WebSocket communication

**Configuration:**

- Free tier: 20 concurrent connections, 20K messages/day
- Standard tier: 1,000 concurrent connections

**Cost:**

- Free tier sufficient for testing
- Standard: $49/month for 1K connections
- **Estimated: $20/month** (with free tier + overages)

### 2. Azure Functions

**Purpose:** Serverless compute

**Configuration:**

- Consumption plan
- 1M executions
- 512MB memory
- 500ms average duration

**Cost:**

- Execution: 1M × $0.20/million = $0.20
- Compute: 250K GB-seconds × $0.000016 = $4.00
- **Total: ~$20/month**

### 3. Azure Speech Services

**Purpose:** Speech-to-text and text-to-speech

**Configuration:**

- Speech-to-text: 100 hours
- Text-to-speech: 10M characters (neural)

**Cost:**

- STT: 100 hours × $1.00/hour = $100
- TTS: 10M chars × $16/million = $160
- Combined discount: ~30%
- **Total: ~$280/month**

### 4. Azure Cache for Redis

**Purpose:** Session management

**Configuration:**

- Basic C0: 250MB
- No replication

**Cost:**

- $0.023 per hour
- 730 hours = $16.79
- **Total: ~$17/month**

### 5. Azure Blob Storage

**Purpose:** Temporary file storage

**Configuration:**

- Hot tier: 50GB
- Data transfer: 100GB

**Cost:**

- Storage: 50GB × $0.0184 = $0.92
- Transfer: 100GB × $0.087 = $8.70
- Operations: minimal
- **Total: ~$10/month**

### 6. Azure OpenAI Service

**Purpose:** LLM for conversation

**Configuration:**

- GPT-3.5-turbo
- 1M input tokens, 500K output tokens

**Cost:**

- Same as OpenAI API
- **Total: ~$50-100/month**

### 7. Azure Monitor

**Purpose:** Logging and monitoring

**Configuration:**

- 10GB log ingestion
- Basic metrics

**Cost:**

- Ingestion: 10GB × $0.50 = $5.00
- Storage: included
- **Total: ~$10/month**

### Azure Total: $454/month

---

## HeyGen API Costs (Separate)

### HeyGen Pricing Tiers

| Tier           | Monthly Cost | Included             | Best For               |
| -------------- | ------------ | -------------------- | ---------------------- |
| **Creator**    | $29          | 15 min video credits | Testing only           |
| **Business**   | $89          | 60 min video credits | Small scale            |
| **Enterprise** | $500-2,000   | Custom, API access   | Production (your case) |

### Estimated HeyGen Usage

**Assumptions:**

- 500 students
- Each student: 2 avatar sessions/month
- Average session: 15 minutes
- Total: 500 × 2 × 15 = 15,000 minutes/month = 250 hours

**HeyGen Enterprise Pricing (estimated):**

- Base: $500/month
- Per-minute: $0.10-0.50/minute
- 15,000 minutes × $0.20 = $3,000
- **Total: $500-1,000/month** (with volume discounts)

**Note:** Contact HeyGen for actual enterprise pricing

---

## Total Cost Summary

### Monthly Costs

| Component                 | Cost Range             |
| ------------------------- | ---------------------- |
| **Existing Services**     |                        |
| Render                    | $25-85                 |
| MongoDB Atlas             | $0-57                  |
| Cloudinary                | $0-50                  |
| Brevo                     | $25                    |
| Certifier.io              | $50                    |
| **Subtotal (Existing)**   | **$100-267**           |
|                           |                        |
| **New Services (HeyGen)** |                        |
| AWS/Azure Infrastructure  | $448-454               |
| HeyGen API                | $500-1,000             |
| **Subtotal (New)**        | **$948-1,454**         |
|                           |                        |
| **GRAND TOTAL**           | **$1,048-1,721/month** |

### Annual Costs

| Scenario                    | Monthly      | Annual         | Notes       |
| --------------------------- | ------------ | -------------- | ----------- |
| **Current (No HeyGen)**     | $100-267     | $1,200-3,204   | Baseline    |
| **With HeyGen (Optimized)** | $1,048-1,721 | $12,576-20,652 | Recommended |
| **Full Cloud Migration**    | $2,500-4,000 | $30,000-48,000 | Unnecessary |

---

## Cost Optimization Strategies

### 1. HeyGen Usage Optimization

**Strategy:** Implement smart session management

- Cache common responses
- Use pre-recorded segments for introductions
- Implement session timeouts (15 min max)
- Batch similar questions

**Savings:** 30-50% on HeyGen costs = $150-500/month

### 2. Speech Services Optimization

**Strategy:** Reduce billable minutes

- Implement voice activity detection
- Use silence suppression
- Cache common TTS responses
- Use lower-cost models where appropriate

**Savings:** 40-60% on speech costs = $100-150/month

### 3. Render Optimization

**Strategy:** Stay on current plan if possible

- Optimize Node.js performance
- Implement caching
- Use CDN for static assets
- Monitor resource usage

**Savings:** Avoid $60 upgrade = $60/month

### 4. MongoDB Optimization

**Strategy:** Stay on free tier longer

- Implement data archiving
- Optimize queries
- Use indexes effectively
- Clean up old data

**Savings:** Delay $57 upgrade = $57/month

### Total Potential Savings: $367-767/month

**Optimized Monthly Cost: $681-954/month**

---

## Comparison: AWS vs Azure for HeyGen

| Factor                   | AWS                | Azure                     | Winner          |
| ------------------------ | ------------------ | ------------------------- | --------------- |
| **Cost**                 | $448/month         | $454/month                | AWS (-$6)       |
| **Speech Services**      | Transcribe + Polly | Speech Services (unified) | Azure (simpler) |
| **WebSocket**            | API Gateway        | SignalR Service           | Azure (easier)  |
| **LLM Integration**      | Bedrock or OpenAI  | OpenAI Service            | Tie             |
| **Learning Curve**       | Medium             | Medium-Low                | Azure           |
| **Documentation**        | Excellent          | Excellent                 | Tie             |
| **Free Tier**            | 12 months          | 12 months                 | Tie             |
| **Scalability**          | Excellent          | Excellent                 | Tie             |
| **Vendor Lock-in**       | Medium             | Medium                    | Tie             |
| **Community**            | Larger             | Growing                   | AWS             |
| **Middle East Presence** | Bahrain            | UAE                       | Azure (closer)  |

### Recommendation: **AWS**

**Reasons:**

1. **Slightly cheaper:** $6/month savings
2. **Better Lambda ecosystem:** More mature serverless
3. **Transcribe quality:** Industry-leading speech recognition
4. **Larger community:** More resources and examples
5. **Your team familiarity:** Easier if you know AWS basics

**Choose Azure if:**

- You prefer unified Speech Services
- You want simpler WebSocket setup (SignalR)
- Geographic proximity matters (UAE region)
- You have existing Azure credits

---

## Implementation Roadmap

### Week 1: Setup & Planning

**Days 1-2: AWS Account Setup**

- [ ] Create AWS account
- [ ] Set up billing alerts ($500, $750, $1000)
- [ ] Configure IAM users and roles
- [ ] Set up MFA for security
- [ ] Create development environment

**Days 3-5: Infrastructure Setup**

- [ ] Set up API Gateway WebSocket
- [ ] Create Lambda functions (skeleton)
- [ ] Configure ElastiCache Redis
- [ ] Set up S3 bucket
- [ ] Configure CloudWatch logging
- [ ] Set up Secrets Manager for API keys

**Days 6-7: HeyGen Account**

- [ ] Contact HeyGen sales for enterprise pricing
- [ ] Set up HeyGen account
- [ ] Get API credentials
- [ ] Review HeyGen documentation
- [ ] Test HeyGen API in sandbox

### Week 2-3: Core Development

**Days 8-12: WebSocket Server**

- [ ] Build Lambda WebSocket handler
- [ ] Implement connection management
- [ ] Build message routing
- [ ] Implement session management (Redis)
- [ ] Add authentication
- [ ] Test WebSocket connections

**Days 13-17: Speech Integration**

- [ ] Integrate Amazon Transcribe
- [ ] Implement voice activity detection
- [ ] Integrate Amazon Polly
- [ ] Cache common TTS responses
- [ ] Test speech quality
- [ ] Optimize latency

**Days 18-21: LLM Integration**

- [ ] Set up Bedrock or OpenAI
- [ ] Build conversation context management
- [ ] Implement prompt engineering
- [ ] Add conversation memory
- [ ] Test conversation quality
- [ ] Implement fallback responses

### Week 4: HeyGen Integration

**Days 22-25: Avatar Integration**

- [ ] Integrate HeyGen API
- [ ] Build avatar session management
- [ ] Implement video streaming
- [ ] Connect speech to avatar
- [ ] Test end-to-end flow
- [ ] Handle error scenarios

**Days 26-28: Testing**

- [ ] Unit testing
- [ ] Integration testing
- [ ] Load testing (50 concurrent users)
- [ ] Latency testing
- [ ] Security testing
- [ ] Bug fixes

### Week 5: Frontend Integration

**Days 29-32: UI Development**

- [ ] Build HeyGen avatar component (React)
- [ ] Integrate WebSocket client
- [ ] Add voice recording UI
- [ ] Add text chat interface
- [ ] Add session controls
- [ ] Responsive design

**Days 33-35: Integration & Testing**

- [ ] Connect frontend to backend
- [ ] Test on multiple browsers
- [ ] Test on mobile devices
- [ ] User acceptance testing
- [ ] Performance optimization
- [ ] Documentation

### Week 6: Launch

**Days 36-38: Pre-launch**

- [ ] Final security audit
- [ ] Load testing with real users
- [ ] Set up monitoring dashboards
- [ ] Create runbook for operations
- [ ] Train support team
- [ ] Prepare rollback plan

**Days 39-42: Launch & Monitor**

- [ ] Soft launch (10% of users)
- [ ] Monitor metrics closely
- [ ] Gather user feedback
- [ ] Fix critical issues
- [ ] Full launch (100% of users)
- [ ] Post-launch optimization

---

## Technical Architecture Details

### WebSocket Communication Flow

```
Student Browser
      │
      │ 1. Connect WebSocket
      ▼
API Gateway WebSocket
      │
      │ 2. Invoke Lambda
      ▼
Lambda Function (Connection Handler)
      │
      │ 3. Store connection in Redis
      ▼
ElastiCache Redis
      │
      │ 4. Return success
      ▼
Student Browser (Connected)
      │
      │ 5. Send voice/text message
      ▼
API Gateway WebSocket
      │
      │ 6. Invoke Lambda
      ▼
Lambda Function (Message Handler)
      │
      ├─ 7a. If voice → Transcribe
      │         │
      │         ▼
      │   Amazon Transcribe (STT)
      │         │
      │         └─ Text
      │
      ├─ 7b. Send text to LLM
      │         │
      │         ▼
      │   Bedrock/OpenAI (LLM)
      │         │
      │         └─ Response text
      │
      ├─ 7c. Convert to speech
      │         │
      │         ▼
      │   Amazon Polly (TTS)
      │         │
      │         └─ Audio
      │
      └─ 7d. Send to HeyGen
                │
                ▼
          HeyGen API
                │
                └─ Avatar video + audio
                      │
                      ▼
                Student Browser
```

### Lambda Functions Architecture

**1. Connection Handler (`onConnect`)**

```javascript
// Handles new WebSocket connections
exports.handler = async (event) => {
  const connectionId = event.requestContext.connectionId;
  const userId = event.queryStringParameters.userId;

  // Store connection in Redis
  await redis.set(
    `connection:${connectionId}`,
    JSON.stringify({
      userId,
      connectedAt: Date.now(),
    }),
    "EX",
    3600
  ); // 1 hour expiry

  return { statusCode: 200 };
};
```

**2. Message Handler (`onMessage`)**

```javascript
// Handles incoming messages
exports.handler = async (event) => {
  const message = JSON.parse(event.body);
  const connectionId = event.requestContext.connectionId;

  if (message.type === "voice") {
    // Process voice message
    const text = await transcribe(message.audio);
    const response = await getLLMResponse(text);
    const audio = await textToSpeech(response);
    const avatarVideo = await heygenAPI.generateAvatar(audio);

    await sendToClient(connectionId, {
      type: "avatar_response",
      video: avatarVideo,
      text: response,
    });
  }

  return { statusCode: 200 };
};
```

**3. Disconnect Handler (`onDisconnect`)**

```javascript
// Handles disconnections
exports.handler = async (event) => {
  const connectionId = event.requestContext.connectionId;

  // Clean up Redis
  await redis.del(`connection:${connectionId}`);

  return { statusCode: 200 };
};
```

### Redis Data Structure

```
# Connection tracking
connection:{connectionId} → {userId, connectedAt, sessionId}

# Session data
session:{sessionId} → {userId, avatarId, conversationHistory, startedAt}

# Conversation history
conversation:{sessionId} → [{role: 'user', text: '...'}, {role: 'avatar', text: '...'}]

# TTS cache
tts_cache:{text_hash} → {audioUrl, generatedAt}

# Rate limiting
rate_limit:{userId} → {count, resetAt}
```

### Environment Variables

```bash
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=123456789012

# API Gateway
WEBSOCKET_API_ENDPOINT=wss://abc123.execute-api.us-east-1.amazonaws.com/prod

# Redis
REDIS_ENDPOINT=your-redis.cache.amazonaws.com:6379

# HeyGen
HEYGEN_API_KEY=your_heygen_api_key
HEYGEN_API_URL=https://api.heygen.com/v1

# OpenAI/Bedrock
OPENAI_API_KEY=your_openai_key
# OR
BEDROCK_MODEL_ID=anthropic.claude-3-haiku-20240307-v1:0

# S3
S3_BUCKET_NAME=your-heygen-sessions

# Monitoring
CLOUDWATCH_LOG_GROUP=/aws/lambda/heygen-integration
```

---

## Security Considerations

### 1. Authentication & Authorization

**Current (Render):**

- JWT-based authentication
- Session management with express-session

**HeyGen Service:**

- Validate JWT token on WebSocket connection
- Store user context in Redis
- Implement rate limiting per user
- Timeout inactive sessions (15 minutes)

```javascript
// WebSocket authentication
const validateToken = async (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded.userId;
  } catch (error) {
    throw new Error("Invalid token");
  }
};
```

### 2. Data Privacy

**Sensitive Data:**

- Voice recordings (temporary)
- Conversation history
- Student personal information

**Protection Measures:**

- Encrypt data in transit (WSS, HTTPS)
- Encrypt data at rest (S3, Redis)
- Auto-delete voice recordings after 24 hours
- Anonymize logs
- GDPR compliance (if needed)

### 3. Rate Limiting

**Prevent Abuse:**

- Max 10 avatar sessions per student per day
- Max 30 minutes per session
- Max 100 messages per session
- Implement exponential backoff

```javascript
// Rate limiting with Redis
const checkRateLimit = async (userId) => {
  const key = `rate_limit:${userId}:${(Date.now() / 86400000) | 0}`;
  const count = await redis.incr(key);
  await redis.expire(key, 86400); // 24 hours

  if (count > 10) {
    throw new Error("Daily limit exceeded");
  }
};
```

### 4. Cost Controls

**Prevent Runaway Costs:**

- Set AWS budget alerts
- Implement session timeouts
- Monitor HeyGen API usage
- Set max concurrent sessions
- Implement graceful degradation

```javascript
// Cost control
const MAX_CONCURRENT_SESSIONS = 50;
const MAX_SESSION_DURATION = 30 * 60 * 1000; // 30 minutes

const checkConcurrentSessions = async () => {
  const activeSessions = await redis.keys("session:*");
  if (activeSessions.length >= MAX_CONCURRENT_SESSIONS) {
    throw new Error("System at capacity");
  }
};
```

---

## Monitoring & Alerting

### Key Metrics to Track

| Metric                    | Threshold        | Alert          |
| ------------------------- | ---------------- | -------------- |
| **WebSocket Connections** | > 100 concurrent | Warning        |
| **Lambda Errors**         | > 5% error rate  | Critical       |
| **Transcribe Latency**    | > 3 seconds      | Warning        |
| **LLM Response Time**     | > 5 seconds      | Warning        |
| **HeyGen API Errors**     | > 2% error rate  | Critical       |
| **Redis Memory**          | > 80%            | Warning        |
| **Monthly Cost**          | > $1,500         | Critical       |
| **Session Duration**      | > 30 minutes     | Auto-terminate |

### CloudWatch Dashboards

**Dashboard 1: Real-time Operations**

- Active WebSocket connections
- Messages per minute
- Lambda invocations
- Error rates
- Latency percentiles (p50, p95, p99)

**Dashboard 2: Cost Tracking**

- Daily spend by service
- HeyGen API usage
- Speech service minutes
- Data transfer costs
- Projected monthly cost

**Dashboard 3: User Experience**

- Average session duration
- Messages per session
- User satisfaction (if tracked)
- Error rates by user
- Peak usage times

### Alerts Configuration

```yaml
# CloudWatch Alarms
Alarms:
  HighErrorRate:
    Metric: Errors
    Threshold: 5%
    Period: 5 minutes
    Action: SNS notification

  HighCost:
    Metric: EstimatedCharges
    Threshold: $50/day
    Period: 1 day
    Action: Email + SMS

  HighLatency:
    Metric: Duration
    Threshold: 5000ms
    Period: 5 minutes
    Action: SNS notification
```

---

## Disaster Recovery & Backup

### Backup Strategy

| Data              | Backup Frequency        | Retention   | Recovery Time |
| ----------------- | ----------------------- | ----------- | ------------- |
| **MongoDB**       | Daily                   | 30 days     | < 1 hour      |
| **Redis**         | Hourly snapshots        | 7 days      | < 15 minutes  |
| **S3 Files**      | Continuous (versioning) | 90 days     | Immediate     |
| **Lambda Code**   | Git + versioning        | Indefinite  | < 5 minutes   |
| **Configuration** | IaC (Terraform)         | Git history | < 30 minutes  |

### Disaster Scenarios

**Scenario 1: AWS Region Outage**

- **Impact:** HeyGen service unavailable
- **Mitigation:** Fallback to text-only chat
- **Recovery:** Switch to backup region (if configured)

**Scenario 2: HeyGen API Outage**

- **Impact:** Avatar unavailable
- **Mitigation:** Show pre-recorded video or text responses
- **Recovery:** Automatic retry with exponential backoff

**Scenario 3: Database Failure**

- **Impact:** Cannot access user data
- **Mitigation:** Read-only mode with cached data
- **Recovery:** Restore from latest backup

**Scenario 4: Cost Spike**

- **Impact:** Unexpected high bills
- **Mitigation:** Auto-disable HeyGen after threshold
- **Recovery:** Investigate and optimize

---

## Final Recommendation

### Recommended Approach: Hybrid AWS

**What to Do:**

1. **Keep existing infrastructure** (Render, MongoDB Atlas, Cloudinary, Brevo)
2. **Add AWS services** for HeyGen integration only
3. **Start small** with minimal AWS configuration
4. **Scale gradually** based on actual usage

**Expected Costs:**

- **Month 1-3 (Testing):** $200-400/month (AWS only, limited HeyGen)
- **Month 4-6 (Soft Launch):** $600-900/month (50% user adoption)
- **Month 7+ (Full Launch):** $1,000-1,700/month (full user adoption)

**Benefits:**

- ✅ Low risk (keep working systems)
- ✅ Fast implementation (5-6 weeks)
- ✅ Cost-effective ($1,000-1,700 vs $2,500-4,000)
- ✅ Scalable (can grow with usage)
- ✅ Flexible (can migrate more services later)

**Next Steps:**

1. Get budget approval for $1,500-2,000/month
2. Contact HeyGen for enterprise pricing quote
3. Create AWS account and set up billing alerts
4. Start Week 1 of implementation roadmap
5. Hire/assign developer for AWS integration (if needed)

---

## Appendix: Alternative Scenarios

### Scenario A: Ultra-Budget (< $500/month)

**Approach:** Pre-recorded HeyGen avatars only

- Create avatar videos in advance
- Store in Cloudinary or YouTube
- No real-time interaction
- **Cost:** $100-300/month (no AWS needed)

**Pros:** Very cheap, simple
**Cons:** Not interactive, limited value

### Scenario B: Premium Experience (> $3,000/month)

**Approach:** Full cloud migration + advanced features

- Migrate everything to AWS/Azure
- Multiple avatar personalities
- Advanced AI features
- Mobile apps
- **Cost:** $3,000-5,000/month

**Pros:** Best performance, fully scalable
**Cons:** Expensive, complex, overkill for 500 users

### Scenario C: Wait and See

**Approach:** Delay HeyGen integration

- Focus on core features first
- Grow user base to 1,000+
- Implement HeyGen when revenue justifies cost
- **Cost:** $100-300/month (current)

**Pros:** No risk, proven demand first
**Cons:** Miss competitive advantage, delayed innovation

---

**Document Version:** 2.0 (Optimized for 500 users)  
**Last Updated:** October 31, 2025  
**Prepared By:** AI Assistant  
**Status:** Ready for Implementation

---

## 🏆 FINAL COST COMPARISON: AWS vs Azure

### Complete Cost Breakdown (Corrected - HeyGen Includes Speech)

| Service Category         | AWS EC2       | AWS Reserved  | Azure VMs     | Azure Reserved | Winner       |
| ------------------------ | ------------- | ------------- | ------------- | -------------- | ------------ |
| **Compute**              | $131.26       | $131.26       | $125.46       | $125.46        | Azure -$5.80 |
| **Networking**           | $161.00       | $161.00       | $304.88       | $304.88        | AWS -$143.88 |
| **Caching**              | $26.01        | $26.01        | $54.75        | $54.75         | AWS -$28.74  |
| **Storage**              | $83.90        | $83.90        | $74.28        | $74.28         | Azure -$9.62 |
| **AI (LLM Only)**        | $50.00        | $50.00        | $50.00        | $50.00         | Tie          |
| **WebSocket/API**        | $8.00         | $8.00         | $49.00        | $49.00         | AWS -$41.00  |
| **Monitoring**           | $40.60        | $40.60        | $48.40        | $48.40         | AWS -$7.80   |
| **Email**                | $5.00         | $5.00         | $5.00         | $5.00          | Tie          |
| **Reserved Savings**     | $0.00         | -$88.74       | $0.00         | -$18.22        | AWS -$70.52  |
| **Infrastructure Total** | **$505.77**   | **$417.03**   | **$711.77**   | **$693.55**    | **AWS -$276.52** |
|                          |               |               |               |                |              |
| **MongoDB Atlas M10**    | $57.00        | $57.00        | $57.00        | $57.00         | Tie          |
| **External Services**    | $75.00        | $75.00        | $75.00        | $75.00         | Tie          |
| **Total Infrastructure** | **$637.77**   | **$549.03**   | **$843.77**   | **$825.55**    | **AWS -$276.52** |
|                          |               |               |               |                |              |
| **HeyGen API (Low)**     | $500.00       | $500.00       | $500.00       | $500.00        | Tie          |
| **HeyGen API (High)**    | $1,000.00     | $1,000.00     | $1,000.00     | $1,000.00      | Tie          |
|                          |               |               |               |                |              |
| **TOTAL (Low)**          | **$1,137.77** | **$1,049.03** | **$1,343.77** | **$1,325.55**  | **AWS -$277**    |
| **TOTAL (High)**         | **$1,637.77** | **$1,549.03** | **$1,843.77** | **$1,825.55**  | **AWS -$277**    |
|                          |               |               |               |                |              |
| **Annual (Low)**         | **$13,653**   | **$12,588**   | **$16,125**   | **$15,907**    | **AWS -$3,319**  |
| **Annual (High)**        | **$19,653**   | **$18,588**   | **$22,125**   | **$21,907**    | **AWS -$3,319**  |

---

### 💡 Key Findings for Decision Makers

**AWS is $277/month cheaper than Azure** ($3,319/year savings)

#### Why AWS Costs Less:

1. **Networking:** AWS saves $144/month
   - CloudFront CDN is cheaper than Azure CDN
   - Application Load Balancer is cheaper than Azure App Gateway
   
2. **WebSocket:** AWS saves $41/month
   - API Gateway WebSocket is cheaper than Azure SignalR Service
   
3. **Caching:** AWS saves $29/month
   - ElastiCache Redis is cheaper than Azure Cache for Redis
   
4. **Reserved Instances:** AWS saves $71/month more
   - Better discounts for 1-year commitment

5. **No Speech Services Needed:** Both save $185/month
   - HeyGen includes Speech-to-Text and Text-to-Speech
   - No need for Amazon Transcribe/Polly or Azure Speech Services

#### Azure Advantages:

- ✅ Slightly cheaper compute ($6/month)
- ✅ Slightly cheaper storage ($10/month)
- ✅ SignalR Service is easier to use (but more expensive)
- ✅ Unified platform (if you prefer Microsoft ecosystem)

---

## 🎯 Quick Decision Matrix for Stakeholders

| If you want...          | Choose...            | Monthly Cost | Annual Cost    | Savings vs Azure | Timeline      |
| ----------------------- | -------------------- | ------------ | -------------- | ---------------- | ------------- |
| **Most cost-effective** ✅ | AWS EC2 (Reserved)   | $1,049-1,549 | $12,588-18,588 | Save $3,319/year | 6-8 weeks     |
| **Best performance**    | AWS EC2 (On-demand)  | $1,138-1,638 | $13,656-19,656 | Save $2,469/year | 6-8 weeks     |
| **Easier WebSocket**    | Azure VMs (Reserved) | $1,326-1,826 | $15,912-21,912 | $0 (baseline)    | 6-8 weeks     |
| **Fully integrated**    | AWS + DocumentDB     | $1,172-1,672 | $14,064-20,064 | Save $1,848/year | 8-10 weeks    |
| **Not recommended** ❌   | Render + APIs        | $874-1,374   | $10,488-16,488 | Will crash       | N/A           |

**Recommended: AWS EC2 with Reserved Instances + MongoDB Atlas M10** ✅

---

### Why AWS EC2 is Recommended (Simple Explanation)

#### Cost Savings:
- ✅ **$277/month cheaper** than Azure ($3,319/year savings)
- ✅ **Better networking costs** - CloudFront CDN and Load Balancer are cheaper
- ✅ **Cheaper WebSocket** - Real-time connections cost less on AWS
- ✅ **Better reserved instance discounts** - Save more with 1-year commitment

#### Performance:
- ✅ **Proven at scale** - AWS handles millions of concurrent users
- ✅ **Auto-scaling** - Automatically adds servers during peak times
- ✅ **Global CDN** - Fast content delivery worldwide
- ✅ **Low latency** - Quick response times for students

#### Ease of Use:
- ✅ **Keep MongoDB Atlas** - No database migration needed, just upgrade
- ✅ **HeyGen handles speech** - No need to manage speech services
- ✅ **Extensive documentation** - Largest cloud community
- ✅ **Mature ecosystem** - More tools and integrations available  
✅ **Mature ecosystem** (Lambda, extensive documentation)  
✅ **Better reserved instance savings** ($88/month vs $18/month)  
✅ **Proven at scale** (handles concurrent HeyGen sessions)  
✅ **Easy database** (keep MongoDB Atlas, just upgrade to M10)  
✅ **S3 integration** (better than Cloudinary for your scale)

### When to Choose Azure?

- You prefer unified Speech Services (simpler API)
- You want built-in SignalR (easier WebSocket setup)
- Geographic proximity matters (UAE region)
- You have existing Azure credits or enterprise agreement
- Your team has Azure expertise

---

## Implementation Recommendation

### Phased Approach: Start Small, Scale Up

**Current Situation:**

- 40-50 students now
- Scaling to 500-600 students soon
- Need to handle simultaneous HeyGen avatar sessions
- Budget-conscious approach

### Phase 1: Launch (40-50 Students) - Weeks 1-8

**Infrastructure:**

- 2× EC2 t3.small instances (on-demand, no commitment yet)
- Application Load Balancer (basic)
- ElastiCache Redis (cache.t3.micro)
- S3 for file storage (minimal)
- CloudFront CDN (basic)
- Lambda + API Gateway for HeyGen
- Amazon Transcribe + Polly (pay-as-you-go)
- Bedrock or OpenAI for LLM

**Database:**

- Keep MongoDB Atlas Free tier initially
- Upgrade to M10 ($57/month) when needed

**External Services:**

- Keep Brevo for email ($25/month)
- Keep Certifier.io for certificates ($50/month)
- Keep Google Meet for live classes (external)

**Phase 1 Cost:**

- **Infrastructure:** $430/month (on-demand)
- **HeyGen API:** $200-400/month (lower usage)
- **External:** $75/month
- **Total:** $705-905/month ($8,460-10,860/year)

**Phase 1 Goals:**

- Validate HeyGen integration
- Test with real students
- Gather usage metrics
- Optimize costs

---

### Phase 2: Growth (100-200 Students) - Months 3-6

**Infrastructure Upgrades:**

- Upgrade to 2× EC2 t3.medium instances
- Purchase 1-year reserved instances (30% savings)
- Upgrade ElastiCache to cache.t3.small
- Increase S3 storage and CloudFront usage
- Scale speech services

**Database:**

- Upgrade MongoDB Atlas to M10 ($57/month)

**Phase 2 Cost:**

- **Infrastructure:** $610/month (with reserved instances)
- **HeyGen API:** $400-600/month (medium usage)
- **External:** $132/month (MongoDB + Brevo + Certifier.io)
- **Total:** $1,142-1,342/month ($13,704-16,104/year)

**Phase 2 Goals:**

- Handle 100-200 students
- 30-40 concurrent HeyGen sessions
- Optimize performance
- Prepare for full scale

---

### Phase 3: Full Scale (500-600 Students) - Months 6+

**Infrastructure at Scale:**

- 2-4× EC2 t3.medium instances (auto-scaling)
- Full Application Load Balancer
- ElastiCache Redis (cache.t3.small)
- S3 for file storage (full usage)
- CloudFront CDN (full usage)
- Lambda + API Gateway for HeyGen
- Amazon Transcribe + Polly (optimized with caching)
- Bedrock or OpenAI for LLM

**Database:**

- MongoDB Atlas M10 or M20 ($57-120/month)

**External Services:**

- Brevo or SES for email
- Certifier.io for certificates
- Google Meet for live classes

**Phase 3 Cost:**

- **Infrastructure:** $733.91/month (with reserved instances)
- **HeyGen API:** $500-1,000/month (full usage)
- **External:** $132/month
- **Total:** $1,233-1,733/month ($14,796-20,796/year)

**Phase 3 Goals:**

- Handle 500-600 students
- 60-80 concurrent HeyGen sessions
- Auto-scaling enabled
- Full production optimization

---

### Cost Progression Summary

| Phase                | Students | Monthly Cost | Annual Cost    | Concurrent Sessions |
| -------------------- | -------- | ------------ | -------------- | ------------------- |
| **Phase 1 (Launch)** | 40-50    | $705-905     | $8,460-10,860  | 15-20               |
| **Phase 2 (Growth)** | 100-200  | $1,142-1,342 | $13,704-16,104 | 30-40               |
| **Phase 3 (Scale)**  | 500-600  | $1,233-1,733 | $14,796-20,796 | 60-80               |

**Key Benefit:** You only pay for what you use. Start at $700-900/month and scale to $1,200-1,700/month as students grow.

---

### Implementation Timeline

**Weeks 1-2: AWS Setup**

- Create AWS account
- Set up billing alerts ($500, $750, $1000)
- Configure IAM users and roles
- Set up development environment
- Deploy basic infrastructure (t3.small instances)

**Weeks 3-4: Core Development**

- Build WebSocket server (Lambda)
- Integrate speech services (Transcribe + Polly)
- Integrate LLM (Bedrock/OpenAI)
- Set up session management (Redis)
- Test basic functionality

**Weeks 5-6: HeyGen Integration**

- Set up HeyGen API account
- Integrate HeyGen avatar generation
- Build avatar session management
- Test end-to-end flow
- Optimize latency

**Weeks 7-8: Frontend & Testing**

- Build HeyGen avatar UI component
- Integrate WebSocket client
- Add voice recording
- User acceptance testing
- Soft launch (10-20 students)

**Weeks 9-12: Optimization & Full Launch**

- Monitor performance
- Optimize costs
- Fix issues
- Full launch (all 40-50 students)
- Gather feedback

---

### Next Steps (Immediate Actions)

1. **Budget Approval**

   - Phase 1: $700-900/month
   - Phase 2: $1,100-1,400/month
   - Phase 3: $1,200-1,800/month

2. **HeyGen Contact**

   - Contact HeyGen sales for enterprise pricing
   - Negotiate volume discounts
   - Get API credentials

3. **AWS Account Setup**

   - Create AWS account
   - Set up billing alerts
   - Configure IAM roles
   - Enable cost explorer

4. **MongoDB Planning**

   - Keep free tier for Phase 1
   - Plan upgrade to M10 for Phase 2
   - Set up backup strategy

5. **Team Assignment**

   - Assign developer for AWS integration
   - Assign frontend developer for UI
   - Assign DevOps for infrastructure

6. **Start Development**
   - Begin Week 1 of implementation
   - Set up development environment
   - Start building infrastructure

**Recommended Start Date:** As soon as budget is approved

**Expected Launch:** 8-12 weeks from start

---

---

# 📋 EXECUTIVE SUMMARY FOR STAKEHOLDERS

## The Bottom Line

**Current Situation:**
- 40-50 students using basic platform
- Hosted on Render ($25/month)
- No AI avatar teachers
- Scaling to 500-600 students soon

**Proposed Solution:**
- Migrate to AWS cloud infrastructure
- Add HeyGen AI avatar teachers with real-time voice interaction
- Scalable architecture that grows with student numbers

**Total Investment:**
- **Phase 1 (40-50 students):** $520-777/month ($6,240-9,324/year)
- **Phase 2 (100-200 students):** $957-1,157/month ($11,484-13,884/year)
- **Phase 3 (500-600 students):** $1,049-1,549/month ($12,588-18,588/year)

---

## What You're Getting

### Real-Time AI Avatar Teachers
- Students can talk to AI avatars using their voice
- Avatars respond with natural speech and video
- Intelligent conversations powered by AI
- Available 24/7 for all students
- Scales to handle hundreds of simultaneous conversations

### Professional Cloud Infrastructure
- Reliable hosting that doesn't crash
- Automatic scaling during peak times
- Fast loading times worldwide
- Secure data storage and backups
- Professional monitoring and alerts

### Cost Breakdown (Phase 3 - Full Scale)

| What You Pay For | Monthly Cost | What It Does |
|------------------|--------------|--------------|
| **AWS Infrastructure** | $417-549 | Servers, storage, networking, security |
| **MongoDB Database** | $57-120 | Stores all student data and progress |
| **Email & Certificates** | $75 | Professional emails and digital certificates |
| **HeyGen AI Avatars** | $500-1,000 | Real-time AI teacher avatars |
| **TOTAL** | **$1,049-1,549/month** | **Complete e-learning platform with AI** |

---

## Why This Investment Makes Sense

### Competitive Advantage
- ✅ **First-mover advantage** - AI avatar teachers are cutting-edge
- ✅ **24/7 availability** - Students can learn anytime
- ✅ **Personalized learning** - AI adapts to each student
- ✅ **Scalable** - Handle 10x more students without hiring more teachers

### Cost Efficiency
- ✅ **Pay as you grow** - Start at $520/month, scale to $1,549/month
- ✅ **No teacher salaries** - AI avatars don't need salaries or benefits
- ✅ **Automated operations** - Less manual work, more efficiency
- ✅ **Better than competitors** - AWS is $277/month cheaper than Azure

### Risk Mitigation
- ✅ **Proven technology** - AWS powers Netflix, Airbnb, NASA
- ✅ **Auto-scaling** - Never crashes during peak times
- ✅ **Automatic backups** - Data is always safe
- ✅ **Professional monitoring** - Problems detected and fixed quickly

---

## Comparison: AWS vs Azure

| Factor | AWS (Recommended) | Azure | Difference |
|--------|-------------------|-------|------------|
| **Monthly Cost** | $1,049-1,549 | $1,326-1,826 | AWS saves $277/month |
| **Annual Cost** | $12,588-18,588 | $15,912-21,912 | AWS saves $3,324/year |
| **Networking** | Cheaper | More expensive | AWS saves $144/month |
| **WebSocket** | Cheaper | More expensive | AWS saves $41/month |
| **Reserved Discounts** | Better (30%) | Lower (10%) | AWS saves $71/month |
| **Community** | Larger | Growing | AWS has more resources |
| **Ease of Use** | Good | Good | Similar |

**Recommendation:** AWS saves $3,324/year with better performance

---

## Implementation Timeline

| Phase | Duration | What Happens | Cost |
|-------|----------|--------------|------|
| **Phase 1: Setup** | Weeks 1-2 | Create AWS account, set up infrastructure | $0 (setup only) |
| **Phase 2: Development** | Weeks 3-6 | Build HeyGen integration, test with AI | $520-777/month |
| **Phase 3: Testing** | Weeks 7-8 | User testing with 10-20 students | $520-777/month |
| **Phase 4: Launch** | Week 9+ | Full launch with all 40-50 students | $520-777/month |
| **Phase 5: Scale** | Months 3-12 | Grow to 500-600 students | $1,049-1,549/month |

**Total Time to Launch:** 8-12 weeks

---

## Budget Approval Needed

### Immediate (Phase 1 - Next 3 Months)
- **Monthly:** $520-777
- **Quarterly:** $1,560-2,331
- **Purpose:** Launch with 40-50 students

### Medium Term (Phase 2 - Months 4-6)
- **Monthly:** $957-1,157
- **Quarterly:** $2,871-3,471
- **Purpose:** Scale to 100-200 students

### Long Term (Phase 3 - Months 7-12)
- **Monthly:** $1,049-1,549
- **Quarterly:** $3,147-4,647
- **Purpose:** Full scale with 500-600 students

### Annual Budget Request
- **Year 1:** $12,588-18,588
- **Includes:** Full AWS infrastructure + HeyGen AI avatars + all services

---

## Questions & Answers

**Q: Why is this 10x more expensive than current setup?**  
A: You're adding real-time AI avatar teachers that can talk to hundreds of students simultaneously. Current setup ($100/month) can't handle this load and will crash.

**Q: Can we start smaller to test?**  
A: Yes! Start at $520/month with 40-50 students, then scale up as you grow.

**Q: What if it doesn't work?**  
A: AWS is pay-as-you-go. You can stop anytime. No long-term contracts (except optional 1-year for 30% discount).

**Q: Why AWS instead of Azure?**  
A: AWS is $277/month cheaper ($3,324/year savings) with better performance and larger community.

**Q: What about HeyGen costs?**  
A: HeyGen charges per minute of avatar usage. More students = higher cost, but it scales with your revenue.

**Q: Can we keep current database?**  
A: Yes! Keep MongoDB Atlas, just upgrade from free to $57/month. No migration needed.

**Q: What if we grow faster than expected?**  
A: AWS auto-scales automatically. You only pay for what you use. Infrastructure grows with your students.

**Q: Is this secure?**  
A: Yes. AWS has enterprise-grade security, automatic backups, and complies with international standards.

---

## Next Steps

1. **Approve Budget:** $520-777/month for Phase 1 (40-50 students)
2. **Contact HeyGen:** Get enterprise pricing quote
3. **Create AWS Account:** Set up billing and alerts
4. **Assign Team:** Developer + DevOps for implementation
5. **Start Development:** Begin 8-12 week implementation
6. **Launch:** Go live with AI avatar teachers

**Decision Needed By:** [Insert Date]  
**Expected Launch:** [Insert Date + 12 weeks]

---

**Document Prepared:** October 31, 2025  
**Version:** 2.0 (Corrected - HeyGen includes speech services)  
**Status:** Ready for stakeholder review and budget approval  
**Contact:** [Your Name/Team]
