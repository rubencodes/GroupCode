Session.setDefault("showVideoButtons", false);
Session.setDefault("videoOngoing", false);
Session.setDefault("videoShown", true);

Template.nav.onRendered(function() {
    Session.set("videoOngoing", false);
    nameAnimation();

    //Load
    webrtc = new SimpleWebRTC({
        localVideoEl: "localVideo",
        remoteVideosEl: "",
        autoRequestMedia: false,
        debug: false,
        detectSpeakingEvents: true,
        autoAdjustMic: true
    });

    // a peer video has been added
    webrtc.on('videoAdded', function(video, peer) {
        var remotes = document.getElementById('remotesVideos');
        if (remotes) {
            var container = document.createElement('div');
            container.className = 'videoContainer';
            container.id = 'container_' + webrtc.getDomId(peer);
            container.appendChild(video);

            // suppress contextmenu
            video.oncontextmenu = function() {
                return false;
            };

            remotes.appendChild(container);
        }
    });
    // a peer video was removed
    webrtc.on('videoRemoved', function(video, peer) {
        var remotes = document.getElementById('remotesVideos');
        var el = document.getElementById(peer ? 'container_' + webrtc.getDomId(peer) : 'localScreenContainer');
        if (remotes && el) {
            remotes.removeChild(el);
        }
    });

    webrtc.on('localStream', function() {
        var room = Session.get("currentCodeBoxId");
        webrtc.joinRoom(room);
    });
});

Template.nav.helpers({
    'showVideoButtons': function() {
        return Session.get("showVideoButtons");
    },
    'videoOngoing': function() {
        return Session.get("videoOngoing");
    },
    'videoShown': function() {
        return Session.get("videoShown");
    },
    'name': function() {
        return Session.get("name");
    }
});

Template.nav.events({
    'click #startVideoCall': function() {
        startCall();
    },
    'click #stopVideoCall': function() {
		//id of current room
    	var room = Session.get("currentCodeBoxId");
		
		//announce cancelled call
		Streamy.broadcast(room, { data : "callCancelled" });
		
		stopSound(); //stop dial sound
		stopDial();  //stop dial indicator
        endCall();	 //end call
    },
    'click #hideVideoCall': function() {
        Session.set("videoShown", false);
        $(".videoChatWrapper").slideUp();
    },
    'click #showVideoCall': function() {
        Session.set("videoShown", true);
        $(".videoChatWrapper").slideDown();
    },
    'click #download': function() {
        download(ace.edit("codeBox").getValue());
    },
    'click .navbar-brand': function() {
        Session.set("videoOngoing", false);
        Session.set("videoShown", true);
        Router.go("/");
    },
    'click #share': function() {
        location.href = 'mailto:?subject=Join My GroupCode!&body=Hello,%0D%0A%0D%0ACome help me code on GroupCode, the free, real-time, collaborative code-editor! Follow the link below to join me.%0D%0A%0D%0A%0D%0A%0D%0AThanks!';
    },
	'click .create-groupcode': function() {
        createGroupCode();
    },
    'click .upload-groupcode': function() {
        //trigger file upload
        document.getElementById("files").click();
    },
    'dragover .upload-groupcode': function(evt) {
        evt.stopPropagation();
        evt.preventDefault();
    },
    'drop .upload-groupcode': function(evt) {
        handleFileSelect(evt, createGroupCode);
    },
    'change #files': function(evt) {
        handleFileSelect(evt, createGroupCode);
    }
});

Template.body.events({
    'keydown *': triggerDownload
});

Template.error.events({
    'click #create': function() {
        createGroupCode();
    }
});

Template.landing.events({
    'click .create-groupcode': function() {
        createGroupCode();
    },
    'click .upload-groupcode': function() {
        //trigger file upload
        document.getElementById("files").click();
    },
    'dragover .upload-groupcode': function(evt) {
        evt.stopPropagation();
        evt.preventDefault();
    },
    'drop .upload-groupcode': function(evt) {
        handleFileSelect(evt, createGroupCode);
    },
    'change #files': function(evt) {
        handleFileSelect(evt, createGroupCode);
    }
});

Template.codeBox.onRendered(function() {
	//id of current room
    var room = Session.get("currentCodeBoxId");
	
	//on Streamy message handler
    Streamy.on(room, function(d, s) {
		//if we get a call and this user didn't start the video, alert them
        if (d.data === "startVideo" &&  !Session.get("videoOngoing")) {
			Streamy.broadcast(room, { data : "callReceived" });
			//start ring sound
			startSound("ring.mp3");
			
            swal({
                title: "Incoming Video Call",
                text: "Your partner would like to video chat with you.",
                type: "warning",
                showCancelButton: true,
                animation: "slide-from-top",
                confirmButtonColor: "#DD6B55",
                confirmButtonText: "Join Call!",
                cancelButtonText: "Decline call",
                closeOnConfirm: true,
                closeOnCancel: false
            }, function(isConfirm) {
				stopSound(); //stop ring sound
                if (isConfirm) {
                    Session.set("videoOngoing", true);
					
					Streamy.broadcast(room, { data : "callAccepted" });
					console.log("Starting local video...");
                    webrtc.startLocalVideo();
                    $(".videoChatWrapper").slideDown();
                } else {
					Streamy.broadcast(room, { data : "callDeclined" });
                }
            });
        }
		//if call was received, and this user is part of the call, cancel timeout that auto-ends the call
		else if(d.data === "callReceived" && Session.get("videoOngoing")) {
			clearTimeout(Session.get("callTimeout"));
			Session.set("callTimeout", null);
		} 
		else if(d.data === "callDeclined" && Session.get("videoOngoing")) {
			stopSound(); //stop dial sound
			stopDial();  //stop dial indicator
			
			//end call and alert
			endCall();
			swal({title:"No One's Home", timer: 5000,text:"Looks like no one picked up! :(", type: "error"});
		} 
		else if(d.data === "callAccepted" && Session.get("videoOngoing")) {
			stopSound(); //stop dial sound
			stopDial();  //stop dial indicator
		} 
		else if(d.data === "callCancelled" && !Session.get("videoOngoing")) {
			stopSound(); //stop ring sound
			swal({title:"You Missed a Call", type: "error"});
		}
    });

	//when the selected element changes, change the editor mode and store in db
    $('select').selectric().on('selectric-change', function(element) {
        var mode = $(this).val();
        ace.edit("codeBox").getSession().setMode('ace/mode/' + mode);

        //update stored groupcode language
        Meteor.call("updateGroupCodeLanguage", Session.get("currentCodeId"), $("select").val());
    });
});

Template.codeBox.helpers({
    'docid': function() {
        return Session.get("currentCodeId");
    },
    'config': function() {
        return function(editor) {
            editor.setTheme('ace/theme/twilight');
            editor.getSession().setMode('ace/mode/' + $("select").val());
            editor.setShowPrintMargin(false);
            editor.getSession().setUseWrapMode(true);

            var code = Code.findOne({
                _id: Session.get("currentCodeId")
            });

            //if we have it stored, set the code language
            if (code) {
                $("select").val(code.language).selectric("refresh");
                ace.edit("codeBox").getSession().setMode('ace/mode/' + code.language);
            }
        }
    },
    'fileUploaded': function() {
        return function(editor) {
            if (Session.get("fileUploaded")) {
                editor.setValue(Session.get("fileUploaded"));

                if (ext = Session.get("fileExtension")) {
                    if (option = $("option[ext='" + ext + "']").attr("value")) {
                        $("select").val(option).selectric("refresh");
                        ace.edit("codeBox").getSession().setMode('ace/mode/' + option);
                        Meteor.call("updateGroupCodeLanguage", Session.get("currentCodeId"), $("select").val());
                    }
                    Session.set("fileExtension", null);
                }

                Session.set("fileUploaded", null);
            }
        }
    }
});

Template.videoChat.events({
    'click #videoControl': function() {
        var newVal = !Session.get("videoMuted");
        Session.set("videoMuted", newVal);
        if (newVal) {
            $("#videoControl").removeClass("btn-success").addClass("btn-danger");
            $("#videoControl>span").removeClass("glyphicon-eye-open").addClass("glyphicon-eye-close");
            webrtc.pauseVideo();
        } else {
            $("#videoControl").removeClass("btn-danger").addClass("btn-success");
            $("#videoControl>span").removeClass("glyphicon-eye-close").addClass("glyphicon-eye-open");
            webrtc.resumeVideo();
        }
    },
    'click #audioControl': function() {
        var newVal = !Session.get("audioMuted");
        Session.set("audioMuted", newVal);
        if (newVal) {
            $("#audioControl").removeClass("btn-success").addClass("btn-danger");
            $("#audioControl>span").removeClass("glyphicon-volume-up").addClass("glyphicon-volume-off");
            webrtc.mute();
        } else {
            $("#audioControl").removeClass("btn-danger").addClass("btn-success");
            $("#audioControl>span").removeClass("glyphicon-volume-off").addClass("glyphicon-volume-up");
            webrtc.unmute();

        }
    },
    'click #sizeControl': function() {
        var newVal = !Session.get("fullscreen");
        Session.set("fullscreen", newVal);
        if (newVal) {
            $(".videoChatWrapper").addClass("fullscreen");
            $("#sizeControl").removeClass("btn-success").addClass("btn-danger");
            $("#sizeControl>span").removeClass("glyphicon-resize-full").addClass("glyphicon-resize-small");
        } else {
            $(".videoChatWrapper").removeClass("fullscreen");
            $("#sizeControl").removeClass("btn-danger").addClass("btn-success");
            $("#sizeControl>span").removeClass("glyphicon-resize-small").addClass("glyphicon-resize-full");
        }
    },
});

//animates name
function nameAnimation() {
    var tempName = "**********".split("");
    var realName = "GroupCodes".split("");
    Session.set("name", tempName.join(""));

    var capital = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    var lower = "abcdefghijklmnopqrstuvwxyz";

    var i = 0;
    var j = 0;
    var animation = setInterval(function() {
        if (tempName[i] != realName[i]) {
            if (capital.indexOf(realName[i]) >= 0) {
                var newLetter = capital[j % capital.length];
            } else {
                var newLetter = lower[j % lower.length];
            }
            tempName[i] = newLetter;
            j++;
        } else {
            i++;
            j = 0;
        }

        if (i == realName.length && tempName == realName) {
            clearInterval(animation);
        }

        Session.set("name", tempName.join(""));
    }, 10);
}

//trigger download on ctrl+s
function triggerDownload(event) {
    if (Router.current().route.getName() == "groupcode.codebox") {
        if (event.keyCode == 83 && (navigator.platform.match("Mac") ? event.metaKey : event.ctrlKey)) {
            event.preventDefault();
            download(ace.edit("codeBox").getValue());
        }
    }
}

//download prompt
function download(text) {
    swal({
        title: "Save File",
        text: "Enter a filename:",
        type: "input",
        showCancelButton: true,
        closeOnConfirm: false,
        animation: "slide-from-top",
        inputValue: "filename." + $('option:selected', $("select")).attr("ext"),
        confirmButtonColor: "rgb(24, 188, 156)",
        confirmButtonText: "Save",
    }, function(filename) {
        if (filename === false)
            return false;
        else if (filename === "") {
            swal.showInputError("Please enter a filename.");
            return false;
        } else {
            var element = document.createElement('a');
            element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
            element.setAttribute('download', filename);

            element.style.display = 'none';
            document.body.appendChild(element);

            element.click();

            document.body.removeChild(element);
            swal.close();
        }
    });
}

//create groupcode on the server
function createGroupCode() {
	if(Session.get("fileUploaded") == null) {
		Session.set("fileUploaded", "/* Welcome to GroupCodes! Get started collaborating with others by sharing your current URL, or press the 'Share' button to share it via email. Anything you type here will be visible to anyone with the URL. */");
	}
    Meteor.call("createGroupCode", "javascript", function(err, result) {
        if (!err) {
            Session.set("currentCodeBoxId", result.codeBoxId);
            Session.set("currentCodeId", result.codeId);
            Router.go("/" + result.codeBoxId);
        }
    });
}

//user uploaded a file, now what?
function handleFileSelect(evt, callback) {
	//stop any default events
    evt.stopPropagation();
    evt.preventDefault();
    evt = evt.originalEvent;

    //gets files from either upload button or drag & drop
    var files = evt.dataTransfer ? evt.dataTransfer.files : evt.target.files; // FileList object

    //we only support one file at a time
	if(files.length > 1) {
		swal({title:"No Multifile Support", text:"Sorry, GroupCodes don't yet support multiple files; files must be uploaded individually.", type: "error"});
		return;
	}
	
    var file = files[0];

    //if file exists, read file & store it
    if (file) {
        var reader = new FileReader();
        reader.readAsText(file, "UTF-8");
        reader.onload = function(evt) {
            Session.set("fileUploaded", evt.target.result);

            //get file extension
            var ext = file.name.match(/\.([0-9a-z]+)(?:[\?#]|$)/);
            if (ext.length > 0) {
                ext = ext[0].substring(1);
				
				if(!validExtension(ext)) {
					swal({title:"File Upload Error", text:"Sorry, this type of file is not yet supported. We'll get right on that!", type: "error"});
					return;
				}
				
                Session.set("fileExtension", ext);
            }
			
			if(callback) callback();
        }
		reader.onerror = function(evt) {
			swal({title:"File Upload Error", text:"Sorry, this type of file is not yet supported. We'll get right on that!", type: "error"});
		}
    }
}

var invalidExtensions = ["xlsx", "xlsm", "doc", "docx", "pptx", "xltx", "xltm", "xlsb", "xlam", "pptm", "potx", "potm", "ppam", "ppsx", "ppsm", "sldx", "sldm", "thmx", "dotm", "dotx", "docm", "jpg", "jpeg", "gif", "png", "zip", "tar", "gz", "mov", "mp3", "mp4", "flac", "iso", "dmg"];
function validExtension(ext) {
	return invalidExtensions.indexOf(ext.toLowerCase()) === -1;
}

//handle end call
function endCall() {
	//hide video call, reset boolean and stop streaming
	$(".videoChatWrapper").slideUp(400, function() {
		//hide video
		Session.set("videoOngoing", false);
		
		//leave room
		var room = Session.get("currentCodeBoxId");
		webrtc.leaveRoom(room);
		webrtc.stopLocalVideo();
	});
}

//handle start video call
function startCall() {
	Session.set("videoOngoing", true);
	var room = Session.get("currentCodeBoxId");

	//start the call
	webrtc.startLocalVideo();

	//show the call
	$(".videoChatWrapper").slideDown();

	//broadcast the call to connected users
	Streamy.broadcast(room, {
		data: 'startVideo'
	});
	
	//start dial sound
	startSound("dial.mp3");
	
	//start dialing indicator
	startDial();

	//ends call after ten seconds if no one is connected
	var endCallIfNoUsers = setTimeout(function() {
		//stop dial sound
		stopSound();
		
		//stop dialing indicator
		stopDial();
		
		//end call and alert
		endCall();
		swal({title:"No One's Home", timer: 5000, text:"Looks like no one picked up! :(", type: "error"});
	}, 10000);
	Session.set("callTimeout", endCallIfNoUsers);
}

//stop sound from playing
function stopSound() {
	var audio = document.getElementById("sound");
	
	if(audio) {
		audio.pause();
		audio.remove();
	}
}

function startSound(file) {
	stopSound(); //stop any sounds playing
	
	//start playing the dial tone
	var audio = new Audio(file);
	audio.id = "sound";
	audio.loop = "true";
	document.body.appendChild(audio);
	audio.play();
}

function stopDial() {
	var dial = document.getElementById("dial");
	
	if(dial) {
		dial.remove();
	}
}

function startDial() {
	document.getElementById("remotesVideos").innerHTML = "<div id=\"dial\" class=\"large progress phonecall\"></div>";
}
