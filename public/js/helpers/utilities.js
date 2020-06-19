var utilities = (function() {
	var awesomplete,
		options = [],
		contactcache,
		contactarray,
		utilities = {};

	utilities.awesomplete = awesomplete;

	utilities.requestNotifications = function requestNotifications() {
		try {
			Notification.requestPermission();
		} catch(err) {
		}
	};

	//// COOKIE FUNCTIONS ////
	utilities.isCookie = function isCookie(cname) {
		return typeof getCookie(cname) !== undefined;
	};

	utilities.getCookie = getCookie;

	utilities.setCookie = function setCookie(cname, value, expire) {
		var now = new Date();
		now.setTime(now.getTime() + expire);
		var cook = cname + '=' + value + ';expires=' + now.toUTCString();
		document.cookie = cook;
	};

	utilities.ini = function ini(cname, val) {
		if(!utilities.isCookie(cname)) {
			utilities.setCookie(cname, val, 24 * 36000000000);
		}
	};
	//// COOKIE FUNCTIONS ////

	function copyText(text) {
		var textArea = document.createElement('textarea');
		textArea.value = text;
		document.body.appendChild(textArea);
		textArea.focus();
		textArea.select();

		try {
			document.execCommand('copy');
		} catch (err) {
		}

		document.body.removeChild(textArea);
	}

	//// UI FUNCTIONS ////
	utilities.setupContextMenu = function setupContextMenu() {
		var menu = document.querySelector('.menu');
		var targetElement;

		window.addEventListener('click', function() {
			menu.style.display = 'none';
			targetElement = null;
		});

		$('.menu-option').click(function() {
			switch(this.textContent) {
				case 'Copy':
					copyText(targetElement.children()[0].textContent);
					break;
				case 'React':
					$('#reactModal').modal();
					break;
				case 'Delete Thread':
					break;
			}
		});

		window.addEventListener('contextmenu', function(e) {
			var clicked = 'mesg';
			if($(e.target).closest('.chat_list').length > 0) {
				targetElement = $(e.target).closest('.chat_list');
				clicked = 'conv';
			} else if($(e.target).closest('.received_msg').length > 0) {
				targetElement = $(e.target).closest('.received_msg');
			} else if($(e.target).closest('.sent_msg').length > 0) {
				targetElement = $(e.target).closest('.sent_msg');
			} else {
				return true;
			}

			$('.menu-option').each(function() {
				if($(this).attr('dataFor') === clicked) {
					$(this).css('display', 'block');
				} else {
					$(this).css('display', 'none');
				}
			});

			e.preventDefault();
			menu.style.left = e.pageX + 'px';
			menu.style.top = e.pageY + 'px';
			menu.style.display = 'block';

			return false;
		});
	};

	utilities.toggleChevron = function toggleChevron() {
		var elem = $('#chevvy').children();
		var remove = elem[0].classList[1];
		var left = remove.includes('left');
		elem.removeClass(remove);
		elem.addClass('fa-chevron-' + (left ? 'right' : 'left'));

		if(!left) {
			$('#chevvy').css({ position: 'unset' });
		}

		$('.inbox_people').stop().animate({
		    'margin-left': left ? '-25%' : '0'
		}, 500, function() {
			if(left) {
				$('#chevvy').css({
					position: 'absolute',
					top: 0,
					left: 0
				});
			}
		});
	};

	utilities.pickNewPhoneAsset = function pickNewPhoneAsset() {
		function findActiveImage() {
			var elems = $('.laptop .phone .frame .screen').length;
			for(var i = 0; i < elems; i++) {
				if($('.laptop .phone .frame .image' + i).css('display') !== 'none') {
					return $('.laptop .phone .frame .image' + i).attr('src');
				}
			}
		}

		var curr = $('.laptop .phone .frame video').css('display') !== 'none' ? $('.laptop .phone .frame video source').attr('src') : findActiveImage();

		if(typeof curr === 'undefined') {
			return;
		}

		curr = parseInt(curr.substring(curr.indexOf('.') - 1, curr.indexOf('.')), 10);
		var next;
		while((next = Math.floor(Math.random() * 7)) === curr) { }

		$('.laptop .phone .frame .image' + next).fadeIn('fast');
		$('.laptop .phone .frame .image' + curr).fadeOut('fast');
		$('.laptop .phone .frame video').fadeOut('fast');

		setTimeout(function() {
			utilities.pickNewPhoneAsset();
		}, 10000);
	};

	utilities.macInstructions = function macInstructions() {
		window.open('/setup', '_blank');
		return true;
	};
	//// UI FUNCTIONS ////

	utilities.setupGuesser = function setupGuesser() {
		$(test);
		$(window).scroll(test);

		function isVisible(elem) {
		    var docViewTop = $(window).scrollTop();
		    var docViewBottom = docViewTop + $(window).height();

		    var elemTop = $(elem).offset().top;
		    var elemBottom = elemTop + $(elem).height();

		    return ((elemBottom <= docViewBottom) && (elemTop >= docViewTop));
		}

		function test() {
			if(isVisible($('.odometer'))) {
				$('#odometer').html('8507059173023461586');
				$('#odometer2').html('5843651857942052864');
			}
		}
	};

	utilities.logout = function logout() {
		utilities.setCookie('login', '', -86400000);

		window.location.href = window.location.href.substring(0, window.location.href.lastIndexOf('/'));
	};

	return utilities;
}());