// Resize canvas to fit screen
function resize_canvas() {

    div = document.getElementById("WWTCanvas");

    if (div.style.width != (window.innerWidth).toString() + "px") {
        div.style.width = (window.innerWidth).toString() + "px";
    }

    if (div.style.height != (window.innerHeight).toString() + "px") {
        div.style.height = ((window.innerHeight)).toString() + "px";
    }

    $('#sky-location').css({
        'bottom': $('#footer').height() + 20 + 'px'
    });
}
            
    // $("#WorldWideTelescopeControlHost").hide();  If using the loading icon
    
    // javascript query to the server, to receive data!

function GetData(msg) {
    
    $.get(
          "/getdata",
          {myParam : msg},    // optional argument
          function(data) {
          $('#messages').append($('<li>').text(data));
          }
          );
}

// submitting form with id="get" will query the server with the value in id="t"
$('#get').submit(function(){
                 $.get(
                       "/survey/WALLABY/",
                       // {myParam : "hello"} optional argument,
                       function(data) {
                       var my_json_data = JSON.parse(data);
                       alert( my_json_data.id );
                       }
                       );
                        return false;
                       });

// button click event
$('.astro_filter').click(function(){
                
                if($(this).find('input').is(':checked')) {
                    alert("checked")
                }
                
                alert("value: " + $(this).attr('value'));
                
                });

// jQuery code that should be able to execute before initialize()
$("input").hover(function(){
                 $(this).css("background-color","#cccccc");
                 },
                 function(){
                 $(this).css("background-color","#ffffff");
                 });

// jQuery event example. When mouse hovers over <input/> 's, they go grey.
// More examples at http://www.w3schools.com/jQuery/
$(document).ready(function() {
                  
                  // init WWT
                  initialize();
                  //$("#loading").hide(); If using loading icon
                  //$("#WorldWideTelescopeControlHost").show();
                  
                  $('label.tree-toggler').click(function () {
                                                $(this).parent().children('ul.tree').toggle(300);
                                                });
                  
                  });

// WWT SPECIFIC CODE

// declare global Worldwide Telescope object
var wwt;
var myCircle;
// Create variables to hold the changeable settings
var bShowCrosshairs = false;
var bShowUI = true;
var bShowFigures = false;
// This function initializes the wwt object and once it is done 
// it fires the wwtReady event
function initialize() {
    wwt = wwtlib.WWTControl.initControl("WWTCanvas");
    wwt.add_ready(wwtReady);
    // This ensures that events that would have fired before we registered them get fired
    resize_canvas();
    wwt.endInit();
}

var survey_cache = [];
var sb_cache = [];

// This function is where you would put your custom code for WWT
// following the initForWwt() call
function wwtReady() {
    
    wwt.settings.set_showCrosshairs(bShowCrosshairs);
    wwt.settings.set_showConstellationFigures(bShowFigures);
    wwt.hideUI(!bShowUI);
    wwt.settings.set_showConstellationBoundries(false);
    
    // custom WWT code here
    
    $.get("/survey/", function(data) {
            var surveys_data = JSON.parse(data);
            
            for (var i = 0; i < surveys_data.length; i++) {
            
                var survey = surveys_data[i];
                survey.annotations = [];    // will store any WWT annotations of the the survey (GAMA looks like it has more than one!)
                
                // create a simple poly annotation, and store it
                var points = survey.characterization.spatialAxis.coverage;
                var center = survey.characterization.spatialAxis.centralPosition;
                var poly = createWWTPolygon(true, "grey", "blue", 1, 0.1, points);
                poly.set_center(center[0], center[1]);
                poly.set_id(survey.id);
                poly.set_label("Survey " + survey.id);
                poly.set_showHoverLabel(true);  // Why doesn't this work??
                survey.annotations.push(poly);  // Add poly annotation data to survey
                
                // cache survey
                survey_cache.push(survey);
                
                // add the annotations (generated above) to WWT to be displayed
                for(var j = 0; j < survey.annotations.length; j++) {
                    wwt.addAnnotation(survey.annotations[0]);
                }
            }
            
          });

	$.get("/sb/", function(data) {

		var sb_data = JSON.parse(data);

		for(var i = 0; i < sb_data.length; i++) {
		
			var sb = sb_data[i];			

			var points = sb.ESO.observationBlock.tileCoverage[0];
			var poly = createWWTPolygon(true, "yellow", "yellow", 1, 0.1, points);
			poly.set_id(sb.id);
			poly.set_label(sb.id);
			poly.set_showHoverLabel(true);
			sb.annotation = poly;

			// cache SB
			sb_cache.push(sb);

			// add the annotation to WWT for display
			wwt.addAnnotation(sb.annotation);

		}
	});
}

function createWWTPolygon(fill, lineColor, fillColor, lineWidth, opacity, points) {
    var poly = wwt.createPolygon(fill);
    poly.set_lineColor(lineColor);
    poly.set_fillColor(fillColor);
    poly.set_lineWidth(lineWidth);
    poly.set_opacity(opacity);
    for (var i in points) {
        poly.addPoint(points[i][0], points[i][1]);
    }   
    return poly;
} 
