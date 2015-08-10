// on the server
Meteor.publish('codebase', function(id) {
  return Code.find({ _id : id });
});

Meteor.methods({
	"userJoinedCall" : function(id) {
		console.log("User joined Call");
		Code.update({ _id: id }, { $inc: { videoParticipants: 1 } });
		setTimeout(function() {
			console.log("stop display");
			Code.update({ _id: id }, { $inc: { videoParticipants: -1 } });
		}, 10000);
	}
});