# 🚨 HOW TO FIX THE VERCEL AUTO-DEPLOY 🚨

Currently, Vercel is NOT auto-deploying when you push to GitHub. This happens because the Vercel project is connected to the wrong GitHub repository.

### TO FIX THIS PERMANENTLY:
1. Go to your [Vercel Dashboard](https://vercel.com).
2. Open the **iConnect** project -> Click **Settings** -> Click **Git**.
3. Scroll to "Connected Repository".
4. Click **Disconnect**.
5. Re-connect it to your actual repository: `https://github.com/ayushcorextend-sudo/iconnect-deployment.git`.

Once you do this, you won't need to run manual deploy commands anymore. Vercel will automatically update every time you run `git push`.

---

## 🚀 MANUAL DEPLOY (While the webhook is broken)

From the `frontend/` directory, run:

```bash
# Push to GitHub + force Vercel deploy in one command:
npm run ship

# Or just force Vercel deploy without a git push:
npm run deploy:prod
```

---

## 📋 DEPLOYMENT CHECKLIST

- [x] Vercel project: `iconnect-med` (ayushcorextend-sudos-projects)
- [x] Production URL: https://iconnect-med.vercel.app
- [x] GitHub repo: https://github.com/ayushcorextend-sudo/iconnect-deployment.git
- [ ] **ACTION NEEDED**: Reconnect GitHub webhook in Vercel Dashboard → Settings → Git
