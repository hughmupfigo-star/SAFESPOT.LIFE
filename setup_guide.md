# SAFE Shop Backend Setup Guide

Follow these steps to deploy your shopping cart checkout system.

---

## STEP 1: Create `.env` File (KEEP THIS SECRET)

1. In your `SAFE-Website` folder, create a new file called `.env` (not `.env.example`)
2. Open it in a text editor
3. Add these two lines:

```
STRIPE_SECRET_KEY=sk_live_YOUR_SECRET_KEY_HERE
DOMAIN=https://your-site.vercel.app
```

**Replace:**
- `sk_live_YOUR_SECRET_KEY_HERE` with your actual Stripe Secret Key
- `https://your-site.vercel.app` with the URL you'll get from Vercel (we'll do this later)

4. **Save the file and NEVER share it or commit it to GitHub**

---

## STEP 2: Deploy to Vercel (FREE)

Vercel is the easiest hosting for Node.js apps. It's free and takes 5 minutes.

### 2a. Create Vercel Account
1. Go to https://vercel.com/signup
2. Sign up with GitHub, GitLab, or email
3. Verify your email

### 2b. Connect Your Project
1. Go to https://vercel.com/new
2. Click **"Import Git Repository"**
3. Paste: `https://github.com/YOUR_GITHUB_USERNAME/SAFE-Website`
   - (Or upload your folder directly if you don't use GitHub)
4. Click **"Import"**

### 2c. Set Environment Variables
1. In the Vercel import screen, scroll down to "Environment Variables"
2. Add these:

**Key:** `STRIPE_SECRET_KEY`  
**Value:** `sk_live_YOUR_SECRET_KEY_HERE` (your actual key)

**Key:** `DOMAIN`  
**Value:** Leave blank for now, we'll update it

3. Click **"Deploy"**

**Wait 2-3 minutes for deployment...**

### 2d. Get Your Vercel URL
1. Once deployed, Vercel will show you a URL like: `https://safe-website.vercel.app`
2. Copy this URL

### 2e. Update Environment Variable
1. Go back to Vercel dashboard
2. Click your project → Settings → Environment Variables
3. Click the `DOMAIN` variable and edit it
4. Set value to: `https://safe-website.vercel.app` (your actual URL)
5. Click Save → **Redeploy**

---

## STEP 3: Update Your Website

In your `shop.html` and `cart.html` files, make sure the checkout is pointing to your Vercel URL.

Your cart.html already has the code. When users click "Proceed to Checkout", it will:
1. Send items to: `YOUR_VERCEL_URL/api/checkout`
2. Stripe Session is created
3. Redirects to Stripe Checkout
4. After payment → `success.html`

---

## STEP 4: Test It

1. Go to your shop (at your Vercel URL)
2. Add items to cart
3. Click "Proceed to Checkout"
4. Use Stripe test card: `4242 4242 4242 4242` (expiry: any future date, CVC: any 3 digits)
5. Complete payment
6. You should see "Order Confirmed" page

---

## STEP 5: Go Live with Real Payments

Once testing works:
1. Make sure you're using your LIVE Stripe Secret Key (`sk_live_...`)
2. Change Stripe mode from Test to Live in Stripe Dashboard
3. You're ready for real transactions!

---

## Files You Now Have

- `server.js` - Your backend
- `package.json` - Dependencies
- `.env` - Your secret key (NEVER SHARE)
- `vercel.json` - Vercel configuration
- `cart.html` - Updated checkout
- `success.html` - Order confirmation page

---

## Troubleshooting

**"Checkout button doesn't work?"**
- Check browser console (F12) for errors
- Make sure `.env` file exists with correct keys

**"404 error when clicking checkout?"**
- Verify Vercel deployment was successful
- Check that `DOMAIN` environment variable matches your Vercel URL

**"Stripe error?"**
- Verify secret key is correct
- Make sure it's the LIVE key, not TEST

---

## Questions?

Let me know if you get stuck on any step!
