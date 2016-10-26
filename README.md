# proxy-to-proxy-https
An http proxy that act as man in the middle between a browser and a corporate proxy in nodeJS node node.js

##usage : 

-l : login for corporate http proxy authentification

-pass : password for corporate http proxy authentification

-p : port to listen to

-P : url to get the proxy.pac configuration.

-https : optional attribute to decode https messages.

-cert : certificate chain for https decoding

-certKey : key for re encoding message to external proxy or website

nodejs webproxy2.js -p 8084 -l myLogin -pass myPassword -P http://localhost:8082 -d -https -cert fullchain.pem -certKey key-letsencrypt.pem 
