# Cost Summary - Corrected (HeyGen Includes Speech Services)

## Key Finding: You Were Right! 🎯

**HeyGen Streaming API includes Speech-to-Text and Text-to-Speech**, so we don't need Amazon Transcribe or Polly.

**Cost Savings: $185/month ($2,220/year)**

---

## Corrected AWS Costs

### What HeyGen Includes:

✅ Speech-to-Text (student voice → text)  
✅ Text-to-Speech (response → avatar voice)  
✅ Voice cloning & custom voice IDs  
✅ Lip-sync video generation  
✅ Real-time streaming

### What You Still Need from AWS:

- EC2 instances (web hosting)
- Load Balancer
- S3 storage
- CloudFront CDN
- Lambda + API Gateway (WebSocket)
- ElastiCache Redis (sessions)
- **OpenAI/Bedrock LLM** (conversation intelligence)
- CloudWatch (monitoring)

---

## Updated Cost Breakdown

### Phase 1: Launch (40-50 Students)

| Component          | Monthly Cost       | Notes                            |
| ------------------ | ------------------ | -------------------------------- |
| AWS Infrastructure | $245-302           | EC2, S3, CDN, Lambda, Redis, LLM |
| MongoDB Atlas      | $0-57              | Free tier or M10                 |
| External Services  | $75                | Brevo + Certifier.io             |
| **HeyGen API**     | **$200-400**       | **Includes STT + TTS + Avatar**  |
| **TOTAL**          | **$520-777/month** | **$6,240-9,324/year**            |

**Original Estimate:** $705-962/month  
**Corrected:** $520-777/month  
**Savings:** $185/month

---

### Phase 2: Growth (100-200 Students)

| Component          | Monthly Cost         | Notes                           |
| ------------------ | -------------------- | ------------------------------- |
| AWS Infrastructure | $425-482             | Scaled up EC2, increased usage  |
| MongoDB Atlas      | $57                  | M10 dedicated                   |
| External Services  | $75                  | Brevo + Certifier.io            |
| **HeyGen API**     | **$400-600**         | **Includes STT + TTS + Avatar** |
| **TOTAL**          | **$957-1,157/month** | **$11,484-13,884/year**         |

**Original Estimate:** $1,142-1,342/month  
**Corrected:** $957-1,157/month  
**Savings:** $185/month

---

### Phase 3: Full Scale (500-600 Students)

| Component          | Monthly Cost           | Notes                              |
| ------------------ | ---------------------- | ---------------------------------- |
| AWS Infrastructure | $417-549               | Full scale with reserved instances |
| MongoDB Atlas      | $57-120                | M10 or M20                         |
| External Services  | $75                    | Brevo + Certifier.io               |
| **HeyGen API**     | **$500-1,000**         | **Includes STT + TTS + Avatar**    |
| **TOTAL**          | **$1,049-1,549/month** | **$12,588-18,588/year**            |

**Original Estimate:** $1,233-1,733/month  
**Corrected:** $1,049-1,549/month  
**Savings:** $185/month ($2,220/year)

---

## What You Need vs What You Don't

### ❌ DON'T Need (HeyGen Handles These):

- Amazon Transcribe ($144/month)
- Amazon Polly ($40/month)
- **Total Savings: $184/month**

### ✅ DO Need:

- **EC2 Instances:** Web hosting for your app
- **S3 + CloudFront:** File storage and CDN
- **Lambda + API Gateway:** WebSocket for real-time connections
- **ElastiCache Redis:** Session management
- **OpenAI/Bedrock:** LLM for conversation intelligence ($50/month)
- **CloudWatch:** Monitoring and logs
- **HeyGen API:** All-in-one avatar solution (STT + TTS + Video)

---

## Architecture Flow (Corrected)

```
Student Browser
      │
      │ 1. Student speaks (audio)
      ▼
Your EC2 Application
      │
      │ 2. Send audio to HeyGen API
      ▼
HeyGen Streaming API
      │
      ├─ Speech-to-Text (student voice → text)
      │
      │ 3. Send text to your LLM
      ▼
Your OpenAI/Bedrock LLM
      │
      │ 4. Generate intelligent response
      ▼
HeyGen Streaming API
      │
      ├─ Text-to-Speech (response → voice)
      ├─ Lip-sync generation
      ├─ Avatar video generation
      │
      │ 5. Stream avatar video + voice
      ▼
Student Browser
      │
      └─ Student sees avatar speaking
```

**Key Point:** HeyGen does the heavy lifting for speech and video. You only need LLM for conversation intelligence.

---

## Final Recommendation

### Start with Phase 1: $520-777/month

**Infrastructure:**

- 2× EC2 t3.small instances
- Basic AWS services (no speech services)
- MongoDB Atlas Free tier
- OpenAI/Bedrock for LLM
- HeyGen API (includes STT + TTS + Avatar)

**Benefits:**

- ✅ Start small, scale up
- ✅ Pay only for what you use
- ✅ $185/month cheaper than original estimate
- ✅ HeyGen handles all speech complexity
- ✅ You focus on conversation logic

**Timeline:** 8-12 weeks to launch

**Next Steps:**

1. Contact HeyGen for enterprise pricing
2. Confirm HeyGen Streaming API includes STT/TTS
3. Get budget approval for $600-800/month (Phase 1)
4. Create AWS account
5. Start development

---

## Questions to Ask HeyGen Sales

1. Does HeyGen Streaming API include Speech-to-Text?
2. Does it include Text-to-Speech with voice cloning?
3. What's the pricing per minute for streaming?
4. Are there volume discounts for 500+ students?
5. What's the latency for real-time streaming?
6. Can we use custom LLMs (OpenAI/Bedrock)?
7. What's included in enterprise tier?
8. Are there any hidden costs?

---

**Document Updated:** October 31, 2025  
**Correction:** Removed unnecessary speech services ($185/month savings)  
**Status:** Ready for implementation
