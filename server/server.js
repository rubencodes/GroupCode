// on the server
Meteor.publish('codebase', function(id) {
	check(id,String);
 	return Code.find({ _id : id });
});

Meteor.methods({
	"createGroupCode" : function(language) {
		check(language,String);
		return Code.insert({ language: language });
	},
	"updateGroupCodeLanguage" : function(id, language) {
		check(language,String);
		check(id,String);
		Code.update({ _id: id }, { $set : { language: language } });
	},
});

