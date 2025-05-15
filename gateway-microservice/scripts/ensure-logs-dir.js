// scripts/ensure-logs-dir.js
const fs = require('fs');
const path = require('path');

const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
    console.log('Logs directory created');
} else {
    console.log('Logs directory already exists');
}