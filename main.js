"use strict";
var DELIMITER = "|Z|",
	TIMESTAMP = "timestamp",
	remspc = new RegExp(/[ ]{2,}|[¤]/ig);

var DishRowBuilder = function() { // Kind of an overdo. Its not even a real builder.
	var pre = '<li><p class="left">',
		post = '</p> <em><span>SHARE<span></em><div class="clear"/></li>\n',
		temp = "", x = 0;

	this.add = function(dishes) {
		if( typeof dishes !== "string") {
			for(x in dishes) {
				temp = temp + pre + dishes[x].name + post;
			}
		} else {
			temp = temp + pre + dishes.name + post;
		}
		return temp.length;
	};

	this.build = function() {
		return temp;
	};

	this.clear = function() {
		temp = "";
	}
}
var Dish = function(n) {
	this.name = n;
	this.share = function() {
		//sharing fu2nc
	};
}

var TTSEngine = new function() {
	var ttsAvailable = (typeof chrome.tts != "undefined");
	this.lines = {
		thisis: "Meny for restaurant: ",
		thashit: "Thats the shit!",
		comm: [
			"I've been thinking. All fat guys eat food, therefore, fat guys cause food.",
			"I've heard you like food so we put food in your food.",
			"I don't always eat food, but when I do, I eat meat.",
			"My father always said; Get out of my house!"
		]
	};
	
	this.speak = function(text) {
		if(!ttsAvailable) {
			return fail();
		}
		chrome.tts.speak(text, {lang:'de',enqueue:true, voiceName: 'Lois'});
		
	}
	
	this.readMeny = function(/*drestaurant*/ r) {
		if(!ttsAvailable) {
			return fail();
		}
		this.speak(this.lines.thisis + r.getName());
		
		var d = r.getDishes();
		for (var i in d){
		  this.speak(d[i].name);
		};
		this.speak(this.lines.thashit);
		
	}
	
	function fail() {
		alert('yo\' browser dont supoport tts');
		return 1;
	}
}

var PopUp = function(r) {
	
	PopUp._instance = this;

	this.restaurants = r;
	this.current = 0;
	this.status = "Updating";

	this.elements = {
		header : $('#header'),
		main : $('#main'),
		list : $('ul', this.main),
		footer : $('#footer'),
		status : $('h1', this.footer),
		optionbtn : $('#optionbtn', this.footer),
		loader : $('#loader')
	};
	
	this.elements.optionbtn.click(function(e) {
		var pu = PopUp.getInstance();
		
		pu.current++;
		if(pu.current === pu.restaurants.length) {
			pu.current = 0;
		}
		
		pu.setup(pu.current);
		_gaq.push(['_trackEvent', 'restaurant: ' + pu.current, 'clicked']);
	});
	
	this.elements.header.click(function(e) {
		var pu = PopUp.getInstance();
		TTSEngine.readMeny(pu.restaurants[pu.current]);
	});
	
	
	var dishes = [];
	
	this.setDishes = function(arr) {
		dishes = arr;
		var $this = this.elements.list;
		$this.slideUp(250, function() {
			$this.html("");

			var builder = new DishRowBuilder();
			builder.add(dishes);
			$this.html(builder.build());
			builder = null;

			$this.slideDown();
		});
	};
	
	this.setup = function(r) {
		if(r===undefined) {
			console.log('R was null');
			this.current = (localStorage.current) ? parseInt(localStorage.current):0;
		} else {
			console.log('R was ' + r);
			this.current = r;
		}
		
		this.elements.status.text(this.restaurants[this.current].getName());
		if(localStorage.timestamp==undefined) {localStorage.timestamp = 1;}

		if((new Date().getTime() - parseInt(localStorage.timestamp)) < 360000) { // Use cache
			for(var x in this.restaurants) {
				this.restaurants[x].restore();
			}
			localStorage.current = this.current;
			this.setDishes(this.restaurants[this.current].getDishes());
		} else { // get from the interwebz
			
			$.get('http://m.webben7.se/dagens_lunch',
				function(data) {
					var d = $(data).find("#ul_lunch"),
						pu = PopUp.getInstance();
					for (var x in pu.restaurants) {
						pu.restaurants[x].filter(d); 
					}
					localStorage.setItem(TIMESTAMP, "" + new Date().getTime());
					localStorage.current = pu.current;
					pu.setDishes(pu.restaurants[pu.current].getDishes());
				});
		}
	};
	
	this.setStatus = function(s) {
		this.status = s;
		
		this.elements.status.fadeOut(250, function() {
			var pu = PopUp.getInstance();
			pu.elements.status.text(pu.status).fadeIn();
		});
	};
	
}

PopUp._instance  = {};

PopUp.getInstance = function() {
	return PopUp._instance; 
};

var Restaurant = function(n, filterFunction) {
	var name = n, dishes = [];
	
	this.filter = filterFunction; //arg $html, side effect set private dishes
	
	this.getName= function () {
	  return name;
	};
	this.setDishes = function(arr) {
		if(arr.length) {
			dishes = arr;
		} else {
			dishes = [new Dish("Nothing. Well, not for you anyway.")];
		}
		var names  = [];
		for(var i in dishes) {
			names.push(dishes[i].name);
		}
		localStorage.setItem("dis"+name, names.join(DELIMITER));
		
		};
	this.getDishes = function() {return dishes;};
	
	this.restore = function() {
		dishes = [];
		var names = localStorage.getItem("dis"+name).split(DELIMITER);
		
		for(var i in names) {
			dishes.push(new Dish(names[i]));
		}
	}
	
}

function clean_spaces(s) {
	return s.replace(remspc, "");
}

var Harrys = new Restaurant('Harrys', function(data) {
	var rows = data.find('div.restaurant:contains(Harrys Pub)').parent();
	rows = rows.find('.lunch-lista').children();

	var d = [];
	rows.each(function(i) {
		d.push(new Dish($(this).text().trim()));
	})
	this.setDishes(d);
	console.log('Ran harrys filter');
});
var SingChef = new Restaurant('SingKock', function(data) {
	var rows = data.find('div.restaurant:contains(Richard)').parent();
	rows = rows.find('.lunch-lista').children();

	var d = [], t ="", c = "";
	rows.each(function(i) {
		t = $(this).text().trim().toLowerCase().substr(2);
		c = t.substr(0,1).toUpperCase();
		t = c + t.substr(1);
		d.push(new Dish( t ));
	})
	this.setDishes(d);
	console.log('Ran singkocks  filter');
});

var p = new PopUp([Harrys, SingChef]);

p.setup();