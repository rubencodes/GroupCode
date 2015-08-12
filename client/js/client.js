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
	  autoAdjustMic: false
	});

	// a peer video has been added
	webrtc.on('videoAdded', function (video, peer) {
		console.log('video added', peer);
		
		var remotes = document.getElementById('remotesVideos');
		if (remotes) {
			var container = document.createElement('div');
			container.className = 'videoContainer';
			container.id = 'container_' + webrtc.getDomId(peer);
			container.appendChild(video);

			// suppress contextmenu
			video.oncontextmenu = function () { return false; };

			remotes.appendChild(container);
		}
	});
	// a peer video was removed
	webrtc.on('videoRemoved', function (video, peer) {
		var remotes = document.getElementById('remotesVideos');
		var el = document.getElementById(peer ? 'container_' + webrtc.getDomId(peer) : 'localScreenContainer');
		if (remotes && el) {
			remotes.removeChild(el);
		}
	});

	webrtc.on('localStream', function() {
		var room = Session.get("currentCodeId");
		webrtc.joinRoom(room);
	});
});

Template.nav.helpers({
	'showVideoButtons' : function() {
		return Session.get("showVideoButtons");
	},
	'videoOngoing' : function() {
		return Session.get("videoOngoing");
	},
	'videoShown' : function() {
		return Session.get("videoShown");
	},
	'name' : function() {
		return Session.get("name");
	}
});

Template.nav.events({
	'click #startVideoCall' : function() {
		Session.set("videoOngoing", true);
		Streamy.broadcast('initiateVideoCall', { data: 'start' });
		webrtc.startLocalVideo();
		$(".videoChatWrapper").slideDown();
	},
	'click #stopVideoCall' : function() {
		$(".videoChatWrapper").slideUp(400, function() {
			Session.set("videoOngoing", false);
			var room = Session.get("currentCodeId");
			webrtc.leaveRoom(room);
			webrtc.stopLocalVideo();
		});
	},
	'click #hideVideoCall' : function() {
		Session.set("videoShown", false);
		$(".videoChatWrapper").slideUp();
	},
	'click #showVideoCall' : function() {
		Session.set("videoShown", true);
		$(".videoChatWrapper").slideDown();
	},
	'click #download' : function() {
		download(ace.edit("codeBox").getValue());
	},
	'click .navbar-brand' : function() {
		Session.set("showVideoButtons", false);
		Session.set("videoOngoing", false);
		Session.set("videoShown", true);
		Router.go("/");
	},
	'click #share' : function() {
		location.href='mailto:?subject=Join My GroupCode!&body=Hello,%0D%0A%0D%0ACome help me code on GroupCode, the free, real-time, collaborative code-editor! Follow the link below to join me.%0D%0A%0D%0A%0D%0A%0D%0AThanks!';
	}
});

Template.body.events({
	'keydown *' : triggerDownload
});

Template.body.helpers({
	'myTemp' : function() {
		return Session.get("template");
	}
});

Template.landing.events({
	'click #create': function() {
		createGroupCode();
	},
	'click #drop_zone': function() {
		//trigger file upload
		document.getElementById("files").click();
	},
	'dragover #drop_zone' : function(evt) {
		evt.stopPropagation();
		evt.preventDefault();
		
		$(this).find("h3").html("Drop Here");
//		evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
	},
	'drop #drop_zone' : function(evt) {
		handleFileSelect(evt);
		createGroupCode();
	},
	'change #files': function(evt) {
		handleFileSelect(evt);
		createGroupCode();
	}
});

Template.codeBox.onRendered(function() {

	// Attach an handler for a specific message
Streamy.on('initiateVideoCall', function(d, s) {
  console.log(d.data); // Will print 'world!'

  // On the server side only, the parameter 's' is the socket which sends the message, you can use it to reply to the client, see below
});


	$('select').selectric().on('selectric-change', function(element){
		var mode = $(this).val();
		ace.edit("codeBox").getSession().setMode('ace/mode/'+mode);
		
		//update stored groupcode language
		Meteor.call("updateGroupCodeLanguage", Session.get("currentCodeId"), $("select").val());
	});
});

Template.codeBox.helpers({
	// helper functions go here
	'code' : function() {
		var codeBase = Code.findOne({ _id: Session.get("currentCodeId") });
		return codeBase ? codeBase.code : "";
	},
	'docid' : function() {
		return Session.get("currentCodeId");
	},
	'config' : function() {
		return function(editor) {
			editor.setTheme('ace/theme/twilight');
			editor.getSession().setMode('ace/mode/'+$("select").val());
			editor.setShowPrintMargin(false);
			editor.getSession().setUseWrapMode(true);

			var codeBase = Code.findOne({ _id: Session.get("currentCodeId") });

			if(codeBase) {
				$("select").val(codeBase.language).selectric("refresh");
				ace.edit("codeBox").getSession().setMode('ace/mode/'+codeBase.language);
			}
		}
	},
	'fileUploaded' : function() {
		return function(editor) {
			if(Session.get("fileUploaded")) {
				editor.setValue(Session.get("fileUploaded"));
				
				if(ext = Session.get("fileExtension")) {
					if(option = $("option[ext='"+ext+"']").attr("value")) {
						$("select").val(option).selectric("refresh");
						ace.edit("codeBox").getSession().setMode('ace/mode/'+option);
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
		if(newVal) {
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
		if(newVal) {
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
		if(newVal) {
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

function nameAnimation() {
	var tempName = "**********".split("");
	var realName = "GroupCodes".split("");
	Session.set("name", tempName.join(""));

	var capital = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
	var lower   = "abcdefghijklmnopqrstuvwxyz";

	var i = 0;
	var j = 0;
	var animation = setInterval(function () {
		if(tempName[i] != realName[i]) {
			if(capital.indexOf(realName[i]) >= 0) {
				var newLetter = capital[j%capital.length];
			} else {
				var newLetter = lower[j%lower.length];
			}
			tempName[i] = newLetter;
			j++;
		} else {
			i++;
			j = 0;
		}

		if(i == realName.length && tempName == realName) {
			clearInterval(animation);
		}

		Session.set("name", tempName.join(""));
	}, 10);
}

//trigger download on ctrl+s
function triggerDownload(event) {
	if(Router.current().route.getName() == "groupcode.codebox") {
		if (event.keyCode == 83 && (navigator.platform.match("Mac") ? event.metaKey : event.ctrlKey)) {
			event.preventDefault();
			download(ace.edit("codeBox").getValue());
		}
	}
}

function download(text) {
	swal({   
		title: "Save File",   
		text: "Enter a filename:",   
		type: "input",   
		showCancelButton: true,   
		closeOnConfirm: false,   
		animation: "slide-from-top",   
		inputValue: "filename."+$('option:selected', $("select")).attr("ext"),
  		confirmButtonColor: "rgb(24, 188, 156)",
  		confirmButtonText: "Save",
	}, function(filename){   
		if (filename === false) 
			return false;      
		else if (filename === "") {
			swal.showInputError("You need to write something!");
			return false
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

function createGroupCode() {
	//create groupcode on the server
	Meteor.call("createGroupCode", "javascript", function(err, codeId) {
		if(!err) {
			Session.set("currentCodeId", codeId);
			Router.go("/"+codeId);
		}
	});
}

/* FILE API */
		
function handleFileSelect(evt) {
	evt.stopPropagation();
	evt.preventDefault();
	evt = evt.originalEvent;
	
	//gets files from either upload button or drag & drop
	var files = evt.dataTransfer ? evt.dataTransfer.files : evt.target.files; // FileList object

	//we only support one file at a time
	var file = files[0];

	//if file exists, read file & store it
	if (file) {
		var reader = new FileReader();
		reader.readAsText(file, "UTF-8");
		reader.onload = function (evt) {
			Session.set("fileUploaded", evt.target.result);
			
			//get file extension
			var ext = file.name.match(/\.([0-9a-z]+)(?:[\?#]|$)/);
			if(ext.length > 0) {
				ext = ext[0].substring(1);
				Session.set("fileExtension", ext);
			}
		}
	}
}


/* END FILE API */