// Initial code by Borui Wang, updated by Graham Roth
// For CS247, Spring 2014
var username = "";
var mediaRecorder;
var fb_instance_stream;
var my_color;

(function() {

  var cur_video_blob = null;
  var fb_instance;

  $(document).ready(function(){
    connect_to_chat_firebase();
    connect_webcam();
    // make_reveal_button();
    $("button").click(reveal_messages);

});


  function connect_to_chat_firebase(){
    /* Include your Firebase link here!*/
    fb_instance = new Firebase("https://resplendent-fire-6810.firebaseio.com/");

    // generate new chatroom id or use existing id
    var url_segments = document.location.href.split("/#");
    if(url_segments[1]){
      fb_chat_room_id = url_segments[1];
    }else{
      fb_chat_room_id = Math.random().toString(36).substring(7);
    }
    display_msg({m:"Share this url with your friend to join this chat -- "+ document.location.origin+"/#"+fb_chat_room_id,c:"red"})

    // set up variables to access firebase data structure
    var fb_new_chat_room = fb_instance.child('chatrooms').child(fb_chat_room_id);
    var fb_instance_users = fb_new_chat_room.child('users');
    fb_instance_stream = fb_new_chat_room.child('stream');
    my_color = "#"+((1<<24)*Math.random()|0).toString(16);

    // listen to events
    fb_instance_users.on("child_added",function(snapshot){
      display_msg({m:snapshot.val().name+" joined the room",c: snapshot.val().c});
    });
    fb_instance_stream.on("child_added",function(snapshot){
      display_msg(snapshot.val());
    });

    // block until username is answered
    username = window.prompt("Welcome, warrior! please declare your name?");
    if(!username){
      username = "anonymous"+Math.floor(Math.random()*1111);
    }
    fb_instance_users.push({ name: username,c: my_color});
    $("#waiting").remove();

    // bind submission box
    $("#submission input").keydown(function( event ) {
      if (event.which == 13) {
        // if(has_emotions($(this).val())){
          // fb_instance_stream.push({m:username+": " +$(this).val(), v:cur_video_blob, c: my_color});
        // }else{
          fb_instance_stream.push({m:username+": " +$(this).val(), c: my_color});
        // }
        $(this).val("");
        scroll_to_bottom(0);
      }
    });
    // scroll to bottom in case there is already content
    scroll_to_bottom(1300);
  }

  function reveal_messages(){
    var obfuscated_msgs = document.getElementsByClassName('obfuscated_msg');
    var hidden_msgs = document.getElementsByClassName('hidden_msg');
    var length = obfuscated_msgs.length;
    for (var i = 0; i < length; i++) {
      var obf_item = obfuscated_msgs.item(0);  
      console.log(obf_item);
      obf_item.parentNode.removeChild(obf_item);
      var hidden_item = hidden_msgs.item(0); 
      console.log(hidden_item); 
      hidden_item.className= "msg";
    }

    record_reaction();
    document.getElementById("reveal_btn").disabled = true; 


  }


  function record_reaction(){
    mediaRecorder.start(5000);

  }


  // creates a message node and appends it to the conversation
  function display_msg(data){
    if(data.v){
      // for video element
      var video = document.createElement("video");
      video.autoplay = true;
      video.controls = false; // optional
      video.loop = true;
      video.width = 120;

      var source = document.createElement("source");
      source.src =  URL.createObjectURL(base64_to_blob(data.v));
      source.type =  "video/webm";

      video.appendChild(source);

      document.getElementById("conversation").appendChild(video);
    } else {
      var index_of_end_name = data.m.indexOf(": ");
      if(index_of_end_name == -1) index_of_end_name = 0;
      var sender_name = data.m.substring(0,index_of_end_name);
      var message = data.m.substr(index_of_end_name+2);

      //
      if (sender_name == username || sender_name === "") {
        $("#conversation").append("<div class='msg' style='color:"+data.c+"'>"+data.m+"</div>");
      } else {
        //actual message initially hidden
        $("#conversation").append("<div class='hidden_msg' style='color:"+data.c+"'>"+data.m+"</div>");

        var obfuscated = "------------";
        $("#conversation").append("<div class='obfuscated_msg' style='color:"+data.c+"'>"+sender_name+": "+obfuscated+"</div>");
        document.getElementById("reveal_btn").disabled = false; 
      }
    }
  }

  function scroll_to_bottom(wait_time){
    // scroll to bottom of div
    setTimeout(function(){
      $("html, body").animate({ scrollTop: $(document).height() }, 200);
    },wait_time);
  }

  function connect_webcam(){
    // we're only recording video, not audio
    var mediaConstraints = {
      video: true,
      audio: false
    };

    // callback for when we get video stream from user.
    var onMediaSuccess = function(stream) {
      // create video element, attach webcam stream to video element
      var video_width= 160;
      var video_height= 120;
      var webcam_stream = document.getElementById('webcam_stream');
      var video = document.createElement('video');
      webcam_stream.innerHTML = "";
      // adds these properties to the video
      video = mergeProps(video, {
          controls: false,
          width: video_width,
          height: video_height,
          src: URL.createObjectURL(stream)
      });
      video.play();
      webcam_stream.appendChild(video);

      // counter
      var time = 0;
      var second_counter = document.getElementById('second_counter');
      var second_counter_update = setInterval(function(){
        second_counter.innerHTML = time++;
      },1000);

      // now record stream in 5 seconds interval
      var video_container = document.getElementById('video_container');
      mediaRecorder = new MediaStreamRecorder(stream);
      var index = 1;

      mediaRecorder.mimeType = 'video/webm';
      // mediaRecorder.mimeType = 'image/gif';
      // make recorded media smaller to save some traffic (80 * 60 pixels, 3*24 frames)
      mediaRecorder.video_width = video_width/2;
      mediaRecorder.video_height = video_height/2;

      mediaRecorder.ondataavailable = function (blob) {
          // console.log("new data avail!");
          video_container.innerHTML = "";

          // convert data into base 64 blocks
          blob_to_base64(blob,function(b64_data){
            cur_video_blob = b64_data;  
            fb_instance_stream.push({m:username, v:cur_video_blob, c: my_color});
          });
      };
      console.log("connect to media stream!");
    }

    // callback if there is an error when we try and get the video stream
    var onMediaError = function(e) {
      console.error('media error', e);
    }

    // get video stream from user. see https://github.com/streamproc/MediaStreamRecorder
    navigator.getUserMedia(mediaConstraints, onMediaSuccess, onMediaError);
  }

  // check to see if a message qualifies to be replaced with video.
  var has_emotions = function(msg){
    var options = ["lol",":)",":("];
    for(var i=0;i<options.length;i++){
      if(msg.indexOf(options[i])!= -1){
        return true;
      }
    }
    return false;
  }


  // some handy methods for converting blob to base 64 and vice versa
  // for performance bench mark, please refer to http://jsperf.com/blob-base64-conversion/5
  // note useing String.fromCharCode.apply can cause callstack error
  var blob_to_base64 = function(blob, callback) {
    var reader = new FileReader();
    reader.onload = function() {
      var dataUrl = reader.result;
      var base64 = dataUrl.split(',')[1];
      callback(base64);
    };
    reader.readAsDataURL(blob);
  };

  var base64_to_blob = function(base64) {
    var binary = atob(base64);
    var len = binary.length;
    var buffer = new ArrayBuffer(len);
    var view = new Uint8Array(buffer);
    for (var i = 0; i < len; i++) {
      view[i] = binary.charCodeAt(i);
    }
    var blob = new Blob([view]);
    return blob;
  };

})();
