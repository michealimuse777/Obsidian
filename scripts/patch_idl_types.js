const fs = require('fs');
const path = require('path');

const IDL_PATH = path.resolve(__dirname, "../src/utils/obsidian-idl.json");
const idl = JSON.parse(fs.readFileSync(IDL_PATH, "utf-8"));

// 1. Patch Bid Struct
const bidType = idl.types.find(t => t.name === "Bid");
if (bidType) {
    const fields = bidType.type.fields;
    // Check if allocation exists
    if (!fields.find(f => f.name === "allocation")) {
        console.log("Patching Bid struct: Adding allocation & is_claimed...");
        fields.push({ name: "allocation", type: "u64" });
        fields.push({ name: "is_claimed", type: "bool" });
        // NOTE: In Rust, struct order matters.
        // Bid: bidder, encrypted_data, is_processed, allocation, is_claimed.
        // The Array push appends to end, which matches Rust declaration order.
    }
}

// 2. Patch Launch Struct
const launchType = idl.types.find(t => t.name === "Launch");
if (launchType) {
    const fields = launchType.type.fields;
    // Check if bump exists (it might, saw it in Step 3405 view - line 261)
    // "name": "bump", "type": "u8"
    // Wait, Step 3405 SHOWED bump!
    // Let's double check Step 3405 content for Bid.
    // Line 270: Bid struct fields: bidder, encrypted_data, is_processed.
    // IT STOPS THERE.

    // Launch struct fields: authority...bump.
    // Launch struct seems up to date?
    // Wait, why? Maybe I updated Launch earlier?
    // Or maybe the IDL I copied (target/idl/obsidian.json) WAS partially updated?

    // Regardless, Bid is definitely missing fields.
}

fs.writeFileSync(IDL_PATH, JSON.stringify(idl, null, 2));
console.log("IDL Types Patched.");
