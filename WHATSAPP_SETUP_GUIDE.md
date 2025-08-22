# WhatsApp Quiz Bot Setup Guide

## Overview
This guide will help you set up the WhatsApp Quiz Bot integration with your LMS. Students can take quizzes through WhatsApp, and scores will be automatically synced with the main LMS database.

## Prerequisites
1. Node.js environment with the existing LMS
2. MongoDB database access
3. Students must have phone numbers registered in the system
4. WhatsApp Web access (for whatsapp-web.js) OR WhatsApp Business API account

## Environment Variables
Add these to your `.env` file:

```bash
# Enable WhatsApp bot (set to 'true' to enable)
ENABLE_WHATSAPP_BOT=false

# WhatsApp Business API Configuration (if using Business API)
WHATSAPP_VERIFY_TOKEN=your_verify_token_here
WHATSAPP_ACCESS_TOKEN=your_access_token_here
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id_here

# Quiz Bot Settings
QUIZ_PASSING_SCORE=70
QUIZ_SESSION_TIMEOUT=1800000  # 30 minutes in milliseconds
```

## Setup Methods

### Method 1: WhatsApp Web (Easier Setup)
This method uses `whatsapp-web.js` and requires a WhatsApp account that can be scanned.

**Steps:**
1. Set `ENABLE_WHATSAPP_BOT=true` in your environment
2. Start your server: `npm run dev`
3. Check the console for QR code log
4. Scan the QR code with your WhatsApp mobile app
5. The bot will be ready to receive messages

**Pros:**
- Easy setup
- No API costs
- Works with personal WhatsApp account

**Cons:**
- Requires keeping a session active
- Less reliable for production
- WhatsApp Web limitations

### Method 2: WhatsApp Business API (Production Ready)
This method uses the official WhatsApp Business API for better reliability.

**Steps:**
1. Create a WhatsApp Business API account
2. Set up a webhook endpoint: `https://yourdomain.com/api/whatsapp/webhook`
3. Configure the webhook with your verify token
4. Add API credentials to environment variables
5. Update the webhook handler in the code

**Pros:**
- More reliable
- Better for production
- Official API support

**Cons:**
- More complex setup
- May have costs
- Requires business verification

## Bot Commands

### Student Commands
- `/start` or `/menu` - Show main menu
- `/courses` - View enrolled courses
- `/progress` - Check quiz progress and scores
- `/quiz [course-slug] [module-number]` - Start a quiz
- `/help` - Show help and instructions

### Example Quiz Flow
1. Student: `/quiz cscp-course 0`
2. Bot: Shows first question with multiple choice options
3. Student: `2` (answers with option number)
4. Bot: Shows next question or results if finished
5. Bot: Saves score to database and shows results

## Admin Management

### Admin Endpoints
- `GET /api/whatsapp/status` - Check bot connection status
- `POST /api/whatsapp/send-test` - Send test messages

### Monitoring
Check WhatsApp bot status through admin dashboard or API endpoint.

## Database Integration

### Quiz Scoring
- Scores are automatically calculated based on correct answers
- Results are saved to the `enrollments.quizAttempts` array
- Module completion is tracked in `enrollments.completedModules`

### Phone Number Authentication
Students are identified by their registered phone numbers in the `students.phone` field.

## Security Considerations

1. **Phone Number Verification**: Only registered students can use the bot
2. **Session Management**: Quiz sessions expire after 30 minutes
3. **Rate Limiting**: Consider implementing rate limits for quiz attempts
4. **Data Privacy**: WhatsApp messages should not store sensitive information

## Troubleshooting

### Common Issues
1. **Bot not responding**: Check if WhatsApp client is connected
2. **Student not found**: Verify phone number is registered in LMS
3. **Quiz not found**: Check course slug and module index
4. **Permissions**: Ensure student is enrolled in the course

### Debug Commands
```bash
# Check bot status
curl -X GET http://localhost:5002/api/whatsapp/status

# Send test message (admin only)
curl -X POST http://localhost:5002/api/whatsapp/send-test \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "1234567890", "message": "Test message"}'
```

## Deployment Notes

### Production Deployment
1. Use WhatsApp Business API for production
2. Set up proper SSL certificates for webhooks
3. Configure firewall rules for webhook endpoints
4. Monitor bot performance and uptime

### Scaling Considerations
- Quiz sessions are stored in memory (consider Redis for scaling)
- WhatsApp Web has rate limits
- Consider message queuing for high volume

## Feature Extensions

### Possible Enhancements
1. **Multimedia Support**: Send images, documents, or audio
2. **Scheduled Reminders**: Notify students about pending quizzes
3. **Progress Reports**: Weekly/monthly progress summaries
4. **Group Features**: Create study groups or class announcements
5. **AI Integration**: Add AI tutoring or help features

### Custom Commands
You can extend the bot by adding new commands in the `handleBotCommand` function.

## Support

For technical support or feature requests, contact the development team or create an issue in the project repository.
