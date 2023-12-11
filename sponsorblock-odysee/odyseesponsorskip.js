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
}, function (items) {
	if (items.opt_plugin) {
		init([items.opt_notifications, items.selected_cats, items.notif_time]);
	}
});

function sha256(ascii) {
    function rightRotate(value, amount) {
        return (value>>>amount) | (value<<(32 - amount));
    };

    var mathPow = Math.pow;
    var maxWord = mathPow(2, 32);
    var lengthProperty = 'length'
    var i, j; // Used as a counter across the whole file
    var result = ''

    var words = [];
    var asciiBitLength = ascii[lengthProperty]*8;

    //* caching results is optional - remove/add slash from front of this line to toggle
    // Initial hash value: first 32 bits of the fractional parts of the square roots of the first 8 primes
    // (we actually calculate the first 64, but extra values are just ignored)
    var hash = sha256.h = sha256.h || [];
    // Round constants: first 32 bits of the fractional parts of the cube roots of the first 64 primes
    var k = sha256.k = sha256.k || [];
    var primeCounter = k[lengthProperty];
    /*/
    var hash = [], k = [];
    var primeCounter = 0;
    //*/

    var isComposite = {};
    for (var candidate = 2; primeCounter < 64; candidate++) {
        if (!isComposite[candidate]) {
            for (i = 0; i < 313; i += candidate) {
                isComposite[i] = candidate;
            }
            hash[primeCounter] = (mathPow(candidate, .5)*maxWord)|0;
            k[primeCounter++] = (mathPow(candidate, 1/3)*maxWord)|0;
        }
    }

    ascii += '\x80' // Append Ƈ' bit (plus zero padding)
    while (ascii[lengthProperty]%64 - 56) ascii += '\x00' // More zero padding
    for (i = 0; i < ascii[lengthProperty]; i++) {
        j = ascii.charCodeAt(i);
        if (j>>8) return; // ASCII check: only accept characters in range 0-255
        words[i>>2] |= j << ((3 - i)%4)*8;
    }
    words[words[lengthProperty]] = ((asciiBitLength/maxWord)|0);
    words[words[lengthProperty]] = (asciiBitLength)

    // process each chunk
    for (j = 0; j < words[lengthProperty];) {
        var w = words.slice(j, j += 16); // The message is expanded into 64 words as part of the iteration
        var oldHash = hash;
        // This is now the undefinedworking hash", often labelled as variables a...g
        // (we have to truncate as well, otherwise extra entries at the end accumulate
        hash = hash.slice(0, 8);

        for (i = 0; i < 64; i++) {
            var i2 = i + j;
            // Expand the message into 64 words
            // Used below if
            var w15 = w[i - 15], w2 = w[i - 2];

            // Iterate
            var a = hash[0], e = hash[4];
            var temp1 = hash[7]
                + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) // S1
                + ((e&hash[5])^((~e)&hash[6])) // ch
                + k[i]
                // Expand the message schedule if needed
                + (w[i] = (i < 16) ? w[i] : (
                        w[i - 16]
                        + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15>>>3)) // s0
                        + w[i - 7]
                        + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2>>>10)) // s1
                    )|0
                );
            // This is only used once, so *could* be moved below, but it only saves 4 bytes and makes things unreadble
            var temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) // S0
                + ((a&hash[1])^(a&hash[2])^(hash[1]&hash[2])); // maj

            hash = [(temp1 + temp2)|0].concat(hash); // We don't bother trimming off the extra ones, they're harmless as long as we're truncating when we do the slice()
            hash[4] = (hash[4] + temp1)|0;
        }

        for (i = 0; i < 8; i++) {
            hash[i] = (hash[i] + oldHash[i])|0;
        }
    }

    for (i = 0; i < 8; i++) {
        for (j = 3; j + 1; j--) {
            var b = (hash[i]>>(j*8))&255;
            result += ((b < 16) ? 0 : '') + b.toString(16);
        }
    }
    return result;
}

function init(options) {
	var isNotifications = options[0];
	var selectedCategories = options[1];
	var notif_time = options[2];
	var categories = "";
	if (selectedCategories && selectedCategories != "[]" && selectedCategories != "") {
		categories = "categories=" + selectedCategories;
	}

	function fetch_segments(video_id) {
		const hash = sha256(video_id).slice(0, 4);
		return new Promise((resolve, reject) => {
			fetch("https://sponsor.ajay.app/api/skipSegments/" + hash + "?" + categories)
			.then((response) => {
				if (response.ok) {
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
		s = 0,
		m = 1;
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

	function showNotif(msg) {
		var notifWrap = document.getElementById('notifWrap');
		if (!notifWrap) {
			return;
		}
		var timestamp = Date.now();

		var message = document.createElement("div");
		message.setAttribute('data-time', timestamp);
		message.style.cssText += 'position: relative; margin-bottom: 10px; padding: 5px; background: rgba(0, 0, 0, 0.45);padding: 15px 20px 15px 40px;border-radius: 5px;';
		message.innerHTML = msg;

		notifWrap.appendChild(message);

		setTimeout(() => {
			var thisEl = document.querySelector('div[data-time="' + timestamp + '"]');
			thisEl.parentNode.removeChild(thisEl); // Remove notification after 4 sec
		}, notif_time * 1000);
	}

	var video_player = null;

	// Wait for a video player node
	var observer = new MutationObserver(function (mutationList) {
		for (var i = 0, l = mutationList.length; i < l; i++) {
			var mutation = mutationList[i];
			if (mutation.type === 'childList') {
				for (var j = 0, k = mutation.addedNodes.length; j < k; j++) {
					var node = mutation.addedNodes[j];
					if (!node.tagName)
						continue;
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

	function waitPlayer(video_player) {
		// Vait for a video to be ready so we can parse all data from it
		video_player.addEventListener('loadeddata', function () {
			startApp();
		});
	}
	function startApp() {

		var id = null;

		// Get the ID of the Youtube video by parsing it from the cover image
		var bgimg = document.querySelector('div.content__cover').style.backgroundImage;

		if (bgimg.includes('ytimg.com')) {
			id = bgimg.split('ytimg.com/vi/').pop().split('/')[0];
		}

		if (!id && bgimg && !bgimg.includes('.webp') && !bgimg.includes('.png') && !bgimg.includes('.jpg') && !bgimg.includes('.jpeg') && !bgimg.includes('.gif')) {
			id = bgimg.split('thumbnails.lbry.com/').pop().split('"')[0];
		}

		if (typeof(id) == 'undefined' || id == null) {
			// console.log("SponsorBlock: YT ID not found");
			return;
		}

		if (document.getElementById('barWrap')) {
			document.getElementById('barWrap').remove(); // Clear bars if exists
		}
		if (document.getElementById('notifWrap')) {
			document.getElementById('notifWrap').remove(); // Clear notifications if exists
		}

		//var videoDuration = hmsToSeconds(document.querySelector('span.vjs-duration-display').innerText);
		var durationData = document.querySelector('div.vjs-progress-holder').getAttribute("aria-valuetext"); // Get video duration (total time)
		var videoDuration = hmsToSeconds(durationData.split(' of ')[1]); // Convert HMS time to seconds

		//console.log("id: " + id);

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

		fetch_segments(id).then(function (videos) {

			if (!videos || videos == "api_error" || !Array.isArray(videos) || videos.length < 1) {
				return;
			}

			videos.forEach(seg => {
				if(seg.videoID === id) {
					segments = seg.segments;
				}
			});

			if(!segments) {
				return;
			}

			document.getElementById('vjs_video_3').className += ' sponsorTrue';
			//console.log(segments);
			if (isNotifications) {
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

				if (duration > 0) {
					const bar = document.createElement('li');
					bar.id = segment.UUID;
					bar.innerHTML = '&nbsp;';
					bar.setAttribute('sponsorblock-category', segment.category);
					bar.style.width = `${intervalToPercentage(startTime, endTime)}`;
					bar.className += ' sponsor_single_bar';
					const time = endTime ? Math.min(videoDuration, startTime) : startTime;
					bar.style.left = timeToPercentage(time);
					bar.style.cssText += " position:absolute;margin:0;display:inline-block;top:-20px;bottom:0;pointer-events:auto;";

					barWrap.appendChild(bar);
				}
			});
			document.getElementsByClassName('vjs-progress-holder')[0].appendChild(barWrap);

			// Show the category name above the thumbnail (on hover)
			const categoryTitle = document.createElement('div');

			catHolder = document.getElementsByClassName("vjs-progress-holder")[0].getElementsByClassName("vjs-mouse-display")[0];
			catHolderClass = "catName-time";
			if (document.getElementsByClassName("vjs-vtt-thumbnail-display").length != 0) {
				var catHolder = document.getElementsByClassName("vjs-vtt-thumbnail-display")[0];
				var catHolderClass = "catName-thumbnail";
			}

			categoryTitle.classList.add(catHolderClass);
			catHolder.appendChild(categoryTitle);

			var allSingleBars = document.getElementsByClassName('sponsor_single_bar');
			Array.from(allSingleBars).forEach(e => e.addEventListener("mouseenter", function (e) {
					categoryTitle.innerHTML = "";
					categoryTitle.innerHTML = '<div class="categoryTitle">' + this.getAttribute("sponsorblock-category") + '</div>';
				}));
			Array.from(allSingleBars).forEach(e => e.addEventListener("mouseleave", function (e) {
					categoryTitle.innerHTML = "";
				}));
			Array.from(allSingleBars).forEach(e => e.addEventListener("click", function (e) {
					this.setAttribute("doNotSkip", "1");
				}));

		});

		return setInterval(() => {
			if (!video_player || !segments) {
				return;
			}

			var current_time = video_player.currentTime;
			var current_segment = segments.find(segment => segment.segment[0] <= current_time && segment.segment[1] >= current_time);


			if (current_segment && !video_player.paused && video_player.readyState > video_player.HAVE_FUTURE_DATA) {
				var segmentEl = document.getElementById(current_segment.UUID);
				if (segmentEl.hasAttribute("doNotSkip")) {
					return;
				}
				video_player.currentTime = current_segment.segment[1]; // Skip to the end of the segment
				if (isNotifications) {
					showNotif('<span style="font-size: 26px;position: absolute;left: 13px;top: 5px;color: #ff3c3c;">»</span> Skipping to ' + secondsToHms(Math.ceil(current_segment.segment[1])) + ' because there was a ' + current_segment.category + ' segment');
				}
			}
		}, 1000);
	}
}