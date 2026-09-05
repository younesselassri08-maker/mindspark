## MindSpark Setup Guide

This file serves as the technical documentation for the local installation of the MindSpark project.

### 1. Prerequisites and Environment Setup
The system requires the prior installation of Git, **Node.js (v18.0.0 or higher recommended)**, and npm on the target machine. It is also crucial to configure the local environment to connect the various services (Firebase, Groq, SMTP). Create a `.env` file in the `backend` directory with the following variables:

| Variable Name | Description |
| :--- | :--- |
| `GROQ_API_KEY` | Groq Cloud API key for LLM inference |
| `SMTP_EMAIL` | Gmail address for OTP dispatch |
| `SMTP_PASSWORD` | Google App Password |
| `FIREBASE_API_KEY` | Firestore project configuration and secret key |
| `PORT` | Backend server listening port |

> **Security Note:** It is imperative to ensure that the `.env` file and the `node_modules/` directory are listed in the `.gitignore` file to never expose private keys publicly.

---

### 2. ⚠️ Important Note for Windows Users (Port Configuration)
This project was initially developed on macOS, where port `5000` is reserved by the system (AirPlay). Therefore, the backend was configured to run on port `5001`. 

If you are running this project on a **Windows machine**, it is standard to use port `5000`. Please make the following adjustments:
1. In your backend `.env` file, set `PORT=5000`.
2. In the frontend React code (specifically in your API service files or Axios configurations), carefully replace any hardcoded `http://localhost:5001` URLs with `http://localhost:5000` to ensure proper Client-Server communication.

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
