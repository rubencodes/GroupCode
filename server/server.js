// on the server
Meteor.publish('code', function(id) {
	check(id,String);
 	return Code.find({ _id : id });
});

Meteor.publish('codeBox', function(id) {
	check(id,String);
 	return CodeBox.find({ _id : id });
});

Meteor.methods({
	"createGroupCode" : function(language) {
		check(language,String);
        var codeId = Code.insert({ language: language });
        var codeBoxId = CodeBox.insert({ codeIds: [codeId] });
		return {
          codeBoxId: codeBoxId,
          codeId: codeId
        }
	},
	"addToGroupCode" : function(language, codeBoxId) {
		check(language,String);
		check(codeBoxId,String);
        var codeId = Code.insert({ language: language });
        var codeBoxId = CodeBox.update({ $push: { codeIds: codeId } });
		
		return {
          codeBoxId: codeBoxId,
          codeId: codeId
        }
	},
	"updateGroupCodeLanguage" : function(id, language) {
		check(language,String);
		check(id,String);
		Code.update({ _id: id }, { $set : { language: language } });
	},
});

