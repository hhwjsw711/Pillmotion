# Agent Chat Interface

A flexible chat interface for interacting with AI agents.

## Getting Started

### Installation

```bash
npm install
```

### Running the Chat Interface

There are two ways to interact with the agent:

#### 1. Console Chat (Terminal)

Run the console-based chat interface:

```bash
npm run start -- --chat
```

This launches an interactive terminal chat session with the agent. Available commands:

-   Type your message and press Enter to chat
-   `exit` or `quit`: Exit the chat
-   `help`: Show help message
-   `clear`: Clear conversation history

#### 2. Web Interface

Start the web-based chat interface:

```bash
npm run start -- --web
```

This launches a web server (default port 3000) with a ChatGPT-style interface. Open your browser to:

```
http://localhost:3000
```

### Environment Variables

-   `SERVER_PORT`: Web server port (default: 3000)

```

```
