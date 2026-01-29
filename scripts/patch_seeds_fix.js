const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../programs/obsidian/src/lib.rs');
console.log(`Patching: ${filePath}`);

let content = fs.readFileSync(filePath, 'utf8');

// Replace all instances of b"launch_v2" with b"launch_v1"
const newContent = content.replace(/b"launch_v2"/g, 'b"launch_v1"');

if (content === newContent) {
    console.log("No 'launch_v2' found to patch.");
} else {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log("Successfully patched 'launch_v2' -> 'launch_v1'.");
}
