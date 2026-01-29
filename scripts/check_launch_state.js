const anchor = require('@coral-xyz/anchor');
const { PublicKey, Keypair } = require('@solana/web3.js');
const fs = require('fs');
const path = require('path');

async function main() {
    const connection = new anchor.web3.Connection('https://api.devnet.solana.com', 'confirmed');
    const walletKeypair = Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync(path.resolve(__dirname, '../win_keypair.json'), 'utf-8'))));
    const wallet = new anchor.Wallet(walletKeypair);
    const provider = new anchor.AnchorProvider(connection, wallet, { commitment: 'confirmed' });
    anchor.setProvider(provider);

    const idl = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../src/utils/obsidian-idl.json'), 'utf-8'));
    const program = new anchor.Program(idl, provider);
    const programId = new PublicKey('BRGaXJJS6oHN1pBPnMhZQHtSfBLmVyYk75xqetsRfib9');

    console.log('=== Checking Launch State (v2 seed) ===');
    const [launchPda] = PublicKey.findProgramAddressSync([Buffer.from('launch')], programId);
    console.log('Launch PDA:', launchPda.toBase58());

    try {
        const launch = await program.account.launch.fetch(launchPda);
        console.log('\n✅ Launch EXISTS with v2 seed!');
        console.log('- isFinalized:', launch.isFinalized);
        console.log('- totalTokens:', launch.totalTokens.toString());
        console.log('- tokensDistributed:', launch.tokensDistributed.toString());
        console.log('- bump:', launch.bump);
        console.log('- mint:', launch.mint.toBase58());
        console.log('- authority:', launch.authority.toBase58());
    } catch (e) {
        console.log('\n❌ Launch NOT found with v2 seed');
        console.log('Error:', e.message);
    }
}
main().catch(console.error);
