# 🌟 Radiant Kids Check-In Dashboard

A secure, real-time classroom dashboard for displaying children's check-ins from Planning Center Check-Ins API. Built with Next.js, TypeScript, and TailwindCSS.

![Dashboard Preview](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)
![Next.js](https://img.shields.io/badge/Next.js-14.x-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.x-38bdf8)

---

## 📋 Table of Contents

- [Features](#-features)
- [Security](#-security)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Environment Configuration](#-environment-configuration)
- [Smart Time-Based Refresh](#-smart-time-based-refresh)
- [Development Mode (Mock Data)](#-development-mode-mock-data)
- [Production Mode (Live API)](#-production-mode-live-api)
- [Folder Structure](#-folder-structure)
- [Customization](#-customization)
- [Deployment](#-deployment)
- [Future Features](#-future-features)
- [API Documentation](#-api-documentation)

---

## ✨ Features

- ✅ **Smart time-based refresh** - 30 seconds during service times, 5 minutes off-hours (84% fewer API calls)
- ✅ **Request deduplication** - Prevents duplicate API calls
- ✅ **Visibility detection** - Pauses refresh when tab is not visible
- ✅ **Real-time check-in display** - Live updates when it matters most
- ✅ **Grouped by service time** - Organized view of different service times
- ✅ **Family grouping** - Siblings grouped together with expand/collapse
- ✅ **Check-out functionality** - Individual and family check-out with status tracking
- ✅ **Filter by classroom & service** - Quickly find specific check-ins
- ✅ **Statistics dashboard** - Total kids, checked in, and checked out counts
- ✅ **First-timer & birthday badges** - Special indicators for new kids and birthdays
- ✅ **Mock mode for development** - Test without API credentials
- ✅ **Secure API authentication** - Server-side only, never exposed to client
- ✅ **Responsive design** - Optimized for tablets (iPad) and mobile devices
- ✅ **Medical notes highlighting** - Important information prominently displayed
- ✅ **Large security codes** - Easy to read for quick parent pickup
- ✅ **Clean, professional UI** - Modern design with smooth animations

---

## 🔒 Security

This dashboard handles **sensitive children's information** including names, medical notes, and check-in data. Comprehensive security measures are implemented:

### Key Security Features

- 🔐 **Zero Data Caching** - No sensitive information stored in browser (localStorage, sessionStorage, or cookies)
- 🔐 **Server-Side API Calls** - API credentials never exposed to client
- 🔐 **Comprehensive Security Headers** - 10+ HTTP security headers configured
- 🔐 **HTTPS Enforcement** - All traffic encrypted in production
- 🔐 **Error Sanitization** - No internal details leaked in error messages
- 🔐 **Attack Prevention** - XSS, CSRF, clickjacking protection
- 🔐 **Environment Validation** - Prevents insecure deployments
- 🔐 **No Cache Headers** - Sensitive data never cached by browser

### Security Verification

Before deployment, run the security verification script:

```bash
npm run security:check
```

This checks for:
- ✅ Environment variables properly configured
- ✅ Security headers enabled
- ✅ No client-side storage of sensitive data
- ✅ No hardcoded credentials
- ✅ Proper .gitignore configuration

### Complete Security Documentation

See **[SECURITY.md](./SECURITY.md)** for comprehensive security documentation including:
- Detailed security measures
- Compliance considerations (COPPA, GDPR)
- Security best practices
- Incident response procedures
- Testing and verification procedures

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) with TypeScript
- **Styling**: [TailwindCSS 3](https://tailwindcss.com/)
- **API**: [Planning Center Check-Ins API](https://developer.planning.center/docs/#/apps/check-ins)
- **Deployment**: Optimized for [Vercel](https://vercel.com/)

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Planning Center API credentials (for production mode)

### Installation

1. **Clone or download this repository**

```bash
git clone https://github.com/TinyBeetleLabs/RadiantKids.git
cd RadiantKids
```

2. **Install dependencies**

```bash
npm install
# or
yarn install
```

3. **Set up environment variables**

Copy the example environment file:

```bash
cp .env.example .env.local
```

4. **Run the development server**

```bash
npm run dev
# or
yarn dev
```

5. **Open your browser**

Navigate to [http://localhost:3000](http://localhost:3000)

---

## 🔧 Environment Configuration

Create a `.env.local` file in the root directory with the following variables:

```env
# Mock Mode Toggle
USE_MOCK_DATA=true

# Planning Center API Credentials (only needed when USE_MOCK_DATA=false)
PCO_CLIENT_ID=your_client_id_here
PCO_CLIENT_SECRET=your_client_secret_here
```

### Environment Variables Explained

| Variable | Description | Required |
|----------|-------------|----------|
| `USE_MOCK_DATA` | Set to `true` for mock data, `false` for live API | Always |
| `PCO_CLIENT_ID` | Your Planning Center application ID | Only in live mode |
| `PCO_CLIENT_SECRET` | Your Planning Center application secret | Only in live mode |

---

## ⚡ Smart Time-Based Refresh

The dashboard uses intelligent refresh logic to provide real-time updates during service times while minimizing API calls during off-hours.

### How It Works

#### **Service Time Mode** ⚡
- **When**: 
  - Sunday: 7:30 AM - 1:00 PM
  - Wednesday: 6:00 PM - 8:30 PM
- **Refresh Rate**: Every **30 seconds**
- **Purpose**: Real-time updates during active check-in periods

#### **Off-Hours Mode** 🌙
- **When**: All other times
- **Refresh Rate**: Every **5 minutes**
- **Purpose**: Minimal API calls when check-ins are unlikely

### Additional Optimizations

1. **Request Deduplication**
   - Prevents duplicate API calls if multiple requests occur simultaneously
   - Skips requests made within 5 seconds of the last fetch

2. **Visibility Detection**
   - Pauses refresh when browser tab is not visible
   - Immediately refreshes when tab becomes visible again
   - Saves bandwidth and API calls

3. **Visual Indicators**
   - **⚡ Service Time** (blue badge) - Active mode with 30s refresh
   - **🌙 Off-Hours** (gray badge) - Passive mode with 5min refresh

### API Call Reduction

**Per Location Dashboard:**
- Before: 2,880 calls/day (30s constant)
- After: 411 calls/day (time-based)
- **Reduction: 86%** 🎉

**All 12 Locations:**
- Before: 34,560 calls/day
- After: 4,932 calls/day
- **Reduction: 86%** 🚀

### Customization

To customize refresh intervals or service times, edit `pages/index.tsx`:

```typescript
// Change refresh intervals
const REFRESH_INTERVAL_SERVICE_TIME = 30000;  // 30 seconds
const REFRESH_INTERVAL_OFF_HOURS = 5 * 60 * 1000; // 5 minutes

// Change service times
const isServiceTime = (): boolean => {
  if (day === 0) { // Sunday: 7:30 AM - 1:00 PM
    const sundayStart = 7 * 60 + 30; // 7:30 AM
    const sundayEnd = 13 * 60; // 1:00 PM
    return currentTimeInMinutes >= sundayStart && currentTimeInMinutes <= sundayEnd;
  }
  if (day === 3) { // Wednesday: 6:00 PM - 8:30 PM
    const wednesdayStart = 18 * 60; // 6:00 PM
    const wednesdayEnd = 20 * 60 + 30; // 8:30 PM
    return currentTimeInMinutes >= wednesdayStart && currentTimeInMinutes <= wednesdayEnd;
  }
  return false;
};
```

See **[TIME_BASED_REFRESH.md](./TIME_BASED_REFRESH.md)** for complete documentation.

---

## 📋 Development Mode (Mock Data)

Perfect for testing and development without API credentials.

### Setup

1. In `.env.local`, set:
```env
USE_MOCK_DATA=true
```

2. Start the development server:
```bash
npm run dev
```

3. The dashboard will display sample check-ins from `lib/mockData.ts`

### Customizing Mock Data

Edit `lib/mockData.ts` to:
- Add more sample check-ins
- Change service times
- Modify medical notes
- Adjust timing

```typescript
// Example: Add a new mock check-in
{
  id: '13',
  childName: 'New Child',
  securityCode: 'D401',
  serviceName: '2:00 PM - Kids Worship',
  checkInTime: new Date().toISOString(),
  medicalNotes: 'Sample note',
  eventId: 'service-2pm',
}
```

---

## 🌐 Production Mode (Live API)

Connect to the real Planning Center Check-Ins API.

### Getting API Credentials

1. Log in to [Planning Center](https://api.planningcenteronline.com/)
2. Navigate to **Personal Access Tokens** or **OAuth Applications**
3. Create a new application
4. Copy your **Client ID** and **Client Secret**

### Setup

1. In `.env.local`, set:
```env
USE_MOCK_DATA=false
PCO_CLIENT_ID=your_actual_client_id
PCO_CLIENT_SECRET=your_actual_client_secret
```

2. Restart your server:
```bash
npm run dev
```

3. The dashboard will now fetch live data from Planning Center

### Authentication Details

- Uses **HTTP Basic Authentication**
- Credentials are base64-encoded in the Authorization header
- All API calls happen **server-side** in `/pages/api/checkins.ts`
- Credentials are **never** exposed to the browser/client
- API requests are cached for 30 seconds to avoid rate limiting

---

## 📁 Folder Structure

```
radiant-kids-checkin-dashboard/
├── .env.local              # Environment variables (not in git)
├── .env.example            # Environment template
├── .gitignore              # Git ignore rules
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript configuration
├── next.config.js          # Next.js configuration
├── tailwind.config.js      # TailwindCSS configuration
├── postcss.config.js       # PostCSS configuration
├── README.md               # This file
│
├── pages/
│   ├── _app.tsx            # Next.js app wrapper (imports global styles)
│   ├── index.tsx           # Main dashboard page
│   └── api/
│       └── checkins.ts     # API route (switches between mock/live data)
│
├── components/
│   ├── CheckInTable.tsx    # Main table component (grouping logic)
│   ├── ServiceGroup.tsx    # Individual service group display
│   └── Loader.tsx          # Loading spinner
│
├── lib/
│   ├── mockData.ts         # Mock check-in data generator
│   └── pcoApi.ts           # Planning Center API integration
│
└── styles/
    └── globals.css         # Global Tailwind styles and custom CSS
```

---

## 🎨 Customization

### Change Auto-Refresh Interval

In `pages/index.tsx`, modify the constant:

```typescript
// Change from 30 seconds to 60 seconds
const REFRESH_INTERVAL_MS = 60000; // 60 seconds
```

### Customize Colors

Edit `tailwind.config.js` to change the color scheme:

```javascript
theme: {
  extend: {
    colors: {
      primary: {
        // Change these values to your brand colors
        500: '#0ea5e9',
        600: '#0284c7',
        // ... etc
      },
    },
  },
},
```

### Modify Table Columns

Edit `components/ServiceGroup.tsx` to add/remove columns:

```tsx
// Add a new column in the table header
<th className="px-6 py-4 text-left">
  New Column
</th>

// Add corresponding data in the table body
<td className="px-6 py-4">
  {checkIn.newField}
</td>
```

### Adjust Styling

All components use TailwindCSS classes. Common customizations:

- **Font sizes**: Change `text-lg`, `text-xl`, etc.
- **Padding**: Modify `p-4`, `px-6`, `py-4`, etc.
- **Colors**: Update `bg-primary-600`, `text-gray-900`, etc.
- **Rounded corners**: Adjust `rounded-lg`, `rounded-full`, etc.

---

## 🚀 Deployment

### Deploy to Vercel (Recommended)

1. **Push code to GitHub**

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin your-github-repo-url
git push -u origin main
```

2. **Import to Vercel**

- Go to [vercel.com](https://vercel.com/)
- Click "New Project"
- Import your GitHub repository
- Vercel will auto-detect Next.js settings

3. **Add Environment Variables**

In Vercel dashboard:
- Go to **Settings** → **Environment Variables**
- Add:
  - `USE_MOCK_DATA` = `false`
  - `PCO_CLIENT_ID` = your client ID
  - `PCO_CLIENT_SECRET` = your client secret

4. **Deploy**

- Click "Deploy"
- Your dashboard will be live at `https://your-project.vercel.app`

### Build for Production Locally

```bash
npm run build
npm start
```

---

## 🔮 Future Features

The following features are planned for future releases:

### 📱 Barcode/QR Scanner for Parent Pickup
- Scan parent pickup tags
- Match security codes
- Quick checkout process

### 📊 Export Attendance Reports
- Download CSV/Excel reports
- Filter by date range
- Include medical notes and check-in times

### 🗂️ Filter by Classroom/Location
- Multiple classroom support
- Location-based filtering
- Room capacity tracking

### 💬 Automated Parent Reminders
- Text parents when service is ending
- Two-button response: "On my way" / "I'm here"
- Send security code to app when parent arrives
- Reduce wait times at pickup

---

## 📚 API Documentation

### API Route: `/api/checkins`

**Method**: `GET`

**Response Format**:

```json
{
  "success": true,
  "mode": "mock",
  "data": [
    {
      "id": "1",
      "childName": "Emma Johnson",
      "securityCode": "A123",
      "serviceName": "9:00 AM - Kids Worship",
      "checkInTime": "2024-01-15T09:30:00Z",
      "medicalNotes": "Allergic to peanuts",
      "eventId": "service-9am"
    }
  ]
}
```

**Error Response**:

```json
{
  "success": false,
  "error": "Error message here"
}
```

### Planning Center API Integration

The app fetches from:
```
https://api.planningcenteronline.com/check-ins/v2/check_ins
```

**Query Parameters**:
- `filter=created_at` - Filter by creation date
- `where[created_at][gte]` - Get check-ins from today
- `include=person,event` - Include related person and event data
- `per_page=100` - Limit results

**Authentication**: HTTP Basic Auth with base64-encoded credentials

**Rate Limiting**: Responses cached for 30 seconds

---

## 🤝 Support

For issues or questions:

1. Check the [Planning Center API Documentation](https://developer.planning.center/docs/#/apps/check-ins)
2. Review this README
3. Check environment variable configuration
4. Verify API credentials are correct

---

## 📄 License

This project is private and proprietary to Radiant Church.

---

## 🎉 Credits

Built with ❤️ for Radiant Kids Ministry

**Technologies Used**:
- [Next.js](https://nextjs.org/)
- [React](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [TailwindCSS](https://tailwindcss.com/)
- [Planning Center](https://www.planningcenter.com/)

---

## 📝 Notes

### Security Best Practices
- ✅ Never commit `.env.local` to git
- ✅ All API calls happen server-side
- ✅ Credentials never sent to browser
- ✅ Use environment variables for all secrets

### Performance Tips
- ✅ API responses cached for 30 seconds
- ✅ Optimized for tablet displays
- ✅ Minimal re-renders with React hooks
- ✅ Efficient data grouping and sorting

### Tablet Optimization
- Large, readable fonts (text-lg, text-xl)
- Touch-friendly buttons and spacing
- Responsive table layout
- Auto-refresh eliminates need for manual interaction

---

**Happy checking in! 🎉**

