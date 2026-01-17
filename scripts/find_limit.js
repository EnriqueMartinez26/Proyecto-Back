const fs = require('fs');
const content = fs.readFileSync('server.js', 'utf8');
const lines = content.split('\n');
lines.forEach((line, index) => {
    if (line.includes('rateLimit')) {
        console.log(`Line ${index + 1}: ${line}`);
        // Print next 15 lines to capture the config object
        for (let i = 1; i <= 15; i++) {
            if (lines[index + i]) console.log(`Line ${index + 1 + i}: ${lines[index + i]}`);
        }
    }
});
