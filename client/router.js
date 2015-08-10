Router.route("/", function () {
  this.render('landing');
}, {
  name: 'groupcode.landing'
});

Router.route("/:_id", {
  // rendered until the subscriptions are ready
  loadingTemplate: 'loading',

  waitOn: function () {
    // return one handle, a function, or an array
    return Meteor.subscribe('codebase', this.params._id);
  },

  action: function () {
    var codebase = Code.findOne({ _id: this.params._id });

	if(codebase) {
		Session.set("currentCodeId", codebase._id);
		Session.set("currentChannelId", codebase.codeId);
		Session.set("showVideoButtons", true);
		this.render('codeBox', { data: codebase });
	} else {
		var error = { code: 404, message: "GroupCode Not Found" };
		this.render("Error", { data: error});
	}
  }
});