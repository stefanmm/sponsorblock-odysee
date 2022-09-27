/*
* Thanks to:
* https://ajay.app/
* https://github.com/Glowman554/yt-block
*/
chrome.storage.sync.get({
	opt_plugin: true,
    opt_notifications: true,
	selected_cats: '["sponsor"]',
	notif_time: 4
	}, function(items) {
	if(items.opt_plugin){
		init([items.opt_notifications, items.selected_cats, items.notif_time]);
	}
});

function init(options){
	var isNotifications = options[0];
	var selectedCategories = options[1];
	var notif_time = options[2];
	var categories = "";
	if(selectedCategories && selectedCategories != "[]" && selectedCategories != ""){
		categories = "&categories="+selectedCategories;
	}
	function fetch_segments(video_id) {
		return new Promise((resolve, reject) => {
			fetch("https://sponsor.ajay.app/api/skipSegments?videoID="+video_id+categories)
			.then((response) => {
				if(response.ok){
					return response.json();
				} else {
					return "api_error";
				}
			})
			.then(data => {
				resolve(data);
			})
			.catch(error => {
				reject(error);
			});
		});
	}

	function hmsToSeconds(d) {
		var p = d.split(':'),
			s = 0, m = 1;
		while (p.length > 0) {
			s += m * parseInt(p.pop(), 10);
			m *= 60;
		}
		return s;
	}

	function secondsToHms(d) {
		d = Number(d);
		var h = Math.floor(d / 3600);
		var m = Math.floor(d % 3600 / 60);
		var s = Math.floor(d % 3600 % 60);

		var hDisplay = h > 0 ? h + (h == 1 ? "h, " : "h, ") : "";
		var mDisplay = m > 0 ? m + (m == 1 ? "m, " : "m, ") : "";
		var sDisplay = s > 0 ? s + (s == 1 ? "s" : "s") : "";
		return hDisplay + mDisplay + sDisplay; 
	}

	function showNotif(msg){
		var notifWrap = document.getElementById('notifWrap');
		if(!notifWrap){ return; }
		var timestamp = Date.now();
		
		var message = document.createElement("div");
		message.setAttribute('data-time', timestamp);
		message.style.cssText += 'position: relative; margin-bottom: 10px; padding: 5px; background: rgba(0, 0, 0, 0.45);padding: 15px 20px 15px 40px;border-radius: 5px;';
		message.innerHTML = msg;
		
		notifWrap.appendChild(message);
		
		setTimeout(() => {
			var thisEl = document.querySelector('div[data-time="'+timestamp+'"]');
			thisEl.parentNode.removeChild(thisEl); // Remove notification after 4 sec
		}, notif_time*1000);
	}

	var video_player = null;
	
	// Wait for a video player node
	var observer = new MutationObserver(function(mutationList) {
		for (var i = 0, l = mutationList.length; i < l; i++) {
			var mutation = mutationList[i];
			if (mutation.type === 'childList') {
				for (var j = 0, k = mutation.addedNodes.length; j < k; j++) {
					var node = mutation.addedNodes[j];
					if (!node.tagName) continue;
					var name = node.nodeName;
					var id = node.id;
					
					if (id === 'vjs_video_3_html5_api') {
						//console.log("Video player found");
						video_player = node;
						waitPlayer(video_player);
					}
				}
			}
		}
	});

	observer.observe(document, {
		attributes: false,
		childList: true,
		subtree: true
	});

	function waitPlayer(video_player){
		// Vaid for a video to be ready so we can parse all data from it
		video_player.addEventListener('loadeddata', function(){
			startApp();
		});
	}
	function startApp() {
		//console.log("start");
		
		var id = null;
		
		// Get the ID of the Youtube video by parsing it from the cover image
		var bgimg = document.querySelector('div.content__cover').style.backgroundImage;
		
		if( bgimg && !bgimg.includes('.webp') && !bgimg.includes('.png') && !bgimg.includes('.jpg') && !bgimg.includes('.jpeg') && !bgimg.includes('.gif') ){
			id = bgimg.split('thumbnails.lbry.com/').pop().split('"')[0];
		}

		if(typeof(id) == 'undefined' || id == null){
			// console.log("SponsorBlock: YT ID not found");
			return;
		}
		if(document.getElementById('barWrap')){
			document.getElementById('barWrap').remove(); // Clear bars if exists
		}
		if(document.getElementById('notifWrap')){
			document.getElementById('notifWrap').remove(); // Clear notifications if exists
		}
		
		//var videoDuration = hmsToSeconds(document.querySelector('span.vjs-duration-display').innerText);
		var durationData = document.querySelector('div.vjs-progress-holder').getAttribute("aria-valuetext"); // Get video duration (total time)
		var videoDuration = hmsToSeconds(durationData.split(' of ')[1]); // Convert HMS time to seconds
		
		//console.log("id: " + id);
		//console.log("videoDuration: " + videoDuration);
		
		// Determines where the segments should be placed on the seek bar
		// (borrowed from the original SponsorBlock extension)
		function timeToDecimal(time) {
			return Math.min(1, time / videoDuration);
		}
		function timeToPercentage(time) {
			return `${timeToDecimal(time) * 100}%`
		}
		function intervalToDecimal(startTime, endTime) {
			return (timeToDecimal(endTime) - timeToDecimal(startTime));
		}
		function intervalToPercentage(startTime, endTime) {
			return `${intervalToDecimal(startTime, endTime) * 100}%`;
		}
		
		var segments = null;

		fetch_segments(id).then(function(segments_) {
			
			if( !segments_ || segments_ == "api_error" || !Array.isArray(segments_) || segments_.length < 1 ){
				return;
			}
			segments = segments_;
			
			if(isNotifications){
				// Prepare notification wrap
				var notifWrap = document.createElement("div");
				notifWrap.setAttribute('id', 'notifWrap');
				notifWrap.style.cssText += " pointer-events: none; position: absolute;bottom: 80px;right: 20px;";
				document.getElementById('vjs_video_3_html5_api').parentNode.appendChild(notifWrap);
			}
			
			// Create bar holder and set attributes
			const barWrap = document.createElement('ul'); 
			barWrap.setAttribute('id', 'barWrap');
			barWrap.style.cssText += " position: absolute;width: 100%;pointer-events: none;height: 100%;overflow: visible;padding: 0px;margin: 0px;transition: transform 0.1s cubic-bezier(0, 0, 0.2, 1) 0s;";
			
			segments.forEach(segment => {
				var startTime = segment.segment[0];
				var endTime = segment.segment[1];
				
				const duration = Math.min(endTime, videoDuration) - startTime; // Duration of the segment
				//console.log("duration");
				//console.log(duration);

				if (duration > 0) {
					const bar = document.createElement('li');
					
					bar.innerHTML = '&nbsp;';
					bar.setAttribute('sponsorblock-category', segment.category);
					bar.style.width = `calc(${intervalToPercentage(startTime, endTime)})`;
					const time = endTime ? Math.min(videoDuration, startTime) : startTime;
					bar.style.left = timeToPercentage(time);
					bar.style.cssText += " background-color:#00d400;opacity:0.7;position:absolute;margin:0;display: inline-block;height: 100%;";
					
					barWrap.appendChild(bar);
				}
				
			});
			
			document.getElementsByClassName('vjs-progress-holder')[0].appendChild(barWrap);
			
		});

		return setInterval(() => {
			if (!video_player || !segments) {
				return;
			}

			var current_time = video_player.currentTime;
			var current_segment = segments.find(segment => segment.segment[0] <= current_time && segment.segment[1] >= current_time);

			if (current_segment && !video_player.paused) {
				video_player.currentTime = current_segment.segment[1]; // Skip to the end of the segment
				if(isNotifications){
					showNotif('<span style="font-size: 26px;position: absolute;left: 13px;top: 5px;color: #ff3c3c;">»</span> Skipping to '+secondsToHms(Math.ceil(current_segment.segment[1]))+' because there was a '+current_segment.category+' segment');
				}

			}
		}, 1000);
	}
}