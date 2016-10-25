var http = require('http');

var directPort=8082;
var proxyPort=8083;


const server = http.createServer((req, res) => {
	res.statusCode = 200;
	res.setHeader('Content-Type', 'text/plain');
	res.end('function FindProxyForURL(url, host) {return "DIRECT"; }\n');
});

server.listen(directPort, 'localhost', () => {
	console.log('Server direct running at '+directPort);
});


const serverProxy = http.createServer((req, res) => {
	res.statusCode = 200;
	res.setHeader('Content-Type', 'text/plain');
	res.end('function FindProxyForURL(url, host) {return "PROXY localhost:8084";}\n');
});

serverProxy.listen(proxyPort, 'localhost', () => {
	console.log('Server proxy running at '+proxyPort);
});

 
