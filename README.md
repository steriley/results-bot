# Results Bot — Beat the AI at predicting EPL scores

This repository is a small, playful web app that challenges you to beat an AI at predicting English Premier League (EPL) match scores.

Players submit score predictions for upcoming matches and compete against an automated model that makes its own predictions. Track leaderboards, compare human vs. machine performance, and see detailed stats about accuracy and deviation.

## What this repo contains

- The frontend app built with Astro (pages live under `src/pages`).
- Reusable UI in `src/components` (leaderboard, predictions UI, stats).
- Small helpers in `src/helpers` for fetching odds and AI predictions.
- Mock data for local testing under `src/mocks`.

## Quick start (development)

Run these from the project root:

```bash
pnpm install
pnpm dev
```

Open http://localhost:4321 to play locally.

Build for production:

```bash
pnpm build
pnpm preview
```

## Local configuration

- Create a `.env` file for any provider keys (for example, `ODDS_API_KEY`). Example:

```env
ODDS_API_KEY=your_api_key_here
```

Do not commit `.env` — it is already ignored by `.gitignore`.

## How to play

1. Open the app and make your score predictions for upcoming EPL fixtures.
2. The AI will predict the same fixtures; scores and points are compared on the leaderboard.
3. Try to outperform the model over a gameweek or an entire season.

## Contributing

- Tweak UI components in `src/components`.
- Update the prediction logic in `src/helpers/prediction-engine.ts`.
- Add tests or CI checks in the project root.

If you find any sensitive keys accidentally committed, rotate them immediately and use a history-cleaning tool if needed.

Have fun beating the bot — and good luck!
