Router.route("/", function () {
  Session.set("showVideoButtons", false);
  this.render('landing');
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

	if(codeBox) {
		Session.set("currentCodeBoxId", codeBox._id);
		Session.set("currentCodeId", codeBox.codeIds[0]);
		Session.set("showVideoButtons", true);
		this.render('master', { data: codeBox });
	} else {
		Session.set("showVideoButtons", false);
		var error = { code: 404, message: "GroupCode Not Found" };
		this.render("Error", { data: error});
	}
  },
  name: "groupcode.codebox"
});