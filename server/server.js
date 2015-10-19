// on the server
Meteor.publish('code', function() {
 	return Code.find();
});

Meteor.publish('codeBox', function(id) {
	check(id,String);
 	return CodeBox.find({ _id : id });
});

Meteor.methods({
	"createGroupCode" : function(filename, language) {
		check(filename,String);
		check(language,String);
        var codeId = Code.insert({ filename: filename, language: language });
        var codeBoxId = CodeBox.insert({ codeIds: [codeId] });
		return {
          codeBoxId: codeBoxId,
          codeId: codeId
        }
	},
	"addToGroupCode" : function(codeBoxId, language) {
		check(language,String);
		check(codeBoxId,String);
        var codeId = Code.insert({ language: language });
        CodeBox.update({ _id : codeBoxId }, { $push: { codeIds: codeId } });

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
	"updateCodeName" : function(id, filename, language) {
		check(filename,String);
		check(language,String);
		check(id,String);
		
		if(language) {
			Code.update({ _id: id }, { $set : { filename: filename, language: language } });
		} else {
			Code.update({ _id: id }, { $set : { filename: filename } });
		}
	}
});

