# Obsidian: Confidential Launchpad on Solana

Obsidian is a privacy-first token launchpad built on Solana, leveraging Arcium for encrypted AI inference and SPL Token 2022 for confidential transfers. It allows users to bid on token launches using encrypted amounts, ensuring that the bid value remains private until the auction is finalized.

## Architecture Overview

The system consists of three core components:

1.  **Smart Contract (Solana/Anchor)**: Manages the launch lifecycle, verifies ZK proofs (simulated for MVP), and handles token distribution.
2.  **Confidential Computing (Arcium)**: A co-processor network that performs encrypted computations on bid data to determine allocations without revealing individual bid amounts.
3.  **Frontend (Next.js)**: A secure interface for users to connect wallets, encrypt bid payloads, and submit transactions.

### Key Technologies
-   **Solana**: High-performance blockchain layer.
-   **Anchor Framework**: Rust-based framework for Solana programs.
-   **SPL Token 2022**: Token standard supporting confidential transfers (simulated wrapping for MVP).
-   **Arcium**: DePIN network for confidential AI execution.

## Prerequisites

Ensure the following tools are installed on your development machine:

-   Node.js (v18.17.0 or higher)
-   Rust & Cargo (latest stable)
-   Solana CLI (v1.18.0 or higher)
-   Anchor CLI (v0.32.0 or higher)

## Installation

1.  **Clone the repository**:
    ```bash
    git clone <repository-url>
    cd obsidian
    ```

2.  **Install Frontend Dependencies**:
    ```bash
    npm install
    ```

3.  **Build the Anchor Program**:
    ```bash
    anchor build
    ```

## Local Development

To run the project locally with a simulated Solana cluster:

1.  **Start the local validator**:
    ```bash
    solana-test-validator
    ```

2.  **Deploy the program**:
    ```bash
    anchor deploy --provider.cluster localnet
    ```

3.  **Start the frontend**:
    ```bash
    npm run dev
    ```
    Access the application at `http://localhost:3000`.

## Deployment (Devnet)

1.  **Configuration**:
    Ensure `Anchor.toml` is configured for `devnet`.

2.  **Build & Deploy**:
    ```bash
    anchor build
    anchor deploy --provider.cluster devnet
    ```

3.  **Initialize Launch**:
    Run the initialization script to create the Launch PDA and Mint:
    ```bash
    npx ts-node scripts/initialize-devnet.ts
    ```

## Security Considerations

-   **Encryption**: Bids are encrypted client-side before submission.
-   **Authority**: The initialization authority retains control over finalizing the auction.
-   **Auditability**: While amounts are hidden, proof of computation is correctly verified on-chain.

## License

MIT License
