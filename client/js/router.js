


FlowRouter.route("/", {
  //FOR RUBEN when he is like, "What is flow router?"
//: https://kadira.io/academy/meteor-routing-guide
    name: "groupcode.landing",
    action: function(params) {
        BlazeLayout.render("mainLayout", {
            top: "nav",
            main: "landing"
        });
    }
});


FlowRouter.route("/error", {

    name: "groupcode.error",
    action: function(params) {
        BlazeLayout.render("mainLayout", {
            top: "nav",
            main: "Error"
        });
    }
});



FlowRouter.route("/:_id", {
    name: "groupcode.codebox",
        // rendered until the subscriptions are ready
    //loadingTemplate: 'loading',

    action: function() {
    BlazeLayout.render("mainLayout", {
            top: "nav",
            main: "codebox"
        });
    }

});
