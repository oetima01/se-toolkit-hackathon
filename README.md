# Personal Memory Card Generator

A web app for creating flashcard sets with progressive review modes and session analytics.

---

## Demo

### Create Card Set
![Create Cards](https://via.placeholder.com/800x450/e9ecef/495057?text=Create+Card+Set+—+Add+Q%26A+cards)

### Review Cards
![Review Cards](https://via.placeholder.com/800x450/e9ecef/495057?text=Review+Cards+—+Flip+%7C+Choose+%7C+Type)

### Session Analytics
![Analytics](https://via.placeholder.com/800x450/e9ecef/495057?text=Session+Analytics+—+History+%26+Progress)

---

## Product Context

### End Users

Students and anyone who needs to memorize information and test their recall — language learners, exam preppers, professionals studying certifications.

### Problem

Manually creating flashcards is time-consuming, and existing tools don't track progress across multiple study sessions. Users need a simple way to create card sets, review them with increasing difficulty, and see how their knowledge improves over time.

### Solution

A web app where users create flashcard sets, review them in three progressively harder modes (flip → choose → type), and track their progress across sessions. Incorrect cards trigger an automatic re-review round so nothing is forgotten.

---

## Features

### Implemented

- **Card set creation** — add Q&A pairs, save to database
- **Three review levels:**
  - **Flip Cards** — click to reveal, self-rate ✓/✗
  - **Choose Answer** — pick the correct answer from 2 options
  - **Type Answer** — write your answer, auto-checked with Levenshtein similarity
- **Two-round system** — incorrect cards from Round 1 automatically trigger Round 2 re-review
- **Card statistics** — correct/incorrect count and accuracy % per card
- **Spaced repetition** — "Study Mode" prioritizes weakest cards first
- **Session analytics** — per-card results, last 5 sessions history, comparison with previous accuracy
- **Set analysis** — view session history for any set before reviewing
- **Docker deployment** — frontend (Nginx) + backend (Node.js) in containers

### Not Yet Implemented

- User authentication and multi-user support
- Cloud-synced card sets across devices
- AI-assisted card generation from a topic
- Mobile app version
- Card sharing / community marketplace
- Export cards as PDF or CSV

---

## Usage

1. Open the app at `http://localhost:3000`
2. Go to **Create New Set** — enter a set name and add Q&A cards
3. Click **Save Set to Database** to persist your set
4. Go to **My Sets** — click a set name to review, or 📊 **Analysis** to see past sessions
5. Choose a review mode: Flip Cards, Choose Answer, or Type Answer
6. Review all cards → incorrect cards trigger Round 2 automatically
7. After session completes, view your results and compare with previous sessions

---

## Deployment

### Prerequisites

- **OS:** Ubuntu 24.04 LTS (or any Linux distribution with Docker support)
- **What should be installed:**
  - Docker (24.0+)
  - Docker Compose (v2.0+)

### Step-by-Step Deployment

#### 1. Clone the Repository

```bash
git clone https://github.com/oetima01/se-toolkit-hackathon
cd inno-toolkit-Hackathon
```

#### 2. Build and Start

```bash
sudo docker compose up --build -d
```

#### 3. Access the App

Open your browser and navigate to:

```
http://<YOUR_VM_IP>:3000
```

#### 4. Verify It's Running

```bash
sudo docker compose ps
```

Expected output:
```
NAME                   STATUS          PORTS
memory-card-backend    Up              3001/tcp
memory-card-frontend   Up              0.0.0.0:3000->80/tcp
```

#### 5. Stop the App

```bash
sudo docker compose down
```

#### 6. View Logs

```bash
sudo docker compose logs -f
```

### Notes

- The SQLite database is stored in `backend/data/` and persisted via Docker volume
- Nginx acts as a reverse proxy, forwarding `/api/*` requests to the backend
- No additional configuration is needed — the app works out of the box
