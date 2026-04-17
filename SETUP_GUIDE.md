# Landscape Job Tracker — Setup Guide

## What You're Setting Up
A web + mobile app for tracking landscape installation jobs. It includes:
- A login system for your team
- A jobs dashboard with GP status
- Per-job project/module tracking
- Change order management
- Estimated vs. actual labor and material tracking
- Live Gross Profit calculations using the Man Day model

---

## Step 1: Create a Free Supabase Account

1. Go to **https://supabase.com** and click "Start your project"
2. Sign up with your email or GitHub
3. Create a **New Project**
   - Give it a name (e.g., "landscape-job-tracker")
   - Set a strong database password (save this somewhere safe)
   - Choose a region close to you
4. Wait ~2 minutes for the project to be ready

---

## Step 2: Set Up the Database

1. In your Supabase project, click **SQL Editor** in the left sidebar
2. Click **+ New query**
3. Open the file `supabase-schema.sql` (included in this folder)
4. Copy **all** the contents and paste into the SQL editor
5. Click **Run** (green button)
6. You should see "Success. No rows returned."

---

## Step 3: Get Your Supabase Keys

1. In Supabase, click **Project Settings** (gear icon, bottom-left)
2. Click **API**
3. Copy two values:
   - **Project URL** (looks like `https://abcdefgh.supabase.co`)
   - **anon public** key (a long string starting with `eyJ...`)

---

## Step 4: Configure the App

1. In the `landscape-job-tracker` folder, find the file `.env.example`
2. Make a copy of it and name the copy exactly: `.env`
3. Open `.env` and fill in your values:
   ```
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJyour_anon_key_here...
   ```

---

## Step 5: Install Node.js (if you don't have it)

1. Go to **https://nodejs.org**
2. Download and install the **LTS** version (recommended)
3. Restart your computer after installing

---

## Step 6: Install and Run the App

Open a terminal (Mac: Terminal app, Windows: Command Prompt or PowerShell):

```bash
# Navigate to the app folder
cd path/to/landscape-job-tracker

# Install dependencies (first time only, takes ~1-2 min)
npm install

# Start the app
npm run dev
```

You'll see something like:
```
  VITE v5.x.x  ready

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.1.x:5173/  ← use this on mobile!
```

Open **http://localhost:5173** in your browser. Field crews on the same Wi-Fi can open the Network address on their phones.

---

## Step 7: Create User Accounts for Your Team

User accounts are managed in Supabase:

1. Go to your Supabase project → **Authentication** → **Users**
2. Click **Add user** → **Create new user**
3. Enter the email and password for each team member
4. They can log in at your app's URL

---

## Step 8: Deploy Online (Optional but Recommended)

To make the app available from anywhere (not just your local network):

### Option A: Vercel (Free, Easiest)
1. Create a free account at **https://vercel.com**
2. Install Vercel CLI: `npm install -g vercel`
3. Run `vercel` in the app folder and follow the prompts
4. Add your environment variables in the Vercel dashboard under Settings → Environment Variables

### Option B: Netlify (Free)
1. Create a free account at **https://netlify.com**
2. Drag and drop the `dist` folder (after running `npm run build`) to Netlify
3. Add environment variables in Site Settings → Environment variables

---

## First-Time App Setup

1. Log in with any user account
2. Go to **Settings** → set your company name, license number, and **labor rate per man day**
3. Start creating jobs from the **Dashboard** → **+ New Job**

---

## Questions?

The app is organized into these main screens:

| Screen | What it does |
|--------|-------------|
| **Dashboard** | All jobs with GP status at a glance |
| **New Job** | Create a job with projects and modules |
| **Job Detail** | View job info, add change orders |
| **Job Tracker** | The main tracking screen — log actual hours/materials, see live GP |
| **Settings** | Company info + labor rate |
