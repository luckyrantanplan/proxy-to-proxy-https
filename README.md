# proxy-to-proxy-https
An http proxy that acts as man in the middle between a browser and a corporate proxy in nodeJS 

Do not hesitate to publish an issue for any question or problem

(inspired by https://newspaint.wordpress.com/2012/11/05/node-js-http-and-https-proxy/ )

You will need nodeJS installed with "pac-resolver" and 'https-proxy-agent' npm packaged installed. (beware : pac-resolver has some issue with dns error handling). 

##usage : 

* -l : login for corporate http proxy authentification
* -pass : password for corporate http proxy authentification
* -p : port to listen to
* -P : url to get the proxy.pac configuration.
* -https : optional attribute to decode https messages.
* -cert : certificate chain for https decoding
* -certKey : key for re encoding message to external proxy or website



If you do not have an url to get a script for proxy configuration, you can run pacserver.js. It will run 2 servers : 
* server at localhost:8083 delivers a script to use an http proxy at localhost:8084. 
* server at localhost:8082 delivers a script to always bypass a proxy ( DIRECT ) 


```sh
$ nodejs pacservers.js&
Server proxy running at 8083
Server direct running at 8082
```


Here, as an example, I run a first instance of my webproxy2.js in order to target a second http proxy running at localhost:8084.
You can see in the http request header that there is no information of login/password. These informations are added on the fly before forwarding the request to the second http proxy.

```sh
nodejs webproxy2.js -l myLogin -pass myPassword -p 8080  -P http://localhost:8083 -d  -https 
webproxy server listening on port 8080
TCP server accepting connection on port: 8080
FindProxyForURL OK for http://localhost:8083
TCP server accepting connection on port: 8081
GET http://www.20minutes.fr/ HTTP/1.1

{
    "user-agent": "Wget/1.17.1 (linux-gnu)",
    "accept": "*/*",
    "accept-encoding": "identity",
    "host": "www.20minutes.fr",
    "connection": "Keep-Alive",
    "proxy-connection": "Keep-Alive"
}
HTTP/1.1 200 OK

{
    "date": "Wed, 26 Oct 2016 21:01:49 GMT",
    "server": "Apache",
    "cache-control": "public, max-age=30, s-maxage=30",
[...]
```



Then, I launch a second proxy running at localhost:8084 configured for a direct connection : 

```sh
$nodejs webproxy2.js -p 8084 -l myLogin -pass myPassword -P http://localhost:8082 -d -https -cert fullchain.pem -certKey key-letsencrypt.pem 
webproxy server listening on port 8084
TCP server accepting connection on port: 8084
FindProxyForURL OK for http://localhost:8082
TCP server accepting connection on port: 8085
GET http://www.20minutes.fr/ HTTP/1.1

{
    "user-agent": "Wget/1.17.1 (linux-gnu)",
    "accept": "*/*",
    "accept-encoding": "identity",
    "host": "www.20minutes.fr",
    "connection": "Keep-Alive",
    "proxy-connection": "Keep-Alive",
    "proxy-authorization": "Basic dW5kZWZpbmVkOnVuZGVmaW5lZA=="
}
HTTP/1.1 200 OK
[...]
```

You can notice that "proxy-authorization" header is now present. Since the connection to the target url is now 'DIRECT', the "proxy-authorization" header is removed before the sending to the endpoint.

###example of client script

```sh
export https_proxy=http://localhost:8080
export http_proxy=http://localhost:8080

wget http://www.20minutes.fr
wget https://www.leboncoin.fr --no-check-certificate -d
```
