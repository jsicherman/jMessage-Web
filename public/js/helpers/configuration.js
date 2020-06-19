var configuration = (function() {
	var configuration = {};

	configuration.toggleNotifications = function toggleNotifications(elem) {
		utilities.setCookie('notifications', elem.checked ? 'on' : 'off', 24 * 36000000000);

		if(elem.checked) {
			utilities.requestNotifications();
		}
	};

	configuration.toggleSounds = function toggleSounds(elem) {
		utilities.setCookie('sounds', elem.checked ? 'on' : 'off', 24 * 36000000000);
	};

	configuration.updatePrimary = function updatePrimary(color) {
		utilities.setCookie('color', color, 24 * 36000000000);
		// TODO Update secondary color
		$(':root').css('--primaryColor', color);
	};

	configuration.randomColor = function randomColor() {
		if(!utilities.isCookie('color')) {
			utilities.ini('color', '#0076FF');
		}

		var allowed = ['#0076FF', '#F0932B', '#E056FD', '#6C5CE7', '#636E72', '#2ECC71'];
		var msgs = ['Looks great!', 'Cool!', 'Surprise!', 'Colorful!', 'Nice one!', 'Sweet!', 'Nice find!', 'Achievement unlocked!', 'Love it!', 'Awesome!', 'Looks fresh!'];

		var curr = utilities.getCookie('color');
		var selected;

		while((selected = allowed[Math.floor(Math.random() * allowed.length)]) === curr) { }

		swal({
			toast: true,
			position: 'top-end',
			showConfirmButton: false,
			timer: 1000,
			title: '<span style="color: ' + selected + '">' + msgs[Math.floor(Math.random() * msgs.length)] +'</span>',
			type: 'success'
		});

		configuration.updatePrimary(selected);
	};

	configuration.setColor = function setColor(elem, check) {
		$('.colorControl').each(function() {
			var c = $(this).attr('id');
			if(elem.id === c && check) {
				$(this)[0].style.setProperty('color', 'white', 'important');
			} else {
				$(this)[0].style.setProperty('color', 'transparent', 'important');
			}
		})

		configuration.updatePrimary(elem.id);
	};

	configuration.setBg = function setBg(elem) {
		$('.bgControl').each(function() {
			var c = $(this).attr('id');
			if(elem.id === c) {
				$(this)[0].style.setProperty('color', '#464646', 'important');
			} else {
				$(this)[0].style.setProperty('color', 'transparent', 'important');
			}
		});

		utilities.setCookie('background', elem.id, 24 * 36000000000);
		
		if(elem.id === 'white') {
			$('.msg_history').css('background-image', 'unset');
			$('.composing').css('background-image', 'unset');
		} else {
			$('.msg_history').css('background-image', 'url(/public/img/backgrounds/' + elem.id + '.svg)');
			$('.composing').css('background-image', 'url(/public/img/backgrounds/' + elem.id + '.svg)');
		}
	};

	return configuration;
}());