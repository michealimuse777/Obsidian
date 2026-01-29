const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const IDL_PATH = path.resolve(__dirname, "../src/utils/obsidian-idl.json");

function getDiscriminator(name) {
    const preimage = `global:${name}`;
    const hash = crypto.createHash('sha256').update(preimage).digest();
    return Array.from(hash.slice(0, 8));
}

const newInstructions = [
    {
        name: "record_allocation",
        discriminator: getDiscriminator("record_allocation"),
        accounts: [
            { name: "bid", writable: true, signer: false },
            { name: "launch", writable: false, signer: false },
            { name: "authority", writable: false, signer: true }
        ],
        args: [
            { name: "amount", type: "u64" }
        ]
    },
    {
        name: "finalize_launch",
        discriminator: getDiscriminator("finalize_launch"),
        accounts: [
            { name: "launch", writable: true, signer: false },
            { name: "authority", writable: false, signer: true }
        ],
        args: []
    },
    {
        name: "claim_tokens",
        discriminator: getDiscriminator("claim_tokens"),
        accounts: [
            { name: "bid", writable: true, signer: false },
            { name: "launch", writable: true, signer: false },
            { name: "launch_pool", writable: true, signer: false },
            { name: "mint", writable: false, signer: false },
            { name: "user_ata", writable: true, signer: false },
            { name: "user", writable: false, signer: true },
            { name: "token_program", writable: false, signer: false }
        ],
        args: []
    }
];

const idl = JSON.parse(fs.readFileSync(IDL_PATH, "utf-8"));

// Check if already exists
const existingNames = new Set(idl.instructions.map(i => i.name));

let addedCount = 0;
for (const instr of newInstructions) {
    if (!existingNames.has(instr.name)) {
        idl.instructions.push(instr);
        console.log(`Added instruction: ${instr.name}`);
        addedCount++;
    } else {
        console.log(`Instruction already exists: ${instr.name}`);
    }
}

if (addedCount > 0) {
    fs.writeFileSync(IDL_PATH, JSON.stringify(idl, null, 2));
    console.log("IDL Patched successfully.");
} else {
    console.log("No changes needed.");
}
