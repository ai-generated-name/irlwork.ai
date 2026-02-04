# Humanwork.ai - Launch Strategy

## Executive Summary
humanwork.ai is uniquely positioned as the **first marketplace connecting AI agents with humans** for real-world tasks. The target audience isn't traditional businesses—it's **AI agent developers and builders** who need physical-world execution.

---

## 📊 Success Metrics

| Metric | Month 1 | Month 3 | Month 6 |
|--------|---------|---------|---------|
| **Signups** | 200 | 1,000 | 5,000 |
| **Active Agents** | 20 | 100 | 500 |
| **Active Humans** | 50 | 300 | 1,000 |
| **Bookings** | 50 | 500 | 3,000 |
| **GMV** | $5,000 | $50,000 | $300,000 |
| **NPS** | 40+ | 50+ | 60+ |

---

## 🎯 Target Audience Profiles

### Primary: AI Agent Builders
- Developers building autonomous agents (LangChain, AutoGPT, CrewAI, etc.)
- Startups integrating physical-world capabilities into agents
- Hackers building "AI + human" hybrid systems
- **Pain point:** Their AI can reason but can't fix a leak or deliver a package

### Secondary: API-First Companies
- Companies with APIs that need human fallback/augmentation
- Robotics companies (where humans handle edge cases)
- **Pain point:** Scaling from 10 to 10,000 tasks requires humans

### Tertiary: AI Enthusiasts
- Indie hackers experimenting with agent swarms
- AI tool reviewers and content creators
- **Pain point:** Want to test agent-to-human workflows

---

## 📣 Launch Tactics

### Tactic 1: AI Developer Community Blitz
**Expected Impact:** High | **Cost:** $500-2,000

| Channel | Action | Conversion Potential |
|---------|--------|---------------------|
| **Hacker News** | Show HN launch post | High (target: 200+ upvotes) |
| **r/Artificial** | Launch announcement | Medium (target: 50+ comments) |
| **Indie Hackers** | Case study: "How I built an AI agent marketplace" | Medium |
| **LangChain Discord** | Share in #showcase | High |
| **CrewAI Discord** | Partnership pitch | High |
| **Twitter/X** | Thread: "I built a marketplace for AI agents" | High |

**Content:**
- Show the MCP integration in action
- Demo: "Claude hires a plumber via API"
- Technical deep-dive: how it works

---

### Tactic 2: Partner with AI Agent Frameworks
**Expected Impact:** Very High | **Cost:** Partnership (no cash)

| Target | Value Proposition |
|--------|------------------|
| **LangChain** | Official human-in-the-loop integration |
| **CrewAI** | Built-in human agent type |
| **AutoGPT** | Physical world execution plugin |
| **AgentGPT** | Task completion via humans |
| **SuperAGI** | Marketplace integration |

**Approach:**
1. Open-source MCP server reference implementation
2. Create tutorial: "Add human tasks to your agent in 5 minutes"
3. Submit to their plugin/extension directories
4. Offer co-marketing (blog posts, webinars)

---

### Tactic 3: Product Hunt Launch
**Expected Impact:** Medium | **Cost:** $500 (photo, assets)

| Element | Content |
|---------|---------|
| **Tagline** | "Marketplace where AI agents hire humans" |
| **Mascot** | 🤖 + 👤 |
| **Gallery** | 4-6 screenshots (landing, search, booking, dashboard) |
| **Description** | Focus on: MCP integration, real-world use cases |
| **First comment** | Engage with every comment within 1 hour |

**Pre-launch prep:**
- Build email list of 500+ AI developers
- Schedule tweets for launch day
- Prepare follow-up content

---

## 🚀 Growth Experiments (Post-Launch)

### Experiment 1: AI Agent Template Library
**Hypothesis:** Agents with pre-built human task templates have 3x higher activation

| Test | Control | Variant |
|------|---------|---------|
| Onboarding | No templates | 5 curated templates (plumbing, delivery, etc.) |
| Success metric | % completing first booking | % completing first booking |

**Implementation:**
- Create templates: `{ category, title, description, budget_range }`
- Expose via MCP: `get_task_templates(category)`
- Measure: activation rate, time-to-first-booking

---

### Experiment 2: Referral Program
**Hypothesis:** Word-of-mouth is highest-leverage channel for agent marketplaces

| Test | Variant A | Variant B |
|------|-----------|-----------|
| Incentive | $20 credit | $20 cash |
| Requirement | 1 booking | 3 bookings |

**Mechanism:**
- Generate unique referral code
- Track via URL param: `?ref=agent_abc`
- Reward when referee completes first booking

---

### Experiment 3: Category Expansion Test
**Hypothesis:** Adding "urgent/emergency" tasks increases GMV by 50%

| Test | Control | Variant |
|------|---------|---------|
| UI | Normal booking flow | + "Urgent" toggle (2x pricing, 4hr SLA) |

**Categories to test:**
- Emergency locksmith
- Emergency plumbing
- Emergency pet care

---

## 📅 Week 1-4 Action Items

### Week 1: Launch Prep
- [ ] Finalize MVP features freeze
- [ ] Create landing page copy
- [ ] Prepare Show HN materials
- [ ] Set up Google Analytics + events
- [ ] Test MCP server end-to-end
- [ ] Prepare launch tweets (5-7)

### Week 2: Launch Execution
- [ ] Submit to Product Hunt (schedule for Tuesday 9am PST)
- [ ] Post on Hacker News (coordinate with PH)
- [ ] Share in 10+ AI Discord servers
- [ ] Post on Indie Hackers
- [ ] Reach out to 5 AI agent frameworks (LangChain, CrewAI)
- [ ] Send launch email to 500 subscribers

### Week 3: Community Engagement
- [ ] Respond to every comment/question
- [ ] Create "Getting Started" tutorial
- [ ] Open-source MCP reference client
- [ ] Publish "How it works" technical blog
- [ ] Collect feedback from first 50 users

### Week 4: Iterate & Optimize
- [ ] Analyze metrics (conversion, activation, churn)
- [ ] Fix top 3 user-reported issues
- [ ] Launch first growth experiment
- [ ] Plan Month 2 campaigns
- [ ] Prepare case study of first successful booking

---

## 📈 Metrics to Track Daily

| Category | Metric | Target |
|----------|--------|--------|
| **Acquisition** | Unique visitors | 100+/day |
| **Acquisition** | Signups | 10+/day |
| **Activation** | Profile completion | 50% |
| **Activation** | First search | 70% |
| **Activation** | First booking | 10% |
| **Retention** | Weekly active agents | 30% |
| **Retention** | Weekly active humans | 40% |
| **Revenue** | GMV | $500+/day |

---

## 🎯 Immediate Next Steps

1. **Today:** Replace GA tracking ID in `/home/irlwork.ai/ui/index.html`
2. **Tomorrow:** Write Show HN post draft
3. **This week:** Create MCP tutorial video
4. **This week:** Reach out to LangChain/CrewAI

---

## Investment Required

| Category | Month 1 | Month 2 | Month 3 |
|----------|---------|---------|---------|
| **Marketing** | $2,000 | $5,000 | $10,000 |
| **Development** | $5,000 | $8,000 | $10,000 |
| **Operations** | $1,000 | $2,000 | $3,000 |
| **Total** | $8,000 | $15,000 | $23,000 |

---

## Moat Analysis

| Moat Type | Strength | Notes |
|-----------|----------|-------|
| **Data moat** | Medium | First to market = most booking data |
| **Network effects** | High | More humans = better for agents |
| **Brand** | Low | Need to build trust |
| **Integration** | High | MCP/API lock-in for agent builders |

**Key insight:** The moat is being the **default choice** for AI agents needing humans. Once an agent is integrated via MCP, switching costs are high.

---

*Generated for humanwork.ai launch planning*
*Status: Ready for review*
