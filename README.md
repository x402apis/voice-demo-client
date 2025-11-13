<!-- @format -->

# x402 Voice Agent Demo

[![x402 Protocol](https://img.shields.io/badge/Powered%20by-x402%20Protocol-blue.svg)](https://github.com/x402-apis)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

This repository contains a demonstration of a real-time AI voice agent, powered by the **x402 Protocol**. It showcases how to use Solana for pay-per-call micropayments to access traditional Web2 APIs like Deepgram, effectively bridging the gap between Web3 and Web2 services.

**Live Demo:** [https://voice-demo-client.vercel.app/](https://voice-demo-client.vercel.app/)

Application Screenshot

## The Core Concept

Traditional APIs require credit cards, monthly subscriptions, and user accounts. This demo proves a different model:

- **No Sign-ups, No Credit Cards:** Users interact directly from their Solana wallet.
- **Pay-Per-Use:** A small SOL payment is made for a single, time-limited session.
- **Decentralized Access:** The frontend client discovers and connects to a network of independent "Provider Nodes."
- **Web3 Bridge to Web2:** The Provider Node takes the Web3 payment and uses its own traditional API keys to pay for the Web2 service (Deepgram) on the user's behalf.

## How It Works: The End-to-End Flow

This demo illustrates the power of the x402 protocol to create a decentralized marketplace for APIs.
It leverages Parallax for the LLM layer and Deepagram for STT and TTS. OpenAI is also an option as the LLM.

![Flow Diagram](./docs/flow-diagram.png)
_(**Note:** You can create a simple diagram and add it to a `/docs` folder.)_

1.  **Wallet Connection:** The user connects their Solana wallet to the Next.js frontend.
2.  **Provider Discovery:** When the user clicks "Start Call," the `@x402apis/client` SDK queries the **x402 Registry** to find available providers that offer the `deepgram.agent.createSession` API.
3.  **Web3 Payment:** The client selects a provider and sends a small SOL payment directly to the provider's wallet on the Solana network.
4.  **Provider Bridge:** The independent **Provider Node** receives the payment. It then uses its own private Deepgram API key to create a new AI agent session.
5.  **Session Proxy:** The provider returns a temporary session token and a WebSocket URL to the client. It then securely proxies the real-time audio stream between the user and Deepgram for the duration of the session.

## Tech Stack

This project consists of two main parts: the client-side UI and the server-side provider node.

- **Frontend (Client):**

  - [Next.js](https://nextjs.org/) (React Framework)
  - [TypeScript](https://www.typescriptlang.org/)
  - [Tailwind CSS](https://tailwindcss.com/)
  - [@solana/wallet-adapter](https://github.com/solana-labs/wallet-adapter) for wallet integration.
  - [@x402apis/client](https://github.com/x402-apis/client) for discovering and paying providers.

- **Backend (Provider Node):**

  - [@x402apis/node](https://github.com/x402-apis/node) (Provider server framework)
  - [Express.js](https://expressjs.com/)
  - [WebSocket (`ws`)](https://github.com/websockets/ws) for real-time audio streaming.
  - [Deepgram](https://deepgram.com/) for the AI voice agent (STT, LLM, TTS).

- **Web3 Infrastructure:**
  - [Solana](https://solana.com/) for fast, low-cost payments.
  - [x402 Protocol](https://github.com/x402-apis) for the decentralized API registry and routing.

## Getting Started

To run this demo locally, you will need to set up both the provider and the client.

### Prerequisites

- [Node.js](https://nodejs.org/en/) (v18 or later)
- [npm]
- A Solana wallet (e.g., Phantom) with some Devnet SOL. You can get some from a [faucet](https://faucet.solana.com/).

### 1. Set Up the Provider Node

The provider node is the backend server that gets paid to serve the API.

```bash
# Navigate to the provider directory
cd voice-demo-client

# Install dependencies
npm install

# Copy the example environment file
cp .env.example .env
```

Open `.env` and configure the variables:

- `NEXT_PUBLIC_REGISTRY_URL`: The URL of the x402 registry. For local testing, this will point to your Next.js API route that acts as a mock registry if you have one.
- `NEXT_PUBLIC_SOLANA_RPC_HOST`: The Solana RPC endpoint. For development, use the Devnet URL: `https://api.devnet.solana.com`.

### 2. Run the UI

ThisThe client is the Next.js frontend that users interact with.

```bash
npm run dev
```

- **Client:** The Next.js frontend is optimized for deployment on [Vercel](https://vercel.com/).
- **Provider Node:** The provider node is a long-running server process and is well-suited for platforms like [Railway](https://railway.app/), Render, or any VPS.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
