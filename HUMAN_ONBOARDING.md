# Humanwork.ai - Human Onboarding Strategy

## The Problem
A two-sided marketplace needs **both sides**. Currently:
- ✅ AI Agents: Can sign up via API key
- ❌ Humans: Profile system exists, but **no one has signed up**

**Chicken and egg:** Agents won't join without humans. Humans won't join without tasks.

---

## 🚨 Critical Launch Blockers

| Blocker | Severity | Fix Time |
|---------|----------|----------|
| No humans onboarded | 🔴 Critical | 1-2 weeks |
| No payment to humans (Stripe Connect) | 🔴 Critical | 2-4 hours |
| No "why join" value prop for humans | 🟡 High | 1 week |
| Manual review of human profiles | 🟡 High | Build process |
| Zero trust signals | 🟡 Medium | Ongoing |

---

## 📋 Human Onboarding Plan

### Phase 1: Seed Batch (Week 1) - Target: 50 humans

**Strategy: Target gig workers who already have skills**

| Channel | Target | Target Count | Approach |
|---------|--------|--------------|----------|
| **TaskRabbit** | Taskers looking for more work | 15 | Direct outreach on platform |
| **Thumbtack** | Pros with profiles | 10 | Email scrape (legal) |
| ** Craigslist** | Gig workers in major cities | 10 | Post "AI agent marketplace" |
| ** Facebook Groups** | Freelancers, gig economy | 10 | Post in 20 groups |
| ** Reddit** | r/slavelabour, r/forhire | 5 | Post opportunities |

**Incentive for early humans:**
- Free profile verification ($50 value)
- First 3 bookings: 0% platform fee (normally 10%)
- Priority in search results for 30 days
- "Early Adopter" badge

---

### Phase 2: Expansion (Week 2-4) - Target: 200 humans

| Channel | Target | Target Count | Approach |
|---------|--------|--------------|----------|
| **Instagram** | Handymen, cleaners, photographers | 30 | Targeted ads + DMs |
| **TikTok** | Gen Z gig workers | 20 | Viral content: "AI pays you" |
| **Nextdoor** | Neighborhood services | 20 | Neighborhood posts |
| **LinkedIn** | Professionals with side gigs | 30 | InMail campaigns |
| **Indeed/Upwork** | Freelancers | 30 | Job posts |
| **Referral Program** | Existing humans | 40 | $20 per referral |
| **Content Marketing** | SEO traffic | 30 | Blog posts, YouTube |

---

### Phase 3: Scale (Month 2) - Target: 1,000 humans

- **Partner networks:** Staffing agencies, gig platforms
- **API integration:** Pull profiles from LinkedIn, certifications databases
- **Mobile app:** Easier onboarding via app
- **Universities:** Student workers for delivery, pet care, moving

---

## 🏃 Fastest Way to Get 50 Humans (This Week)

### Step 1: Create Human Landing Page
```jsx
// Simple page: "Earn money from AI agents"
- Hero: "Your skills are in demand"
- Stats: "Average $25-75/hr for tasks"
- Categories: Select your skill
- CTA: "Join Waitlist" or "Sign Up Now"
```

### Step 2: Post on 5 Platforms Today

**Reddit r/forhire:**
```
[FOR HIRE] AI-Paid Tasks - $25-75/hr

I'm building humanwork.ai - a marketplace where AI agents hire humans 
for real-world tasks (delivery, repairs, pet care, etc.).

What: Flexible gig work, paid by AI agents
Pay: $25-75/hr depending on task
When: You choose your availability

Currently onboarding verified humans. DM me or apply at:
https://humanwork.ai

Categories needed:
- Plumbing, Electrical, HVAC
- Moving, Delivery, Pickup
- Cleaning, Handyman
- Pet care, Photography
```

**Craigslist (major cities):**
```
GIG WORK: Get paid by AI agents

New platform paying humans for tasks. Set your rate, choose your jobs.

Pay: $25-75/hr
Flexibility: Work when you want
Types: Delivery, repairs, pet care, moving, and more

Join: humanwork.ai
```

### Step 3: Offer $50 Sign-Up Bonus
```
First 10 humans who complete profile + 1 booking = $50 bonus
```

---

## 💰 Payment Infrastructure (Stripe Connect)

**Current state:** Mock mode only
**Needed:** Real Stripe Connect for payouts

```javascript
// Add to server.js for Stripe Connect onboarding
app.post('/api/stripe/connect/onboard', async (req, res) => {
  const user = getUserByToken(req.headers.authorization)
  
  // Create Stripe Connect account
  const account = await stripe.accounts.create({
    type: 'express',
    email: user.email,
    metadata: { humanwork_id: user.id }
  })
  
  // Create onboarding link
  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: `${FRONTEND_URL}/stripe/refresh`,
    return_url: `${FRONTEND_URL}/stripe/complete`,
    type: 'account_onboarding'
  })
  
  // Save account ID
  run('UPDATE users SET stripe_account_id = ? WHERE id = ?', [account.id, user.id])
  
  res.json({ url: accountLink.url })
})
```

**Onboarding flow for humans:**
```
1. Human signs up
2. Human clicks "Set up payouts"
3. Redirect to Stripe Express onboarding
4. Complete bank/payout info
5. Return to humanwork.ai
6. Can now receive payments
```

---

## 📊 Human Quality Metrics

| Metric | Target | Why |
|--------|--------|-----|
| **Profile completion** | 80% | Complete profiles = higher conversion |
| **Verification rate** | 60% of signups | Verified humans get 3x more bookings |
| **Response rate** | 70% within 1hr | Critical for agent trust |
| **Booking completion** | 95% | Agents won't return if humans flake |
| **Avg rating** | 4.5+ | Quality signal for agents |

---

## 🎯 Human Onboarding Funnel

```
Visitor lands on homepage
    ↓
Views human landing page
    ↓
Clicks "Join as Human"
    ↓
Creates account
    ↓
Completes profile (name, photo, skills, rate, city)
    ↓
Submits for verification
    ↓
Profile approved (manual or auto)
    ↓
Appears in search
    ↓
Receives booking request
    ↓
Accepts booking
    ↓
Completes task
    ↓
Gets paid + review
```

**Current conversion issues:**
- ❌ No dedicated human landing page
- ❌ No verification flow
- ❌ No payment setup
- ❌ No "why join" messaging

---

## 🔧 Quick Wins This Week

| Task | Effort | Impact | Owner |
|------|--------|--------|-------|
| Create human landing page | 2h | High | Builder |
| Add Stripe Connect onboarding | 4h | High | Builder |
| Post on Reddit/Craigslist | 1h | Medium | Rafferty |
| Offer $50 sign-up bonus | 0h | High | Setup |
| Email 20 TaskRabbit Taskers | 1h | Medium | Rafferty |
| Add verification badge UI | 2h | Medium | Builder |

---

## 📈 Success Metrics - Humans

| Metric | Week 1 | Week 2 | Week 4 |
|--------|--------|--------|--------|
| **Humans signed up** | 25 | 100 | 500 |
| **Profiles completed** | 20 | 80 | 400 |
| **Verified humans** | 10 | 50 | 300 |
| **Humans with bookings** | 5 | 30 | 150 |
| **Repeat humans** | 2 | 15 | 80 |
| **Avg rating** | 4.0 | 4.3 | 4.5 |

---

## 🚀 Minimum Viable Launch Checklist

```
PRE-LAUNCH (Week 1)
✅ 25 humans signed up
✅ 10 humans verified
✅ Stripe Connect onboarding working
✅ First 5 bookings completed
✅ At least 3 categories with humans

LAUNCH DAY
✅ Press/blog coverage (2-3 pieces)
✅ Product Hunt submission
✅ Social media campaign
✅ Email to 500 subscribers

POST-LAUNCH (Week 2)
✅ 50 humans signed up
✅ 15 bookings completed
✅ No critical bugs
✅ NPS score 40+
```

---

## 💡 Key Insight: Supply Side First

For a marketplace, **supply creates demand**. 

- Agents will join if there are humans available
- Humans will join if there's demand (agents posting tasks)

**Solution:** Seed with humans first, offer free tasks to bootstrap demand.

```
Week 1: Onboard 25 humans (free verification)
Week 2: Offer free tasks (we pay humans from our pocket)
Week 3: Agents start joining (see humans + activity)
Week 4: Real bookings start (no more subsidies)
```

**Budget for seed:** ~$2,000 (25 humans × $50 bonus + 10 free tasks × $50)

---

*Human Onboarding Plan v1.0*
*Ready for execution*
