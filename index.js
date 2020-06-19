var net = require('net'),
	express = require('express'),
	app = express(),
	path = require('path'),
	fs = require('fs'),
	server = require('http').Server(app),
	//tls = require('https').Server({ key: fs.readFileSync('public/certs/client-key.pem'), cert: fs.readFileSync('public/certs/client-cert.pem') }, app),
	crypto = require('crypto'),
	aesjs = require('aes-js'),
	io = require('socket.io')(server),//tls),
	axios = require('axios'),
	querystring = require('querystring');
	bodyParser =require('body-parser');
	qr = require('qrcode');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get('/', function(req, res) {
	res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/login', function(req, res) {
	res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/web', function(req, res) {
	res.sendFile(path.join(__dirname, 'messenger.html'));
});

app.get('/setup', function(req, res) {
	res.sendFile(path.join(__dirname, 'setup.html'));
});

app.get('/privacy', function(req, res) {
	res.sendFile(path.join(__dirname, 'privacy.html'));
});

app.get('/qr', function(req, res) { // TODO Add branding
	var q = req.query;
	if(q['k'] && q['a'] && q['p']) {
		qr.toDataURL('{"a":"' + q['a'] + '","k":"' + q['k'] + '","p":"' + q['p'] + '"}', {width:112, margin:0, color: { light: '#00000000'} }, function(err, url) {
			var img = Buffer.from(url.replace(/^data:image\/png;base64,/, ''), 'base64');

			res.writeHead(200, {
				'Content-Type': 'image/png',
				'Content-Length': img.length
			});
			res.end(img);
		});
	} else {
		res.status(400).send('Bad Request');
	}
});

server.listen(8737, function() {
	console.log('Listening on *:8737');
});

/*tls.listen(443, function() {
	console.log('Using SSL');
});*/

app.use('/public', express.static(path.join(__dirname, 'public')));

io.on('connection', function(socket) {
	var uuid = crypto.randomBytes(8).toString('hex');
	var key = crypto.randomBytes(16).toString('hex');
	
	socket.emit('setup', uuid, key);
	
	socket.on('stored', function(config) {
		socket.emit('start');
		setupServer(socket, JSON.parse(config));
	});

	socket.on('ready', function(addr) {
		var client = new net.Socket();
		var to = addr.replace('http://', '').replace('https://', '');
		if(to.endsWith('/')) {
			to = to.substring(0, to.length - 1);
		}

		client.connect(8736, to);

		client.on('data', function(data) {
			var message = data.toString().replace("\n", "").replace("\r", "");
			switch(message) {
				case "ACK":
					socket.emit('valid');
					client.write('jMessage Web');
					break;
				case "DAT":
					client.write(uuid);
					break;
				default:
					var decryptedText = decrypt(message, key, uuid);
					var config = JSON.parse(decryptedText);
					
					socket.emit('start', config);
					setupServer(socket, config);
					break;
			}
		});

		socket.on('disconnect', function() {
			client.end();
			client.destroy();
		});

		client.on('error', function(err) {
			socket.emit('err', err);
		});
	});
});

////

function setupServer(client, json) {
	if(json === null) {
		return;
	}

	var server = new net.Socket();
	
	var addr = json['a'];
	var pass = json['p'];
	var key = json['k'];

	addr = addr.replace('http://', '').replace('https://', '');
	if(addr.endsWith('/')) {
		addr = addr.substring(0, to.length - 1);
	}
	
	server.connect(8736, addr);
	
	var response = '';
	
	client.on('disconnecting', function() {
		server.destroy();
		client.emit('logout');
	});

	server.on('data', function(data) {
		response = handleIncoming(data.toString(), server, client, addr, pass, key, response);
	});
	
	server.on('close', function() {
		client.emit('logout');
	});

	client.on('getContacts', function() {
		getContacts(client, addr, pass, key);
	});
	
	client.on('sendMessage', function(display, id, partners, custom, guid, msg) {
		sendMessage(client, addr, pass, key, display, id, partners, custom, guid, msg);
	});
	
	client.on('getMessages', function(id, offset) {
		loadMessages(client, addr, pass, key, id, offset);
	});

	client.on('getAttachment', function(id, uti) {
		loadAttachment(client, addr, pass, key, id, uti);
	});
}

function handleIncoming(msg, server, client, addr, pass, key, response) {
	if(msg.indexOf("\n") == -1) {
		return response + msg;
	} else {
		var indx = msg.indexOf("\n");
		
		handleResponse(server, client, addr, pass, key, response + msg.substring(0, indx));
		return handleIncoming(msg.substring(indx + 1), server, client, addr, pass, key, '');
	}
}

function handleResponse(server, client, addr, pass, key, response) {
	try {
		switch(response) {
			case 'ACK':
				server.write(encrypt(pass, key));
				break;
			case 'READY':
				loadConversations(client, addr, pass, key)
				break;
			case 'FAIL':
				console.log('Bad password!');
				// TODO
				break;
			case 'A':
				break;
			default:
				client.emit('message', JSON.parse(decrypt(response, key)));
				break;
		}
	} catch(err) {
		console.log(err.message);
	}
}

function sendMessage(client, addr, pass, key, display, id, partners, custom, guid, msg) {
	var iv = crypto.randomBytes(8).toString('hex');

	var data = {
		iv: iv,
		password: encrypt(pass, key, iv),
		chat_id: encrypt(id, key, iv),
		message: encrypt(msg, key, iv),
		hasCustomName: encrypt(custom, key, iv),
		participants: encrypt(custom ? partners : display, key, iv),
		track: encrypt(1, key, iv)
	}

	if(guid && guid !== 'null' && guid !== 'undefined') {
		data.guid = encrypt(guid, key, iv);
	}
	
	axios.post('http://' + addr + ':8735/send', querystring.stringify(data), {
		headers: {
			"Content-Type": "application/x-www-form-urlencoded"
		}
	}).then(function(response) {
	}).catch(function(error) {
	});
}

// TODO Handle decryption on client side, not server side.

function loadAttachment(client, addr, pass, key, id, uti) {
	var iv = crypto.randomBytes(8).toString('hex');

	client.emit('attachmentGet', id,
		'http://' + addr + ':8735/attachment?id=' + encrypt(id, key, iv) + '&password=' + encrypt(pass, key, iv) + '&iv=' + iv, uti);
}

function getContacts(client, addr, pass, key) {
	var iv = crypto.randomBytes(8).toString('hex');
	
	axios.get('http://' + addr + ':8735/contacts?iv=' + iv + '&password=' + encrypt(pass, key, iv) + '&web=true').then(function(response) {
		client.emit('contacts', JSON.parse(decrypt(response.data, key)));
	}).catch(function(error) {
	});
}

function loadMessages(client, addr, pass, key, id, offset) {
	var iv = crypto.randomBytes(8).toString('hex');
	
	axios.get('http://' + addr + ':8735/messages?iv=' + iv + '&password=' + encrypt(pass, key, iv) +
			  '&limit=' + encrypt(25, key, iv) + '&chat_id=' + encrypt(id, key, iv) + '&offset=' + encrypt(offset, key, iv) + '&web=true').then(function(response) {
		client.emit('messages', JSON.parse(decrypt(response.data, key)), offset);
	}).catch(function(error) {
	});
}

function loadConversations(client, addr, pass, key) {
	var iv = crypto.randomBytes(8).toString('hex');
	
	axios.get('http://' + addr + ':8735/conversations?iv=' + iv + '&password=' + encrypt(pass, key, iv) + '&web=true').then(function(response) {
		client.emit('conversations', JSON.parse(decrypt(response.data, key)));
	}).catch(function(error) {
	});
}

function decrypt(msg, key, vec) {
	if(!vec || typeof vec === 'undefined') {
		vec = msg.substring(0, 16);
		msg = msg.substring(16);
	}

	var secure = aesjs.utils.utf8.toBytes(key);
	var iv = aesjs.utils.utf8.toBytes(vec);
	var aesCbc = new aesjs.ModeOfOperation.cbc(secure, iv);
	
	var decryptedBytes = aesCbc.decrypt(aesjs.utils.hex.toBytes(msg));
	var decryptedString = aesjs.utils.utf8.fromBytes(decryptedBytes);
	
	return clean(decryptedString).trim();
}

function clean(str) {
	var i;
	for(i = str.length - 1; i > 0; i--) {
		if(str.charCodeAt(i) > 16) {
			break;
		}
	}
	return str.substring(0, i + 1);
}

function encrypt(msg, key, withIV) {
	var iv = withIV === undefined ? crypto.randomBytes(8).toString('hex') : withIV;
	var aesCbc = new aesjs.ModeOfOperation.cbc(aesjs.utils.utf8.toBytes(key), aesjs.utils.utf8.toBytes(iv));
	var encryptedBytes = aesCbc.encrypt(aesjs.padding.pkcs7.pad(aesjs.utils.utf8.toBytes(msg)));
	return (withIV === undefined ? iv : '') + aesjs.utils.hex.fromBytes(encryptedBytes);
}