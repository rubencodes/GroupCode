Session.setDefault('showVideoButtons', false);
Session.setDefault('videoOngoing', false);
Session.setDefault('videoShown', true);
Meteor.subscribe('code');
// Meteor.subscribe('codeBox');

Template.nav.onRendered(() => {
  Session.set('videoOngoing', false);
  nameAnimation();

  //Load
  webrtc = new SimpleWebRTC({
    localVideoEl: 'localVideo',
    remoteVideosEl: '',
    autoRequestMedia: false,
    debug: false,
    detectSpeakingEvents: true,
    autoAdjustMic: true
  });

  // a peer video has been added
  webrtc.on('videoAdded', (video, peer) => {
    const remotes = document.getElementById('remotesVideos');
    if (remotes) {
      const container = document.createElement('div');
      container.className = 'videoContainer';
      container.id = 'container_' + webrtc.getDomId(peer);
      container.appendChild(video);

      // suppress contextmenu
      video.oncontextmenu = () => {
        return false;
      };

      remotes.appendChild(container);
    }
  });
  // a peer video was removed
  webrtc.on('videoRemoved', (video, peer) => {
    const remotes = document.getElementById('remotesVideos');
    const el = document.getElementById(peer ? 'container_' + webrtc.getDomId(peer) : 'localScreenContainer');
    if (remotes && el) {
      remotes.removeChild(el);
    }
  });

  webrtc.on('localStream', () => {
    const room = Session.get('currentCodeBoxId');
    webrtc.joinRoom(room);
  });
});
Template.nav.helpers({
  'showVideoButtons': () => {
    return Session.get('showVideoButtons');
  },
  'videoOngoing': () => {
    return Session.get('videoOngoing');
  },
  'videoShown': () => {
    return Session.get('videoShown');
  },
  'name': () => {
    return Session.get('name');
  }
});
Template.nav.events({
  'click #startVideoCall': () => {
    startCall();
  },
  'click #stopVideoCall': () => {
    //id of current room
    const room = Session.get('currentCodeBoxId');

    //announce cancelled call
    Streamy.broadcast(room, { data : 'callCancelled' });

    stopSound(); //stop dial sound
    stopDial();  //stop dial indicator
    endCall();	 //end call
  },
  'click #hideVideoCall': () => {
    Session.set('videoShown', false);
    $('.videoChatWrapper').slideUp();
  },
  'click #showVideoCall': () => {
    Session.set('videoShown', true);
    $('.videoChatWrapper').slideDown();
  },
  'click #download': () => {
    download(ace.edit('codeBox').getValue());
  },
  'click #trash': () => {
    swal({
      title: 'Are you sure?',
      text: 'You will not be able to recover this file!',
      type: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#DD6B55',
      confirmButtonText: 'Yes, delete it!',
      closeOnConfirm: false,
    }, () => {
      Meteor.call('deleteFileFromGroupCode', Session.get('currentCodeId'), Session.get('currentCodeBoxId'), () => {
        swal({
          title: 'Deleted!',
          text: 'Your file has been deleted.',
          type: 'success',
          timer: 1000
        })
      });
    });
  },
  'click .navbar-brand': () => {
    Session.set('videoOngoing', false);
    Session.set('videoShown', true);
    Router.go('/');
  },
  'click #share': () => {
    location.href = 'mailto:?subject=Join My GroupCode!&body=Hello,%0D%0A%0D%0ACome help me code on GroupCode, the free, real-time, collaborative code-editor! Follow the link below to join me.%0D%0A%0D%0A%0D%0A%0D%0AThanks!';
  },
  'click .create-groupcode': () => {
    createGroupCode();
  },
  'click .upload-groupcode': () => {
    //trigger file upload
    document.getElementById('files').click();
  },
  'dragover .upload-groupcode': (evt) => {
    evt.stopPropagation();
    evt.preventDefault();
  },
  'drop .upload-groupcode': (evt) => {
    handleFileSelect(evt, createGroupCode);
  },
  'change #files': (evt) => {
    handleFileSelect(evt, createGroupCode);
  }
});

Template.body.events({
  'keydown *': triggerDownload
});

Template.error.events({
  'click #create': () => {
    createGroupCode();
  }
});

Template.landing.events({
  'click .create-groupcode': () => {
    createGroupCode();
  },
  'click .upload-groupcode': () => {
    //trigger file upload
    document.getElementById('files').click();
  },
  'dragover .upload-groupcode': (evt) => {
    evt.stopPropagation();
    evt.preventDefault();
  },
  'drop .upload-groupcode': (evt) => {
    handleFileSelect(evt, createGroupCode);
  },
  'change #files': (evt) => {
    handleFileSelect(evt, createGroupCode);
  }
});

Template.codeBox.onRendered(() => {
  //id of current room
  const room = Session.get('currentCodeBoxId');

  //on Streamy message handler
  Streamy.on(room, (d, s) => {
    //if we get a call and this user didn't start the video, alert them
    if (d.data === 'startVideo' &&  !Session.get('videoOngoing')) {
      Streamy.broadcast(room, { data : 'callReceived' });
      //start ring sound
      startSound('ring.mp3');

      swal({
        title: 'Incoming Video Call',
        text: 'Your partner would like to video chat with you.',
        type: 'warning',
        showCancelButton: true,
        animation: 'slide-from-top',
        confirmButtonColor: '#DD6B55',
        confirmButtonText: 'Join Call!',
        cancelButtonText: 'Decline call',
        closeOnConfirm: true,
        closeOnCancel: false
      }, (isConfirm) => {
        stopSound(); //stop ring sound
        if (isConfirm) {
          Session.set('videoOngoing', true);

          Streamy.broadcast(room, { data : 'callAccepted' });
          console.log('Starting local video...');
          webrtc.startLocalVideo();
          $('.videoChatWrapper').slideDown();
        }
        else {
          Streamy.broadcast(room, { data : 'callDeclined' });
        }
      });
    }
    //if call was received, and this user is part of the call, cancel timeout that auto-ends the call
    else if(d.data === 'callReceived' && Session.get('videoOngoing')) {
      clearTimeout(Session.get('callTimeout'));
      Session.set('callTimeout', null);
    }
    else if(d.data === 'callDeclined' && Session.get('videoOngoing')) {
      stopSound(); //stop dial sound
      stopDial();  //stop dial indicator

      //end call and alert
      endCall();
      swal({
        title:'No One\'s Home',
        timer: 5000,
        text:'Looks like no one picked up! :(',
        type: 'error'
      });
    }
    else if(d.data === 'callAccepted' && Session.get('videoOngoing')) {
      stopSound(); //stop dial sound
      stopDial();  //stop dial indicator
    }
    else if(d.data === 'callCancelled' && !Session.get('videoOngoing')) {
      stopSound(); //stop ring sound
      swal({
        title:'You Missed a Call',
        type: 'error'
      });
    }
  });

  //when the selected element changes, change the editor mode and store in db
  $('select').selectric().on('selectric-change', (element) => {
    const mode = $(this).val();
    ace.edit('codeBox').getSession().setMode('ace/mode/' + mode);

    //update stored groupcode language
    Meteor.call('updateGroupCodeLanguage', Session.get('currentCodeId'), $('select').val());
  });
});
Template.codeBox.helpers({
  'docid': () => {
    return Session.get('currentCodeId');
  },
  'config': () => {
    return (editor) => {
      editor.setTheme('ace/theme/twilight');
      editor.getSession().setMode('ace/mode/' + $('select').val());
      editor.setShowPrintMargin(false);
      editor.getSession().setUseWrapMode(true);
      editor.$blockScrolling = Infinity;
      editor.focus();

      const code = Code.findOne({ _id: Session.get('currentCodeId') });

      //if we have it stored, set the code language
      if (code) {
        $('select').val(code.language).selectric('refresh');
        ace.edit('codeBox').getSession().setMode('ace/mode/' + code.language);
      }
    }
  },
  'fileUploaded': () => {
    return (editor) => {
      if (Session.get('fileUploaded')) {
        editor.setValue(Session.get('fileUploaded'));
        Session.set('fileUploaded', null);
      }
    }
  }
});

Template.videoChat.events({
  'click #videoControl': () => {
    const newVal = !Session.get('videoMuted');
    Session.set('videoMuted', newVal);
    if (newVal) {
      $('#videoControl').removeClass('btn-success').addClass('btn-danger');
      $('#videoControl>span').removeClass('glyphicon-eye-open').addClass('glyphicon-eye-close');
      webrtc.pauseVideo();
    }
    else {
      $('#videoControl').removeClass('btn-danger').addClass('btn-success');
      $('#videoControl>span').removeClass('glyphicon-eye-close').addClass('glyphicon-eye-open');
      webrtc.resumeVideo();
    }
  },
  'click #audioControl': () => {
    const newVal = !Session.get('audioMuted');
    Session.set('audioMuted', newVal);
    if (newVal) {
      $('#audioControl').removeClass('btn-success').addClass('btn-danger');
      $('#audioControl>span').removeClass('glyphicon-volume-up').addClass('glyphicon-volume-off');
      webrtc.mute();
    }
    else {
      $('#audioControl').removeClass('btn-danger').addClass('btn-success');
      $('#audioControl>span').removeClass('glyphicon-volume-off').addClass('glyphicon-volume-up');
      webrtc.unmute();
    }
  },
  'click #sizeControl': () => {
    const newVal = !Session.get('fullscreen');
    Session.set('fullscreen', newVal);
    if (newVal) {
      $('.videoChatWrapper').addClass('fullscreen');
      $('#sizeControl').removeClass('btn-success').addClass('btn-danger');
      $('#sizeControl>span').removeClass('glyphicon-resize-full').addClass('glyphicon-resize-small');
    }
    else {
      $('.videoChatWrapper').removeClass('fullscreen');
      $('#sizeControl').removeClass('btn-danger').addClass('btn-success');
      $('#sizeControl>span').removeClass('glyphicon-resize-small').addClass('glyphicon-resize-full');
    }
  },
});

ReactiveTabs.createInterface({
  template: 'dynamicTabs',
  onChange: (slug, template) => {
    // This callback runs every time a tab changes.
    // The `template` instance is unique per {{#basicTabs}} block.

    if(slug === 'newTab') {
      Meteor.call('addToGroupCode', Session.get('currentCodeBoxId'), $('select').val(), (err, result) => {
        if(!err) {
          Session.set('activeTab', result.codeId);
          Session.set('currentCodeId', result.codeId);

          //set name of file
          const code = Code.findOne({ _id: result.codeId });
          showFileNameInputDialog((filename, language, finish) => {
            Meteor.call('updateCodeName', result.codeId, filename, language, () => {
              if(language) {
                //update editor language
                $('select').val(language).selectric('refresh');
                ace.edit('codeBox').getSession().setMode('ace/mode/' + language);
              }
              finish();
            });
          });
        }
      });
    }
    else {
      //update editor language to this language
      const code = Code.findOne({ _id: slug });

      if(code) {
        $('select').val(code.language).selectric('refresh');
        ace.edit('codeBox').getSession().setMode('ace/mode/' + code.language);
        if(!code.filename) {
          showFileNameInputDialog((filename, language, finish) => {
            Meteor.call('updateCodeName', slug, filename, language, () => {
              if(language) {
                //update editor language
                $('select').val(language).selectric('refresh');
                ace.edit('codeBox').getSession().setMode('ace/mode/' + language);
              }
              finish();
            });
          });
        }
      }
    }
  }
});

Template.master.helpers({
  tabs: () => {
    const codeBox = CodeBox.findOne({ _id: Session.get('currentCodeBoxId') });

    //loop through ids to create tabs
    const tabs = codeBox.codeIds.map((codeId, i) => {
      const code = Code.findOne({ _id: codeId });

      return {
        name: code.filename || 'tab-'+i,
        slug: codeId,
        onRender: (slug, template) => {
          //set active code id
          Session.set('currentCodeId', slug);
        }
      }
    });

    tabs.push({
      name: '+',
      slug: 'newTab'
    });

    // Every tab object MUST have a name, slug, and onRender!
    return tabs;
  },
  activeTab: () => {
    // Use this optional helper to reactively set the active tab.
    // All you have to do is return the slug of the tab.

    // You can set this using an Iron Router param if you want--
    // or a Session constiable, or any reactive value from anywhere.

    // If you don't provide an active tab, the first one is selected by default.
    // See the `advanced use` section below to learn about dynamic tabs.
    return Session.get('activeTab'); // Returns 'people', 'places', or 'things'.
  },
  currentCodeId: () => {
    return Session.get('currentCodeId');
  }
});

//enter a filename
function showFileNameInputDialog(success) {
  swal({
    title: 'New File',
    text: 'Enter a filename:',
    type: 'input',
    showCancelButton: true,
    closeOnConfirm: false,
    animation: 'slide-from-top',
    inputValue: 'filename.ext',
    confirmButtonColor: 'rgb(24, 188, 156)',
    confirmButtonText: 'Save',
  }, (filename) => {
    if (filename === false || filename === '') {
      swal.showInputError('Please enter a filename.');
      return false;
    }
    else {
      //get file extension
      const ext = extractFileExtension(filename);

      //if this is a valid extension, update the name and language on the server
      if(validExtension(ext)) {
        const language = getLanguageForExtension(ext) || '';

        success(filename, language, swal.close);
      }
      else {
        swal({
          title:'File Upload Error',
          text:'Sorry, this file type is not yet supported. We\'ll get right on that!',
          type: 'error'
        }, showFileNameInputDialog);
        return false;
      }
    }
  });
}

//language stuff
const invalidExtensions = ['xlsx', 'xlsm', 'doc', 'docx', 'pptx', 'xltx', 'xltm', 'xlsb', 'xlam', 'pptm', 'potx', 'potm', 'ppam', 'ppsx', 'ppsm', 'sldx', 'sldm', 'thmx', 'dotm', 'dotx', 'docm', 'jpg', 'jpeg', 'gif', 'png', 'zip', 'tar', 'gz', 'mov', 'mp3', 'mp4', 'flac', 'iso', 'dmg'];
const knownExtensions = {
  'as': 		'actionscript',
  'bat': 		'batchfile',
  'c': 		'c_cpp',
  'cpp': 	 	'c_cpp',
  'cs':		'csharp',
  'coffee':	'coffee',
  'css':		'css',
  'cbl':		'cobol',
  'd':		'd',
  'dart':	 	'dart',
  'py':		'django',
  'erl':		'erlang',
  'h': 		'c_cpp',
  'haml':		'haml',
  'hs':		'haskell',
  'html':		'html',
  'erb':		'html',
  'java':		'java',
  'json':		'json',
  'js':		'javascript',
  'md':		'markdown',
  'sql':		'mysql',
  'tex':		'latex',
  'mat':		'matlab',
  'm':		'objectivec',
  'pas':		'pascal',
  'pl':		'perl',
  'php':		'php',
  'pl':		'prolog',
  'py':		'python',
  'r':		'r',
  'rb':		'ruby',
  'scss':		'sass',
  'scala':	'scala',
  'scm':		'scheme',
  'sh':		'sh',
  'sql':		'sql',
  'svg':		'svg',
  'txt':		'text',
  'vbs':		'vbscript',
  'yaml':		'yaml'
};
function validExtension(ext) {
  return invalidExtensions.indexOf(ext.toLowerCase()) === -1;
}
function extractFileExtension(filename) {
  let ext = filename.match(/\.([0-9a-z]+)(?:[\?#]|$)/);
  if (ext && ext.length > 0) {
    ext = ext[0].substring(1);

    return ext;
  }
  return '';
}
function getLanguageForExtension(ext) {
  return knownExtensions[ext] || '';
}
function getExtensionForLanguage(language) {
  for(ext in knownExtensions) {
    if(knownExtensions[ext] == language) return ext;
  }
}

//animates name
function nameAnimation() {
  const tempName = '**********'.split('');
  const realName = 'GroupCodes'.split('');
  Session.set('name', tempName.join(''));

  const capital = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lower = 'abcdefghijklmnopqrstuvwxyz';

  let i = 0;
  let j = 0;
  const animation = setInterval(() => {
    if (tempName[i] != realName[i]) {
      let newLetter;
      if (capital.indexOf(realName[i]) >= 0) {
        newLetter = capital[j % capital.length];
      }
      else {
        newLetter = lower[j % lower.length];
      }
      tempName[i] = newLetter;
      j++;
    }
    else {
      i++;
      j = 0;
    }

    if (i == realName.length && tempName == realName) {
      clearInterval(animation);
    }

    Session.set('name', tempName.join(''));
  }, 10);
}

//trigger download on ctrl+s
function triggerDownload(event) {
  if (Router.current().route.getName() == 'groupcode.codebox') {
    if (event.keyCode == 83 && (navigator.platform.match('Mac') ? event.metaKey : event.ctrlKey)) {
      event.preventDefault();
      if(!Session.get('saveInProgress')) {
        download(ace.edit('codeBox').getValue());

        const TO = setTimeout(() => {
          Session.set('saveInProgress', null);
          clearTimeout(TO);
        }, 1000);
        Session.set('saveInProgress', TO);
      }
    }
  }
}

//download prompt
function download(text) {
  const code = Code.findOne({ _id: Session.get('currentCodeId') });

  const downloadWithFileName = (filename, file) => {
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(file));
    element.setAttribute('download', filename);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
  }

  if(code.filename == null) {
    swal({
      title: 'Save File',
      text: 'Enter a filename:',
      type: 'input',
      showCancelButton: true,
      closeOnConfirm: false,
      animation: 'slide-from-top',
      inputValue: 'filename.' + getExtensionForLanguage(code.language),
      confirmButtonColor: 'rgb(24, 188, 156)',
      confirmButtonText: 'Save',
    }, (filename) => {
      if (filename === false) {
        return false;
      }
      else if (filename === '') {
        swal.showInputError('Please enter a filename.');
        return false;
      }
      else {
        downloadWithFileName(filename, text);
        swal.close();
      }
    });
  }
  else {
    downloadWithFileName(code.filename, text);
  }
}

//create groupcode on the server
function createGroupCode(upload) {
  if(Session.get('fileUploaded') == null) {
    Session.set('fileUploaded', '/* Welcome to GroupCodes! Get started collaborating with others by sharing your current URL, or press the \'Share\' button to share it via email. Anything you type here will be visible to anyone with the URL. */');
  }

  Meteor.call('createGroupCode', upload ? upload.filename : 'newfile.js', upload ? upload.language : 'javascript', (err, result) => {
    if (!err) {
      Session.set('currentCodeBoxId', result.codeBoxId);
      Session.set('currentCodeId', result.codeId);
      Router.go('/' + result.codeBoxId);
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
  const files = evt.dataTransfer ? evt.dataTransfer.files : evt.target.files; // FileList object

  //we only support one file at a time
  if(files.length > 1) {
    swal({
      title:'No Multifile Support', text:'Sorry, GroupCodes don\'t yet support multiple files; files must be uploaded individually.',
      type: 'error'
    });

    return;
  }

  const file = files[0];

  //if file exists, read file & store it
  if (file) {
    const reader = new FileReader();
    reader.readAsText(file, 'UTF-8');
    reader.onload = (evt) => {
      Session.set('fileUploaded', evt.target.result);

      //get file extension
      const ext = extractFileExtension(file.name);
      if(ext && validExtension(ext)) {
        const language = getLanguageForExtension(ext);
        if(callback) callback({ filename: file.name, language : language });
      }
      else {
        swal({
          title:'File Upload Error', text:'Sorry, this type of file is not yet supported. We\'ll get right on that!',
          type: 'error'
        });
        return;
      }
    }
    reader.onerror = (evt) => {
      swal({
        title:'File Upload Error', text:'Sorry, this type of file is not yet supported. We\'ll get right on that!',
        type: 'error'
      });
    }
  }
}

//handle end call
function endCall() {
  //hide video call, reset boolean and stop streaming
  $('.videoChatWrapper').slideUp(400, () => {
    //hide video
    Session.set('videoOngoing', false);

    //leave room
    const room = Session.get('currentCodeBoxId');
    webrtc.leaveRoom(room);
    webrtc.stopLocalVideo();
  });
}

//handle start video call
function startCall() {
  Session.set('videoOngoing', true);
  const room = Session.get('currentCodeBoxId');

  //start the call
  webrtc.startLocalVideo();

  //show the call
  $('.videoChatWrapper').slideDown();

  //broadcast the call to connected users
  Streamy.broadcast(room, {
    data: 'startVideo'
  });

  //start dial sound
  startSound('dial.mp3');

  //start dialing indicator
  startDial();

  //ends call after ten seconds if no one is connected
  const endCallIfNoUsers = setTimeout(() => {
    //stop dial sound
    stopSound();

    //stop dialing indicator
    stopDial();

    //end call and alert
    endCall();
    swal({
      title:'No One\'s Home',
      timer: 5000,
      text:'Looks like no one picked up! :(',
      type: 'error'
    });
  }, 10000);
  Session.set('callTimeout', endCallIfNoUsers);
}

//stop sound from playing
function stopSound() {
  const audio = document.getElementById('sound');

  if(audio) {
    audio.pause();
    audio.remove();
  }
}

function startSound(file) {
  stopSound(); //stop any sounds playing

  //start playing the dial tone
  const audio = new Audio(file);
  audio.id = 'sound';
  audio.loop = 'true';
  document.body.appendChild(audio);
  audio.play();
}

function stopDial() {
  const dial = document.getElementById('dial');

  if(dial) {
    dial.remove();
  }
}

function startDial() {
  document.getElementById('remotesVideos').innerHTML = '<div id=\'dial\' class=\'large progress phonecall\'></div>';
}
