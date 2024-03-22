const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const dns = require('dns').promises;
const fs = require('fs');
const readline = require('readline');
const { format } = require('date-fns');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const extensions = ['.com'];
//const extensions = ['.com', '.co.uk', '.uk'];
const csvFileName = 'available_domains.csv';
const delayBetweenChecks = 3000; // Delay in milliseconds (e.g., 3000ms = 3 seconds)
const minLetterCount = 3;
const maxLetterCount = 4;

// Initialize the CSV file with headers
fs.writeFileSync(csvFileName, 'Date,Domain,Status\n');

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('start checking domains', async () => {
    const fileStream = fs.createReadStream('words.txt');
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    for await (const line of rl) {
      const word = line.trim();
      // Only proceed if the word is 3 to 4 letters long
      if (word.length >= minLetterCount && word.length <= maxLetterCount) {
        for (const extension of extensions) {
          const domain = word + extension;
          socket.emit('checking domain', domain);
          try {
            await dns.lookup(domain);
            // socket.emit('domain status', `${domain} exists.`);
            // writeToCSV(domain, 'Exists');
          } catch (error) {
            socket.emit('domain status', `${domain} does not exist or may be available.`);
            writeToCSV(domain, 'Available');
          }
          // Wait for the specified delay before continuing to the next domain check
          await sleep(delayBetweenChecks);
        }
      }
    }
    socket.emit('checking finished', 'All domains have been checked.');
  });
});

function writeToCSV(domain, status) {
  const date = format(new Date(), 'yyyy-MM-dd');
  const line = `${date},${domain},${status}\n`;
  fs.appendFile(csvFileName, line, (err) => {
    if (err) {
      console.error('Failed to write to CSV:', err);
    }
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

server.listen(3000, () => {
  console.log('Listening on *:3000');
});
