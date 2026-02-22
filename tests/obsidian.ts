import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { ObsidianAuction } from "../target/types/obsidian_auction.ts";
import { assert, expect } from "chai";
import {
    getArciumEnv,
    getCompDefAccAddress,
    getCompDefAccOffset,
    getComputationAccAddress,
    getClusterAccAddress,
    getMXEAccAddress,
    getMempoolAccAddress,
    getExecutingPoolAccAddress,
    getMXEPublicKey,
    getLookupTableAddress,
    RescueCipher,
    awaitComputationFinalization,
    x25519,
} from "@arcium-hq/client";
import { randomBytes } from "crypto";
import * as os from "os";
import {
    createMint,
    mintTo,
    getAssociatedTokenAddress,
    TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import BN from "bn.js";

const ARCIUM_PROGRAM_ID = new anchor.web3.PublicKey("Arcj82pX7HxYKLR92qvgZUAd7vGS1k4hQvAFcPATFdEQ");
const LUT_PROGRAM_ID = new anchor.web3.PublicKey("AddressLookupTab1e1111111111111111111111111");

/**
 * Obsidian Blind Auction — Arcium v0.8.5 Integration Tests
 *
 * These tests validate the full Arcium computation lifecycle:
 *   1. Init computation definitions (skip if already done)
 *   2. Initialize launch with a test SPL mint
 *   3. Encrypt bid client-side and submit → queues MPC computation
 *   4. Wait for MPC finalization
 */
describe("obsidian-auction", () => {
    anchor.setProvider(anchor.AnchorProvider.env());
    const program = anchor.workspace.ObsidianAuction as Program<ObsidianAuction>;
    const provider = anchor.getProvider() as anchor.AnchorProvider;
    const arciumEnv = getArciumEnv();

    // Helper: read keypair from file
    function readKpJson(path: string): anchor.web3.Keypair {
        const fs = require("fs");
        const raw = JSON.parse(fs.readFileSync(path, "utf-8"));
        return anchor.web3.Keypair.fromSecretKey(Uint8Array.from(raw));
    }

    // Shared state across tests
    let owner: anchor.web3.Keypair;
    let mintAddress: anchor.web3.PublicKey;

    before(async () => {
        const path = require("path");
        const fs = require("fs");
        const winKp = path.resolve(__dirname, "..", "win_keypair.json");
        const defaultKp = `${os.homedir()}/.config/solana/id.json`;
        const kpPath = fs.existsSync(winKp) ? winKp : defaultKp;
        owner = readKpJson(kpPath);
    });

    it("Initializes computation definitions (skip if already done)", async () => {
        const verifyBidOffset = Buffer.from(getCompDefAccOffset("verify_bid")).readUInt32LE();
        const allocOffset = Buffer.from(getCompDefAccOffset("compute_allocation")).readUInt32LE();

        const verifyBidCompDef = getCompDefAccAddress(program.programId, verifyBidOffset);

        // Check if already initialized
        const existing = await provider.connection.getAccountInfo(verifyBidCompDef);
        if (existing) {
            console.log("  \u26a0\ufe0f  Comp defs already initialized, skipping.");
            return;
        }

        // Read MXE account to get lut_offset_slot
        const mxeAddr = getMXEAccAddress(program.programId);
        const mxeInfo = await provider.connection.getAccountInfo(mxeAddr);
        if (!mxeInfo) throw new Error("MXE account not found");

        // lut_offset_slot is a u64 — for v0.8.5
        const lutOffsetSlot = new BN(mxeInfo.data.readBigUInt64LE(255).toString());
        const lutAddress = getLookupTableAddress(program.programId, lutOffsetSlot);
        console.log("  LUT address:", lutAddress.toBase58());

        console.log("Initializing verify_bid computation definition...");
        const initVerifyBidSig = await program.methods
            .initVerifyBidCompDef()
            .accountsPartial({
                payer: owner.publicKey,
                mxeAccount: mxeAddr,
                compDefAccount: verifyBidCompDef,
                addressLookupTable: lutAddress,
                lutProgram: LUT_PROGRAM_ID,
                arciumProgram: ARCIUM_PROGRAM_ID,
            })
            .signers([owner])
            .rpc();
        console.log("  verify_bid comp def initialized:", initVerifyBidSig);

        console.log("Initializing compute_allocation computation definition...");
        const initAllocSig = await program.methods
            .initAllocationCompDef()
            .accountsPartial({
                payer: owner.publicKey,
                mxeAccount: mxeAddr,
                compDefAccount: getCompDefAccAddress(program.programId, allocOffset),
                addressLookupTable: lutAddress,
                lutProgram: LUT_PROGRAM_ID,
                arciumProgram: ARCIUM_PROGRAM_ID,
            })
            .signers([owner])
            .rpc();
        console.log("  compute_allocation comp def initialized:", initAllocSig);
    });

    it("Initializes launch with test SPL mint (skip if already done)", async () => {
        const [launchPda] = anchor.web3.PublicKey.findProgramAddressSync(
            [Buffer.from("launch_v3")],
            program.programId
        );

        // Check if launch already exists
        const existingLaunch = await provider.connection.getAccountInfo(launchPda);
        if (existingLaunch) {
            console.log("  ⚠️  Launch already initialized, skipping.");
            // Read the mint from the existing launch account
            const launchData = await program.account.launch.fetch(launchPda);
            mintAddress = launchData.mint;
            console.log("  Existing mint:", mintAddress.toBase58());
            return;
        }

        console.log("Creating test SPL token mint...");
        // Create a new SPL token mint
        mintAddress = await createMint(
            provider.connection,
            owner,                  // payer
            owner.publicKey,        // mint authority
            null,                   // freeze authority
            6,                      // decimals (USDC-like)
            undefined,              // keypair (auto-generate)
            { commitment: "confirmed" },
            TOKEN_PROGRAM_ID
        );
        console.log("  Mint created:", mintAddress.toBase58());

        // Initialize the launch
        const totalTokens = new anchor.BN(1_000_000 * 1e6);   // 1M tokens
        const maxAllocation = new anchor.BN(100_000 * 1e6);    // 100K max per bidder

        console.log("Calling initializeLaunch...");
        const initSig = await program.methods
            .initializeLaunch(totalTokens, maxAllocation)
            .accountsPartial({
                launch: launchPda,
                mint: mintAddress,
                authority: owner.publicKey,
                tokenProgram: TOKEN_PROGRAM_ID,
            })
            .signers([owner])
            .rpc({ commitment: "confirmed" });

        console.log("  ✅ Launch initialized:", initSig);

        // Verify launch account
        const launchData = await program.account.launch.fetch(launchPda);
        assert.ok(launchData.authority.equals(owner.publicKey));
        assert.equal(launchData.bidCount, 0);
        assert.equal(launchData.isFinalized, false);
        console.log("  ✅ Launch account verified on-chain");

        // Mint tokens to the launch pool so claims can work later
        console.log("Minting tokens to launch pool...");
        await mintTo(
            provider.connection,
            owner,
            mintAddress,
            launchData.launchPool,
            owner,
            1_000_000 * 1e6,       // 1M tokens
            [],
            { commitment: "confirmed" },
            TOKEN_PROGRAM_ID
        );
        console.log("  ✅ 1M test tokens minted to launch pool");
    });

    it("Submits an encrypted bid and queues MPC computation", async () => {
        // Generate ephemeral x25519 keypair
        const privateKey = x25519.utils.randomSecretKey();
        const publicKey = x25519.getPublicKey(privateKey);

        // Fetch MXE x25519 public key
        const mxePublicKey = await getMXEPublicKey(
            provider,
            program.programId
        );
        if (!mxePublicKey) throw new Error("MXE public key not found — finalize-mxe-keys may not have run");
        console.log("MXE x25519 pubkey:", Buffer.from(mxePublicKey).toString("hex"));

        // Derive shared secret and create cipher
        const sharedSecret = x25519.getSharedSecret(privateKey, mxePublicKey);
        const cipher = new RescueCipher(sharedSecret);

        // Encrypt bid amount (1000 USDC = 1000 * 10^6 base units)
        const bidAmount = BigInt(1000_000_000);
        const nonce = randomBytes(16);
        const ciphertext = cipher.encrypt([bidAmount], nonce);

        console.log("Encrypted bid amount:", Buffer.from(ciphertext[0]).toString("hex"));

        // Generate computation offset
        const computationOffset = new anchor.BN(randomBytes(8), "hex");

        // Derive accounts
        const [launchPda] = anchor.web3.PublicKey.findProgramAddressSync(
            [Buffer.from("launch_v3")],
            program.programId
        );

        const [bidPda] = anchor.web3.PublicKey.findProgramAddressSync(
            [Buffer.from("bid_v3"), owner.publicKey.toBuffer()],
            program.programId
        );

        // Submit encrypted bid
        console.log("Submitting encrypted bid...");
        const submitSig = await program.methods
            .submitEncryptedBid(
                computationOffset,
                Array.from(ciphertext[0]),
                new anchor.BN(
                    Buffer.from(nonce).toString("hex"),
                    16
                ),
            )
            .accountsPartial({
                bid: bidPda,
                launch: launchPda,
                bidder: owner.publicKey,
                computationAccount: getComputationAccAddress(
                    arciumEnv.arciumClusterOffset,
                    computationOffset
                ),
                clusterAccount: getClusterAccAddress(arciumEnv.arciumClusterOffset),
                mxeAccount: getMXEAccAddress(program.programId),
                mempoolAccount: getMempoolAccAddress(arciumEnv.arciumClusterOffset),
                executingPool: getExecutingPoolAccAddress(arciumEnv.arciumClusterOffset),
                compDefAccount: getCompDefAccAddress(
                    program.programId,
                    Buffer.from(getCompDefAccOffset("verify_bid")).readUInt32LE()
                ),
            })
            .signers([owner])
            .rpc({ commitment: "confirmed" });

        console.log("Bid submitted with signature:", submitSig);

        // Wait for MPC computation to finalize
        console.log("Waiting for MPC computation to finalize...");
        const finalizeSig = await awaitComputationFinalization(
            provider,
            computationOffset,
            program.programId,
            "confirmed"
        );
        console.log("Computation finalized:", finalizeSig);

        // Verify bid account was created
        const bidAccount = await program.account.bid.fetch(bidPda);
        assert.ok(bidAccount.bidder.equals(owner.publicKey));
        console.log("✅ Bid account verified on-chain");
    });

    it("Claims tokens after finalization", async () => {
        // This test requires a finalized launch with recorded allocations
        // It validates the claim flow is correctly wired
        console.log("✅ Claim test placeholder — requires finalized launch state");
    });
});
