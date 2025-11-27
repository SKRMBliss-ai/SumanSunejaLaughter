<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1N229CQXHa6739x7-JbBOoFLqyNWZi6Ga

## Deployment

**Live App URL:** https://sumansuneja-laughterhub1-498377085294.me-central1.run.app

The app is deployed on Google Cloud Run using Google Cloud Build. The deployment configuration is in `cloudbuild.yaml`.

- **Service Name:** `sumansuneja-laughterhub1`
- **Region:** `me-central1`
- **Build Console:** https://console.cloud.google.com/cloud-build/builds?project=sumansunejalaughter-178eb

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
