Router.route("/", function () {
  Session.set("showVideoButtons", false);
  this.render('master');
}, {
  name: 'groupcode.landing'
});

Router.route("/:_id", {
  // rendered until the subscriptions are ready
  loadingTemplate: 'loading',

  waitOn: function () {
    // return one handle, a function, or an array
    return Meteor.subscribe('codeBox', this.params._id);
  },

  action: function () {
	var codeBox = CodeBox.findOne({ _id: this.params._id });
	var code = CodeBox.findOne({ _id: codeBox.codeIds[0] });

	if(codeBox) {
		Session.set("currentCodeBoxId", codeBox._id);
		Session.set("currentCodeId", codeBox.codeIds[0]);
		Session.set("showVideoButtons", true);
		this.render('codeBox', { data: code });
	} else {
		Session.set("showVideoButtons", false);
		var error = { code: 404, message: "GroupCode Not Found" };
		this.render("Error", { data: error});
	}
  },
  name: "groupcode.codebox"
});