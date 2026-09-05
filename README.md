## MindSpark Setup Guide

This file serves as the technical documentation for the local installation of the MindSpark project.

### 1. Prerequisites and Environment Setup
The system requires the prior installation of Git, **Node.js (v18.0.0 or higher recommended)**, and npm on the target machine. 

**⚠️ CRITICAL: Security & Authentication Files**
For security reasons and to comply with Google Cloud and Groq safety standards, sensitive API keys and database credentials are strictly excluded from this public repository. To run this project locally, the evaluator must manually create the configuration files as detailed below.

**A. Database Configuration (Firebase)**
1. Obtain the `serviceAccountKey.json` file provided privately by the author, OR generate your own from your Firebase Console (Project Settings > Service Accounts > Generate new private key).
2. Place this exact file inside the `backend/` directory.

**B. Environment Variables (.env)**
Create a file named exactly `.env` inside the `backend/` directory and populate it with the following structure:

```env
PORT=5001
GROQ_API_KEY=your_groq_api_key_here
SMTP_EMAIL=your_email@gmail.com
SMTP_PASSWORD=your_app_password_here
2. 📧 Configuring the OTP Email Verification System
The MindSpark application includes a user verification system that sends an OTP (One-Time Password) via email.

Security Notice: The backend code is strictly configured to read credentials dynamically from the .env file using process.env.SMTP_EMAIL and process.env.SMTP_PASSWORD. Passwords are NEVER hardcoded in the source code.

To test this feature, you must configure the backend to use your own email address as the sender:

In the backend/.env file, set SMTP_EMAIL to your Gmail address.

You cannot use your standard Gmail password. You must generate an App Password.

Go to your Google Account > Security.

Ensure 2-Step Verification is turned on.

Search for App passwords in the security search bar.

Generate a new password (select "Mail" and "Other (Custom name)" like "MindSpark").

Copy the generated 16-character password (without spaces) and paste it as the SMTP_PASSWORD in your .env file.

3. ⚠️ Important Note for Windows Users (Port Configuration)
This project was initially developed on macOS, where port 5000 is reserved by the system (AirPlay). Therefore, the backend was configured to run on port 5001.

If you are running this project on a Windows machine, it is standard to use port 5000. Please make the following adjustments:

In your backend/.env file, set PORT=5000.

In the frontend React code (specifically in the API service files), carefully replace any hardcoded http://localhost:5001 URLs with http://localhost:5000 to ensure proper Client-Server communication.

4. Installation Pipeline
The following commands will guide you through installing the client-side (React) and server-side (Node/Express) dependencies.

Clone the repository: git clone https://github.com/younesselassri08-maker/mindspark.git

Install backend dependencies: cd mindspark/backend then run npm install

Install frontend dependencies: Open a new terminal, navigate to cd mindspark/frontend and run npm install

5. Running the Application
Running the application requires starting both the frontend and the backend simultaneously in two separate terminals.

Start the Node Server: In the backend directory, run the command npm start (or node server.js).

Start the React Client: In the frontend directory, run the command npm run dev.

The interface will then open automatically in your default browser, typically at http://localhost:5173.

http://localhost:5173.


---

### 🚨 N'oublie pas la modification dans ton propre code !
Le README explique à l'évaluateur comment faire, mais **tu dois absolument t'assurer que ton fichier JavaScript local est bien corrigé** sur ton ordinateur, sinon ton programme va planter. 

Vérifie bien que dans ton code Node.js, tu as remplacé tes informations personnelles par ceci :
```javascript
auth: {
    user: process.env.SMTP_EMAIL, 
    pass: process.env.SMTP_PASSWORD 
}

