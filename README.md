## MindSpark Setup Guide

This file serves as the technical documentation for the local installation of the MindSpark project.

### 1. Prerequisites and Environment Setup
The system requires the prior installation of Git, **Node.js (v18.0.0 or higher recommended)**, and npm on the target machine. 

**⚠️ CRITICAL: Security & Authentication Files**
For security reasons and to comply with Google Cloud and Groq safety standards, sensitive API keys and database credentials are strictly excluded from this public repository. 

To run this project locally, the evaluator must obtain the environment configuration files provided privately alongside the project submission.

**Setup Instructions:**
1. Locate the private configuration files provided by the author (`.env` and `serviceAccountKey.json`).
2. Place the `.env` file inside the `backend/` directory. It should contain the following variables:
   * `GROQ_API_KEY`: Groq Cloud API key for LLM inference
   * `SMTP_EMAIL`: Gmail address for OTP dispatch
   * `SMTP_PASSWORD`: Google App Password
   * `PORT`: Backend server listening port
3. Place the `serviceAccountKey.json` file inside the `backend/` directory. This file contains the Firestore project configuration and private key required for database authentication.

Failure to include these two files in the `backend/` directory will result in a `16 UNAUTHENTICATED` error or a server crash upon launch.

---

### 2. ⚠️ Important Note for Windows Users (Port Configuration)
This project was initially developed on macOS, where port `5000` is reserved by the system (AirPlay). Therefore, the backend was configured to run on port `5001`. 

If you are running this project on a **Windows machine**, it is standard to use port `5000`. Please make the following adjustments:
1. In your backend `.env` file, set `PORT=5000`.
2. In the frontend React code, carefully replace any hardcoded `http://localhost:5001` URLs with `http://localhost:5000` to ensure proper Client-Server communication.

---

### 3. Installation Pipeline
The following commands will guide the user through installing the client-side (React) and server-side (Node/Express) dependencies.

* **Clone the repository:** `git clone https://github.com/younesselassri08-maker/mindspark.git`
* **Install backend dependencies:** `cd mindspark/backend` then run `npm install`
* **Install frontend dependencies:** Open a new terminal, navigate to `cd mindspark/frontend` and run `npm install`

---

### 4. Running the Application
Running the application requires starting both the frontend and the backend simultaneously in two separate terminals.

* **Start the Node Server:** In the `backend` directory, run the command `npm start` (or `node server.js`).
* **Start the React Client:** In the `frontend` directory, run the command `npm run dev`.

The clinical assistant interface will then open automatically in your default browser, typically at `http://localhost:5173`.
