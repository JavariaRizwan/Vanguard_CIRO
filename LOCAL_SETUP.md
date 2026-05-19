# 🚀 Running CIRO Locally on Your Web Browser

This guide provides a comprehensive, step-by-step walkthrough to get the **CIRO (Crisis Incident Reporting & Orchestration)** application running locally on your web browser. 

Since you currently have no `node_modules` installed, this guide will walk you through the entire process, including verifying prerequisites, installing dependencies, configuring MySQL, and starting the local server.

---

## 🛠️ Step 1: Verify & Install Prerequisites

To run this application, you must have **Node.js** and **MySQL** installed on your system.

### 1. Check if Node.js is Installed
Open your terminal (PowerShell or Command Prompt) and run:
```powershell
node -v
npm -v
```
* **If you see version numbers** (e.g., `v18.x.x` or higher), you are ready to go!
* **If you get an error** ("command not found" or similar), download and install Node.js:
  👉 **[Download Node.js (LTS Version)](https://nodejs.org/en/)** (Choose the Windows Installer).

### 2. Ensure MySQL is Installed & Running
The application uses a MySQL database for storing incident reports and user accounts.
* You can run MySQL via **XAMPP**, **WampServer**, or a standalone **MySQL Community Server**.
* Make sure your MySQL service is started (e.g., start Apache and MySQL on the XAMPP Control Panel).

---

## 📂 Step 2: Open Terminal in the Project Folder

Since your project resides in a subfolder, you need to open your terminal inside the exact directory containing `package.json`.

1. Open **PowerShell** or **Command Prompt**.
2. Navigate to the project folder by running this command:
   ```powershell
   cd "C:\new_AI_Seekho\CIRO-Final\CIRO-Final"
   ```

---

## 📦 Step 3: Install Node Modules

Now, run the installation command to fetch all required libraries and dependencies:
```powershell
npm install
```
> [!NOTE]
> This command reads the `package.json` file, downloads all required libraries (like React, Tailwind, Express, Vite, and Leaflet Maps), and creates the `node_modules` folder. This might take 1–2 minutes depending on your internet speed.

---

## 🗄️ Step 4: Import the Database Schema

Before running the server, we need to create the database and its tables.

1. Open your MySQL client (e.g., **phpMyAdmin** at `http://localhost/phpmyadmin` or the MySQL Command Line Client).
2. Create a new database named `ciro_pakistan` (or let the schema do it).
3. Import or execute the SQL commands found in **`database_schema.sql`**.

### Quick Import via MySQL CLI:
If you have MySQL in your PATH, you can run this command in your terminal:
```powershell
mysql -u root -p < database_schema.sql
```
*(Press Enter when prompted for a password, or type your password if you set one).*

---

## ⚙️ Step 5: Check Your Environment Configurations (`.env`)

You already have a pre-configured `.env` file in your project folder! Let's double check if the database credentials match your local MySQL configuration:

Open **`C:\new_AI_Seekho\CIRO-Final\CIRO-Final\.env`** and check these lines:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=adina@4321   # <-- Change this to your local MySQL password (leave blank if none)
DB_NAME=ciro_pakistan
```
* If you do not have a password for your local `root` user, change it to: `DB_PASSWORD=`

---

## 🚀 Step 6: Start the Server and Web Browser

Once the installation is complete and the database is configured, start the application!

1. In your terminal (still inside `C:\new_AI_Seekho\CIRO-Final\CIRO-Final`), run:
   ```powershell
   npm run dev
   ```
2. You will see output showing that the server has started successfully:
   ```bash
   ✅ Successfully connected to MySQL Database.
   📦 Database Tables: users, incidents, details_flooding, details_heatwave, details_road_blockage, details_power_outage, details_health, details_disease_spike, details_accident
   Server running at http://localhost:3000
   ```

3. **Open your web browser** (Chrome, Edge, Firefox) and navigate to:
   👉 **[http://localhost:3000](http://localhost:3000)**

🎉 **You are all set! The CIRO Dashboard is now fully operational in your web browser!**
