const fs = require('fs');
const path = require('path');

const serverPath = path.join(__dirname, '..', 'server.js');
let content = fs.readFileSync(serverPath, 'utf8');

// Regex to match the rateLimit configuration block
// We look for "const limiter = rateLimit({" and end with "});"
// We'll be careful to capture the closing brace and parenthesis.
const regex = /const limiter = rateLimit\(\{[\s\S]*?\}\);/;

const newLimiter = `const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 1000, 
  message: { success: false, message: "Demasiadas peticiones, intenta más tarde." },
  standardHeaders: true, 
  legacyHeaders: false,
});`;

if (regex.test(content)) {
    console.log('Found rateLimit block. Replacing...');
    content = content.replace(regex, newLimiter);
    fs.writeFileSync(serverPath, content);
    console.log('Successfully patched server.js');
} else {
    console.error('Could not find rateLimit block with regex.');
    // Fallback: Try to find just the max property if the block is different
    // But let's see output first.
    console.log('Content preview:', content.substring(0, 500));
}
