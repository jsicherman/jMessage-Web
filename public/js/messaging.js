var messenger = (function() {
	var current_chat_display,
		current_chat_id,
		current_chat_partners,
		current_stylized_partners,
		current_chat_has_custom_name,
		current_chat_guid,
		is_composed_msg = false,
		is_waiting = false,
		gettingMessages = false,
		reactDict = {},
		messenger = {};

	if(!String.linkify) {
	    String.prototype.linkify = function() {

	        // http://, https://, ftp://
	        var urlPattern = /\b(?:https?|ftp):\/\/[a-z0-9-+&@#\/%?=~_|!:,.;]*[a-z0-9-+&@#\/%=~_|]/gim;

	        // www. sans http:// or https://
	        var pseudoUrlPattern = /(^|[^\/])(www\.[\S]+(\b|$))/gim;

	        // Email addresses
	        var emailAddressPattern = /[\w.]+@[a-zA-Z_-]+?(?:\.[a-zA-Z]{2,6})+/gim;

	        return this
	            .replace(urlPattern, '<a href="$&">$&</a>')
	            .replace(pseudoUrlPattern, '$1<a href="http://$2">$2</a>')
	            .replace(emailAddressPattern, '<a href="mailto:$&">$&</a>');
	    };
	}

	function fix(str) {
		try {
			return str.replace(/U\+{((U\+[\dA-F]{5})+)}/g,
				function (match, group) {
					var points = group.split('U+').map(function(x) {
						return parseInt(x, 16);
					}).filter(Boolean);
					var fix = String.fromCodePoint.apply(String, points);
					return fix;
				});
		} catch(err) {
			return "�";
		}
	}

	function isJustEmoji(str) {
		return str.length > 0 && str.length <= 6 && str.split('').every(function(x) {
			return !'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890!@#$%^&*()~`-_=+\\|]}[{;:\'",<.>/?'.includes(x);
		});
	}

	messenger.loadAttachment = function loadAttachment(id, url, uti) {
		if(uti.includes('gif') || uti.includes('jpeg') || uti.includes('png')) {
			$('.image' + id).prepend('<img alt="' + "🎬" + '"class="inline_image" src="' + url + '" onclick="window.open(\'' + url + '\');"></img>');
		} else {
			$('.image' + id).click(function() {
				window.open(url);
			});
		}
	};

	messenger.newMessage = function newMessage(chat_id, from, msg, timestamp, alert, prepend, updateDescription) {
		var needsImage = false,
			bundle,
			guid = 'null',
			msgId;

		function addTimestampIfNeeded(prev, cur, prepend) {
			if(prev === undefined) { return; }

			var td = new Date((cur + 978307200) * 1000);

			if(((cur - prev) >= 3600 && isToday(td)) || diffDay(td, new Date((prev + 978307200) * 1000))) {
				if(prepend) {
					$('.msg_history').prepend('<div class="inline_date"><p>' + parseTimestamp(cur) + '</p></div>');
				} else {
					$('.msg_history').append('<div class="inline_date"><p>' + parseTimestamp(cur) + '</p></div>');
				}
			}
		}

		function decodeUTI(uti) {
			if(!uti.startsWith('dyn.a')) {
				return uti;
			}

			var ALPHABET = 'abcdefghkmnpqrstuvwxyz0123456789',
				MASK = 31,
				SHIFT = 5,
				buffer = 0,
				next = 0,
				bitsLeft = 0,
				result = [];

			for(var i=5; i<uti.length; i++) {
				var c = uti.charAt(i);

				buffer = buffer << SHIFT;
				buffer = buffer | (ALPHABET.indexOf(c) & MASK);
				bitsLeft = bitsLeft + SHIFT;
				if(bitsLeft >= 8) {
					result[next++] = (buffer >> (bitsLeft - 8)) & 255;
					bitsLeft = bitsLeft - 8;
				}
			}

			return String.fromCharCode.apply(null, result);
		}

		if(arguments.length == 4) {
			bundle = arguments[0];
			alert = arguments[1];
			prepend = arguments[2];

			chat_id = bundle['chat_id'];
			guid = bundle['guid'];
			from = bundle['is_from_me'] == 1 ? 'me' : bundle['human_name'];
			msg = bundle['text'];
			timestamp = bundle['date'];
			msgId = bundle['message_id'];

			if(chat_id == current_chat_id && bundle['has_attachments'] && bundle['uti'] !== undefined) {
				var uti = decodeUTI(bundle['uti']);
				needsImage = true;
				
				if(uti.includes('movie')) {
					msg = "🎬\n" + msg;
				} else if(!uti.includes('gif') && !uti.includes('jpeg') && !uti.includes('png')) {
					console.log('Unknown UTI ' + uti);
				}

				sockethelper.socket.emit('getAttachment', bundle['attachment_id'], uti);
			}
		} else {
			msgId = $('.msg_history .logged_msg:last-child').attr('message_id') + 1;
		}

		from = fix(from);

		if(bundle !== undefined && bundle['associated_message_type'] != 0) {
			var guid = bundle['associated_message_guid'];
			guid = guid.substring(guid.indexOf('/') + 1);
			reactDict[guid + bundle['associated_message_type']] = bundle['associated_message_type'] + from;
			return;
		}

		msg = fix(msg).linkify();

		if(chat_id == current_chat_id) {
			var set = from == 'me' ? ['outgoing_msg', 'sent_msg'] : ['incoming_msg', 'received_msg'];

			var lastFromSame = $('.msg_history .logged_msg:last-child').attr('sender') === from;

			var optionalName = '';
			if(from !== 'me' && !lastFromSame && current_chat_partners.split(',').length > 1) {
				optionalName = '<span class="time_date name">' + from + '</span>';
			}

			var optionalBorderHack = lastFromSame ? 'border-top-' + (from === 'me' ? 'right' : 'left') + '-radius: 0;' : '';
			var optionalStyle = isJustEmoji(msg) ? ' style="font-size: xx-large;' + optionalBorderHack + '"' : optionalBorderHack.length === 0 ? '' : ' style="' + optionalBorderHack + '";'

			var message = '<div class="' + set[0] + ' logged_msg" stamp="' + timestamp + '" message_id="' + msgId + '" sender="' + from + '" guid="' + guid + '"' + (lastFromSame ? 'style="margin-top: -8px;"' : '') + '>' +
				optionalName + '<div class="' + set[1] + '" title="' + parseSimple(timestamp) +'"><p' +
				(needsImage ? ' class="clickable image' + bundle['attachment_id'] + ' image"' : '') + optionalStyle + '>' + msg +
				'</p>' + (!prepend ? '<span class="time_date msg_time">' + parseTimestamp(timestamp) + '</span>' : '') + '</div></div>';

			if(!prepend) {
				$('.msg_history .msg_time:last-child').remove();

				try {
					var last = $('.msg_history .logged_msg:last-child').attr('stamp');
					if(last !== undefined && last !== '') { addTimestampIfNeeded(parseInt(last), timestamp, false); }

					$('.msg_history').append(message);

					var element = $('.msg_history')[0];
					element.scrollTop = element.scrollHeight;
				} catch(err) { }
			} else {
				var last = $('.msg_history .logged_msg:first-child').attr('stamp');
				if(last !== undefined && last !== '') { addTimestampIfNeeded(timestamp, parseInt(last), true); }
				$('.msg_history').prepend(message);

				try {
					var element = $('.msg_history')[0];
					element.scrollTop += $('.logged_msg').first()[0].scrollHeight;
				} catch(err) { }
			}
		}

		if(updateDescription) {
			$('#' + chat_id).find('p').text(msg);
		}

		if(alert && from !== 'me' && (!document.hasFocus() || chat_id != current_chat_id)) {
			messenger.sendDesktopNotification(from, msg, chat_id);
		}
	};

	//// TIME FUNCTIONS ////
	function diffDay(d1, d2) {
		return d1.getDate() !== d2.getDate() ||
		d1.getMonth() !== d2.getMonth() ||
		d1.getFullYear() !== d2.getFullYear();
	}

	function isToday(td) {
	    var d = new Date();
		
	    return td.getDate() === d.getDate() &&
	    td.getMonth() === d.getMonth() &&
	    td.getFullYear() === d.getFullYear();
	}

	function isYesterday(td) {
	    var d = new Date();
		d.setDate(d.getDate() - 1);

	    return td.getDate() === d.getDate() &&
	    td.getMonth() === d.getMonth() &&
	    td.getFullYear() === d.getFullYear();
	}

	function parseSimple(time) {
		return $.format.date(new Date((time + 978307200) * 1000), 'h:mm:ss a');
	}

	function parseTimestamp(time) {
		var d = new Date((time + 978307200) * 1000);
		
		if(isToday(d)) {
			return $.format.date(d, 'h:mm a');
		} else if(isYesterday(d)) {
			return 'Yesterday';
		}

		return $.format.date(d, 'MMMM d');
	}
	//// TIME FUNCTIONS ////

	//// MESSENGER FUNCTIONS ////

	messenger.scrollMessages = function scrollMessages() {
		var elem = $('.msg_history')[0];

		if(elem.scrollTop == 0 && !gettingMessages) {
			var top = $('.msg_history .logged_msg:first-child').attr('message_id');
			if(!top) {
				top = Number.MAX_SAFE_INTEGER;
			}

			sockethelper.socket.emit('getMessages', current_chat_id, top);
			gettingMessages = true;
		}
	}

	messenger.loadMessages = function loadMessages(bundle, offset) {
		var emojis = { "2000": "❤", "2001": "👍", "2002": "👎", "2003": "😄", "2004": "❗", "2005": "❓"}

		bundle.sort(function(a, b) {
			return (b['date'] - a['date']) * (offset !== 0 ? 1 : -1);
		});

		bundle.forEach(function(msg) {
			messenger.newMessage(msg, false, offset != 0, false);
		});

		console.log(bundle);

		if(Object.keys(reactDict).length != 0) {
			for(key in reactDict) {
				var k = key.substring(0, key.length - 4);
				var r = reactDict[key];
				var who = r.substring(4).replace('me', 'You');
				var elem = $("[guid='" + k + "']");

				if(elem.length) {
					elem.append('<div title="' + who + '" class="time_date reaction_' + (elem.hasClass('outgoing_msg') ? 'outgoing' : 'incoming') + '"><p>' + emojis[r.substring(0, 4)] + '</p></div>');
					delete reactDict[k];
				}
			}
		}

		if(offset == 0) {
			try {
				var element = $('.msg_history')[0];
				element.scrollTop = element.scrollHeight;
			} catch(err) { }
		}

		gettingMessages = false;
	};

	messenger.loadConversations = function loadConversations(bundle) {
		$('.inbox_chat').empty();
		
		bundle.sort(function(a, b) {
			return b['lastMessage']['date'] - a['lastMessage']['date'];
		});
		
		bundle.forEach(function(chat) {
			var preview = fix(chat['lastMessage']['text']);
			if(preview === '') {
				preview = "￼";
			}

			var isMe = chat['lastMessage']['is_from_me'];

			var optionalStyle = isMe ? '' : ' style="color: var(--primaryColor);"';

			var message = '<div id="' + chat['chat_id'] + '" participants="' + fix(chat['IDs']) +
				'" custom="' + chat['has_manual_display_name'] + '" guid="' + chat['GUID'] +
				'" display_name="' + fix(chat['display_name']) +
				'" class="chat_list row w-100' + (chat['chat_id'] == current_chat_id ? ' active_chat' : '') +
				'" onclick="messenger.openConversation(this)"><div class="chat_ib w-100"><div class="d-flex flex-row"><h5>' +
				'<span class="flex-fill">' + fix(chat['display_name']) + '</span><span style="width: 2%"></span><span' + optionalStyle + ' class="chat_date">' +
				parseTimestamp(chat['lastMessage']['date']) + '</span></h5></div><p>' +
				preview + '</p></div></div>';
			
			$('.inbox_chat').append(message);
		});

		if(is_waiting) {
			is_waiting = false;
			messenger.openConversation($('.chat_list').first()[0]);
		}
	};

	messenger.sendDesktopNotification = function sendDesktopNotification(title, body, chat_id) {
		if(utilities.getCookie('notifications') === 'off') {
			return;
		}

		var options = {
			body: body,
			icon: 'public/img/launcher.png',
			badge: 'public/img/launcher.png'
		};
		
		var n = new Notification(title, options);
		
		n.onclick = function(e) {
			if(e !== undefined) {
				e.preventDefault();
			}

			if(chat_id != -1) {
				messenger.clickNotification(chat_id);
			}
		};
	};

	messenger.clickNotification = function clickNotification(id) {
		messenger.stopComposing();
		messenger.openConversation($('.chat_list#' + id)[0]);
	};

	messenger.openConversation = function openConversation(e) {
		try {
			$('.chat_list#' + current_chat_id)[0].classList.remove('active_chat');
		} catch(err) {
		}
		
		current_chat_display = e.getAttribute('display_name');
		current_chat_id = e.getAttribute('id');
		current_chat_partners = e.getAttribute('participants');
		current_chat_has_custom_name = e.getAttribute('custom');
		current_chat_guid = e.getAttribute('guid');

		messenger.stopComposing();
		
		$('.msg_history').empty();
		sockethelper.socket.emit('getMessages', current_chat_id, Number.MAX_SAFE_INTEGER);
		gettingMessages = true;
		e.classList.add('active_chat');
		return false;
	};

	messenger.typing = function typing(e) {
	    if(e.which === 13 && !e.shiftKey) {        
	        messenger.sendMessage();
	        e.preventDefault();
	        return false;
	    }
	};

	messenger.sendMessage = function sendMessage() {
		var txt = document.getElementById('msg_input');
		var text = txt.value.trim();
		
		if(text === '' || current_chat_partners === undefined || current_chat_partners === '') {
			return;
		}

		if(is_composed_msg) {
			$('.msg_history').empty();
			is_waiting = true;
		}

		messenger.stopComposing();
		messenger.newMessage(current_chat_id, 'me', text, new Date().getTime() / 1000 - 978307200, true, false, true);

		sockethelper.socket.emit('sendMessage',
					current_chat_display,
					current_chat_id,
					current_chat_partners,
					current_chat_has_custom_name,
					current_chat_guid,
					text);
		txt.value = '';
	};

	messenger.loadRecipients = function loadRecipients(e, ev) {
		if(e.value === '' || (ev.which >= 37 && ev.which <= 40)) {
			return;
		}

		if(ev.which == 13) {
			messenger.addRecipient($('.recipients').val(), $('.recipients').val());
			return;
		}

	    var newest = e.value.split(';')[e.value.split(';').length - 1].trim();

	    var substrRegex = new RegExp(newest.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i');

	    utilities.options = []
	    $.each(utilities.contactArray, function(i, str) {
	      if (substrRegex.test(str.substring(0, str.indexOf(' ('))) || substrRegex.test(str.substring(str.indexOf(' (') + 2, str.length - 1))) {
	      	utilities.options.push(
	      		{
	      			label: str,
	      			value: str.substring(str.indexOf(' (') + 2, str.length - 1)
	      		});
	      }
	    });
	    utilities.awesomplete.list = utilities.options;
	};

	messenger.addRecipient = function addRecipient(to, show) {
		if(to !== '') {
			if(current_chat_partners === '') { current_chat_partners = to; current_stylized_partners = show; }
			else { current_chat_partners += ', ' + to; current_stylized_partners += '; ' + show; }

			current_chat_display = current_chat_partners;

			$('.recipients').attr('placeholder', current_stylized_partners);

			$('.recipients').val('');
		}

		return false;
	};

	messenger.composeMessage = function composeMessage() {
		$('.msg_history').css('cssText', 'display: none !important;');
		$('.msg_compose').css('cssText', 'display: block;');
		var cook = utilities.getCookie('background');
		if(cook !== 'white') {
			$('.composing').css('background-image', 'url(public/img/backgrounds/' + cook + '.svg)');
		}

		$('.recipients').focus();

		try {
			$('.chat_list#' + current_chat_id)[0].classList.remove('active_chat');
		} catch(err) {
		}
		
		current_chat_display = undefined;
		current_chat_id = -1;
		current_chat_partners = '';
		current_stylized_partners = '';
		current_chat_has_custom_name = false;
		current_chat_guid = 'null';
		is_composed_msg = true;

		if(utilities.contactCache === undefined) {
			sockethelper.socket.emit('getContacts');
		}
	};

	messenger.stopComposing = function stopComposing() {
		$('.msg_history').css('cssText', 'display: block;');
		$('.msg_compose').css('cssText', 'display: none !important;');
		var cook = utilities.getCookie('background');
		if(cook !== 'white') {
			$('.msg_history').css('background-image', 'url(public/img/backgrounds/' + cook + '.svg)');
		}

		$('.recipients').val('');
		$('.recipients').attr('placeholder', 'Recipients');
		current_stylized_partners = '';
		is_composed_msg = false;
	};

	messenger.react = function react(id) {
		console.log('Reacting ' + id);
		setTimeout(function() {
			$('#reactModal').modal('hide');
		}, 1);

		return false;
	};

	//// MESSENGER FUNCTIONS ////

	return messenger;
}());