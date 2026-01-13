# OPTC Crews- Backend API

The RESTful API powering the OPTC Crews platform. This service orchestrates data flow between the client and the database, manages user sessions without traditional registration, and handles content administration protocols.

## Project Overview

The backend is built with **Node.js** and **Express**, designed to serve a high-traffic community tool. The primary focus of the architecture was to create a scalable, secure, and maintainable codebase that serves data efficiently to the frontend while enforcing strict validation rules for user-submitted content.

## Key Architecture Highlights

### 1. MVC Pattern & Modular Design
The project follows a strict **Model-View-Controller (MVC)** separation of concerns to ensure maintainability:
*   **Routes:** Define the API endpoints and map them to specific logic.
*   **Controllers:** Handle the business logic, process incoming requests, and format responses.
*   **Models:** Interface with the database layer to retrieve or store data.
*   **Middleware:** Intercepts requests for validation, authentication, and security checks before they reach the controllers.

### 2. Custom Authentication System (Key-Based)
To improve User Experience (UX) for gamers, the system avoids email/password barriers.
*   **Logic:** Implemented a logic flow that generates a secure **Public/Secret Key pair** for every new user "Box".
*   **Persistence:** Users can restore their character collection on any device simply by inputting their unique Secret Key. This acts as a direct identifier to retrieve the user's saved data state from the database without requiring traditional account creation.

### 3. Security & Stability Protocols
Given that the application accepts user input (text guides, crew submissions), security was a priority:
*   **Rate Limiting:** Implemented `express-rate-limit` to protect specific endpoints (like submission forms and login) from abuse or spam attacks.
*   **Header Security:** Utilized `helmet` to set various HTTP headers, protecting against common vulnerabilities.
*   **Admin Protection:** Critical operations (creating official game stages, rotating crews) are protected via **JWT (JSON Web Tokens)**, ensuring only authorized administrators can alter the game's core data. 

### 4. Input Validation & Data Integrity
*   **Middleware Validation:** All incoming payloads are sanitized and validated. For example, ensuring submitted video URLs are valid, character IDs exist, and JSON guides follow the correct schema before any database interaction occurs.
*   **Error Handling:** A centralized error handling mechanism ensures that the API fails gracefully, returning consistent HTTP status codes (400, 404, 500) and meaningful messages to the frontend client. 

## Tech Stack

*   **Runtime:** Node.js
*   **Framework:** Express.js
*   **Database:** PostgreSQL (Hosted on Supabase, utilizing connection pooling for performance)
*   **Authentication:** JWT (Admin), Custom Key-Pair (Users)
*   **Security:** Helmet, CORS, Express-Rate-Limit
*   **Utilities:** Dotenv (Config management)

## API Resources Structure

The API is organized into logical resources to support the frontend application:

*  `/api/crews` - Operations regarding strategy submissions, retrieval and reporting
*  `/api/box` - Endpoints for creating, updating, and restoring user character collections.
*  `/api/stages` - Provides game stage data and content metadata.
*  `/api/admin` - Secured endpoints for content management (CMS functionality).