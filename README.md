# Welcome to the Y STEM and Chess Project

This is an educational platform combining chess instruction with STEM learning, aimed at supporting socially and economically underserved students. It helps learners who benefit from alternative approaches by providing chess tutoring alongside mathematics, computer science, and mentoring. The platform is built with React and Node.js and integrates the Stockfish chess engine for gameplay.

## Development Environment Setup

To run the platform, you’ll need **Node.js v18** installed. **Nodemon** is optional and can be used to automatically restart servers when code changes, which is convenient during development.

### Node.js

---

This project requires **Node.js v18.20.8**. Using a version manager ensures consistent Node versions across contributors.

#### Option 1: Using [Volta](https://volta.sh) (recommended)

Volta automatically uses the Node version pinned in this project’s `package.json`.

**Install Volta:**

* **Linux / macOS**

```bash
curl https://get.volta.sh | bash
source ~/.bashrc  # or ~/.zshrc
```

* **Windows**
  Download and run the installer from [volta.sh](https://volta.sh).

Volta will automatically install and use **Node.js v18.20.8** when you cd into the project.

#### Option 2: Using [nvm](https://github.com/nvm-sh/nvm)

If you prefer nvm:

* **Linux / macOS**

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.nvm/nvm.sh
nvm install 18.20.8
nvm use 18.20.8
nvm alias default 18.20.8  # optional
```

* **Windows**
  Use [nvm-windows](https://github.com/coreybutler/nvm-windows/releases).

```powershell
nvm install 18.20.8
nvm use 18.20.8
```

### Nodemon (Optional)

---

Nodemon can be installed globally to automatically restart servers when code changes:

```bash
npm install -g nodemon
```

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/YSTEMandChess/react.git
cd react
```

### 2. Environment Setup

Before running any services, create the local development environment from the **project root directory**:

```bash
./create_dev_envs.sh
```

Copy `middlewareNode/.env.example` to `middlewareNode/.env` and fill in your local values. A committed `middlewareNode/config/default.js` already provides safe, non-secret defaults, nothing needs to be handed to you separately.


## Running Each Service

Each service runs independently in its own terminal window. Start the Middleware API first, then the other services in any order.

### Middleware API (Backend)

Handles user authentication, database operations, and coordinates other services.

```bash
cd middlewareNode
npm install   
npm start      
```

The server typically runs on port 8000. You should see `"MongoDB Connected..."` when it starts successfully.

To create local mentor and student demo accounts, run:

```bash
npm run seed:dev
```

This generates a brand-new random password for both accounts every time it runs and prints them to your terminal. Passwords are never committed or written to a file, and re-running the command rotates both passwords. This only works outside of a production environment.

### Main React Application (Frontend)

Primary interface for students and mentors.

```bash
cd react-ystemandchess
npm install
npm start
```

Once started, the React application is accessible at `http://localhost:3000` (or the next available port if 3000 is occupied).

### Chess Game Server

Manages chess game logic, validates moves, and handles real-time gameplay.

```bash
cd chessServer
npm install
npm start      
```

The server runs on port 3001.

### Chess Engine Server

Integrates Stockfish for AI opponents and move analysis.

```bash
cd stockfishServer
npm install
npm start
```

The server runs on port 8080.

---

## Contributing

1. Create a new branch with a descriptive name:

```bash
git checkout -b branch-name
```

2. Test thoroughly to ensure all services work together.
3. Commit changes with clear messages.
4. Push and create a Pull Request for review.

---

You're all set! Happy coding, and thank you for contributing to educational equity! 🎯♟️
