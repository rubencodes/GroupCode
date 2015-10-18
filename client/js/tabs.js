ReactiveTabs.createInterface({
  template: 'basicTabs',
  onChange: function (slug, template) {
    // This callback runs every time a tab changes.
    // The `template` instance is unique per {{#basicTabs}} block.

	if(slug === "newTab") {
		Meteor.call("addToGroupCode", Session.get("currentCodeBoxId"), $("select").val(), function(codeId) {
			//find and set the active tab
			var tabs = template.data.tabs;
			for(var i = 0; i < tabs.length; i++) {
				if(tabs[i].codeId == codeId) {
					template.setActiveTab(tabs[i]);
				}
			}
			
			Session.set("currentCodeId", codeId);
		})
	}
  }
});

Template.master.helpers({
  	tabs: function () {
		var codeBox = CodeBox.findOne({ _id: Session.get("currentCodeBoxId") });
		
		var tabs = [];
		//loop through ids to create tabs
		for(var i = 0; i < codeBox.codeIds.length; i++) {
			tabs.push({
				name: 'tab-'+i,
				slug: 'codeBox',
				codeId: codeBox.codeIds[i],
				onRender: function(slug, template) {
					//set active code id
					var activeCodeId = template._activeTab.curValue.codeId;
					Session.set("currentCodeId", activeCodeId);
				}
			});
		}
		
		tabs.push({
			name: '+',
			slug: 'newTab'
		});

		// Every tab object MUST have a name, slug, and onRender!
		return tabs;
	},
	activeTab: function () {
		// Use this optional helper to reactively set the active tab.
		// All you have to do is return the slug of the tab.

		// You can set this using an Iron Router param if you want--
		// or a Session variable, or any reactive value from anywhere.

		// If you don't provide an active tab, the first one is selected by default.
		// See the `advanced use` section below to learn about dynamic tabs.
		return Session.get('activeTab'); // Returns "people", "places", or "things".
	}
});