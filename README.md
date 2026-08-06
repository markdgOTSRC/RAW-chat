# Study — a simple Claude chat site

A small, self-hosted chat interface for Claude. Static frontend, one secure
serverless function for the actual API call — no login, no database, no
framework build step.

## Why this isn't *just* GitHub Pages

GitHub Pages only serves static files — it can't run backend code. If your
Anthropic API key lived in the browser JavaScript, anyone could open dev
tools, copy it, and run up charges on your account. So this project keeps
your code in GitHub, but deploys through **Cloudflare Pages**, which:

- serves the static site (`index.html`, `assets/`) exactly like GitHub Pages would
- also runs the one small serverless function in `functions/api/chat.js`
- keeps your API key as a server-side secret, never sent to the browser
- deploys automatically every time you push to GitHub
- is free for this use case

You still get "push to GitHub → it's live" — there's just one extra
one-time step to connect the repo to Cloudflare.

## 1. Get an Anthropic API key

1. Go to [console.anthropic.com](https://console.anthropic.com) and sign in (or create an account).
2. Go to **API Keys** → **Create Key**.
3. Copy the key (starts with `sk-ant-...`). You won't be able to see it again, so save it somewhere safe for now.
4. Add a small amount of credit under **Billing** — this key is billed per use, separate from any claude.ai subscription.

## 2. Push this project to GitHub

```bash
cd study-chat
git init
git add .
git commit -m "Initial commit"
gh repo create study-chat --public --source=. --push
# or, without the GitHub CLI:
# create a new repo on github.com, then:
# git remote add origin https://github.com/YOUR_USERNAME/study-chat.git
# git branch -M main
# git push -u origin main
```

## 3. Deploy on Cloudflare Pages

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Select the repo you just pushed.
3. Build settings: leave **everything default** — no build command, no output directory needed (this is plain HTML/CSS/JS with a `functions/` folder, which Cloudflare Pages picks up automatically).
4. Before the first deploy finishes, go to **Settings → Environment variables** on the Pages project.
5. Add a variable:
   - Name: `ANTHROPIC_API_KEY`
   - Value: the key from step 1
   - Type: **Secret** (not "Plaintext")
   - Apply to both **Production** and **Preview**.
6. Click **Deploy**. Cloudflare gives you a `*.pages.dev` URL — that's your live chat site.

Every future `git push` to `main` redeploys automatically.

### Optional: custom domain

In the Pages project, go to **Custom domains** → **Set up a custom domain**
and follow the prompts if you want something nicer than `*.pages.dev`.

## 4. Test it locally (optional)

```bash
npm install -g wrangler
cp .env.example .env    # then fill in your real key
wrangler pages dev . --binding-path=.env
```

Open the printed `localhost` URL — the function runs locally the same way it will in production.

## What's here

```
index.html            the page itself
assets/style.css       styling
assets/script.js       chat logic — sends messages to /api/chat, renders replies
functions/api/chat.js   the ONLY place the API key is used — runs server-side
.env.example           template for local testing
```

## Notes on what's intentionally left out

- **No login.** Anyone with the URL can use it and it'll bill your API key. Fine for a private/internal link now — see below if you want to lock it down later.
- **No knowledge base grounding.** This is a general-purpose Claude chat, not wired to any particular content.
- **Conversation history** is kept in the browser's `localStorage` only — it's per-device, not synced anywhere, and clears if you use the trash icon or clear site data.

## Adding a password later (if you want it)

The simplest version: add a `SITE_PASSWORD` environment variable and check
it in `functions/api/chat.js` (reject the request with 401 if a header
doesn't match). That's a ~10-line change whenever you're ready — just say
the word.

## Cost

You're billed by Anthropic per token, not per month — there's no
subscription tied to this site. Typical short chat exchanges cost a small
fraction of a cent each on Claude Sonnet. Keep an eye on
console.anthropic.com → Usage if you share the link with a team.
