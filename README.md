# ShrutiPagluChat 💬⚡

**ShrutiPagluChat** is a Telegram/WhatsApp-style 1:1 realtime chat web application built with **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS**, and **Supabase**. It is fully installable as a Progressive Web App (PWA) on mobile/desktop and deployable 100% free on **Vercel** and **Supabase free tier**.

---

## Features

- 🔐 **Supabase Auth**: Email & password registration with mandatory Display Name + Unique Username + optional profile avatar upload.
- 🔍 **Username Search**: Case-insensitive partial username search (`@username`) to start instant 1:1 chats.
- ⚡ **Realtime Messaging**: Instant message delivery powered by Supabase Realtime Postgres Changes.
- ⌨️ **Typing Indicators & Presence**: Broadcast live typing status and online/offline user presence using Supabase Realtime Presence.
- 📸 **Self-Destructing 24h Image Attachments**: Client-side compressed image uploads with automatic 24-hour expiration and hard deletion.
- 🔔 **Web Push Notifications**: Standard Web Push API with VAPID key signing via Service Worker when the app is backgrounded or tab is unfocused.
- 📱 **Mobile PWA Installable**: Custom PWA Manifest + Service Worker passing Chrome/iOS home-screen installation checks.
- 🎨 **Discord-Inspired Design System**: Built with a deep-indigo aesthetic (`#0a0d3a`), Blurple accents (`#5865f2`), Electric Green CTAs (`#35ed7e`), and glassmorphism UI.

---

## Tech Stack & Free-Tier Services

| Layer | Technology |
| --- | --- |
| **Frontend** | Next.js 14+ (App Router), React 18, TypeScript, Tailwind CSS |
| **Database & Auth** | Supabase Postgres DB, Supabase Auth |
| **Realtime & Presence** | Supabase Realtime (Postgres Changes + Presence) |
| **File Storage** | Supabase Storage (`avatars` and `chat-images` buckets) |
| **Push Notifications** | Web Push API (Service Worker + `web-push` VAPID) |
| **Hosting** | Vercel Free Tier |

---

## Step-by-Step Setup Guide

### Step 1: Create a Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a free project.
2. Go to **Project Settings** -> **API** and copy:
   - **Project URL** (`NEXT_PUBLIC_SUPABASE_URL`)
   - **Anon / Public Key** (`NEXT_PUBLIC_SUPABASE_ANON_KEY`)
   - **Service Role Key** (`SUPABASE_SERVICE_ROLE_KEY`)

---

### Step 2: Run Database Migrations & Create Storage Buckets
1. Open your Supabase Dashboard -> **SQL Editor**.
2. Copy the contents of [`supabase/schema.sql`](file:///c:/Users/Admin/Documents/ShrutiPagluChat/supabase/schema.sql) and execute it.
   - This creates tables (`profiles`, `conversations`, `messages`, `push_subscriptions`), RLS policies, trigger function `handle_new_user()`, and `cleanup_expired_images()` RPC function.
3. Verify Storage Buckets:
   - Go to **Storage** in Supabase sidebar.
   - Confirm public buckets `avatars` and `chat-images` were created with public read RLS policies.

---

### Step 3: Generate VAPID Keys for Web Push Notifications
Run the included key generator script:
```bash
npm run generate-vapid
```
Output:
```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BH...
VAPID_PRIVATE_KEY=4...
```

---

### Step 4: Configure Local Environment Variables
Create a `.env.local` file in the project root:
```env
# Supabase Keys
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Web Push VAPID Keys
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-generated-vapid-public-key
VAPID_PRIVATE_KEY=your-generated-vapid-private-key
VAPID_SUBJECT=mailto:admin@shrutipagluchat.com
```

---

### Step 5: Setup Image Auto-Expiry Cron Job (Hourly Cleanup)
Image attachments expire after 24 hours (`expires_at = created_at + 24 hours`).

#### Option A: Supabase `pg_cron` (Recommended)
If `pg_cron` extension is enabled in your Supabase project, run this SQL:
```sql
SELECT cron.schedule(
  'cleanup-24h-images',
  '0 * * * *', -- runs every hour
  $$ SELECT cleanup_expired_images(); $$
);
```

#### Option B: Vercel Cron Jobs (Free)
Add `cron` definition to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/cleanup-images",
      "schedule": "0 * * * *"
    }
  ]
}
```

---

### Step 6: Local Development & Verification
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start local dev server:
   ```bash
   npm run dev
   ```
3. Open `http://localhost:3000` in your browser.
4. Test flow:
   - Create two accounts (e.g. `@shruti` and `@paglu`).
   - Search for `@paglu` from `@shruti`'s account to start a 1:1 chat.
   - Send text & compressed image attachments.
   - Verify typing indicators and online status in real-time.

---

### Step 7: Deploying Free on Vercel
1. Push your repository to GitHub.
2. Import repository into [Vercel](https://vercel.com).
3. Add all environment variables from `.env.local` into Vercel Project Settings -> **Environment Variables**.
4. Click **Deploy**. Your app will be live with full HTTPS, PWA installation support, and real-time messaging!
