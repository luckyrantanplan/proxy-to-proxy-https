#!/usr/bin/env node
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { QuickJS } from 'quickjs-wasi';
import { createPacResolver } from 'pac-resolver';

// Intentionally disabled TLS certificate verification so the proxy can relay traffic through
// corporate proxies that use self-signed or private CA certificates. Only enable this tool
// in a trusted network environment. Do NOT use this on untrusted networks.
// nosemgrep: nodejs_security.audit.security-tls-client-insecure
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // lgtm[js/disabling-certificate-validation]

const require = createRequire(import.meta.url);
const wasmPath = join(dirname(require.resolve('quickjs-wasi')), '..', 'quickjs.wasm');

let debugging = false;
let FindProxyForURL;
let authHeader;
let httpsDecode = false;

const REGEX_HOSTPORT = /^([^:]+)(:([0-9]+))?$/;
const REGEX_PAC_PROXY = /\S+\b(\S+)/;

/**
 * Extract the proxy host:port string from a PAC result such as "PROXY host:port".
 * @param {string} data - PAC result string
 * @returns {string}
 */
function getUrlHeader(data) {
  return REGEX_PAC_PROXY.exec(data)[0];
}

/**
 * Parse a "host" or "host:port" string into [host, port].
 * @param {string} hostString
 * @param {number} defaultPort
 * @returns {[string, string|number]}
 */
function getHostPortFromString(hostString, defaultPort) {
  let host = hostString;
  let port = defaultPort;
  const result = REGEX_HOSTPORT.exec(hostString);
  if (result !== null) {
    host = result[1];
    if (result[2] != null) {
      port = result[3];
    }
  }
  return [host, port];
}

function printHeaderRequestHttp(userRequest) {
  console.log(`${userRequest.method} ${userRequest.url} HTTP/${userRequest.httpVersion}\r\n`);
  console.log(JSON.stringify(userRequest.headers, null, 4));
}

function printHeaderResponseHttp(response) {
  console.log(`HTTP/${response.httpVersion} ${response.statusCode} ${response.statusMessage}\r\n`);
  console.log(JSON.stringify(response.headers, null, 4));
}

/**
 * Handle plain HTTPS requests forwarded through the proxy.
 * @param {http.IncomingMessage} userRequest
 * @param {http.ServerResponse} userResponse
 */
async function httpsRequest(userRequest, userResponse) {
  try {
    printHeaderRequestHttp(userRequest);
    const hostport = getHostPortFromString(userRequest.headers['host'], 443);
    const res = await FindProxyForURL(userRequest.url, hostport[0]);

    let options;
    if (res === 'DIRECT') {
      let path = userRequest.url;
      const match = /^[a-zA-Z]+:\/\/[^/]+(\/.*)?$/.exec(userRequest.url);
      if (match) {
        path = match[1]?.length > 0 ? match[1] : '/';
      }
      delete userRequest.headers['Proxy-Authorization'];
      options = {
        host: hostport[0],
        port: hostport[1],
        method: userRequest.method,
        path,
        agent: userRequest.agent,
        auth: userRequest.auth,
        headers: userRequest.headers,
      };
    } else {
      const overHeader = { ...userRequest.headers, 'Proxy-Authorization': authHeader };
      const proxyHostport = getHostPortFromString(getUrlHeader(res), 443);
      const agent = new HttpsProxyAgent(`http://${proxyHostport[0]}:${proxyHostport[1]}`);
      options = {
        host: hostport[0],
        port: hostport[1],
        path: userRequest.url,
        agent,
        headers: overHeader,
      };
    }

    const proxyRequest = https.request(options, (proxyResponse) => {
      printHeaderResponseHttp(proxyResponse);
      userResponse.writeHead(proxyResponse.statusCode, proxyResponse.headers);
      proxyResponse.pipe(userResponse);
    });

    proxyRequest.on('error', (error) => {
      userResponse.writeHead(500);
      userResponse.end(
        `<h1>500 Error</h1>\r\n<p>Error was <pre>${error}</pre></p>\r\n</body></html>\r\n`,
      );
    });

    userRequest.pipe(proxyRequest);
  } catch (err) {
    console.error('httpsRequest error:', err);
    if (!userResponse.headersSent) {
      userResponse.writeHead(500);
    }
    userResponse.end();
  }
}

/**
 * Handle plain HTTP requests forwarded through the proxy.
 * @param {http.IncomingMessage} userRequest
 * @param {http.ServerResponse} userResponse
 */
async function httpUserRequest(userRequest, userResponse) {
  try {
    printHeaderRequestHttp(userRequest);
    const hostport = getHostPortFromString(userRequest.headers['host'], 80);
    const res = await FindProxyForURL(userRequest.url, hostport[0]);

    let options;
    if (res === 'DIRECT') {
      let path = userRequest.url;
      const match = /^[a-zA-Z]+:\/\/[^/]+(\/.*)?$/.exec(userRequest.url);
      if (match) {
        path = match[1]?.length > 0 ? match[1] : '/';
      }
      delete userRequest.headers['Proxy-Authorization'];
      options = {
        host: hostport[0],
        port: hostport[1],
        method: userRequest.method,
        path,
        agent: userRequest.agent,
        auth: userRequest.auth,
        headers: userRequest.headers,
      };
    } else {
      const overHeader = { ...userRequest.headers, 'Proxy-Authorization': authHeader };
      const hp = getHostPortFromString(getUrlHeader(res), 80);
      options = {
        host: hp[0],
        port: hp[1],
        path: userRequest.url,
        headers: overHeader,
      };
    }

    const proxyRequest = http.request(options, (proxyResponse) => {
      printHeaderResponseHttp(proxyResponse);
      userResponse.writeHead(proxyResponse.statusCode, proxyResponse.headers);
      proxyResponse.pipe(userResponse);
    });

    proxyRequest.on('error', (error) => {
      userResponse.writeHead(500);
      userResponse.end(
        `<h1>500 Error</h1>\r\n<p>Error was <pre>${error}</pre></p>\r\n</body></html>\r\n`,
      );
    });

    userRequest.pipe(proxyRequest);
  } catch (err) {
    console.error('httpUserRequest error:', err);
    if (!userResponse.headersSent) {
      userResponse.writeHead(500);
    }
    userResponse.end();
  }
}

/**
 * Fetch the PAC file contents from a URL (supports http:// and https://).
 * @param {string} url
 * @returns {Promise<string>}
 */
function fetchPacFile(url) {
  const transport = url.startsWith('https://') ? https : http;
  return new Promise((resolve, reject) => {
    const req = transport.get(url, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      response.on('error', reject);
    });
    req.on('error', reject);
  });
}

async function main() {
  let port = 5555;
  let urlProxyPac = '';
  let password;
  let login;
  let certificateKey = 'selfsigned.key';
  let certificate = 'selfsigned.crt';

  for (let argn = 2; argn < process.argv.length; argn++) {
    switch (process.argv[argn]) {
      case '-p':
        port = parseInt(process.argv[++argn], 10);
        break;
      case '-P':
        urlProxyPac = process.argv[++argn];
        break;
      case '-l':
        login = process.argv[++argn];
        break;
      case '-pass':
        password = process.argv[++argn];
        break;
      case '-cert':
        certificate = process.argv[++argn];
        break;
      case '-certKey':
        certificateKey = process.argv[++argn];
        break;
      case '-d':
        debugging = true;
        break;
      case '-https':
        httpsDecode = true;
        break;
      default:
        console.warn(`Unknown argument: ${process.argv[argn]}`);
    }
  }

  if (!urlProxyPac) {
    console.error('Error: -P <url> (PAC file URL) is required.');
    process.exit(1);
  }
  if (!login || !password) {
    console.error('Error: -l <login> and -pass <password> are required.');
    process.exit(1);
  }

  authHeader = `Basic ${Buffer.from(`${login}:${password}`).toString('base64')}`;

  if (debugging) {
    console.log(`webproxy server listening on port ${port}`);
  }

  // Initialize QuickJS WASM runtime and load the PAC file
  const wasmBytes = readFileSync(wasmPath);
  const qjs = await QuickJS.create(wasmBytes);
  const pacContent = await fetchPacFile(urlProxyPac);
  FindProxyForURL = createPacResolver(qjs, pacContent);
  console.log(`FindProxyForURL OK for ${urlProxyPac}`);

  // Start HTTP proxy server
  const server = http.createServer(httpUserRequest);

  // Start HTTPS decoding server (port + 1) only when -https flag is set
  if (httpsDecode) {
    const optionsCertificate = {
      key: readFileSync(certificateKey),
      cert: readFileSync(certificate),
    };
    const httpsServer = https.createServer(optionsCertificate, httpsRequest);
    httpsServer.listen(port + 1);
    console.log(`TCP server accepting connection on port: ${port + 1}`);
  }

  // Handle HTTPS CONNECT tunnelling
  server.on('connect', async (request, socketRequest, bodyhead) => {
    const { url, httpVersion } = request;
    let hp = getHostPortFromString(url, 443);

    let res;
    try {
      res = await FindProxyForURL(request.url, hp[0]);
    } catch (err) {
      console.error('PAC resolver error:', err);
      socketRequest.write(`HTTP/${httpVersion} 500 Connection error\r\n\r\n`);
      socketRequest.end();
      return;
    }

    if (res !== 'DIRECT') {
      hp = getHostPortFromString(getUrlHeader(res), 80);
    }

    if (httpsDecode) {
      hp = ['localhost', String(port + 1)];
      res = 'DIRECT';
    }

    const proxySocket = new net.Socket();

    proxySocket.connect(parseInt(hp[1], 10), hp[0], () => {
      if (debugging) {
        console.log('  < connected to %s/%s', hp[0], hp[1]);
        console.log('  > writing head of length %d', bodyhead.length);
      }

      if (res === 'DIRECT') {
        proxySocket.write(bodyhead);
        socketRequest.write(`HTTP/${httpVersion} 200 Connection established\r\n\r\n`);
      } else {
        let httpConnect = `CONNECT ${request.url} HTTP/${httpVersion}\r\n`;
        for (const [h, v] of Object.entries(request.headers)) {
          httpConnect += `${h}: ${v}\r\n`;
        }
        httpConnect += `Proxy-Authorization: ${authHeader}\r\n\r\n`;
        proxySocket.write(httpConnect);
        proxySocket.write(bodyhead);
      }
    });

    proxySocket.pipe(socketRequest);
    socketRequest.pipe(proxySocket);

    proxySocket.on('error', (err) => {
      socketRequest.write(`HTTP/${httpVersion} 500 Connection error\r\n\r\n`);
      if (debugging) {
        console.log('  < ERR: %s', err);
      }
      socketRequest.end();
    });

    socketRequest.on('error', (err) => {
      proxySocket.end();
      if (debugging) {
        console.log('  > ERR: %s', err);
      }
    });
  });

  server.listen(port);
  console.log(`TCP server accepting connection on port: ${port}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
