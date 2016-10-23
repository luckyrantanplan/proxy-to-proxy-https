var url = require('url');
var https = require('https');
const fs = require('fs');

var pac = require('pac-resolver');

var HttpsProxyAgent = require('https-proxy-agent');

// HTTP/HTTPS proxy to connect to
var proxy = process.env.http_proxy || 'http://168.63.76.32:3128';
console.log('using proxy server %j', proxy);

// HTTPS endpoint for the proxy to connect to
var endpoint = process.argv[2] || 'https://graph.facebook.com/tootallnate';
console.log('attempting to GET %j', endpoint);
var opts = url.parse(endpoint);

// create an instance of the `HttpsProxyAgent` class with the proxy server information
var agent = new HttpsProxyAgent(proxy);
opts.agent = agent;

https.get(opts, function (res) {
  console.log('"response" event!', res.headers);
  res.pipe(process.stdout);
});


var debugging = 0;
 
var regex_hostport = /^([^:]+)(:([0-9]+))?$/;
var regex_url = /\S+\b(\S+)/; 

function getUrlHeader(data){
	return regex_url.exec(data)[0];

}
 

function getHostPortFromString( hostString, defaultPort ) {
  var host = hostString;
  var port = defaultPort;
 
  var result = regex_hostport.exec( hostString );
  if ( result != null ) {
    host = result[1];
    if ( result[2] != null ) {
      port = result[3];
    }
  }
 
  return( [ host, port ] );
}
 
var FindProxyForURL;


 
var auth;




const options = {
  key: fs.readFileSync('test/fixtures/keys/agent2-key.pem'),
  cert: fs.readFileSync('test/fixtures/keys/agent2-cert.pem')
};

https.createServer(options, (userRequest, userResponse) => {

var proxyRequest = https.request(opts,function (proxyResponse) {
  



// handle a HTTP proxy request


function httpUserRequest( userRequest, userResponse ) {
  if ( debugging ) {
    console.log( '  > request: %s', userRequest.url );
  }
 
  var httpVersion = userRequest['httpVersion'];
  var hostport = getHostPortFromString( userRequest.headers['host'], 443 );
 

    FindProxyForURL(userRequest.url,  hostport[0] , function (err, res) {
                       if (err) console.log( err);
                        
                       // → "DIRECT" 
                       if (res=='DIRECT' ){
 var hostport = getHostPortFromString( userRequest.headers['host'], 443 );
                             


			  // have to extract the path from the requested URL
			  var path = userRequest.url;
                          
			  result = /^[a-zA-Z]+:\/\/[^\/]+(\/.*)?$/.exec( userRequest.url );
			  if ( result ) {
			    if ( result[1].length > 0 ) {
			      path = result[1];
			    } else {
			      path = "/";
			    }
			  }
                          delete userRequest.headers["Proxy-Authorization"];
			  var options = {
			    'host': hostport[0],
			    'port': hostport[1],
			    'method': userRequest.method,
			    'path': path,
			    'agent': userRequest.agent,
			    'auth': userRequest.auth,
			    'headers': userRequest.headers
                            
			  };
                      }else{

                          var overHeader=  userRequest.headers;
                          overHeader["Proxy-Authorization"]=auth;
                        var hostport = getHostPortFromString(getUrlHeader(res),443);
			var options = {
			 'host': hostport[0],
			 'port': hostport[1],
			  path: userRequest.url,
                          'agent': agent,
			  headers: overHeader
			  };
                      }
  if ( debugging ) {
    console.log( '  > options: %s', JSON.stringify( options, null, 2 ) );
  }
 
  var proxyRequest = http.request(
    options,
    function ( proxyResponse ) {
      if ( debugging ) {
        console.log( '  > request headers: %s', JSON.stringify( options['headers'], null, 2 ) );
      }
 
      if ( debugging ) {
        console.log( '  < response %d headers: %s', proxyResponse.statusCode, JSON.stringify( proxyResponse.headers, null, 2 ) );
      }
 
      userResponse.writeHead( proxyResponse.statusCode, proxyResponse.headers );
 
      proxyResponse.on('data',function (chunk) {
          if ( debugging ) {
            console.log( '  < chunk = %d bytes', chunk.length );
          }
          userResponse.write( chunk );
        } );
 
      proxyResponse.on('end',function () {
          if ( debugging ) {
            console.log( '  < END' );
          }
          userResponse.end();
        } );
    });
   
  
 
  proxyRequest.on('error',function ( error ) {
      userResponse.writeHead( 500 );
      userResponse.write(
        "<h1>500 Error</h1>\r\n" +
        "<p>Error was <pre>" + error + "</pre></p>\r\n" +
        "</body></html>\r\n"
      );
      userResponse.end();
    } );
 
  userRequest.on('data',function (chunk) {
      if ( debugging ) {
        console.log( '  > chunk = %d bytes', chunk.length );
      }
      proxyRequest.write( chunk );
    } );
 
  userRequest.on('end',function () {
      proxyRequest.end();
    });
 });
}


function main() {
 
 var port = 5555; // default port if none on command line
  // check for any command line arguments

 var urlProxyPac="";
var password;
var login ;
  for ( var argn = 2; argn < process.argv.length; argn++ ) {
    if ( process.argv[argn] === '-p' ) {
      port = parseInt( process.argv[argn + 1] );
      argn++;
      continue;
    }
    
    if ( process.argv[argn] === '-P' ) {
      urlProxyPac =  process.argv[argn + 1]  ;
      argn++;
      continue;
    } 

 if ( process.argv[argn] === '-l' ) {
      login =  process.argv[argn + 1]  ;
      argn++;
      continue;
    } 

if ( process.argv[argn] === '-pass' ) {
      password =  process.argv[argn + 1]  ;
      argn++;
      continue;
    } 

    if ( process.argv[argn] === '-d' ) {
      debugging = 1;
      continue;
    }
  }
 

 auth=new Buffer('Basic '+login+":"+password).toString('base64');

 
var request = http.get(urlProxyPac, function(response) {

        var allresponse="";
	response.on('data',function(chunk) {
    		 
		allresponse=allresponse+chunk;
  	});
        response.on('end',function(){
		FindProxyForURL = pac(""+allresponse);
		console.log("FindProxyForURL OK for "+urlProxyPac);
	});
	
  
    });



  if ( debugging ) {
    console.log( 'webproxy server listening on port ' + (port) );
  }
 
  // start HTTP server with custom request handler callback function
  var server = http.createServer( httpUserRequest );
 
 
      });
    } ); // HTTPS connect listener
  server.listen(port);

console.log("TCP server accepting connection on port: " + port);
}


main();
