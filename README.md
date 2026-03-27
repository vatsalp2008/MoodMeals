# MoodMeals

Emotion-aware meal planning powered by nutritional psychiatry. MoodMeals analyzes how you feel, maps your emotional state to clinically-backed nutrient targets, and recommends meals that can genuinely help — all on a student budget.

Built for the Northeastern University Hackathon (March 2026).

## How It Works

1. **Tell us how you feel** — free-text or voice input describing your mood
2. **AI analyzes your emotional state** — Gemini 2.0 Flash maps input to one of five clinical mood states (high-stress, cognitive-fatigue, depressive, poor-focus, burnout)
3. **Nutrient targeting** — each clinical state maps to specific nutrients backed by nutritional psychiatry research (e.g., stressed → magnesium, zinc, B6 for HPA axis modulation)
4. **Meal recommendations** — curated + API meals filtered by your dietary preference, allergies, and nutrient profile
5. **Grocery list + pantry tracking** — plan meals, generate shopping lists, mark items as shopped

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, React 19) |
| Language | TypeScript 5 |
| Styling | CSS Modules (custom design system) |
| AI | Google Gemini 2.0 Flash (`@google/generative-ai`) |
| Auth & DB | Supabase (Auth + Postgres with RLS) |
| Testing | Jest + React Testing Library |
| Voice Input | Web Speech API |
| Calendar | Google Calendar API |

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── page.tsx            # Landing page (Hero, HowItWorks, TheScience, CTA)
│   ├── api/
│   │   ├── analyze-mood/   # Gemini AI mood analysis endpoint
│   │   ├── meals/          # Dynamic meal search (Spoonacular)
│   │   ├── recipes/        # Recipe details
│   │   └── calendar/google/# Google Calendar event import
│   ├── app/                # Authenticated app shell
│   │   ├── page.tsx        # Dashboard (MoodInput + MealLibrary)
│   │   ├── calendar/       # Meal calendar planning
│   │   ├── grocery/        # Grocery list from selected meals
│   │   ├── journal/        # Mood journal history
│   │   ├── pantry/         # Pantry management by category
│   │   └── profile/        # User profile (diet, allergies)
│   └── auth/callback/      # Supabase OAuth callback
│
├── components/             # 27 React components (all .tsx + .module.css)
├── context/                # 8 context providers (localStorage-persisted)
│   ├── UserContext.tsx      # Auth state, profile, preferences
│   ├── MoodContext.tsx      # Emotion analysis, dietary mode
│   ├── JournalContext.tsx   # Mood journal entries
│   ├── PantryContext.tsx    # Pantry items by category
│   ├── GroceryContext.tsx   # Selected meals for grocery list
│   ├── MealCalendarContext  # Meal calendar planning
│   ├── StressCalendarContext# Stress events + interventions
│   └── ReflectionContext    # Post-meal reflection prompts
│
├── data/
│   ├── meals.ts            # 12 curated meals (4 veg, 4 non-veg, 4 vegan)
│   ├── mood-nutrient-map.ts# Clinical mood → nutrient mappings
│   ├── glossary.ts         # Nutrient/term definitions
│   ├── budgetTips.ts       # Seattle-specific budget tips
│   └── usda-nutrients.ts   # USDA nutrient reference data
│
├── lib/supabase/           # Supabase client, server, and middleware helpers
├── utils/                  # Heuristic fallback engine (when Gemini is unavailable)
└── types/index.ts          # Shared TypeScript types
```

## Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn

### Installation

```bash
git clone https://github.com/rohanjoshi1399/MoodMeals.git
cd MoodMeals
npm install
```

### Environment Variables

Create `.env.local` in the project root:

```env
# Gemini AI (required for AI mood analysis; falls back to heuristic engine without it)
GEMINI_API_KEY=your_gemini_api_key

# Supabase (optional — app works in guest/localStorage mode without these)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Run Tests

```bash
npm test
npm run test:coverage
```

## Database Setup (Supabase)

Supabase is **optional**. Without it, the app runs entirely with localStorage (guest mode). To enable Google OAuth and cloud persistence:

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Copy the **Project URL** and **anon/public key** into `.env.local`

### 2. Run the Schema

Open the Supabase SQL Editor and run the contents of `src/lib/schema.sql`. This creates five tables with Row Level Security:

| Table | Purpose |
|-------|---------|
| `user_profiles` | Name, allergies, dietary preference (extends `auth.users`) |
| `journal_entries` | Mood check-in history per user |
| `calendar_events` | Stress events (exams, deadlines, etc.) |
| `pantry_items` | Pantry inventory with quantities |
| `meal_calendar` | Planned meals by date |

All tables have RLS policies so users can only access their own data.

### 3. Configure Google OAuth

1. In Supabase Dashboard, go to **Authentication > Providers > Google**
2. Enable Google provider
3. Create OAuth credentials in [Google Cloud Console](https://console.cloud.google.com/apis/credentials):
   - Application type: **Web application**
   - Authorized redirect URI: `https://<your-supabase-project>.supabase.co/auth/v1/callback`
4. Copy the **Client ID** and **Client Secret** into Supabase's Google provider settings
5. Under **OAuth Scopes**, the app requests `calendar.readonly` for Google Calendar integration

### 4. (Optional) Google Calendar Integration

The app can import upcoming events from Google Calendar to predict stress and suggest pre-event meals. This uses the `calendar.readonly` scope requested during Google OAuth sign-in. No additional setup is needed beyond enabling Google OAuth above.

## Architecture

### AI Pipeline

```
User Input → Sanitization (HTML strip, injection filter, length cap)
           → Gemini 2.0 Flash (4-step agentic prompt)
           │   1. Semantic Analysis (emotions, constraints, preferences)
           │   2. Clinical Mapping (mood → clinical state → nutrients)
           │   3. Filter Recommendation (meal type, cook time, diet focus)
           │   4. Contextual Insight (neuroscience explanation)
           → Validation (emotion, intensity, recommendedMoods checks)
           → Fallback: local heuristic engine (keyword → nutrient mapping)
```

### Clinical Mood States

| State | Trigger Emotions | Target Nutrients | Mechanism |
|-------|-----------------|------------------|-----------|
| High Stress | stressed, anxious | Magnesium, Zinc, B6 | HPA axis modulation, GABA production |
| Cognitive Fatigue | tired, exhausted | Iron, B12, DHA | O2 transport, membrane fluidity |
| Depressive | sad, down | Tryptophan, Folate, Vitamin D | Serotonin/dopamine precursors |
| Poor Focus | unfocused, scattered | Choline, Iron, Tyrosine | Dopamine signaling |
| Burnout | burned out, overwhelmed | Magnesium, Vitamin C, B-complex | ROS neutralization, adrenal support |

### Stress Intervention System

When the user connects Google Calendar or manually adds events, the app:
1. Scans events within a 72-hour horizon
2. Classifies event type (exam, deadline, presentation, meeting)
3. Calculates optimal pre-event meal timing (2-4 hours before)
4. Suggests nutrient-targeted meals with clinical reasoning

### Design System

- **Palette**: Sage green (`#5f8a6e`), cream (`#fdfaf4`), coral accents — de-saturated to reduce cognitive load during distress
- **Typography**: Plus Jakarta Sans (body), Lora (headings)
- **Adaptive UI**: Gentle mode activates for high-stress/depressive states (hides secondary features, reduces visual noise)
- **Mobile breakpoint**: 640px, with bottom navigation for app pages

## Feature Map

### Implemented

- AI mood analysis with Gemini 2.0 Flash + heuristic fallback
- 5 clinical mood states with nutrient-targeted meal recommendations
- 12 curated meals (veg/non-veg/vegan) with full ingredient lists and nutrient profiles
- Dynamic meal search via Spoonacular API
- Dietary preference filtering (veg, non-veg, vegan) and allergen exclusion
- Grocery list with meal prep multipliers, servings control, and budget estimates
- Pantry management with fuzzy ingredient matching and quantity tracking
- Mood journal with auto-logging and deduplication
- Meal calendar planning (drag meals to dates)
- Google Calendar stress event import and proactive meal interventions
- Post-meal reflection prompts (triggered 2 hours after meal selection)
- Wellness progress milestones (non-punitive, cumulative)
- Voice input via Web Speech API
- Seattle-specific budget tips (Grocery Outlet, Uwajimaya, QFC discounts, food banks)
- Sustain/Wind-down mode for positive emotional states
- Dark mode support
- PWA-ready with service worker
- Guest mode (full functionality without sign-up)
- Google OAuth with Supabase (cloud sync across devices)

### Future Scope

- **Canvas LMS Integration** — Import assignment deadlines and exam schedules from Northeastern's Canvas API to predict stress 48-72 hours ahead and suggest preparatory meals automatically
- **Wearable Data Integration** — Connect with Apple Health / Google Fit for sleep quality, heart rate variability, and activity data to refine mood predictions beyond self-reporting
- **Personalized ML Model** — Train a per-user model on journal history to learn individual mood-food correlations (e.g., "salmon consistently improves your focus scores")
- **Social Meal Planning** — Shared grocery lists and meal coordination for roommates, splitting costs and reducing food waste
- **Recipe Generation** — Use LLM to generate novel recipes targeting specific nutrient profiles from available pantry ingredients
- **Expanded University Support** — Generalize campus-specific budget features beyond Seattle (dining hall menus, local grocery deals, food bank schedules per university)
- **Nutritionist Review Mode** — Allow campus nutritionists to review anonymized mood-meal patterns and provide cohort-level dietary guidance
- **Multi-language Support** — Internationalized UI and meal recommendations for diverse student populations
- **Offline-First Architecture** — Full offline support with background sync when connectivity returns (currently localStorage-only in guest mode)
- **Notification System** — Push notifications for upcoming stress events, reflection prompts, and pantry expiry reminders

## Team

Built by Team MoodMeals at Northeastern University, Seattle Campus.

## License

This project was built for the Northeastern University Hackathon (March 2026).
