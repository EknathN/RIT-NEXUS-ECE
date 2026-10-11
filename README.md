# 🎓 RIT ECE — Dedicated Professional Networking Platform

A state-of-the-art full-stack professional networking platform designed exclusively for the **Department of Electronics and Communication Engineering (ECE)** at **Rajalakshmi Institute of Technology (RIT), Chennai**.

---

## 🌟 Key Features & Ecosystem

1. **Dedicated RIT ECE Identity & Onboarding**
   - Distinct registration workflows tailored for **Current Students**, **Alumni**, and **Faculty Mentors**.
   - Profile verification with Roll Number / Register Number and Batch Year.
   - Comprehensive profile management: Headline, Bio, ECE Skills, Projects, Internships, Certifications, and Mentorship topic tags.

2. **Dynamic Home Feed & Professional Engagement**
   - Three-column layout inspired by modern professional networks with custom RIT ECE cyber-navy and neon-cyan branding.
   - Rich post creation with multimedia uploads, technical project showcases, and categorized tags (`#VLSI`, `#EmbeddedSystems`, `#IoT`, `#Robotics`, `#GATE`).
   - Interactive reactions (❤️ Like, 💡 Insightful, 🚀 Inspiring), nested comments, and bookmarking.
   - Real-time departmental announcements and trending peer recommendations.

3. **Alumni & Student Network Directory (`/network`)**
   - Filter peers by role (**Student**, **Alumni**, **Faculty**) and batch years.
   - 1-click Connection requests, pending invitation management, and mutual connections view.
   - Mentorship directory highlighting alumni working in tier-1 core semiconductor & software firms (Intel, Qualcomm, Texas Instruments, Cisco, Bosch).

4. **ECE Career & Internship Board (`/jobs`)**
   - Specialized job & internship board tailored for ECE domains: **VLSI / Semiconductor**, **Embedded Systems**, **IoT & Robotics**, **Telecommunications / 5G**, and **Hardware AI / TinyML**.
   - Verified Alumni Referral badges with 1-click applications.
   - Direct opportunity posting for alumni, faculty, and administrators.

5. **Hackathons & Incubation Cell (`/hackathons`)**
   - Dedicated portal for national contests (Smart India Hackathon, RIT InnoVate) and MSME Incubation grants.
   - Team formation assistance, eligibility checks, prize pool tracking, and direct registration links.

6. **ECE Technical Communities & Labs (`/communities`)**
   - Technical circles including:
     - *VLSI & Chip Design Circle*
     - *Embedded Systems & IoT Club*
     - *Robotics & Automation Wing*
     - *Telecommunications & 5G Forum*
     - *Hardware AI & TinyML Lab*
     - *GATE ECE & Core Placement Prep*
   - Interactive discussion threads and community resource sharing.

7. **Direct Messaging & Real-Time Chat (`/messages`)**
   - Real-time 1-on-1 private messaging powered by WebSockets (Socket.IO).
   - Conversation histories, instant unread alerts, and profile shortcuts.

8. **Departmental Events & Symposia (`/events`)**
   - Department-hosted workshops, guest lectures from industry leaders, and technical conferences.
   - 1-click RSVP and attendance tracking.

9. **Admin & Faculty Command Center (`/admin`)**
   - Real-time platform metrics (Active students, alumni, faculty, posts, opportunities).
   - User roster verification and role management.
   - Department-wide broadcast notices with priority pinning.

10. **Aesthetic Excellence & Theme System**
    - Seamless toggle between Dark and Light themes.
    - Glassmorphism effects, fluid animations, responsive mobile navigation bar, and accessible contrast.

---

## 🚀 Demo Accounts

The database is pre-seeded with realistic profiles and demo data:

| Role | Email | Password | Details |
| :--- | :--- | :--- | :--- |
| **Admin / HOD** | `admin@ritchennai.edu.in` | `password123` | Department Admin with full Command Center access |
| **Alumni (Intel)** | `priya.k@ritchennai.edu.in` | `password123` | Senior Silicon Design Engineer @ Intel |
| **Student** | `kavitha.s@ritchennai.edu.in` | `password123` | Final Year ECE Student (VLSI & Embedded) |
| **Student** | `rahul.m@ritchennai.edu.in` | `password123` | 3rd Year ECE Student (IoT & Robotics) |

---

## 🛠️ Tech Stack & Architecture

- **Frontend**: React 18, React Router v6, Lucide Icons, Custom CSS Design System with CSS variables and responsive glassmorphism.
- **Backend**: Node.js, Express 4, Socket.IO for real-time messaging, Helmet, CORS, Express Rate Limit.
- **Database**: Local JSON File Database (`server/db/data/`) with relational indexing, ensuring zero-dependency, plug-and-play local execution.
- **Tooling**: Vite 5 for instant HMR and optimized production bundles.

---

## 💻 Running the Platform Locally

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Seed the database with sample ECE data**:
   ```bash
   npm run seed
   ```

3. **Start both backend and frontend servers**:
   ```bash
   npm run dev
   ```

4. **Access the application**:
   - **Frontend App**: [http://localhost:3000](http://localhost:3000)
   - **Backend API**: [http://localhost:5000/api](http://localhost:5000/api)
   - **WebSocket Server**: `ws://localhost:5000`
