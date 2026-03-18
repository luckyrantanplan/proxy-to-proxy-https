# proxy-to-proxy-https

An HTTP/HTTPS proxy that acts as man-in-the-middle between a browser and a
corporate proxy, written in Node.js.

Inspired by
[node-js-http-and-https-proxy](https://newspaint.wordpress.com/2012/11/05/node-js-http-and-https-proxy/).

> Do not hesitate to open an issue for any question or problem.

---

## Requirements

- **Node.js ≥ 22**

## Installation

```sh
npm install
```

## Usage

```sh
node webproxy2.js [options]
```

### Options

| Flag        | Description |
|-------------|-------------|
| `-l <login>`    | Login for corporate HTTP proxy authentication |
| `-pass <pass>`  | Password for corporate HTTP proxy authentication |
| `-p <port>`     | Port to listen on (default: `5555`) |
| `-P <url>`      | URL to fetch the PAC (proxy auto-config) file from |
| `-https`        | Enable HTTPS decoding (man-in-the-middle) |
| `-cert <file>`  | Certificate chain file for HTTPS decoding (default: `selfsigned.crt`) |
| `-certKey <file>` | Private key file for HTTPS decoding (default: `selfsigned.key`) |
| `-d`            | Enable debug logging |

---

## PAC server helper

If you don't have a PAC URL handy, you can run the included helper which
starts two lightweight PAC servers:

- **localhost:8082** – always returns `DIRECT`
- **localhost:8083** – always routes through `PROXY localhost:8084`

```sh
node pacservers.js
# Server direct running at 8082
# Server proxy running at 8083
```

---

## Example: chained proxies

### First proxy (port 8080) → forwards to upstream proxy at port 8084

```sh
node webproxy2.js -l myLogin -pass myPassword -p 8080 -P http://localhost:8083 -d -https
# webproxy server listening on port 8080
# TCP server accepting connection on port: 8080
# FindProxyForURL OK for http://localhost:8083
# TCP server accepting connection on port: 8081
# GET http://www.example.com/ HTTP/1.1
#
# {
#     "user-agent": "Wget/1.21 (linux-gnu)",
#     "accept": "*/*",
#     "host": "www.example.com",
#     "connection": "Keep-Alive"
# }
```

### Second proxy (port 8084) → direct connection

```sh
node webproxy2.js -p 8084 -l myLogin -pass myPassword \
  -P http://localhost:8082 -d -https \
  -cert fullchain.pem -certKey key-letsencrypt.pem
# webproxy server listening on port 8084
# TCP server accepting connection on port: 8084
# FindProxyForURL OK for http://localhost:8082
# TCP server accepting connection on port: 8085
```

### Configure your HTTP client

```sh
export http_proxy=http://localhost:8080
export https_proxy=http://localhost:8080

wget http://www.example.com
wget https://www.example.com --no-check-certificate
```

> **Note:** When the connection is `DIRECT`, the `Proxy-Authorization` header is
> stripped before forwarding to the endpoint. When routed through an upstream
> proxy, the header is injected automatically.

---

## License

MIT
