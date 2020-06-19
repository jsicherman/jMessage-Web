$(document).scroll(function(){
  checkStart();
});

$(document).resize(function(){
  checkStart();
});

$(document).ready(function(){
 checkStart();
});

var animStarted = false;

function testInView(el) {
  var wTop = $(window).scrollTop();
  var wBot = wTop + $(window).height();
  var eTop = el.offset().top;
  var eBot = eTop + el.height();

  return ((eBot <= wBot) && (eTop >= wTop));
}

function checkStart() {
  if(animStarted) { return; }

  $('.msg-container').each(function() {
    var me = $(this);
    if(testInView(me)) {
      startAnimation(); 
    }
  });
}

function showMessage(id) {
  var message = $('#message-' + id);
  message.css('display', 'table');
}

function startAnimation() {
  var messages = $('.message');
  var timeOut = 2000;

  messages.each(function(index) {
  index++;

  if(index === messages.length) {
    window.setTimeout(function() {
      writer.remove();
    }, timeOut);
  }

  window.setTimeout(function() {
    showMessage(index);
  }, timeOut);

  timeOut += 2000;
  });
}