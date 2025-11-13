# Deployment Guide - CALLME

Complete guide for deploying the CALLME English coaching application.

## Prerequisites

Before deploying, ensure you have:

1. **Supabase Account**
   - Sign up at [supabase.com](https://supabase.com)
   - Create a new project

2. **OpenAI API Key**
   - Sign up at [platform.openai.com](https://platform.openai.com)
   - Generate an API key with access to:
     - GPT-4o-mini model
     - Whisper API

3. **GPU Backend Server** (Optional)
   - Required for fluency evaluation and sketch processing
   - Current endpoint: `https://zqzydflnzyyuuiyckzho.supabase.co/functions/v1/backend_server`

## Deployment Steps

### 1. Environment Configuration

#### Configure Supabase Secrets

In your Supabase project dashboard:

1. Navigate to **Settings** → **Edge Functions** → **Environment Variables**
2. Add the following secrets:

```bash
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx
```

The following are auto-configured by Supabase:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL`

### 2. Deploy Edge Functions

#### Install Supabase CLI

```bash
npm install -g supabase
```

#### Login to Supabase

```bash
supabase login
```

#### Link Your Project

```bash
supabase link --project-ref your-project-ref
```

#### Deploy the Server Function

```bash
supabase functions deploy make-server-96f01fbd --project-ref your-project-ref
```

### 3. Update Frontend Configuration

Update `/utils/supabase/info.tsx` with your Supabase project details:

```typescript
export const projectId = "your-project-id";
export const publicAnonKey = "your-anon-key";
```

### 4. Deploy Frontend

#### Option A: Deploy on Figma Make (Recommended)

The application is designed to run directly on Figma Make:
1. Import the project into Figma Make
2. The platform handles build and deployment automatically
3. Environment variables are managed through the Figma Make interface

#### Option B: Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

Configure environment variables in Vercel dashboard:
- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key

#### Option C: Deploy to Netlify

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Build and deploy
npm run build
netlify deploy --prod --dir=dist
```

Configure environment variables in Netlify dashboard.

### 5. GPU Backend Server Setup (Optional) 
#### ⭐ Please refer to GPU_backend/backend_deployment.md

If you need to set up your own GPU backend server:

#### Requirements
- GPU-enabled server (NVIDIA CUDA support recommended)
- Python 3.8+
- Flask or FastAPI framework

#### Endpoints to Implement

**`/fluency` (POST)**
```python
# Accept audio data URI
# Process with speech-to-text model
# Return fluency metrics
```

**`/sketch2real` (POST)**
```python
# Accept image data URI
# Process with image generation model
# Return processed result
```

#### Update Backend URL

In `/supabase/functions/server/index.tsx`, update:
```typescript
const BACKEND_SERVER_URL = "https://your-gpu-server.com/backend_server";
```

## Verification

### 1. Test Health Endpoint

```bash
curl https://your-project-id.supabase.co/functions/v1/make-server-96f01fbd/health
```

Expected response:
```json
{"status": "ok"}
```

### 2. Test Transcription

```bash
curl -X POST https://your-project-id.supabase.co/functions/v1/make-server-96f01fbd/transcribe \
  -H "Authorization: Bearer your-anon-key" \
  -F "audio=@test-audio.webm"
```

### 3. Test Chat Endpoint

```bash
curl -X POST https://your-project-id.supabase.co/functions/v1/make-server-96f01fbd/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-anon-key" \
  -d '{"message": "Hello, how are you?"}'
```

### 4. Frontend Testing

1. Open the deployed application URL
2. Test each feature:
   - Text messaging
   - Voice recording
   - Audio file upload
   - Image upload
   - Sketch canvas
   - Settings dialog

## Troubleshooting

### Common Issues

#### 1. "API key not configured" Error

**Solution:**
- Verify `OPENAI_API_KEY` is set in Supabase Edge Functions environment variables
- Redeploy the edge function after adding the key

#### 2. Microphone Not Working

**Solution:**
- Ensure the site is served over HTTPS or localhost
- Check browser permissions
- Click "Need help?" button in the app for browser-specific instructions

#### 3. CORS Errors

**Solution:**
- Verify CORS configuration in `/supabase/functions/server/index.tsx`
- Ensure `origin: "*"` is set (or specify your frontend domain)
- Check that all required headers are in `allowHeaders`

#### 4. Transcription Fails

**Solution:**
- Check OpenAI API key validity
- Verify API key has Whisper API access
- Check OpenAI account billing status
- Review server logs in Supabase Functions dashboard

#### 5. GPU Backend Unavailable

**Solution:**
- Fluency evaluation and sketch processing will fail gracefully
- Chat functionality will continue to work
- Consider deploying your own GPU backend server

### Viewing Logs

#### Supabase Edge Function Logs

1. Go to Supabase Dashboard
2. Navigate to **Edge Functions** → **make-server-96f01fbd**
3. Click **Logs** tab
4. Filter by error level or search for specific issues

#### Real-time Monitoring

```bash
supabase functions logs make-server-96f01fbd --project-ref your-project-ref
```

## Performance Optimization

### 1. Cold Start Reduction

Edge functions may have cold starts. To minimize:
- Keep functions warm with periodic health checks
- Optimize function initialization code
- Consider reserved instances (paid Supabase plans)

### 2. Audio File Size

- WebM format is efficient but can be large
- Consider implementing client-side compression
- Set maximum recording duration limits

### 3. Image Optimization

- Compress images before upload
- Limit maximum image dimensions
- Use appropriate quality settings

### 4. Caching

Implement caching strategies:
- Cache API responses where appropriate
- Use browser cache for static assets
- Consider CDN for media files

## Security Best Practices

### 1. API Key Protection

- Never expose API keys in frontend code
- Rotate keys regularly
- Use environment variables only
- Monitor API usage for anomalies

### 2. Rate Limiting

Implement rate limiting to prevent abuse:
```typescript
// Add to server/index.tsx
import { rateLimiter } from 'npm:hono/middleware';

app.use('/make-server-96f01fbd/*', rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
}));
```

### 3. Input Validation

- Validate all user inputs server-side
- Sanitize file uploads
- Check file types and sizes
- Prevent injection attacks

### 4. HTTPS Only

- Force HTTPS in production
- Configure secure headers
- Use HSTS (HTTP Strict Transport Security)

## Scaling Considerations

### Horizontal Scaling

Supabase Edge Functions auto-scale based on demand. For custom backends:
- Use load balancers
- Implement connection pooling
- Consider container orchestration (Kubernetes)

### Database Scaling

Current implementation uses KV store:
- Scales automatically with Supabase
- Consider PostgreSQL for relational data needs
- Implement data archiving for old conversations

### Cost Management

Monitor usage of:
- OpenAI API calls (Whisper + GPT-4o-mini)
- Supabase Edge Function invocations
- Supabase bandwidth
- GPU backend server costs

### Monitoring

Set up monitoring for:
- API response times
- Error rates
- User engagement metrics
- System health checks

## Maintenance

### Regular Tasks

1. **Weekly**
   - Review error logs
   - Monitor API usage and costs
   - Check system performance metrics

2. **Monthly**
   - Update dependencies
   - Review and rotate API keys if needed
   - Backup conversation history data

3. **Quarterly**
   - Security audit
   - Performance optimization review
   - Update OpenAI models if new versions available

### Updating the Application

```bash
# Pull latest changes
git pull origin main

# Deploy updated edge functions
supabase functions deploy make-server-96f01fbd

# Deploy updated frontend
vercel --prod
# or
netlify deploy --prod
```

## Support and Resources

- **Supabase Documentation**: https://supabase.com/docs
- **OpenAI API Documentation**: https://platform.openai.com/docs
- **Hono Documentation**: https://hono.dev
- **React Documentation**: https://react.dev

## Rollback Procedure

If a deployment fails:

### Edge Functions
```bash
# List deployments
supabase functions list --project-ref your-project-ref

# Rollback to previous version (if supported by Supabase)
# Or redeploy previous code version
git checkout <previous-commit>
supabase functions deploy make-server-96f01fbd
```

### Frontend
```bash
# Vercel
vercel rollback

# Netlify
netlify rollback
```

## Production Checklist

Before going live:

- [ ] All environment variables configured
- [ ] OpenAI API key tested and funded
- [ ] HTTPS enabled
- [ ] Error logging configured
- [ ] Rate limiting implemented
- [ ] CORS properly configured
- [ ] Browser compatibility tested
- [ ] Mobile responsiveness verified
- [ ] Microphone permissions tested on all browsers
- [ ] Performance metrics baseline established
- [ ] Backup strategy in place
- [ ] Monitoring and alerts configured
- [ ] Documentation updated
- [ ] User guide created
- [ ] Privacy policy and terms of service (if required)

## Post-Deployment

After successful deployment:

1. Test all features in production
2. Set up monitoring dashboards
3. Configure alerts for critical errors
4. Document any custom configurations
5. Train support team (if applicable)
6. Gather user feedback
7. Plan iterative improvements

## Contact

For deployment issues or questions:
- Check the README.md for general information
- Review Supabase dashboard logs
- Consult OpenAI status page for API issues
