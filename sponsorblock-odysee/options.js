// Saves options to chrome.storage
function save_options() {
	// ["sponsor", "selfpromo", "exclusive_access", "interaction", "poi_highlight", "intro", "outro", "preview", "filler", "chapter", "music_offtopic"]
  
	var opt_plugin = document.getElementById('opt_plugin').checked;
	var opt_notifications = document.getElementById('opt_notifications').checked;
	var notif_time = document.getElementById('notif_time').value;
	if(notif_time == "" || notif_time < 1){
		notif_time = 4;
	} else if( notif_time > 60 ){
		notif_time = 60;
	}
	
	// Make an array of checked inputs
	var selected_cats = new Array();
	var skip_cats = document.getElementById("skip_cats");
	var chks = skip_cats.getElementsByTagName("input");
	for (var i = 0; i < chks.length; i++) {
		if (chks[i].checked) {
			selected_cats.push(chks[i].value);
		}
	}
	selected_cats = JSON.stringify(selected_cats);
	
  chrome.storage.sync.set({
    opt_plugin: opt_plugin,
    opt_notifications: opt_notifications,
	selected_cats: selected_cats,
	notif_time: notif_time
  }, function() {
    // Update status to let user know options were saved.
    var status = document.getElementById('status');
    status.textContent = 'Saved! Please reload the site.';
	status.style.opacity ="1";
    setTimeout(function() {
      status.textContent = '';
	  status.style.opacity = "0";
    }, 7000);
  });
}

function restore_options() {
	var manifestData = chrome.runtime.getManifest();
	console.log(manifestData.version);
	document.getElementById('ver_num').innerText = manifestData.version;
  chrome.storage.sync.get({
    opt_plugin: true,
    opt_notifications: true,
	selected_cats: '["sponsor"]',
	notif_time: 4
  }, function(items) {
	  console.log("items.notif_time"+items.notif_time);
		var opt_plugin = document.getElementById('opt_plugin');
		var opt_notifications = document.getElementById('opt_notifications');
		var notif_time = document.getElementById('notif_time');
		opt_plugin.checked = items.opt_plugin;
		opt_notifications.checked = items.opt_notifications;
		notif_time.value = items.notif_time;
	
	try {
		var obj = JSON.parse(items.selected_cats);
	} catch (ex) {
		console.log(ex);
	}
	if(obj){
		for (i = 0; i < obj.length; i++) {
			var val = obj[i];
			document.getElementById(val).checked = true;
		}
	}
	if(!opt_plugin.checked){
		showHideDivs("hideifdisabled", "none");
	}
	if(!opt_notifications.checked){
		showHideDivs("notif_info", "none");
	}
	
  });
}

document.getElementById('opt_plugin').addEventListener('change', (event) => {
	
	if (event.currentTarget.checked) {
		var vis = "block";
	} else {
		var vis = "none";
	}
	showHideDivs("hideifdisabled", vis);
	
});
document.getElementById('opt_notifications').addEventListener('change', (event) => {
	
	if (event.currentTarget.checked) {
		var vis = "block";
	} else {
		var vis = "none";
	}
	showHideDivs("notif_info", vis);
	
});

function showHideDivs(className, display){
	var els = document.getElementsByClassName(className);
	for(var i = 0; i < els.length; i++){
		els[i].style.display = display;
	}
}

document.getElementById('plugin_info_btn').addEventListener('click', (event) => {
	var plugin_info_div = document.getElementById("plugin_info_div");
	plugin_info_div.style.display = plugin_info_div.style.display == "none" ? "block" : "none";
});

document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click', save_options);