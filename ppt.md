# MABlytic: Personalized Ad Recommendation Platform
*Comprehensive Technical Analysis, Documentation, and Presentation Guide*

---

## 1. Project Summary

*   **Project Title**: MABlytic
*   **One-line Description**: A full-stack, installable advertisement recommendation platform combining user profiling, ad targeting, real-time analytics, A/B testing, and Thompson Sampling-based Multi-Armed Bandit reinforcement learning.
*   **Problem Statement**: Digital advertising environments must continuously balance *exploitation* (serving ads with known high click-through rates to maximize immediate revenue) and *exploration* (serving newer or less-tested ads to gather user engagement statistics), while simultaneously providing personalization based on user-defined preferences, handling device/network offline states, and tracking real-time client interaction logs.
*   **Objective**: To design, implement, and deploy a responsive, service-worker-enabled web application that recommends highly relevant ads using Thompson Sampling, captures user views and clicks in real-time, displays live metrics on an administrative dashboard, and supports complete offline capability.
*   **Target Users**: 
    1.  **End-Users**: Consumers seeking relevant, personalized advertisement feeds aligned with their dynamic interests without experiencing high latency or layout disruptions.
    2.  **Platform Admins**: Marketing campaign managers and system operators who need to monitor ad click-through rates (CTR), control ad inventories, and analyze persona-based user groups.
    3.  **Reinforcement Learning Researchers**: Researchers studying real-world applications of online adaptive algorithms (Thompson Sampling) and A/B test variant tracking.
*   **Overall Project Workflow**:
    1.  **Registration & Profiling**: A user creates an account via [register.html](file:///c:/Users/akgam/OneDrive/Desktop/Dev/mablytic/mablytic/frontend/register.html) specifying credentials, demographics, and multi-select interests.
    2.  **Authentication**: The user logs in via [index.html](file:///c:/Users/akgam/OneDrive/Desktop/Dev/mablytic/mablytic/frontend/index.html). The login session is cached locally in `localStorage` as a JSON object.
    3.  **Feed Loading**: The user opens [feed.html](file:///c:/Users/akgam/OneDrive/Desktop/Dev/mablytic/mablytic/frontend/feed.html). The frontend sends a GET request to `/serve-ad/{user_id}` on the FastAPI backend [main.py](file:///c:/Users/akgam/OneDrive/Desktop/Dev/mablytic/mablytic/backend/main.py).
    4.  **Category Filtering & Bandit Scoring**: The backend filters the ad database [models.py](file:///c:/Users/akgam/OneDrive/Desktop/Dev/mablytic/mablytic/backend/models.py) to match user preferences. The class [ThompsonSamplingBandit](file:///c:/Users/akgam/OneDrive/Desktop/Dev/mablytic/mablytic/backend/ad_serving.py#L14) fetches views/clicks for candidates, draws a random score from `random.betavariate(alpha, beta)`, and returns the highest scorer.
    5.  **Impression Logging**: The frontend displays the ad and automatically fires a POST request to `/interactions/` logging a "view" interaction.
    6.  **Action Logging**: If the user clicks "Learn More", the frontend logs a "click" interaction via POST `/interactions/`, reveals a confirmation alert, and triggers an immediate reload of the ad slot.
    7.  **Admin Monitoring**: The admin logs in using credentials, redirects to [admin.html](file:///c:/Users/akgam/OneDrive/Desktop/Dev/mablytic/mablytic/frontend/admin.html), checks live system metrics (global CTR, user lists, active ads), logs custom test ads, inspects the interaction event stream, or executes test runs with the API Console.

---

## 2. Architecture

```
                          +-------------------------------+
                          |            Users              |
                          +---------------+---------------+
                                          |
                                          v
                    +---------------------v---------------------+
                    |          Firebase Hosting                 |
                    |            Frontend PWA                   |
                    |  (HTML5 / CSS3 / Vanilla ES6+ JS / PWA)   |
                    +---------------------+---------------------+
                                          |
                        HTTPS REST APIs   | (JSON payloads)
                                          v
                    +---------------------+---------------------+
                    |            Render Cloud                   |
                    |           FastAPI Backend                 |
                    | (Uvicorn / Pydantic / SQLAlchemy / PIL*)  |
                    +---+-----------------------------------+---+
                        |                                   |
                        v                                   v
             +----------+-----------+           +-----------+----------+
             | Recommendation Engine|           |   Analytics Engine   |
             |  Category Filtering  |           |     CTR Tracking     |
             |   Thompson Sampling  |           |   Event Stream Log   |
             +----------+-----------+           +-----------+----------+
                        |                                   |
                        +-----------------+-----------------+
                                          |
                               SQL Queries| (SQLAlchemy Core)
                                          v
                    +---------------------+---------------------+
                    |        Neon PostgreSQL Cloud              |
                    |      SQLite Local DB Fallback             |
                    +-------------------------------------------+
```

### Component Breakdown
*   **Frontend**: Implemented as standard static assets inside the [frontend](file:///c:/Users/akgam/OneDrive/Desktop/Dev/mablytic/mablytic/frontend) directory. Consists of multiple pages containing embedded CSS and vanilla JavaScript. Features a Web App Manifest ([manifest.json](file:///c:/Users/akgam/OneDrive/Desktop/Dev/mablytic/mablytic/frontend/manifest.json)) defining installability parameters and shortcuts, and a Service Worker ([sw.js](file:///c:/Users/akgam/OneDrive/Desktop/Dev/mablytic/mablytic/frontend/sw.js)) that implements caching rules: precaching structural pages, caching images using a cache-first strategy, and providing offline fallback ads for `/serve-ad/` calls.
*   **Backend**: A FastAPI application hosted on Render. API routing is configured in [main.py](file:///c:/Users/akgam/OneDrive/Desktop/Dev/mablytic/mablytic/backend/main.py). Database integrations are managed via SQLAlchemy in [database.py](file:///c:/Users/akgam/OneDrive/Desktop/Dev/mablytic/mablytic/backend/database.py). Request/response formats are structured using Pydantic schemas in [schemas.py](file:///c:/Users/akgam/OneDrive/Desktop/Dev/mablytic/mablytic/backend/schemas.py).
*   **Database**: The system leverages SQLAlchemy's dialect support. Locally, it writes to a file-based SQLite database [ad_recommender.db](file:///c:/Users/akgam/OneDrive/Desktop/Dev/mablytic/mablytic/backend/ad_recommender.db) to simplify development. In production, when `DATABASE_URL` is configured, it switches to Neon.tech serverless PostgreSQL. The connection settings enforce SSL (`sslmode=require`), connection pre-pings (`pool_pre_ping=True`), and low-timeout safeguards to prevent stalling.
*   **Data Flow**:
    1.  **Serve request**: The frontend calls `GET /serve-ad/{user_id}`.
    2.  **Preference retrieval**: The database retrieves user preference strings (e.g. `gaming,sports`) and normalizes them into an array.
    3.  **SQL Aggregation**: The backend queries the `interactions` table, grouping views and clicks for matching advertisements.
    4.  **Thompson Scoring**: In memory, the FastAPI process samples from a Beta distribution for each candidate.
    5.  **HTTP Response**: The ad with the maximum sample value is returned as a JSON object to the client.
    6.  **Interaction Logging**: Every interaction (view / click) is pushed back via a POST request to `/interactions/`, generating a row in the database.

---

## 3. Technology Stack

| Layer / Component | Technology Chosen | Advantages | Limitations | Rationale |
| :--- | :--- | :--- | :--- | :--- |
| **Programming Language** | Python 3.11 | High developer velocity; strong ecosystem for math/ML operations. | Slower raw performance than compiled languages. | Necessary for reinforcement learning computations and FastAPI integration. |
| **Frontend Framework** | None (Vanilla JS ES6+) | Zero build/compile step; light payloads; instant execution; direct access to SW APIs. | Scalability challenges with complex states; potential code replication. | Keeps the PWA lightweight, fast-loading, and easily deployable via static hosting. |
| **Styling** | Vanilla CSS + Tailwind | Customized interface control; consistent dark/light themes; responsive grid setups. | Large inline CSS sections. | Custom styles ensure modern aesthetics with minimal dependencies. |
| **Backend Framework** | FastAPI | Asynchronous performance; automatic Swagger OpenAPI docs; auto-validation via Pydantic. | Minimal built-in structures (unlike Django). | Allows fast, validated endpoint configuration with native async support. |
| **ORM** | SQLAlchemy | Flexible mapping; protects against SQL injection; smooth migration between SQLite/PostgreSQL. | Complex connection setups; performance overhead on complex joins. | Standardizes queries for local SQLite files and Neon PostgreSQL tables. |
| **Database (Dev)** | SQLite | Zero-configuration; local file-based storage; rapid iteration. | Weak concurrent write support; does not persist on ephemeral containers. | Allows immediate local development without provisioning databases. |
| **Database (Prod)** | Neon PostgreSQL | Cloud persistence; automatic branching; serverless scaling. | Potential cold start delays when scaling from zero. | Render's storage is ephemeral, demanding an external persistent DB. |
| **Hosting (Frontend)** | Firebase Hosting | Edge-cached SSL delivery; free hosting tiers; automated merge workflows. | Strictly limited to static asset deployment. | Standard hosting for fast, secure delivery of PWA files. |
| **Hosting (Backend)** | Render | Native Python build runs; automated Git triggers; simple env variable management. | Free tier spin-down after 15 mins of inactivity. | Standard host for cloud API deployment. |
| **PWA Services** | SW + Manifest | Installation on home screen; offline loading of ads; background alerts. | Push permissions vary across browsers/OS. | Guarantees mobile app-like experiences from a web application shell. |

---

## 4. Backend Analysis

The backend application directory ([backend](file:///c:/Users/akgam/OneDrive/Desktop/Dev/mablytic/mablytic/backend)) is modularized into dedicated files handling connections, schemas, database models, algorithms, and endpoints.

### Module Breakdown
1.  **[database.py](file:///c:/Users/akgam/OneDrive/Desktop/Dev/mablytic/mablytic/backend/database.py)**: Configures the engine. If `DATABASE_URL` exists in the environment, it parses it (modifying standard `postgres://` prefixes to `postgresql://` for SQLAlchemy compatibility) and establishes a PostgreSQL connection pool with standard production parameters. If absent, it provisions a SQLite file. Yields sessions via the [get_db](file:///c:/Users/akgam/OneDrive/Desktop/Dev/mablytic/mablytic/backend/database.py#L39) dependency generator.
2.  **[models.py](file:///c:/Users/akgam/OneDrive/Desktop/Dev/mablytic/mablytic/backend/models.py)**: Defines the declarative relational schemas. Contains the tables `users`, `ads`, and `interactions`. Includes model relationships using SQLAlchemy's `relationship` to enable navigation from users/ads to their interaction lists.
3.  **[schemas.py](file:///c:/Users/akgam/OneDrive/Desktop/Dev/mablytic/mablytic/backend/schemas.py)**: Defines validation rules using Pydantic. Includes [UserRegister](file:///c:/Users/akgam/OneDrive/Desktop/Dev/mablytic/mablytic/backend/schemas.py#L8) (enforcing string constraints), [UserLogin](file:///c:/Users/akgam/OneDrive/Desktop/Dev/mablytic/mablytic/backend/schemas.py#L19), [AdCreate](file:///c:/Users/akgam/OneDrive/Desktop/Dev/mablytic/mablytic/backend/schemas.py#L61) (variant constrained to "A" or "B"), and various responses.
4.  **[ad_serving.py](file:///c:/Users/akgam/OneDrive/Desktop/Dev/mablytic/mablytic/backend/ad_serving.py)**: Contains the central machine learning logic:
    *   [user_preference_categories](file:///c:/Users/akgam/OneDrive/Desktop/Dev/mablytic/mablytic/backend/ad_serving.py#L9): Tokenizes a user's preference string (e.g. `"tech, gaming"`) into a clean array (`['tech', 'gaming']`).
    *   [ThompsonSamplingBandit](file:///c:/Users/akgam/OneDrive/Desktop/Dev/mablytic/mablytic/backend/ad_serving.py#L14): Tracks view and click events for ads. Runs the scoring loop:
        ```python
        def score(self, ad: models.Ad) -> float:
            views, clicks = self.get_ad_stats(ad)
            alpha = 1 + clicks
            beta = 1 + max(0, views - clicks)
            return random.betavariate(alpha, beta)
        ```
5.  **[main.py](file:///c:/Users/akgam/OneDrive/Desktop/Dev/mablytic/mablytic/backend/main.py)**: Configures FastAPI. Handles CORS for authorized origins. Sets up a startup trigger to run [seed](file:///c:/Users/akgam/OneDrive/Desktop/Dev/mablytic/mablytic/backend/seed_data.py#L90) on empty tables. Sets custom endpoints:
    *   *Auth*: Registration checks database constraints, hashes passwords using SHA-256 with static salt `adwise_salt_v1`, and commits. Login verifies inputs and sends slim user profiles.
    *   *Ad Serving*: [serve_ad](file:///c:/Users/akgam/OneDrive/Desktop/Dev/mablytic/mablytic/backend/main.py#L221) pulls the active user profile, attempts to match ads based on user categories, and runs the Multi-Armed Bandit model to select the best option.
    *   *Admin API*: Exposes statistics aggregation paths (`/admin/dashboard-stats`, `/admin/analytics`, `/admin/history`).
6.  **[seed_data.py](file:///c:/Users/akgam/OneDrive/Desktop/Dev/mablytic/mablytic/backend/seed_data.py)**: Houses 6 default user profiles (including administrator) and 18 advertisements spanning 9 distinct categories.

---

## 5. Frontend Analysis

The user interface ([frontend](file:///c:/Users/akgam/OneDrive/Desktop/Dev/mablytic/mablytic/frontend)) runs client-side. The styling utilizes deep gradients (`background_color: #0d1017`) and active border glowing to achieve a high-tech visual feel.

### Detailed Page Overview
1.  **Login (`index.html`)**: Features role-selection tabs. Uses client-side JavaScript to inspect if credentials are blank. Performs role checking (verifying `is_admin` matches the selected login tab) to ensure users cannot load admin views. On success, writes the user object to `localStorage` and routes the browser.
2.  **Register Wizard (`register.html`)**: Implements a modular multi-step registration workflow:
    *   *Step 1*: Account info. Regular expressions validate inputs (alphanumeric username; password strictly 6–8 alphanumeric characters). A dynamic progress bar visualizes password complexity.
    *   *Step 2*: Demographic details. Captures first name, last name, email, age (enforcing limits of 13 to 100 years), and gender.
    *   *Step 3*: Category selections. Renders a grid of 9 categories with dynamic CSS highlight states. Sends selected preferences as a clean comma-separated string to the backend.
3.  **User Feed (`feed.html`)**: Simulates a personalized news application. Shows a modern, single-column layout containing 5 static news articles. Incorporates 2 dynamic ad slots.
    *   *Loading & Display*: Shows animated skeleton blocks during API requests.
    *   *Impression Logging*: Once loaded, it immediately logs a `view` to the backend database.
    *   *Offline fallback*: Uses a network-first fetch wrapper. If a network request fails (or if the client is offline), it attempts to pull the last cached ad from `localStorage` under the key `mablytic_ad_cache` and displays it with a custom `📦 Cached` badge on the ad card.
    *   *Background notifications*: Tracks page visibility. When the user hides the app, if notification permissions are granted, it schedules a background timeout (45 seconds) to trigger an alert with a targeted product based on cached ad details.
4.  **Admin Dashboard (`admin.html`)**: Built with custom stylesheets. Comprises 6 distinct dashboard tabs managed through a custom sidebar component:
    *   *Home*: Displays general summary metrics (Total Users, Total Ads, Total Views, Total Clicks, Global CTR).
    *   *Ad Analysis*: Renders real-time CTR graphs. Integrates a **Serve Ad - Live Test** simulator where administrators can input any user ID, trigger recommendations, see the selected ad, and manually log clicks to test learning feedback loops.
    *   *User Management*: Lists registered accounts. Clicking a user pulls their custom engagement stats (views, clicks, individual CTR) and enables user deletion. Provides a **Persona Creator** button to quickly register random mock profiles.
    *   *Ad Management*: Forms to input title, copy, category, variant, and image link. Lists active ads and provides deletion buttons.
    *   *Interaction Log*: Tabulates chronological activity logs.
    *   *API Console*: A developer client to run GET/POST tests on standard backend API routes. Shows formatted JSON response blocks.
    *   *Settings*: Features a dark/light theme toggler and a **Clear All Data** button.
5.  **Icon Generator (`icon_generator.html`)**: Uses canvas scripts to draw and generate required PWA icons (72px to 512px) in multiple styles (Monogram, Shield, Neural Nodes, Pulse Chart).

---

## 6. Database Analysis

The application uses an ORM-managed relational database. In production, this maps to a Neon PostgreSQL instance. Locally, it writes to a file-based SQLite database.

```
   +---------------------------------+          +---------------------------------+
   |              users              |          |               ads               |
   +---------------------------------+          +---------------------------------+
   | id: Integer (PK)                |<---+     | id: Integer (PK)                |<---+
   | username: String (Unique, Null) |    |     | title: String                   |    |
   | password_hash: String           |    |     | content: String                 |    |
   | first_name: String              |    |     | category: String                |    |
   | last_name: String               |    |     | variant: String                 |    |
   | email: String (Unique)          |    |     | image_url: String               |    |
   | gender: String                  |    |     +---------------------------------+    |
   | age: Integer                    |    |                                            |
   | preferences: String             |    |                                            |
   | is_admin: Boolean               |    |                                            |
   | created_at: DateTime            |    |                                            |
   +---------------------------------+    |                                            |
                                          |                                            |
                                          |                                            |
                                   +------+------+                                     |
                                   | interactions |                                    |
                                   +--------------+                                    |
                                   | id: Integer (PK)                                  |
                                   | user_id: Integer (FK -> users.id) ----------------+
                                   | ad_id: Integer (FK -> ads.id) --------------------+
                                   | interaction_type: String                          |
                                   | timestamp: DateTime                               |
                                   +---------------------------------------------------+
```

### Table Schema Definitions
1.  **`users`**:
    *   `id`: Primary key (Integer).
    *   `username`: Unique string identifier (alphanumeric).
    *   `password_hash`: Secure SHA-256 hashed password.
    *   `first_name` & `last_name`: User demographic identifiers.
    *   `email`: Unique email string.
    *   `gender`: Gender profile.
    *   `age`: User age (integer).
    *   `preferences`: Comma-separated list of interests (e.g. `tech,gaming`).
    *   `is_admin`: Boolean flag to control access to administrative views.
    *   `created_at`: Autogenerated timestamp set on record insertion.
2.  **`ads`**:
    *   `id`: Primary key (Integer).
    *   `title`: Product or service title.
    *   `content`: Promo text copy.
    *   `category`: Category label used for matching.
    *   `variant`: String identifier ("A" or "B") used for variant tracking.
    *   `image_url`: Optional link for ad creatives.
3.  **`interactions`**:
    *   `id`: Primary key (Integer).
    *   `user_id`: Foreign key reference to `users.id`.
    *   `ad_id`: Foreign key reference to `ads.id`.
    *   `interaction_type`: Categorizes action as a `"view"` or `"click"`.
    *   `timestamp`: Autogenerated timestamp.

### CRUD Patterns
*   **Create**: Registration maps input objects to the `User` model. Ad Management posts map inputs to the `Ad` model. Interactions are recorded using JSON posts mapped to the `Interaction` model.
*   **Read**: Queries fetch list objects or execute database aggregations. For example, CTR calculations use count queries grouped by `ad_id` and `interaction_type`.
*   **Delete**: User deletion and ad deletion endpoints execute queries that clean up the associated tables. To ensure integrity and avoid orphan keys, references are cleaned up by explicitly deleting matching records from the `interactions` table first:
    ```python
    db.query(models.Interaction).filter(models.Interaction.user_id == user_id).delete()
    db.delete(user)
    ```

---

## 7. Implemented Features

| Feature | Description | Files Involved |
| :--- | :--- | :--- |
| **Secure Authentication** | Hashed registration using SHA-256 with static salt; tab-based login checking matching credentials to roles. | [main.py](file:///c:/Users/akgam/OneDrive/Desktop/Dev/mablytic/mablytic/backend/main.py), [index.html](file:///c:/Users/akgam/OneDrive/Desktop/Dev/mablytic/mablytic/frontend/index.html) |
| **Registration Wizard** | Multi-step sign-up workflow with password strength indicators and a multi-select interest selector. | [register.html](file:///c:/Users/akgam/OneDrive/Desktop/Dev/mablytic/mablytic/frontend/register.html) |
| **Thompson Sampling** | Multi-Armed Bandit engine using Beta distributions to select candidate ads based on views and clicks. | [ad_serving.py](file:///c:/Users/akgam/OneDrive/Desktop/Dev/mablytic/mablytic/backend/ad_serving.py), [main.py](file:///c:/Users/akgam/OneDrive/Desktop/Dev/mablytic/mablytic/backend/main.py) |
| **PWA Installability** | Configuration file specifying display rules, icons, and shortcuts for installation on mobile/desktop. | [manifest.json](file:///c:/Users/akgam/OneDrive/Desktop/Dev/mablytic/mablytic/frontend/manifest.json) |
| **Service Worker Cache** | Controls precaching, image asset cache-first caching, and offline ad caching. | [sw.js](file:///c:/Users/akgam/OneDrive/Desktop/Dev/mablytic/mablytic/frontend/sw.js) |
| **Offline Fallback** | Detects loss of connection, updates status banners, and falls back to local storage caches for ad slots. | [feed.html](file:///c:/Users/akgam/OneDrive/Desktop/Dev/mablytic/mablytic/frontend/feed.html) |
| **Admin Stats & CTR** | Aggregated view tracking displaying total metrics and per-ad click-through rates. | [main.py](file:///c:/Users/akgam/OneDrive/Desktop/Dev/mablytic/mablytic/backend/main.py), [admin.html](file:///c:/Users/akgam/OneDrive/Desktop/Dev/mablytic/mablytic/frontend/admin.html) |
| **Simulation Sandbox** | Live testing widget in the admin portal allowing managers to request recommendations for any user ID and click ads to verify learning feedback loops. | [admin.html](file:///c:/Users/akgam/OneDrive/Desktop/Dev/mablytic/mablytic/frontend/admin.html) |
| **Persona Creator** | Dynamic button generating mock profiles with random interests to run simulations. | [admin.html](file:///c:/Users/akgam/OneDrive/Desktop/Dev/mablytic/mablytic/frontend/admin.html) |
| **Database Control** | Endpoint allowing users to wipe users, ads, and interactions from the database to reset simulations. | [main.py](file:///c:/Users/akgam/OneDrive/Desktop/Dev/mablytic/mablytic/backend/main.py), [admin.html](file:///c:/Users/akgam/OneDrive/Desktop/Dev/mablytic/mablytic/frontend/admin.html) |
| **API testing Console** | Administrative testing view showing API request forms and formatted JSON response logs. | [admin.html](file:///c:/Users/akgam/OneDrive/Desktop/Dev/mablytic/mablytic/frontend/admin.html) |
| **Background Alerts** | Visibility listener scheduling push notifications with relevant cached products when the application is hidden. | [feed.html](file:///c:/Users/akgam/OneDrive/Desktop/Dev/mablytic/mablytic/frontend/feed.html), [sw.js](file:///c:/Users/akgam/OneDrive/Desktop/Dev/mablytic/mablytic/frontend/sw.js) |

---

## 8. Requirements

### Functional Requirements
1.  **User Registration**: The system must allow users to register with verified credentials, ages, and category preferences.
2.  **Role-Based Access Control**: Standard users must be restricted to viewing their feed and logging interactions. Administrative tools must remain locked behind a dashboard check.
3.  **Adaptive Ad Serving**: The backend must run Thompson Sampling on matched category candidates to select the optimal ad.
4.  **Real-Time Interaction Logging**: View events must be logged automatically upon ad rendering. Click events must be logged immediately when the user clicks the action button.
5.  **Analytics Calculations**: The system must compute views, clicks, and CTR (as a percentage rounded to two decimal places) for individual ads and aggregate them globally.
6.  **Offline Data Support**: The application must fallback to cached assets and offline ad repositories when internet connection is lost.
7.  **Administrative CRUD**: Administrators must have the ability to create ads, view raw interactions, delete users/ads, and clean database tables.

### Non-Functional Requirements
1.  **Security**: User passwords must never be stored in plain text. Input formats (usernames/passwords) must match security requirements.
2.  **Performance**: The ad-serving endpoint should score candidates and return the selected ad quickly (mitigated by setting database connection pre-pings).
3.  **Usability**: The layout must adapt to various screens (from 320px mobile viewports to wide desktop monitors) and support light and dark theme toggling.
4.  **Reliability & Availability**: Database connections must recover gracefully from serverless cold starts. Offline caching must prevent application crashes.

---

## 9. User Flow

```
   [ Open Application ]
            |
            v
   +------------------+
   | Is User Logged   |--- Yes ---> [ feed.html (User Feed) ]
   |    In? (Cache)   |                     |
   +------------------+                     v
            |                      [ Fetch serve-ad/ ]
            No                              |
            v                               v
   +------------------+            [ Log View Interaction ]
   | Sign In Screen   |                     |
   |   (index.html)   |                     v
   +------------------+            [ User Clicks Ad? ]
            |                               |
     (Need Account)                        Yes
            |                               |
            v                               v
   +------------------+            [ Log Click Interaction ]
   | Register Wizard  |                     |
   |  (register.html) |                     v
   +------------------+            [ Request New Ad Served ]
            |
      (Success Redirect)
            |
            v
    [ Login Screen ]
```

### Steps in Detail
1.  **Entry**: The user accesses the application. The system checks `localStorage` for active session details.
    *   If credentials exist and the role is user, the browser redirects to [feed.html](file:///c:/Users/akgam/OneDrive/Desktop/Dev/mablytic/mablytic/frontend/feed.html).
    *   If the role is admin, the browser redirects to [admin.html](file:///c:/Users/akgam/OneDrive/Desktop/Dev/mablytic/mablytic/frontend/admin.html).
    *   If no session is found, the browser opens [index.html](file:///c:/Users/akgam/OneDrive/Desktop/Dev/mablytic/mablytic/frontend/index.html).
2.  **Registration Workflow**:
    *   An unregistered user clicks the register link.
    *   They fill in username, password, demographics, and interest preferences across three wizard pages, then click "Create Account".
    *   Upon successful registration, the browser redirects the user to the login screen.
3.  **Active Engagement**:
    *   The user logs in with their credentials, and the browser routes to their personalized feed page.
    *   The feed renders, and the system fetches personal ads using the recommendation engine.
    *   A view interaction is immediately logged.
    *   If the user clicks "Learn More", the action is recorded, a confirmation pop-up is shown, and a new ad is requested.
4.  **Admin Analysis**:
    *   An administrator logs in and views overall platform statistics, inspects real-time ad performance metrics, or triggers simulations.

---

## 10. PPT Content (Slides 1–10)

### Slide 1: Title Slide
*   **Title**: MABlytic
*   **Subtitle**: A Full-Stack Advertisement Recommendation Platform Using Multi-Armed Bandit Learning & Progressive Web App Architecture
*   **Team Placeholders**:
    *   *Presenter*: [Student Name / Roll Number]
    *   *Course*: MCA [Semester / Year]
    *   *Institution*: [University / Department Name]

### Slide 2: Index
*   **Index**:
    1.  Project Overview & Objectives
    2.  System Architecture & Infrastructure
    3.  Technology Stack Decisions
    4.  Database Design & Relationships
    5.  The Recommendation Engine: Thompson Sampling
    6.  Frontend Implementation & Register Wizard
    7.  PWA Capabilities & Offline Performance
    8.  Administrative Dashboard & Live Simulator
    9.  Verification, Verification, and Key Features
    10. Project Summary, Achievements & Future Scope

### Slide 3: Introduction
*   **The Context**:
    *   Digital advertising needs to continually balance user engagement with ad campaign testing.
    *   Simple heuristic recommendation systems fail to balance the exploitation of high-performing ads with the exploration of new ads.
*   **The MABlytic Solution**:
    *   A decoupled full-stack platform providing real-time personalized recommendations.
    *   Leverages Thompson Sampling based Multi-Armed Bandit algorithms to dynamically optimize CTR.
    *   Implements an installable PWA with offline fallback caching and background alerts.

### Slide 4: Key Features
*   **Personalized Recommendation**: Category-based user preference matching combined with Thompson Sampling.
*   **Real-time Analytics**: Tracks impressions (views) and interactions (clicks) to update statistics dynamically.
*   **Progressive Web App (PWA)**: Supports home-screen installation, custom web app manifests, and offline access.
*   **Administrative Management**: A comprehensive admin dashboard featuring user/ad management, database controls, and API testing consoles.
*   **Simulated Sandbox**: Direct tool within the admin view allowing managers to serve test recommendations and log clicks to test learning feedback loops.

### Slide 5: Technology Stack
*   **Backend Framework**: FastAPI (Asynchronous Python REST API).
*   **Database Integration**: Neon serverless PostgreSQL (Production) with SQLite local file fallback.
*   **ORM Mapping**: SQLAlchemy (Declarative schema models).
*   **Client Interface**: Vanilla ES6+ JavaScript, custom HTML5, and CSS.
*   **Deployment Platforms**: Firebase Hosting (Frontend files) and Render (Backend service).
*   **CI/CD Pipeline**: GitHub Actions workflows automations.

### Slide 6: Requirements & Features
*   **Functional Requirements**:
    *   Secure account registration and role-based login.
    *   Dynamic ad serving based on user interests.
    *   Impressions and clicks tracking.
    *   Admin dashboard statistics and database control.
*   **Non-Functional Requirements**:
    *   SHA-256 password hashing.
    *   Responsive, mobile-friendly design.
    *   High reliability with database pre-pings and offline fallbacks.

### Slide 7: User Interface / Navigation Flow
*   **Key Screens**:
    *   `index.html`: Role-based authentication gate.
    *   `register.html`: Multi-step form with alphanumeric validation and strength bar.
    *   `feed.html`: Core user feed displaying articles and personalized ad cards.
    *   `admin.html`: Administrative console with sidebar controls.
*   **Suggested Screenshots**:
    1.  *Screenshot 1*: The multi-step Register Wizard showing interest category selection.
    2.  *Screenshot 2*: The personalized user feed containing the dynamic ad cards with a "Cached" badge.
    3.  *Screenshot 3*: The Admin dashboard displaying CTR charts and the Live Test simulator.

### Slide 8: Demonstration
*   **Suggested Demonstration Flow**:
    1.  *Wipe & Reset*: Open the admin settings page and clear the database to show a clean state.
    2.  *Wizard Registration*: Create a new user profile, select interest categories (e.g. "tech, gaming"), and complete the registration.
    3.  *Feed Personalization*: Log in as the user. Show that the feed only serves ads matching the selected categories.
    4.  *Simulated Engagement*: Click "Learn More" on a served ad. Show that a new ad loads immediately and the click is recorded.
    5.  *Admin Dashboard Analytics*: Log in as the administrator. View the real-time CTR changes, check the interaction logs, and run an API Console test.
    6.  *Offline Fallback Verification*: Disable network connections in dev tools. Reload the user feed to show the offline banner and the cached ad placeholder.

### Slide 9: Conclusion
*   **Key Achievements**:
    *   Built a responsive, decoupled web application.
    *   Implemented Thompson Sampling based Multi-Armed Bandit ad recommendation.
    *   Implemented PWA features like offline fallbacks and background notifications.
*   **Advantages**:
    *   Optimizes click-through rate dynamically.
    *   Robust architecture with offline capability.
*   **Future Scope**:
    *   Integrate OAuth2/JWT tokens.
    *   Add ad creative image upload support.
    *   Scale recommendation calculations using Redis caches.

### Slide 10: Thank You
*   **Closing**:
    *   Thank you for your time.
    *   Questions and Discussion.
    *   *Demo Link*: [Website: https://mablytic.web.app]
    *   *Repository Link*: [GitHub: https://github.com/Rajlohith/mablytic]

---

## 11. Speaker Notes

### Slide 1 Notes: Title Slide
> *"Good morning, respected external examiners and faculty members. Welcome to the presentation of my MCA project titled 'MABlytic'. MABlytic is a full-stack, decoupled advertisement recommendation platform designed to demonstrate the lifecycle of personalized advertising. By leveraging Multi-Armed Bandit reinforcement learning algorithms and Progressive Web App structures, the platform provides a responsive user experience and real-time analytical reporting. In this presentation, I will discuss the technical design, the underlying Thompson Sampling algorithm, and the database architecture that powers the system."*

### Slide 2 Notes: Index
> *"Here is the index of topics I will cover. I will begin with the project context, problem definition, and system objectives. Next, I will explain the system architecture, technology selections, and the relational database schema. I will then walk you through the details of the Thompson Sampling recommendation engine. Finally, we will review the PWA offline features, the administrative analytics dashboard, the verification flow, and discuss potential future enhancements."*

### Slide 3 Notes: Introduction
> *"Digital advertising platforms face a fundamental trade-off. They must decide whether to serve ads with known high click-through rates, which is exploitation, or test new ads with unknown performance, which is exploration. Traditional static A/B testing often wastes traffic on low-performing ads. MABlytic addresses this problem. By implementing a Thompson Sampling based Multi-Armed Bandit algorithm, the platform dynamically balances exploration and exploitation, learning from user interactions in real-time to optimize ad relevance and engagement."*

### Slide 4 Notes: Key Features
> *"Let's look at the primary features of the platform. For end-users, MABlytic provides account registration and personalized ad delivery based on category preferences. For platform administrators, it offers an analytics dashboard that calculates metrics like views, clicks, and CTR in real-time. It also provides tools to manage the ad inventory. Lastly, the app is built as a PWA, meaning it is installable, mobile-friendly, and capable of displaying cached ads when offline."*

### Slide 5 Notes: Technology Stack
> *"Our technology stack is designed to be lightweight, responsive, and easy to deploy. The backend is built with FastAPI, a modern, high-performance Python framework. We use SQLAlchemy to map our database models, allowing us to use SQLite for local development and Neon serverless PostgreSQL in production. The frontend is built using standard HTML5, CSS3, and Vanilla JavaScript to avoid the build steps and overhead of large frameworks, ensuring fast initial page loads."*

### Slide 6 Notes: Requirements & Features
> *"The system design satisfies several functional and non-functional requirements. Functionally, it supports user registration, role-based login, personalized ad serving, and interaction logging. From a non-functional perspective, we prioritize security by hashing passwords using SHA-256, usability through responsive dark/light themes, and reliability by using database connection pools and offline caching."*

### Slide 7 Notes: User Interface / Navigation Flow
> *"The user interface is structured around four primary pages: the login page, the multi-step registration wizard, the personalized user feed, and the admin dashboard. The registration wizard validates inputs client-side, showing a password complexity bar and a multi-select interest selector. The feed renders dynamic ad cards alongside static news articles. The admin dashboard provides a centralized view for monitoring metrics, managing ads, and simulating recommendations."*

### Slide 8 Notes: Demonstration
> *"I will now explain the workflow for our live demonstration. First, we will open the admin console and clear the database to show a clean system state. Next, we will register a new user profile with specific interests, log in, and view the personalized ad cards. We will click an ad to show how the click interaction is recorded. Finally, we will switch to the admin dashboard to view the updated CTR charts, and disable the network connection to verify the offline banner and caching features."*

### Slide 9 Notes: Conclusion
> *"In conclusion, MABlytic successfully demonstrates how online reinforcement learning algorithms can be integrated into full-stack web applications. By using Thompson Sampling, the platform optimizes ad delivery dynamically based on user engagement. The architecture is robust, leveraging PWAs to handle network loss and Neon PostgreSQL to persist data reliably. For future work, we plan to implement JWT authentication and add support for image uploads."*

### Slide 10 Notes: Thank You
> *"Thank you for your time and attention. I am now open to your questions and feedback."*

---

## 12. Viva Questions

### Q1: What is the core recommendation algorithm used in MABlytic, and how does it work?
**Answer**: MABlytic uses **Thompson Sampling**, a reinforcement learning algorithm for the Multi-Armed Bandit problem. For each ad, the algorithm models the Click-Through Rate (CTR) using a Beta distribution, defined by parameters $\alpha$ (clicks + 1) and $\beta$ (views - clicks + 1). When serving an ad, the system draws a random sample from the Beta distribution for each candidate ad using `random.betavariate(alpha, beta)`. The ad with the highest sampled value is selected. This approach naturally balances exploration (testing ads with fewer impressions, which have wider distributions) and exploitation (serving ads with known high click-through rates).

### Q2: Why did you use SQLite for development and Neon PostgreSQL for production?
**Answer**: Local SQLite databases write to a local file, making them fast and simple to use during development without requiring database setup. However, platforms like Render use ephemeral storage, meaning any locally saved files are deleted whenever the container restarts or redeploys. To ensure reliable data persistence, Neon PostgreSQL (a cloud-hosted serverless PostgreSQL database) is used in production.

### Q3: How is database switching handled dynamically in the code?
**Answer**: Dynamic database switching is implemented in [database.py](file:///c:/Users/akgam/OneDrive/Desktop/Dev/mablytic/mablytic/backend/database.py). The script checks for the existence of the `DATABASE_URL` environment variable. If it exists, the engine connects to Neon PostgreSQL with custom parameters like SSL requirement and connection pool sizes. If it is absent, it falls back to a local SQLite connection.

### Q4: Explain the connection pooling parameters configured for Neon PostgreSQL.
**Answer**: The parameters in [database.py](file:///c:/Users/akgam/OneDrive/Desktop/Dev/mablytic/mablytic/backend/database.py) are:
*   `pool_pre_ping=True`: Verifies connection health before executing queries, which is useful for serverless databases that may idle or spin down.
*   `pool_recycle=300`: Automatically recycles connections after 5 minutes to prevent stale connections.
*   `pool_size=5`: Limits the pool to 5 persistent connections to save database resources.
*   `max_overflow=10`: Allows up to 10 additional connections under heavy load.

### Q5: How is user password security managed on registration and login?
**Answer**: Passwords are secure. In [main.py](file:///c:/Users/akgam/OneDrive/Desktop/Dev/mablytic/mablytic/backend/main.py#L65-L72), the function [hash_password](file:///c:/Users/akgam/OneDrive/Desktop/Dev/mablytic/mablytic/backend/main.py#L68) prepends a static salt (`adwise_salt_v1`) to the plain text password and hashes it using SHA-256. The resulting hash is stored in the database. During login, the password check verifies if the hashed input matches the stored hash.

### Q6: What is a Progressive Web App (PWA), and what files make MABlytic a PWA?
**Answer**: A PWA is a web application that uses modern web APIs to deliver an app-like experience, including offline support and home-screen installation. In MABlytic, the files that implement this are:
1.  [manifest.json](file:///c:/Users/akgam/OneDrive/Desktop/Dev/mablytic/mablytic/frontend/manifest.json): Defines the app's metadata, shortcuts, display configuration, and icons.
2.  [sw.js](file:///c:/Users/akgam/OneDrive/Desktop/Dev/mablytic/mablytic/frontend/sw.js): The Service Worker script that controls network caching and offline fallbacks.

### Q7: Explain the caching strategy implemented in the Service Worker.
**Answer**: The service worker in [sw.js](file:///c:/Users/akgam/OneDrive/Desktop/Dev/mablytic/mablytic/frontend/sw.js) uses three main strategies:
1.  **Pre-caching**: Automatically caches shell assets (`index.html`, `feed.html`, `admin.html`, manifest, and icons) during installation.
2.  **Network-First with Cache Fallback**: Used for HTML, JS, CSS files, and the `/serve-ad/` API. It attempts to fetch updated versions from the network, falling back to the cache if the network is unavailable.
3.  **Cache-First**: Used for images and icons to minimize network requests.

### Q8: How is the offline ad experience implemented on the user feed page?
**Answer**: When the user feed page is offline, the client fetch wrapper in [feed.html](file:///c:/Users/akgam/OneDrive/Desktop/Dev/mablytic/mablytic/frontend/feed.html#L507-L541) catches the network failure and attempts to read the last cached ad from local storage. If found, it renders the ad and displays a `📦 Cached` badge. The service worker also intercepts network failures on the `/serve-ad/` endpoint, returning cached responses if available.

### Q9: Why does the system perform manual cascades instead of using foreign key cascade rules?
**Answer**: When deleting users or ads, database systems often require child records (in this case, interactions) to be deleted first to prevent foreign key constraint violations. In [main.py](file:///c:/Users/akgam/OneDrive/Desktop/Dev/mablytic/mablytic/backend/main.py#L167-L176), the application executes a query to delete all matching rows in the `interactions` table before deleting the parent record, ensuring database integrity.

### Q10: How does the system handle password validation on registration?
**Answer**: Validation is applied both client-side and server-side:
*   **Client-Side**: The script in [register.html](file:///c:/Users/akgam/OneDrive/Desktop/Dev/mablytic/mablytic/frontend/register.html#L300-L314) uses regular expressions to enforce a password length of 6–8 alphanumeric characters, displaying validation states dynamically.
*   **Server-Side**: In [main.py](file:///c:/Users/akgam/OneDrive/Desktop/Dev/mablytic/mablytic/backend/main.py#L80-L82), the API route runs validation checks on requests, throwing an HTTP 400 bad request error if validation fails.

### Q11: How is the role-based login check enforced?
**Answer**: During authentication, the login API returns a user object containing the `is_admin` boolean flag. In [index.html](file:///c:/Users/akgam/OneDrive/Desktop/Dev/mablytic/mablytic/frontend/index.html#L197-L203), the frontend validates if the user's role matches the active tab selection (User or Admin), displaying an error message and blocking login if there is a mismatch.

### Q12: How are user preferences structured, and how are they used during ad serving?
**Answer**: User preferences are stored in the database as a comma-separated string (e.g. `tech,gaming`). During ad serving, the backend normalizes this string and queries the database for ads matching those categories. If matching ads are found, the Thompson Sampling bandit scores and selects from that subset. If no matching ads exist, it falls back to scoring the entire ad inventory.

### Q13: What is Click-Through Rate (CTR) and how is it calculated in this platform?
**Answer**: CTR measures the ratio of clicks to views for a given advertisement, represented as a percentage:
$$\text{CTR} = \left( \frac{\text{Clicks}}{\text{Views}} \times 100 \right)$$
In [main.py](file:///c:/Users/akgam/OneDrive/Desktop/Dev/mablytic/mablytic/backend/main.py#L291), the backend aggregates views and clicks, rounding the final value to two decimal places.

### Q14: How is CORS configured on the FastAPI backend?
**Answer**: Cross-Origin Resource Sharing (CORS) is configured using FastAPI's `CORSMiddleware` in [main.py](file:///c:/Users/akgam/OneDrive/Desktop/Dev/mablytic/mablytic/backend/main.py#L42-L48). It specifies an allowed list of origins (including localhost, local ports, and the deployed Firebase Hosting URL), enabling headers, methods, and credential passing.

### Q15: What is the purpose of the seed script?
**Answer**: The seeding script in [seed_data.py](file:///c:/Users/akgam/OneDrive/Desktop/Dev/mablytic/mablytic/backend/seed_data.py) pre-populates the database with test profiles and ad inventories. This ensures developers and examiners have a working set of test cases ready to use immediately without manual input.

### Q16: How does the background notification system work?
**Answer**: When the user feed page goes out of view, a visibility listener in [feed.html](file:///c:/Users/akgam/OneDrive/Desktop/Dev/mablytic/mablytic/frontend/feed.html#L643-L667) triggers a timer. If the page remains hidden for 45 seconds and notification permissions are active, the Service Worker displays a notification containing product details read from the local cache.

### Q17: What are Pydantic schemas, and how do they benefit the API?
**Answer**: Pydantic schemas are data models that enforce type validation, parsing, and serialization. They parse incoming JSON request payloads, validate field types, and serialize database outputs into clean JSON response structures.

### Q18: What is the database clear endpoint, and why is it useful?
**Answer**: The database clear endpoint (`POST /clear-database/`) deletes all records from the `interactions`, `ads`, and `users` tables. This allows developers to reset the system state and start fresh simulations during demonstrations or testing runs.

### Q19: How are PWA screenshots configured in the manifest file?
**Answer**: PWA screenshots are configured in the `screenshots` array within [manifest.json](file:///c:/Users/akgam/OneDrive/Desktop/Dev/mablytic/mablytic/frontend/manifest.json#L24-L39). They provide preview images of the application for mobile and desktop screens, which are displayed by app stores and install dialogs.

### Q20: How are database transactions handled in FastAPI endpoints?
**Answer**: Database sessions are injected into API endpoints via dependency injection (`db: Session = Depends(get_db)`). When operations complete successfully, changes are committed using `db.commit()`. If an exception occurs, the transaction rolls back changes using `db.rollback()` to maintain database consistency.

---

## 13. Future Improvements

Based on the current implementation, here are realistic future improvements that would enhance the platform:
1.  **JWT/OAuth2 Session Validation**: Replace basic local storage user caching with secure, signed JSON Web Tokens (JWT) for authentication.
2.  **Cascade Delete Configuration**: Update SQLAlchemy models to use database-level foreign key cascade constraints (`ondelete="CASCADE"`) instead of relying on manual cleanup queries.
3.  **Media Upload Management**: Implement an image upload endpoint using python libraries to allow administrators to upload ad creative assets directly to storage (e.g. Firebase Storage) instead of referencing static external URLs.
4.  **Distributed Caching**: Integrate a caching layer like Redis to store calculated ad engagement views/clicks, improving performance under high traffic.
5.  **Analytics Visualizations**: Replace raw CSS bar charts with library-based charts (e.g., Chart.js) to show trend lines, category distributions, and conversion funnels.
