# Kids Check-In — Quick Setup Guide

---

## ⚡ Quick Start (5 minutes)

### Step 1: Install Dependencies

```bash
npm install
```

This will install:
- Next.js 14
- React 18
- TypeScript 5
- TailwindCSS 3
- And all necessary dependencies

---

### Step 2: Configure Environment

Copy the example environment file:

```bash
cp .env.example .env.local
```

**For testing/development** (recommended first):
```env
USE_MOCK_DATA=true
PCO_CLIENT_ID=not_needed_in_mock_mode
PCO_CLIENT_SECRET=not_needed_in_mock_mode
```

**For production** (requires API credentials):
```env
USE_MOCK_DATA=false
PCO_CLIENT_ID=your_real_client_id
PCO_CLIENT_SECRET=your_real_client_secret
```

---

### Step 3: Start the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

You should see the dashboard with sample check-ins! 🎉

---

## 🔑 Getting Planning Center Credentials

### Option 1: Personal Access Token (Recommended for Testing)

1. Go to [https://api.planningcenteronline.com/oauth/applications](https://api.planningcenteronline.com/oauth/applications)
2. Log in with your Planning Center account
3. Click "New Personal Access Token"
4. Give it a name: "Kids Check-In Dashboard"
5. Copy the **Application ID** → This is your `PCO_CLIENT_ID`
6. Copy the **Secret** → This is your `PCO_CLIENT_SECRET`

### Option 2: OAuth Application (For Production)

1. Go to [https://api.planningcenteronline.com/oauth/applications](https://api.planningcenteronline.com/oauth/applications)
2. Click "New Application"
3. Fill in the details:
   - **Name**: Kids Check-In Dashboard
   - **Description**: Classroom check-in display
   - **Website**: Your church website
4. Copy the credentials as above

---

## 🧪 Testing the Setup

### Test in Mock Mode

1. Ensure `.env.local` has `USE_MOCK_DATA=true`
2. Run `npm run dev`
3. Open [http://localhost:3000](http://localhost:3000)
4. You should see 12 sample check-ins across 3 services

### Test in Live Mode

1. Get your API credentials (see above)
2. Set `.env.local`:
   ```env
   USE_MOCK_DATA=false
   PCO_CLIENT_ID=your_client_id
   PCO_CLIENT_SECRET=your_client_secret
   ```
3. Restart the server: `npm run dev`
4. Open [http://localhost:3000](http://localhost:3000)
5. You should see real check-ins from today

---

## 🎨 Customization Checklist

After setup, you may want to:

- [ ] Update the color scheme in `tailwind.config.js`
- [ ] Adjust auto-refresh interval in `pages/index.tsx`
- [ ] Customize mock data in `lib/mockData.ts`
- [ ] Add your church logo to the header
- [ ] Modify table columns in `components/ServiceGroup.tsx`

---

## 🚀 Production Deployment (Vercel)

1. **Install Vercel CLI** (optional):
   ```bash
   npm install -g vercel
   ```

2. **Push to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git push
   ```

3. **Deploy to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Import your repository
   - Add environment variables in Vercel dashboard
   - Deploy!

4. **Set Environment Variables in Vercel**:
   - Settings → Environment Variables
   - Add `USE_MOCK_DATA`, `PCO_CLIENT_ID`, `PCO_CLIENT_SECRET`

---

## ❓ Troubleshooting

### "Module not found" errors
```bash
rm -rf node_modules package-lock.json
npm install
```

### API not returning data
- Check `.env.local` exists in root directory
- Verify credentials are correct
- Ensure `USE_MOCK_DATA` is set correctly
- Check server logs for error messages

### Styling not working
- Ensure `pages/_app.tsx` imports `@/styles/globals.css`
- Run `npm run dev` to rebuild

### Port already in use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
# Or use a different port
npm run dev -- -p 3001
```

---

## 📞 Need Help?

1. Check the main [README.md](./README.md)
2. Review [Planning Center API Docs](https://developer.planning.center/docs/#/apps/check-ins)
3. Check the console logs for error messages
4. Verify all environment variables are set

---

**You're all set! Enjoy your new dashboard! 🎉**

