# AuraMail Google OAuth 2.0 & Production Vercel Setup Guide

To run **AuraMail** with live **Google OAuth 2.0 & Gmail API** integration on your Vercel deployment (`https://aura-mails01.vercel.app`), follow these step-by-step instructions.

---

## 1. Google Cloud Console Setup

1. Go to [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials).
2. Click **+ Create Credentials** → **OAuth client ID**.
3. Select **Web application** as Application type.
4. Set **Name**: `AuraMail Production`
5. Under **Authorized JavaScript origins**, add:
   - `https://aura-mails01.vercel.app`
   - `http://localhost:3000`
   - `http://localhost:3001`
6. Under **Authorized redirect URIs**, add:
   - `https://aura-mails01.vercel.app/api/auth/google/callback`
   - `http://localhost:3001/api/auth/google/callback`
7. Click **Create** and copy your **Client ID** and **Client Secret**.

---

## 2. Enable Gmail API

1. Go to [Google Cloud API Library](https://console.cloud.google.com/apis/library/gmail.googleapis.com).
2. Click **Enable**.
3. Ensure the OAuth consent screen is configured with the following scopes:
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/gmail.send`
   - `https://www.googleapis.com/auth/gmail.modify`
   - `https://www.googleapis.com/auth/gmail.labels`
   - `https://www.googleapis.com/auth/userinfo.email`
   - `https://www.googleapis.com/auth/userinfo.profile`

---

## 3. Vercel Environment Variables Setup

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard) and select your `aura-mails01` project.
2. Go to **Settings** → **Environment Variables**.
3. Add the following environment variables:

| Variable Name | Example Value | Description |
|---|---|---|
| `GOOGLE_CLIENT_ID` | `your_client_id.apps.googleusercontent.com` | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | `GOCSPX-your_client_secret` | Google OAuth Client Secret |
| `SESSION_SECRET` | `random_secret_string_32_chars` | Secret key for express session |
| `JWT_SECRET` | `random_jwt_secret_32_chars` | Secret key for signing JWTs |
| `NODE_ENV` | `production` | Node environment |

4. Trigger a **Redeploy** on Vercel so the serverless API routes (`/api/*`) load your environment variables.

---

## 4. How Google OAuth Works Live

1. When a user clicks **Sign in with Google** or says *"Sign in"*:
2. The browser fetches `/api/auth/google` on `https://aura-mails01.vercel.app`.
3. The Vercel serverless function generates the Google OAuth consent URL.
4. User logs into Google and approves Gmail access.
5. Google redirects back to `https://aura-mails01.vercel.app/api/auth/google/callback`.
6. The serverless function exchanges the authorization code for Gmail access & refresh tokens, embeds them into a signed JWT, and redirects back to `https://aura-mails01.vercel.app/?auth=success&token=...`.
7. AuraMail stores the token, displays the user's Google avatar & name in the header, and syncs live Gmail inbox messages seamlessly with Web Speech voice controls!
