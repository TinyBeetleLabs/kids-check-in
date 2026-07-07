# Deployment Guide

Comprehensive guide for deploying Kids Check-In to production.

---

## 📋 Pre-Deployment Checklist

Before deploying, ensure:

- [ ] All tests pass locally (`npm run dev` works without errors)
- [ ] You have valid Planning Center API credentials
- [ ] Environment variables are documented
- [ ] Code is pushed to Git repository
- [ ] You've tested both mock and live modes

---

## 🌐 Option 1: Vercel (Recommended)

Vercel offers the best experience for Next.js applications with zero-config deployment.

### Why Vercel?

- ✅ Automatic SSL certificates
- ✅ Global CDN
- ✅ Automatic scaling
- ✅ Zero configuration for Next.js
- ✅ Built-in environment variable management
- ✅ Free tier available

### Step-by-Step Deployment

#### 1. Prepare Your Repository

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: Kids Check-In"

# Create a GitHub repository and push
git remote add origin https://github.com/your-org/kids-check-in.git
git branch -M main
git push -u origin main
```

#### 2. Import to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Sign in with GitHub
3. Click "Add New..." → "Project"
4. Import your repository
5. Vercel will auto-detect Next.js

#### 3. Configure Environment Variables

In the Vercel import screen:

**Environment Variables to Add:**

| Name | Value | Where to Get It |
|------|-------|----------------|
| `USE_MOCK_DATA` | `false` | Set to false for production |
| `PCO_CLIENT_ID` | Your Client ID | Planning Center OAuth app |
| `PCO_CLIENT_SECRET` | Your Secret | Planning Center OAuth app |

**Important**: Make these available for:
- Production
- Preview
- Development

#### 4. Deploy

Click "Deploy" and wait for the build to complete (usually 1-2 minutes).

#### 5. Access Your Dashboard

Once deployed, Vercel provides:
- Production URL: `https://your-project.vercel.app`
- Custom domain support (optional)

### Post-Deployment Steps

1. **Test the live dashboard**
   - Visit your Vercel URL
   - Verify check-ins are loading
   - Test auto-refresh functionality
   - Check mobile/tablet responsiveness

2. **Set up custom domain (optional)**
   - Go to Vercel dashboard → Your project → Settings → Domains
   - Add your custom domain (e.g., `checkin.yourchurch.org`)
   - Update DNS records as instructed

3. **Monitor usage**
   - Check Vercel Analytics
   - Review function execution logs
   - Monitor API rate limits

---

## 🐳 Option 2: Docker Deployment

For self-hosted environments or custom cloud providers.

### Create Dockerfile

Create `Dockerfile` in root:

```dockerfile
# Use official Node.js runtime
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
```

### Docker Compose (Optional)

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  dashboard:
    build: .
    ports:
      - "3000:3000"
    environment:
      - USE_MOCK_DATA=false
      - PCO_CLIENT_ID=${PCO_CLIENT_ID}
      - PCO_CLIENT_SECRET=${PCO_CLIENT_SECRET}
    restart: unless-stopped
```

### Build and Run

```bash
# Build the image
docker build -t kids-check-in .

# Run the container
docker run -p 3000:3000 \
  -e USE_MOCK_DATA=false \
  -e PCO_CLIENT_ID=your_id \
  -e PCO_CLIENT_SECRET=your_secret \
  kids-check-in

# Or use docker-compose
docker-compose up -d
```

---

## ☁️ Option 3: Other Cloud Providers

### AWS Amplify

1. Push code to Git
2. Go to AWS Amplify Console
3. Connect your repository
4. Add environment variables
5. Deploy

### Netlify

1. Push code to Git
2. Go to Netlify dashboard
3. Import repository
4. Build command: `npm run build`
5. Publish directory: `.next`
6. Add environment variables
7. Deploy

### Google Cloud Run

```bash
# Build container
gcloud builds submit --tag gcr.io/PROJECT_ID/kids-check-in

# Deploy
gcloud run deploy kids-check-in \
  --image gcr.io/PROJECT_ID/kids-check-in \
  --platform managed \
  --set-env-vars USE_MOCK_DATA=false,PCO_CLIENT_ID=xxx,PCO_CLIENT_SECRET=xxx
```

---

## 🔒 Security Best Practices

### Environment Variables

- ✅ Never commit `.env.local` to git
- ✅ Use different credentials for staging and production
- ✅ Rotate secrets regularly (every 90 days)
- ✅ Use Vercel/platform secrets management

### API Security

- ✅ All API calls happen server-side only
- ✅ Credentials never exposed to browser
- ✅ Rate limiting in place (30-second cache)
- ✅ HTTPS enforced in production

### Access Control

Consider adding:
- Authentication for dashboard access
- IP whitelisting for church network only
- Basic auth for added security

---

## 📊 Monitoring & Maintenance

### What to Monitor

1. **API Usage**
   - Planning Center API rate limits
   - Number of check-ins fetched
   - Response times

2. **Application Health**
   - Uptime monitoring
   - Error rates
   - Page load times

3. **User Experience**
   - Auto-refresh working correctly
   - Data accuracy
   - Mobile/tablet performance

### Recommended Tools

- **Uptime Monitoring**: [UptimeRobot](https://uptimerobot.com/) (free)
- **Error Tracking**: Vercel built-in logs
- **Analytics**: Vercel Analytics or Google Analytics

### Maintenance Schedule

- **Weekly**: Check dashboard functionality
- **Monthly**: Review API usage and costs
- **Quarterly**: Update dependencies (`npm update`)
- **Yearly**: Review and rotate API credentials

---

## 🔄 Updating the Dashboard

### For Minor Updates

```bash
# Pull latest changes
git pull origin main

# Deploy automatically triggers on Vercel
# Or rebuild Docker container for self-hosted
```

### For Major Updates

1. Test changes locally
2. Deploy to preview environment
3. Test preview thoroughly
4. Merge to main branch
5. Monitor production deployment

---

## 🆘 Troubleshooting Deployment Issues

### Build Fails on Vercel

```bash
# Check build logs in Vercel dashboard
# Common issues:
# - Missing dependencies: Check package.json
# - TypeScript errors: Run `npm run build` locally
# - Environment variables: Verify all are set
```

### API Errors in Production

- Verify credentials are correct in Vercel settings
- Check Planning Center API status
- Review function logs for specific errors
- Ensure `USE_MOCK_DATA` is set correctly

### Performance Issues

- Enable Vercel Analytics
- Check API response times
- Consider increasing cache duration
- Monitor Planning Center rate limits

---

## 📱 Tablet Setup for Classroom

### Recommended Hardware

- **iPad Pro 11" or 12.9"** (best for readability)
- **iPad Air 10.9"** (good budget option)
- **Wall mount or stand** for permanent display

### Browser Settings

1. Open Safari/Chrome on iPad
2. Navigate to your dashboard URL
3. Add to Home Screen (looks like an app)
4. Enable Guided Access (locks to single app)

### iOS Guided Access Setup

1. Settings → Accessibility → Guided Access
2. Turn on Guided Access
3. Set passcode
4. Open dashboard
5. Triple-click home button to start Guided Access
6. Circle areas to disable touch (optional)
7. Click Start

This prevents accidental navigation away from the dashboard.

---

## 🎯 Production Checklist

Before going live:

- [ ] Tested with real Planning Center data
- [ ] Verified auto-refresh works (30 seconds)
- [ ] Tested on actual iPad in classroom
- [ ] Set up custom domain (optional)
- [ ] Configured monitoring/alerts
- [ ] Documented access credentials securely
- [ ] Trained staff on using the dashboard
- [ ] Created backup plan if dashboard is down

---

## 📞 Support

**Deployment Issues**:
- Vercel: [vercel.com/support](https://vercel.com/support)
- Planning Center: [planningcenter.com/support](https://www.planningcenter.com/support)

**Code Issues**:
- Check README.md
- Review SETUP.md
- Check GitHub Issues (if public repo)

---

**Happy deploying! Your classrooms will love this! 🎉**

