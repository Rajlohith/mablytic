# Personalized Ad Recommender PWA

A full-stack Progressive Web Application (PWA) that delivers personalized advertisements based on user preferences, tracks user interactions (views and clicks), and supports A/B testing for future machine learning integration such as Multi-Armed Bandits.


## Overview

This project demonstrates a complete pipeline for serving targeted advertisements:

- A FastAPI backend that manages users, ads, and interaction tracking
- A lightweight frontend PWA that fetches and displays ads
- A rule-based recommendation system based on user preferences
- A/B testing support via multiple ad variants
- Data collection for future analytics and machine learning models


## Features

- Installable Progressive Web App with offline support
- Rule-based ad recommendation system
- A/B testing with multiple ad variants
- Automatic tracking of ad impressions (views) and clicks
- Interactive API documentation using Swagger UI
- Lightweight and easy-to-run local setup


## Tech Stack

### Backend
- Python 3.x
- FastAPI
- SQLAlchemy
- SQLite
- Uvicorn

### Frontend
- HTML5
- CSS3
- Vanilla JavaScript (ES6+)
- Service Workers
- Web App Manifest


## Project Structure

```text
personalized-ad-pwa/
│
├── backend/                  # Python FastAPI Server
│   ├── main.py               # API Endpoints & Logic
│   ├── database.py           # SQLAlchemy Connection
│   ├── models.py             # Database Tables
│   ├── schemas.py            # Pydantic Data Models
│   ├── requirements.txt      # Dependencies
│   └── ad_recommender.db     # SQLite Database File
│
└── frontend/                 # PWA Frontend
    ├── index.html            # Main App Shell
    ├── style.css             # Styling
    ├── app.js                # API Logic & Tracking
    ├── manifest.json         # PWA Metadata
    └── sw.js                 # Service Worker
```


## Installation and Setup

Install dependencies:

```bash
pip install -r requirements.txt
```

Run the backend and frontend in separate terminal windows.


### Backend Setup

1. Navigate to the backend directory:

```bash
cd backend
```

2. Start the FastAPI server:

```bash
uvicorn main:app --reload
```

3. Access the backend:

```bash
http://127.0.0.1:8000
```

4. API documentation (Swagger UI):

```bash
http://127.0.0.1:8000/docs
```

### Frontend Setup

1. Open a new terminal and navigate to the frontend directory:

```bash
cd frontend
```

2. Start a local server:

```bash
python -m http.server 8081
```

3. Access the frontend application:

```bash
http://127.0.0.1:8081
```


## Usage Guide

1. Seed the Database

Open Swagger UI at:

```bash
http://127.0.0.1:8000/docs
```

Use POST endpoints to:

- Create a user with preferences (e.g., "tech", "gaming")
- Create multiple advertisements with different variants



2. Run the Application

Open the frontend in your browser:

```bash
http://127.0.0.1:8081
```



3. Interact with the System

- The application automatically:
    - Fetches ads based on user preferences
    - Logs a "view" event when an ad is displayed
- Clicking the "Learn More" button logs a "click" event

4. Verify Data Tracking
- Use GET endpoints in Swagger UI to inspect:
    - Users
    - Ads
    - Interaction logs
- Alternatively, inspect the SQLite database file:

```bash
backend/ad_recommender.db
```