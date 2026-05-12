# Fix for White Screen Issues on Booking & Login

## Problems Fixed

You were getting white screens on:
1. **Booking page**: When clicking "Confirm Booking"
2. **Login page**: When clicking "Get OTP"

## Root Cause

Your frontend on Vercel was making API calls using **relative paths** (`/api/send-otp`, `/api/bookings`) instead of the **full backend URL** on Render. This caused the requests to fail silently.

### Before (❌ Wrong):
```typescript
await axios.post('/api/send-otp', { phone });
await axios.post('/api/bookings', bookingData);
```

### After (✅ Fixed):
```typescript
await axios.post(`${import.meta.env.VITE_API_URL}/api/send-otp`, { phone });
await axios.post(`${import.meta.env.VITE_API_URL}/api/bookings`, bookingData);
```

## Changes Made

### 1. **Fixed API URLs** in:
   - `src/views/Login.tsx` - Send OTP endpoint
   - `src/views/Customer/Booking.tsx` - Send OTP and Create Booking endpoints

### 2. **Added Better Error Handling & Logging**
   - Console logs now show what's happening (easier to debug)
   - Error messages are properly captured and displayed to users
   - API errors are now visible in the UI instead of silent failures

### 3. **Updated `.env.example`**
   - Added `VITE_API_URL` to show what environment variable is needed

## How to Deploy This Fix

### Step 1: Verify Local .env
Your local `.env` file already has:
```
VITE_API_URL=https://turbotech-backend.onrender.com
```

### Step 2: Set Environment Variable in Vercel
1. Go to your **Vercel Project Settings**
2. Navigate to **Settings → Environment Variables**
3. Add this variable:
   - **Name:** `VITE_API_URL`
   - **Value:** `https://turbotech-backend.onrender.com` (your Render backend URL)
   - **Environments:** Select **Production**, **Preview**, **Development**
4. Click **Save**

### Step 3: Redeploy
```bash
git add .
git commit -m "Fix: Use full API URLs from environment variables"
git push
```

Then trigger a redeployment in Vercel (or it will auto-deploy).

## Testing After Deployment

### Test Login:
1. Open your Vercel frontend
2. Click "Get OTP" 
3. Should see OTP sent message (not white screen)
4. Check browser console (F12 → Console) for logs

### Test Booking:
1. Fill booking form
2. Click "Confirm Booking"
3. Should see OTP modal (not white screen)
4. Check browser console for logs

## Debugging If Issues Persist

### Check Browser Console (F12):
- Look for logs like `[Login] Sending OTP to: 9876543210`
- Look for any error messages
- Check the Network tab to see if API calls are reaching Render

### Check Network Requests:
1. Open DevTools (F12)
2. Go to **Network** tab
3. Click "Get OTP" or "Confirm Booking"
4. Look for `/api/send-otp` or `/api/bookings` requests
5. Verify they're calling: `https://turbotech-backend.onrender.com/api/...`
6. Check the response for errors

### Common Issues:

**Issue:** API returns 403/401 errors
- **Cause:** CORS or authentication issue
- **Fix:** Check backend is running and CORS is enabled for Vercel domain

**Issue:** API returns 500 errors
- **Cause:** Backend error
- **Fix:** Check Render backend logs

**Issue:** Requests timeout
- **Cause:** Render backend might be sleeping (free tier)
- **Fix:** Keep Render instance awake or upgrade

## Environment Variable Reference

The frontend uses these environment variables:
- `VITE_API_URL` - Base URL of your backend API (required)

Example for different deployments:
- **Local**: `http://localhost:5000` or `http://localhost:3001`
- **Render**: `https://turbotech-backend.onrender.com`
- **Other**: Your custom backend domain

---

**Note:** Make sure your Render backend is running and accessible from the internet before testing!
