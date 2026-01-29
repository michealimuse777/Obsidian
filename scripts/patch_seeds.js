const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../programs/obsidian/src/lib.rs');
console.log(`Patching: ${filePath}`);

let content = fs.readFileSync(filePath, 'utf8');

// Replace all instances of b"launch" with b"launch_v1"
// We use a global regex.
const newContent = content.replace(/b"launch"/g, 'b"launch_v1"');

if (content === newContent) {
    console.log("No changes made (already patched?).");
} else {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log("Successfully patched seeds to 'launch_v1'.");
}
