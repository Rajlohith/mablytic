# MABlytic

> A Full-Stack Advertisement Recommendation Platform featuring Personalized Ad Delivery, Real-Time Analytics, Progressive Web App Support, A/B Testing, and Multi-Armed Bandit Learning.

MABlytic is a modern advertisement recommendation system that demonstrates the complete lifecycle of personalized advertising. The platform combines user profiling, advertisement targeting, interaction tracking, analytics, and reinforcement learning concepts into a deployable full-stack web application.

The system currently utilizes user preference matching and Thompson Sampling based Multi-Armed Bandit learning to improve advertisement selection through user engagement data.

## Live Demo

**Website:** https://mablytic.web.app

**Repository:** https://github.com/Rajlohith/mablytic

## Overview

MABlytic was designed to explore how recommendation systems can improve advertisement relevance and engagement while providing a practical implementation of:

* Personalized Advertisement Delivery
* User Preference Modeling
* Click Through Rate Analytics
* A/B Advertisement Testing
* Progressive Web Applications
* Push Notifications
* Multi-Armed Bandit Learning
* Thompson Sampling

The project serves as both a production-ready web application and a research platform for studying adaptive recommendation systems.

## Key Features

### User Management

* User Registration
* Secure Authentication
* User Profiles
* Interest-Based Preferences

### Advertisement Recommendation

* Category-Based Ad Matching
* Personalized Feed Generation
* User Preference Filtering
* Thompson Sampling Ad Selection

### Analytics

* Advertisement View Tracking
* Advertisement Click Tracking
* CTR Calculation
* Performance Monitoring

### Administration

* User Management Dashboard
* Advertisement Management
* Analytics Dashboard
* Historical Interaction Logs

### Progressive Web App

* Installable Application
* Service Worker Support
* Offline Capability
* App Manifest
* Responsive Design
* Push Notifications

### Deployment

* Firebase Hosting Support
* Render Deployment Support
* Neon PostgreSQL Integration
* GitHub Actions Workflow

## Technology Stack

| Layer                  | Technology                             |
| ---------------------- | -------------------------------------- |
| Backend Framework      | FastAPI                                |
| Programming Language   | Python 3.11                            |
| ORM                    | SQLAlchemy                             |
| Database (Development) | SQLite                                 |
| Database (Production)  | PostgreSQL (Neon)                      |
| Frontend               | HTML5                                  |
| Styling                | Tailwind CSS + CSS3                    |
| Client Logic           | Vanilla JavaScript (ES6+)              |
| Authentication         | SHA-256 Password Hashing               |
| Recommendation Engine  | Thompson Sampling (Multi-Armed Bandit) |
| Analytics              | CTR Tracking & Interaction Logging     |
| Progressive Web App    | Service Worker + Web App Manifest      |
| Cloud Database         | Neon PostgreSQL                        |
| Frontend Hosting       | Firebase Hosting                       |
| Backend Hosting        | Render                                 |
| CI/CD                  | GitHub Actions                         |
| Version Control        | Git & GitHub                           |

## System Architecture

```text
                         +------------------+
                         |      Users       |
                         +--------+---------+
                                  |
                                  v
                     +--------------------------+
                     |      Frontend PWA        |
                     | HTML / CSS / JavaScript  |
                     +------------+-------------+
                                  |
                                  v
                     +--------------------------+
                     |      FastAPI Backend     |
                     +------------+-------------+
                                  |
          +-----------------------+-----------------------+
          |                                               |
          v                                               v

+----------------------+                   +----------------------+
| Recommendation Engine|                   | Analytics Engine     |
| Preference Matching  |                   | CTR Tracking         |
| Thompson Sampling    |                   | Performance Metrics  |
+----------------------+                   +----------------------+
          |                                               |
          +-----------------------+-----------------------+
                                  |
                                  v

                     +--------------------------+
                     | SQLite / PostgreSQL DB   |
                     +--------------------------+
```

## Production Deployment Architecture

```text
                    +----------------------+
                    |       Users          |
                    +----------+-----------+
                               |
                               v
                    +----------------------+
                    |  Firebase Hosting    |
                    |    Frontend PWA      |
                    +----------+-----------+
                               |
                               v
                    +----------------------+
                    |      Render          |
                    |   FastAPI Backend    |
                    +----------+-----------+
                               |
                               v
                    +----------------------+
                    | Neon PostgreSQL      |
                    | Persistent Database  |
                    +----------------------+
```

### Infrastructure

| Component        | Service          |
| ---------------- | ---------------- |
| Frontend Hosting | Firebase Hosting |
| Backend Hosting  | Render           |
| Database         | Neon PostgreSQL  |
| CI/CD            | GitHub Actions   |
| Version Control  | GitHub           |

### Why Neon PostgreSQL?

MABlytic uses SQLite during local development and Neon PostgreSQL in production.

Since Render instances use ephemeral storage, local SQLite databases do not persist across service restarts or redeployments. To ensure reliable data persistence and production scalability, Neon PostgreSQL is used as the primary cloud database.

Benefits include:

* Persistent cloud storage
* PostgreSQL compatibility
* Automatic backups
* High availability
* Production-grade reliability

## Repository Structure

```text
mablytic/
│
├── .github/
│   └── workflows/
│       ├── firebase-hosting-merge.yml
│       └── firebase-hosting-pull-request.yml
│
├── backend/
│   ├── __init__.py
│   ├── ad_serving.py
│   ├── database.py
│   ├── main.py
│   ├── models.py
│   ├── schemas.py
│   ├── seed_data.py
│   ├── requirements.txt
│   └── ad_recommender.db
│
├── frontend/
│   ├── icons/
│   │   ├── icon-72.png
│   │   ├── icon-96.png
│   │   ├── icon-128.png
│   │   ├── icon-144.png
│   │   ├── icon-152.png
│   │   ├── icon-192.png
│   │   ├── icon-384.png
│   │   └── icon-512.png
│   │
│   ├── 404.html
│   ├── admin.html
│   ├── app.js
│   ├── feed.html
│   ├── icon_generator.html
│   ├── index.html
│   ├── manifest.json
│   ├── register.html
│   ├── robots.txt
│   ├── style.css
│   └── sw.js
│
├── .firebaserc
├── .gitignore
├── firebase.json
├── LICENSE
├── README.md
├── requirements.txt
└── skills-lock.json
```

## Recommendation Pipeline

### Current Workflow

1. User registers an account.
2. User selects personal interests.
3. Preferences are stored in the database.
4. Advertisements are categorized by topic.
5. Matching advertisements are identified.
6. Thompson Sampling evaluates candidate advertisements.
7. Advertisement is delivered to the user.
8. Views and clicks are recorded.
9. Analytics engine updates performance metrics.
10. Future recommendations adapt using engagement history.

## Thompson Sampling Implementation

MABlytic incorporates Multi-Armed Bandit learning through Thompson Sampling.

### Objective

Maximize user engagement while continuously learning advertisement effectiveness.

### Reward Model

```text
Click               → Success
View Without Click  → Failure
```

### Beta Distribution

```text
Beta(α, β)

α = Clicks + 1
β = Failures + 1
```

For every advertisement, a probability distribution is maintained.

Advertisements with higher expected engagement gradually receive more exposure while still allowing exploration of new advertisements.

## Database Design

### Users

| Column        | Description           |
| ------------- | --------------------- |
| id            | Primary Key           |
| username      | Unique Username       |
| email         | User Email            |
| age           | User Age              |
| gender        | User Gender           |
| preferences   | User Interests        |
| password_hash | SHA-256 Password Hash |

### Advertisements

| Column   | Description            |
| -------- | ---------------------- |
| id       | Primary Key            |
| title    | Advertisement Title    |
| category | Advertisement Category |
| variant  | A/B Testing Variant    |

### Interactions

| Column           | Description             |
| ---------------- | ----------------------- |
| id               | Primary Key             |
| user_id          | User Reference          |
| ad_id            | Advertisement Reference |
| interaction_type | View or Click           |
| timestamp        | Event Timestamp         |

## Installation

### Backend

```bash
cd backend

pip install -r requirements.txt

uvicorn main:app --reload --port 8000
```

Populate sample data:

```bash
python seed_data.py
```

Backend URL:

```text
http://127.0.0.1:8000
```

API Documentation:

```text
http://127.0.0.1:8000/docs
```

### Frontend

```bash
cd frontend

python -m http.server 8081
```

Frontend URL:

```text
http://127.0.0.1:8081
```

## Demo Accounts

| Role  | Username | Password |
| ----- | -------- | -------- |
| Admin | admin    | Admin123 |
| User  | alice    | Tech12   |
| User  | bobfit   | Fit456   |
| User  | carol    | Food78   |
| User  | davidg   | Game12   |
| User  | emmaed   | Book34   |

## Progressive Web App Features

* Installable Web Application
* Offline Access
* Service Worker Support
* Application Manifest
* Background Caching
* Push Notifications
* Mobile-Friendly Design
* App Shortcuts

## Deployment

### Frontend

Firebase Hosting

```bash
firebase deploy --only hosting
```

### Backend

Render Deployment

### Database

Neon PostgreSQL

Production Architecture:

```text
Firebase Hosting
        │
        ▼
Render FastAPI Backend
        │
        ▼
Neon PostgreSQL
```

## Project Evolution

### Initial Development

* Backend API Structure
* SQLAlchemy Models
* Authentication System
* CRUD Operations

### User Experience Improvements

* Login System
* Registration Workflow
* Personalized Feed
* Admin Dashboard

### Progressive Web App

* Manifest Configuration
* Service Worker Integration
* Offline Support
* Installability

### Cloud Deployment

* Firebase Hosting
* Render Backend
* Neon PostgreSQL Integration
* Production API Integration

### Recommendation Engine

* Preference Matching
* Advertisement Analytics
* Thompson Sampling
* Multi-Armed Bandit Learning

## Notable Milestones

* Full FastAPI Backend Architecture
* Progressive Web App Support
* Firebase Hosting Integration
* Render Backend Deployment
* Neon PostgreSQL Integration
* PostgreSQL Compatibility
* Thompson Sampling Integration
* Multi-Armed Bandit Recommendation Engine
* Advertisement Analytics Dashboard
* Automated Firebase Deployment Workflows

## Research Applications

This project can be used to study:

* Recommendation Systems
* Multi-Armed Bandits
* Reinforcement Learning
* Online Learning Algorithms
* Click Through Rate Optimization
* User Personalization
* Digital Advertising Platforms

## License

Licensed under the Apache License 2.0.

## Links

Website:
https://mablytic.web.app

Repository:
https://github.com/Rajlohith/mablytic
