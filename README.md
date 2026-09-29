# Sevenfold

A seven-letter word game for one player or a room of friends. Everyone in a room shares the same secret word. You get eight guesses. Fewest guesses wins, and an equal score shares the win.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:43123](http://localhost:43123).

No accounts and no API keys. Rooms live in the server process and clear when it stops, or after 12 hours without anyone in them.

`npm run dev` listens on all interfaces, so friends on the same network can join at `http://<your-lan-ip>:43123`.

## How to play

1. Enter a display name and create a room, or join with a 4-character code.
2. Guess a 7-letter word. Type it or tap the on-screen keys, then press Enter.
3. Each guess is marked like classic Wordle:
   - **Green** — right letter, right place.
   - **Yellow (marigold)** — the letter is in the word, wrong place.
   - **Gray (slate)** — the letter is not in the word.
4. Duplicate letters are counted. Greens are claimed first. If the secret has one L and you guess two, only one L lights up.
5. Solve it in eight guesses or fewer. The winner is whoever used the fewest guesses. Two people who solve in the same number share the win.
6. Miss all eight and you are out. You still show on that room's standings.
7. The host can deal a new word. If anyone is still guessing, Sevenfold asks first.

The secret stays on the server until you solve the word or run out of guesses. Other players' letters are not shown, so a neighbor's board cannot give the word away. The standings show names, progress, and scores.

## Multiplayer

- **Create a room** and share the code, or the room link (the code chip copies it).
- **Join** with the same code and a display name. Late arrivals play the current word.
- Up to 12 players. Each person has their own board and eight guesses.
- The room updates about once a second.
- A room is only as shared as the server you started. Two people must open the same running app.

Playing alone is the same flow: create a room and guess. You are the host, so you can deal another word when you want one.

## Word lists

- `data/answers.txt` — about 1,300 common 7-letter secret words.
- `data/guesses.txt` — about 6,000 accepted guesses, including every answer.

Both lists are in the repo. Regenerate them with `npm run words` (it downloads public word-frequency and dictionary sources). Person names are kept out of the secret list. A short blocklist keeps slurs out of both lists.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server on port 43123 |
| `npm test` | Scoring, standings, word lists, and room rules |
| `npm run lint` | ESLint |
| `npm run words` | Rebuild the word lists |
