sockethelper.socket.on('setup', sockethelper.setup);

sockethelper.socket.on('valid', function() { sockethelper.valid = true; });

sockethelper.socket.on('err', sockethelper.error);

sockethelper.socket.on('start', sockethelper.start);

sockethelper.socket.on('logout', sockethelper.logout);

sockethelper.socket.on('conversations', sockethelper.conversations);

sockethelper.socket.on('attachmentGet', function(id, imgUrl, uti) { messenger.loadAttachment(id, imgUrl, uti); });

sockethelper.socket.on('messages', function(msg, offset) { messenger.loadMessages(msg, offset); });

sockethelper.socket.on('message', sockethelper.message);

sockethelper.socket.on('contacts', sockethelper.contacts);

sockethelper.socket.on('test', function(msg) { console.log(msg); });

//////

function startModal() {
	var logCook = utilities.getCookie('login');
	
	if(logCook) {
		sockethelper.socket.emit('stored', logCook);
		return false;
	}

	swal.mixin({
		showCloseButton: true,
		showConfirmButton: false,
		allowOutsideClick: false,
		progressSteps: ['1', '2', '3'],
		// TODO disconnect on close
		preConfirm: (data) => {
			if(swal.getQueueStep() == 0) { // Entered the address
				sockethelper.valid = false;
				utilities.setCookie('addr', data, 24 * 36000000000);
				
				sockethelper.socket.emit('ready', data);

				setTimeout(function() {
					$('.swal2-cancel')[0].onclick = false;
					$('.swal2-cancel').click(function(e) {
						e.preventDefault();
						$('.swal2-confirm').click();
						sockethelper.rememberMe = false;
						return false;
					});
				}, 1);
			} else if(swal.getQueueStep() == 1) { // Entered the remember me
				setTimeout(function() {
					if(sockethelper.valid) {
						new QRious(
						{
							element: document.getElementById('qr'),
							value: '{"k":"' + sockethelper.key + '","u":"' + sockethelper.uuid + '"}',
							size: 400,
							backgroundAlpha: 0
						});
					} else {
						swal({
							toast: true,
							position: 'top-end',
							type: 'error',
							timer: 4000,
							title: 'Not a jMessage Server!',
							showConfirmButton: false
						})
					}
				}, 1);
			}
		}
	}).queue([
		{
			title: 'Server?',
			text: 'Enter your server address',
			input: 'url',
			inputPlaceholder: 'http://example.com',
			inputValue: utilities.isCookie('addr') ? utilities.getCookie('addr') : ''
		},
		{
			title: 'Staying?',
			text: 'Stay logged in on this browser?',
			showCancelButton: true,
			showConfirmButton: true,
			confirmButtonText: 'Yes',
			cancelButtonText: 'No',
			reverseButtons: true
		},
		{
			title: 'Scan!',
			html: 'Open jMessage &rarr; Settings &rarr; Scan QR<canvas id="qr"></canvas>'
		}
	]);

	return false;
}

function scrl(to, e) {
	var top;
	if('' === to) { top = 0; }
	else { top = $(to).offset().top - 80; }

	$('html, body').animate({
		scrollTop: top
	}, 800);

	if(e) {
		$('.active').each(function() {
			console.log(this);
            $(this).removeClass('active');
        });

        $(e).addClass('active');
	}

	return false;
}

$(document).ready(function() {
  utilities.ini('notifications', 'on');
  utilities.ini('sounds', 'on');
  utilities.ini('color', '#0076FF');
  utilities.ini('background', 'white');

  utilities.pickNewPhoneAsset();

  utilities.setupGuesser();

  var isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  var isAndroid = navigator.platform.toUpperCase().indexOf('ANDROID') >= 0;
  var isIPhone = navigator.platform.toUpperCase().indexOf('IOS') >= 0;

  if(isMac) {
  	$('#recommended').attr('href', '#');
  } else if(isAndroid) {
  	$('#recommended').attr('href', '#');
  } else if(isIPhone) {
  	$('#recommended').text('Not Available on iPhone');
  } else {
  	$('#recommended').click(startModal);
  }

  $('.scroller').on('click', function(event) {
	event.preventDefault();

	$('html, body').animate({
	  scrollTop: $($.attr(this, 'href')).offset().top
	}, 600);
  });

  $('html').click(function(event) {
	var t = $(event.target);

	if(!t.is('input')) {
		if(t.is('button')) {
			switch(t[0].classList[0]) {
				case 'msg_send_button':
				case 'chevronButton':
					$('#msg_input').focus();
					break;
				default:
					$('.recipients').focus();
					break;
			}
		} else if(!t.is('p')) {
			if(t.is('li')) {
				$('.recipients').focus();
			} else {
				$('#msg_input').focus();
			}
		}
	}
  });
});