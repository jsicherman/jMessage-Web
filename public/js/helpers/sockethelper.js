var sockethelper = (function() {
	var socket = io(),
		uuid,
		key,
		rememberMe = true,
		valid = false,
		sockethelper = {};

	sockethelper.socket = socket;
	sockethelper.uuid = uuid;
	sockethelper.key = key;
	sockethelper.rememberMe = rememberMe;
	sockethelper.valid = valid;

	sockethelper.setup = function setup(uid, k) {
		uuid = uid;
		sockethelper.uuid = uuid;
		key = k;
		sockethelper.key = key;

		if(window.location.href.includes('/login')) {
			window.history.pushState(null, '', '/');
			
			if(utilities.isCookie('login')) {
				var logCook = utilities.getCookie('login');
				swal({
					toast: true,
					position: 'top-end',
					showConfirmButton: false,
					timer: 4000,
					title: 'Logging in...',
					type: 'success'
				});
				socket.emit('stored', logCook);
			} else {
				swal({
					toast: true,
					position: 'top-end',
					showConfirmButton: false,
					timer: 2000,
					title: 'Unable to login.',
					type: 'error'
				});
				setTimeout(startModal, 2000);
			}
		}
	};

	sockethelper.error = function error(err) {
		swal({
			toast: true,
			position: 'top-end',
			showConfirmButton: false,
			timer: 4000,
			title: 'Unable to connect!',
			type: 'error'
		});
	};

	sockethelper.start = function start(data) {
		if(data && rememberMe) {
			utilities.setCookie('login', JSON.stringify(data), 24 * 36000000000);
		}

		$.ajax({
			url: '/web',
			success: function(response) {
				document.head.innerHTML = response.substring(response.indexOf('<head>') + 6, response.indexOf('</head>'));
				var bdy = response.substring(response.indexOf('<div id="body-wrapper">') + 23, response.lastIndexOf('</div>')).substring(0, response.lastIndexOf('</div>'));
				document.getElementById('body-wrapper').innerHTML = bdy;
				console.log('Loaded!');

			    try {
					utilities.awesomplete = new Awesomplete('.recipients', {
						list: utilities.options,
						autoFirst: true
					});
				} catch(err) {
					console.log('Unable to load Awesomplete: ' + err.message);
				}

				$('#notifBox').prop('checked', utilities.getCookie('notifications') === 'on');
				$('#soundBox').prop('checked', utilities.getCookie('sounds') === 'on');

				var cook = utilities.getCookie('color');
				$('.colorControl').each(function() {
					var ths = $(this);
					var c = ths.attr('id');
					ths[0].style.setProperty('border-radius', '50%', 'important');
					ths[0].style.setProperty('background', c, 'important');
					ths[0].style.setProperty('border-color', c, 'important');

					ths.text('✓');
					if(cook !== c) {
						ths[0].style.setProperty('color', 'transparent', 'important');
					}
				});

				var cook = utilities.getCookie('background');
				$('.bgControl').each(function() {
					var ths = $(this);
					var c = ths.attr('id');
					if(c === 'white') {
						ths[0].style.setProperty('background', '#fff', 'important');
					} else {
						ths[0].style.setProperty('background-image', 'url(/public/img/backgrounds/' + c + '.svg)', 'important');
						ths[0].style.setProperty('background-size', 'cover', 'important');
					}


					ths.text('✓');
					ths[0].style.setProperty('border-radius', '50%', 'important');
					ths[0].style.setProperty('border-color', '#464646', 'important');

					if(cook === c) {
						ths[0].style.setProperty('color', '#464646', 'important');
						if(c === 'white') {
							$('.msg_history').css('background-image', 'unset');
						} else {
							$('.msg_history').css('background-image', 'url(/public/img/backgrounds/' + c + '.svg)');
							$('.composing').css('background-image', 'url(/public/img/backgrounds/' + c + '.svg)');
						}
					} else {
						ths[0].style.setProperty('color', 'transparent', 'important');
					}
				});

				utilities.setupContextMenu();

				$('.recipients')[0].addEventListener("awesomplete-selectcomplete", function(event) {
					messenger.addRecipient(event.text.value, event.text.label);
				});
			}
		});
	};

	sockethelper.logout = function logout() {
		$.ajax({
			url: '/',
			success: function(response) {
				document.head.innerHTML = response.substring(response.indexOf('<head>') + 6, response.indexOf('</head>'));
				var bdy = response.substring(response.indexOf('<div id="body-wrapper">') + 23, response.lastIndexOf('</div>')).substring(0, response.lastIndexOf('</div>'));
				document.getElementById('body-wrapper').innerHTML = bdy;
				console.log('Loaded!'); // TODO Not reloading all scripts

				swal({
					toast: true,
					showConfirmButton: false,
					timer: 4000,
					title: 'Disconnected',
					type: 'info'
				});
			}
		});
	};

	sockethelper.conversations = function conversations(msg) {
		messenger.loadConversations(msg);
		try {
			messenger.clickNotification($('.chat_list')[0].getAttribute('id'));
		} catch(err) {
			console.log(err);
		}
	};

	sockethelper.message = function message(msg) {
		switch(msg['type']) {
			case 'conversations':
				messenger.loadConversations(msg['content']);
				break;
			case 'messageSendFailure':
				messenger.sendDesktopNotification('Server', 'Failed to send message.', -1);
				break;
			case 'threadDelete':
				break;
			case 'newMessage':
				messenger.newMessage(msg['content'][0]['chat_id'], msg['content'][0]['human_name'], msg['content'][0]['text'], msg['content'][0]['date'], true, true);
				break;
			case 'messageSent':
				break;
			case 'imageSent':
				break;
			case "typing":
				break;
		}
	};

	sockethelper.contacts = function contacts(contacts) {
		utilities.contactCache = contacts;

		utilities.contactArray = [];
		for(var key in contacts) {
			utilities.contactArray.push(contacts[key] + ' (' + key + ')');
		}
	};

	return sockethelper;
}());