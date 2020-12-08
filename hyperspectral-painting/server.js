
const WebSocketServer = require('websocket').server;
const fs = require('fs');
const mime = require('mime');
const url = require('url');
const util = require('util');
const http = require('http');

/******************
 *                *
 * The Web Server *
 *                *
 ******************/

 // This buffer stores all commands sent over the websocket, so that we can
 // start new clients off with the latest state of the canvas.
let command_buffer = [];

// PORT to serve our web server
const PORT = 8000;

// Initializing the server
let server = http.createServer(async (req, res) => {
  console.log("Got request!", req.method, req.url);
  
  // get the file path out of the URL, stripping any "query string"
  let path = url.parse(req.url, true).pathname
  
  // then, based on the file path:
  switch (path) {
  case '/': 
  case '/sketch.js': 
  case '/p5.js': 
  case '/p5.min.js': 
  case '/p5.dom.min.js': 
  case '/color.js': 
  case '/style.css': 
  case '/index.html':
  case '/colorPicker_yuhan.js':
  case '/colorPicker_keming.js':
  case '/ColorWheel.png':
    // if it's one of these known files above, then...
    
    // remove any path elements that go "up" in the file hierarchy
    let safePath = path.split('/').filter(e => ! e.startsWith('.')).join('/');
    
    // also. requests without a file path should be served the index.html file.
    if (safePath === '/') {
      safePath = '/index.html';
    }
    
    // try to get the requested file.
    try {
      let fullPath = './src/' + safePath;
      if ((await util.promisify(fs.stat)(fullPath)).isFile()) {
        // if it's a valid file, then serve it! The mime library uses the
        // file extension to figure out the "mimetype" of the file.
        res.writeHead(200, {'Content-Type': mime.getType(safePath)});
        
        // create a "read stream" and "pipe" (connect) it to the response.
        // this sends all the data from the file to the client.
        fs.createReadStream(fullPath).pipe(res);
      } else {
        // if it's not a valid file, return a "404 not found" error.
        console.log("unknown request", path);
        res.writeHead(404, {'Content-Type': 'text/html'});
        res.end("Couldn't find your URL...");
      }
    } catch (err) {
      // if there's an error reading the file, return a 
      // "500 internal server error" error
      console.log("Error reading static file?", err);
      res.writeHead(500, {'Content-Type': 'text/html'});
      res.end("Failed to load something...try again later?");
    }
    break;
  default:
    // if it's not one of the known files above, then return a
    // "404 not found" error.
    console.log("unknown request", path);
    res.writeHead(404, {'Content-Type': 'text/html'});
    res.end("Couldn't find your URL...");
    break;
  }
});

// tell the module to listen on the port we chose.
server.listen(PORT);

/************************
 *                      *
 * The Websocket Server *
 *                      *
 ************************/

// track all the current websocket connections in a set.
let allConnections = new Set();

// run the websocket server off the main web server
let wsServer = new WebSocketServer({
  httpServer: server
});

// when there's a new websocket coming in...
wsServer.on('request', request => {
  // accept the connection
  let connection = request.accept(null, request.origin);
  
  // add it to the set of all connections
  allConnections.add(connection);

  // send all the commands in the command_buffer to the client
  for(let c of command_buffer) {
    connection.send(c);
  }

  // when a message comes in on that connection
  connection.on('message', message => {
    // ignore it if it's not text
    if (message.type !== 'utf8') {
      return;
    }
    
    // get the text out if it is text.
    let messageString = message.utf8Data;
    
    // store the command in the command buffer so that new clients can replay
    // all existing commands. 
    // command_buffer.push(messageString);
    
    // forward the message to other websocket clients
    if (allConnections.size > 1) {
      for (let c of allConnections) {
        if (c !== connection) {
          c.send(messageString);
        }
      }
    }
  });
  
  // when this connection closes, remove it from the set of all connections.
  connection.on('close', connection => {
    allConnections.delete(connection);
  });
});

// all ready! print the port we're listening on to make connecting easier.
console.log("Listening on port", PORT);
