# Vibe Theme Editor

An AI-powered Shopify theme editing IDE. Connect your Shopify store, chat with Claude, and push theme changes live — all from a beautiful developer-focused interface.

## Features

- 🛍️ Connect to any Shopify store via OAuth
- 🤖 Chat with Claude AI to describe theme changes
- 📁 Browse and view all theme files
- 🔍 Side-by-side diff view for proposed changes
- 🚀 Push approved changes directly to your live theme
- ✨ Dark, developer-focused terminal-inspired UI

## Setup

### 1. Create a Shopify Partner App

1. Go to [Shopify Partners](https://partners.shopify.com) and log in
2. Click **Apps** → **Create app** → **Create app manually**
3. Give your app a name (e.g., "Vibe Theme Editor")
4. Under **App setup**:
   - Note your **API Key** and **API secret key**
   - Add an **Allowed redirection URL**: `https://your-vercel-url.vercel.app/api/auth/callback`
   - For local development, also add: `http://localhost:3000/api/auth/callback`
5. Under **Configuration**, set the required scopes: `read_themes, write_themes`

### 2. Get an Anthropic API Key

1. Go to [Anthropic Console](https://console.anthropic.com)
2. Create an account or log in
3. Navigate to **API Keys** and create a new key
4. Copy the key — you'll enter it in the app's setup screen

### 3. Configure Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```
SHOPIFY_API_KEY=your_api_key_from_partner_dashboard
SHOPIFY_API_SECRET=your_api_secret_from_partner_dashboard
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
SESSION_SECRET=your_random_32_char_secret
```

Generate a session secret:
```bash
openssl rand -base64 32
```

### 4. Deploy to Vercel

#### Option A: Deploy via Vercel CLI

```bash
npm install -g vercel
vercel --prod
```

Follow the prompts to link to a Vercel project. Add your environment variables in the Vercel dashboard.

#### Option B: Deploy via GitHub

1. Push this repo to GitHub
2. Go to [Vercel](https://vercel.com) and import your repository
3. Add environment variables in the project settings:
   - `SHOPIFY_API_KEY`
   - `SHOPIFY_API_SECRET`
   - `NEXT_PUBLIC_APP_URL` (set to your Vercel deployment URL)
   - `SESSION_SECRET`
4. Deploy

### 5. Configure OAuth Redirect URL

After deploying to Vercel:
1. Go back to your Shopify Partner Dashboard
2. Under your app's **App setup** → **Allowed redirection URLs**
3. Add your Vercel URL: `https://your-app.vercel.app/api/auth/callback`

## Local Development

```bash
# Install dependencies
npm install

# Copy and fill in environment variables
cp .env.example .env.local

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. **Connect your store**: Enter your Shopify store domain (e.g., `my-store.myshopify.com`) and click "Connect Shopify Store"
2. **Add API key**: Enter your Anthropic API key in the setup screen
3. **Browse files**: Use the left sidebar to select a theme and browse files
4. **Chat with Claude**: Describe changes in the chat panel (e.g., "Make the header background dark navy blue")
5. **Review changes**: Claude will propose file modifications shown in the diff viewer
6. **Push changes**: Click "Apply Change" on diffs you like, then "Push to Shopify"

## Architecture

- **Framework**: Next.js 14 (App Router)
- **AI**: Anthropic Claude (claude-sonnet-4-20250514)
- **Auth**: Shopify OAuth 2.0
- **API**: Shopify GraphQL Admin API (2026-01) + REST for file operations
- **Sessions**: iron-session (HTTP-only encrypted cookies)
- **Deployment**: Vercel

## Security Notes

- Shopify access tokens are stored in HTTP-only encrypted cookies (never exposed to client JS)
- Anthropic API keys are stored in localStorage (browser-side only, never sent to our servers except proxied to Anthropic)
- All Shopify API calls are proxied through server-side API routes
