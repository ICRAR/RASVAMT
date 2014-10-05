var wwt;

var survey_cache = [];
var sb_cache = [];
var filters = [];

var bShowCrosshairs = false;
var bShowUI = true;
var bShowFigures = false;

// Resize canvas to fit screen
function resize_canvas() {
    
    div = document.getElementById("WWTCanvas");
    
    if (div.style.width != (window.innerWidth).toString() + "px") {
        div.style.width = (window.innerWidth).toString() + "px";
    }
    
    if (div.style.height != (window.innerHeight).toString() + "px") {
        div.style.height = ((window.innerHeight)).toString() + "px";
    }
    
    $('#sky-coordinates').css({
                              'bottom': $('#footer').height() + 10 + 'px'
                              });
}

// click function, that gives coordinates 'eventArgs.get_RA()' and 'eventArgs.get_dec()'
// this may be needed to select surveys/SBs, because WWT sucks and can't do this on its own
function clicked(obj, eventArgs) {
    alert("Clicked on: " + eventArgs.get_RA().toString() + ", " + eventArgs.get_dec().toString());
}

// called when the page loads
function initialize() {
    wwt = wwtlib.WWTControl.initControl("WWTCanvas");
    wwt.add_ready(wwtReady);
    wwt.add_clicked(clicked);
    resize_canvas();
    wwt.endInit();
}

// Code that should be activated once wwt has loaded
function wwtReady() {
    
    wwt.settings.set_showCrosshairs(bShowCrosshairs);
    wwt.settings.set_showConstellationFigures(bShowFigures);
    wwt.hideUI(!bShowUI);
    wwt.settings.set_showConstellationBoundries(false);
    
    // custom WWT code below
    
    $('#WWTCanvas').mousemove(displayCoordinates);
    $('#WWTCanvas').scroll(function(e) {
                           e.preventDefault();
                           });
    $('#WWTCanvas').mouseout(function(e) {
                             wwtlib.WWTControl.singleton.onMouseUp(e);
                             });
    
    $.getJSON("/survey/", function(survey_data) {
              for (var i = 0; i < survey_data.length; i++) {
              
              var survey = survey_data[i];
              survey.annotations = [];    // will store any WWT annotations of the the survey (GAMA looks like it has more than one!)
              
              // create a simple poly annotation, and store it
              var points = survey.characterization.spatialAxis.coverage;
              var center = survey.characterization.spatialAxis.centralPosition;
              var poly = createWWTPolygon(true, "grey", "blue", 1, 0.1, points);
              poly.set_center(center[0], center[1]);
              poly.set_id(survey.id);
              poly.set_label("Survey " + survey.id);
              poly.set_showHoverLabel(true);  // Why doesn't this work??
              
              survey.annotation = poly;  // Add poly annotation data to survey
              survey.isShown = false;
              
              // cache survey
              survey_cache.push(survey);
              
              }
              });
    
    $.getJSON("/sb/", function(sb_data) {
              for(var i = 0; i < sb_data.length; i++) {
              
              var sb = sb_data[i];
              
              var points = sb.ESO.observationBlock.tileCoverage[0];
              var poly = createWWTPolygon(true, "yellow", "yellow", 1, 0.1, points);
              poly.set_id(sb.id);
              poly.set_label(sb.id);
              poly.set_showHoverLabel(true);
              
              sb.annotation = poly;
              sb.isShown = false;
              
              // cache SB
              sb_cache.push(sb);
              
              }
              });
}

// Function to create a WWT poygon
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

// Displays coordinates under the HTML object with id = "sky-coordinates"
function displayCoordinates(event) {
    var coords = '(α,δ)=' + (wwt.getRA() * 15).toFixed(2) + "°, " + wwt.getDec().toFixed(2) + "° FOV= " + wwt.get_fov().toFixed(0) + "°";
    $('#sky-coordinates').text(coords);
}

// Hides the menu containing filters
function hideFilterMenu() {
    $('#filter-container').hide(100);
    $('#toggle-filter-menu').removeClass('glyphicon-resize-small').addClass('glyphicon-resize-full');
    $('#facet-ui').addClass('collapsed');
}

// Shows the menu containing filters
function showFilterMenu() {
    $('#filter-container').show(100);
    $('#toggle-filter-menu').removeClass('glyphicon-resize-full').addClass('glyphicon-resize-small');
    $('#facet-ui').removeClass('collapsed');
}

// deselects filters
function deselectFacets() {
    //update highlight
    $('#facet-list a').each(function(index) {
                            $(this).attr('class', '');
                            });
    //$('#year-label').hide();
}

// activates/deactivates filter "filter"
function setFilter(filter) {
    
    console.log(filter);
    
    for(var i = 0; i < sb_cache.length; i++) {
        
        if(sb_cache[i].project == filter.id) {
        
            if(!sb_cache[i].isShown) {
                console.log("added SB");
                sb_cache[i].isShown = true;
                wwt.addAnnotation(sb_cache[i].annotation);
            }
            else {
                console.log("removed SB");
                sb_cache[i].isShown = false;
                wwt.removeAnnotation(sb_cache[i].annotation);
            }
        }
    }
}

// Code that should be activated once document has loaded
$(function() {
  
  $('#WWTCanvas').bind('mousewheel DOMMouseScroll', function(e) {
                       e.preventDefault();
                       });
  
  $('#toggle-list a').click(function(e) {
                            e.preventDefault();
                            var url = $(this).attr('href');
                            setFilter(url);
                            
                            //update highlight
                            $('#toggle-list a').each(function(index) {
                                                     $(this).attr('class', '');
                                                     });
                            $(this).attr('class', 'label label-default');
                            });

    $('#survey-list .btn').click(function(e) {
                            e.preventDefault();
                            $(this).blur();
                            
                            var json = $(this).attr('href');
                            var obj = JSON.parse(json);
                            setFilter(obj);
                            });
  
  $('#facet-list a').click(function(e) {
                           e.preventDefault();
                           var url = $(this).attr('href');
                           setFilter(url);
                           deselectFacets();
                           $(this).attr('class', 'label label-default');
                           });
  
  $('#toggle-filter-menu').click(function(e) {
                                 e.preventDefault();
                                 if ($('#filter-container').is(':visible')) {
                                 hideFilterMenu();
                                 } else {
                                 showFilterMenu();
                                 }
                                 });
  
  });
