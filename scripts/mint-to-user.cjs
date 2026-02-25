const { PublicKey, Connection, Keypair } = require('@solana/web3.js');
const { Program, AnchorProvider, Wallet } = require('@coral-xyz/anchor');
const { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, createMintToInstruction, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } = require('@solana/spl-token');
const fs = require('fs');

async function main() {
    const pid = new PublicKey('CsS69vzRAZ4dJXFg68tTnP2ei4XCbYzPENdzQnBWU5Ua');
    const [launchPda] = PublicKey.findProgramAddressSync([Buffer.from('launch_v3')], pid);
    const conn = new Connection('https://devnet.helius-rpc.com/?api-key=f0d2c504-70d7-4e0a-9a16-ed251386301a');

    const raw = JSON.parse(fs.readFileSync('win_keypair.json', 'utf-8'));
    const owner = Keypair.fromSecretKey(Uint8Array.from(raw));
    const wallet = new Wallet(owner);
    const provider = new AnchorProvider(conn, wallet, { commitment: 'confirmed' });
    const idl = JSON.parse(fs.readFileSync('target/idl/obsidian.json', 'utf-8'));
    const program = new Program(idl, provider);

    const launch = await program.account.launch.fetch(launchPda);
    const mint = launch.mint;
    console.log('Mint:', mint.toBase58());

    const recipient = new PublicKey('3Vyn8g2avGj3EaWDv1mCfo5Qd72XttvTHWCmgcH7EWSw');
    const ata = await getAssociatedTokenAddress(mint, recipient, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
    console.log('Recipient ATA:', ata.toBase58());

    // Check if ATA exists
    const ataInfo = await conn.getAccountInfo(ata);

    const { Transaction } = require('@solana/web3.js');
    const tx = new Transaction();

    if (!ataInfo) {
        console.log('Creating ATA for recipient...');
        tx.add(createAssociatedTokenAccountInstruction(
            owner.publicKey, ata, recipient, mint, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID
        ));
    }

    // Mint 10,000 tokens (6 decimals)
    const amount = 10_000 * 1e6;
    tx.add(createMintToInstruction(mint, ata, owner.publicKey, amount, [], TOKEN_PROGRAM_ID));

    const sig = await provider.sendAndConfirm(tx, [owner]);
    console.log('Minted', amount / 1e6, 'tokens to', recipient.toBase58());
    console.log('Signature:', sig);
}
main().catch(console.error);
