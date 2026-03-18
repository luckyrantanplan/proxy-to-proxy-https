#!/usr/bin/env node
import http from 'node:http';

const DIRECT_PORT = 8082;
const PROXY_PORT = 8083;

const serverDirect = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('function FindProxyForURL(url, host) {return "DIRECT"; }\n');
});

serverDirect.listen(DIRECT_PORT, 'localhost', () => {
  console.log(`Server direct running at ${DIRECT_PORT}`);
});

const serverProxy = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('function FindProxyForURL(url, host) {return "PROXY localhost:8084";}\n');
});

serverProxy.listen(PROXY_PORT, 'localhost', () => {
  console.log(`Server proxy running at ${PROXY_PORT}`);
});
