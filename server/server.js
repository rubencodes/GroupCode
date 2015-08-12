// on the server
Meteor.publish('codebase', function(id) {
  return Code.find({ _id : id });
});

Meteor.methods({
	"createGroupCode" : function(language) {
		return Code.insert({ language: language });
	},
	"updateGroupCodeLanguage" : function(id, language) {
		Code.update({ _id: id }, { $set : { language: language } });
	},
});