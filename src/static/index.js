var aladin = A.aladin('#aladin-lite-div', {survey: "P/DSS2/color", fov:180});

// cache of overlays (each one represents an entire survey)
var overlays = {};

// Add catalog (points overlay) object to Aladin
// The catalog should only appear when selecting surveys/SBs
var catalog = aladin.createCatalog({name: 'Catalog'});
aladin.addCatalog(catalog);

// main object cache, and variable to query objects
var obj_cache = [];
var obj_query = SpahQL.db(obj_cache);

// selected objects stuff
var selected = [];
var selecting = true;

// filters cache
var filters = {};

/*
*	CALCULATION OF SELECTION POINT
*/
function getAveragePoint(points) {
    var average = [0, 0];
    
    for(var i = 0; i < points.length; i++) {
        var p = points[i];
        average[0] += getDisplacement(average[0],p[0])/(i+1);//adds to the running average
        average[1] += getDisplacement(average[1],p[1])/(i+1);
    }
    
    //normalises angle between -180 -> 180
    if(average[0]>180){
        average[0]= average[0]-360;
    }
    else if (average[0]<(-180)){
        average[0]+=360;
    }
    
    if(average[1]>180){
        average[1]+= -360;
    }
    else if (average[1]<(-180)){
        average[1]+=360;
    }
    
    return average;
}
//returns displacement between to angles (not distance)
function getDisplacement(point0,point1){
    if(Math.abs(point0 - point1)>180){
        var x = Math.abs(point0)+ Math.abs(point1) -360;
        if(point0<point1){
            return x;
        }
        else {
            return -x;
        }
    }
    else {
        return (point1-point0);
    }
}


/*
 For calculating a colour based on the project name
 */

function hashCode(str) { // java String#hashCode
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return hash;
}

function intToARGB(i){
    return ((i>>24)&0xFF).toString(16) +
    ((i>>16)&0xFF).toString(16) +
    ((i>>8)&0xFF).toString(16) +
    (i&0xFF).toString(16);
}


/*
 *  Requests JSON survey/SB objects from the
 *  back-end server. The requests are sent
 *  in a RESTful form, and the replies are cached.
 */
function getJSONData() {
    
    /*$.getJSON("/survey/", function(survey_data) {
              for (var i = 0; i < survey_data.length; i++) {
              var survey = survey_data[i];
              
              // create a simple poly annotation, and store it
              var points = survey.characterization.spatialAxis.coverage;
              var center = survey.characterization.spatialAxis.centralPosition;
              
              // add SB overlay
              SB_overlay.addFootprints(points);
              
              // cache survey
              survey_cache.push(survey);
              }
              });*/
    
    $.getJSON("/sb/", function(sb_data) {
              
              // min and max numbers for calculating date filter
              var minDate = null;
              var maxDate = null;
              
              for(var i = 0; i < sb_data.length; i++) {
              var sb = sb_data[i];
              
              // Retrieve coordinates from the JSON object
              var points = sb.ESO.observationBlock.tileCoverage[0];
              var points_average = getAveragePoint(points);
              
              // For Aladin to create a footprint, a string must be parsed with
              // the format "Polygon J2000 X1 Y1 X2 Y2 .... Xn Yn"
              var sb_string = 'Polygon J2000';
              for(var p = 0; p < points.length; p++) {
                sb_string += ' ' + points[p][0];
                sb_string += ' ' + points[p][1];
              }
              
              // Create the Aladin footprint & point
              // NOTE: createFootprintsFromSTCS returns an array! useful if SBs have more than one footprint
              var sb_footprints = aladin.createFootprintsFromSTCS(sb_string);
              var sb_footprint = sb_footprints[0];
              var sb_points = [];   // Aladin likes arrays passed into 'addSources'
              var sb_point = aladin.createSource(points_average[0], points_average[1]);
              sb_points.push(sb_point);
              
              // Check if the project exists
              // If it doesnt, add the button
              if(!overlays[sb.project]) {
                $('#survey-name-filter').append($('<button id="'+sb.project+'" href=\'[/data/project!="'+sb.project+'"]\' type="button" class="btn active" data-toggle="button">'+sb.project+'</button>'));
                overlays[sb.project] = {};
              }
              // Check if the project/status combo exists
              // If it doesnt, add the overlay
              if(!overlays[sb.project][sb.status]) {
                var overlay = aladin.createOverlay({color: intToARGB(hashCode(sb.project+sb.status))});
                aladin.addOverlay(overlay);
                overlays[sb.project][sb.status] = overlay;
              }
              
              // Add footprint/point to aladin for display
              overlays[sb.project][sb.status].addFootprints(sb_footprints);
              catalog.addSources(sb_points);
              
              // link data to object
              var obj = {};
              obj.footprint = sb_footprint;
              obj.point = sb_point;
              obj.data = sb;
              
              // TEST DATE FILTERING
              // Date filter, update ranges if new date is outside range
              var date = Date.parse(sb.date);
              if(minDate == null || minDate > date) {
                minDate = date;
              }
              if(maxDate == null || maxDate < date) {
                maxDate = date;
              }
              obj.data.date = Math.round(Date.parse(sb.date)/(1000*60*60*24));
              
              // link selectable point to object
              sb_point.obj = obj;
              
              // hides the overlays by default
              sb_point.hide();
              sb_footprint.hide();
              
              // cache SB
              obj_cache.push(obj);
              }
              
              // update date filter range
              $('#survey-date-slider').dateRangeSlider("bounds", minDate, maxDate);
              
              // apply the filters once objects are loaded in, and display parameters
              setFilter('[/data/date>='+Math.round(minDate/(1000*60*60*24))+'][/data/date<='+Math.round(maxDate/(1000*60*60*24))+']', 'date-range');
              applyFilters();
              displayParameters();
              });
}

/*
 *  This function parses selected points after
 *  using Aladin's selection tool.
 */
aladin.on('select', function(selection) {
          
          // Hide all points, as the selection is done
          for (var i = 0; i < obj_cache.length; i++) {
                obj_cache[i].point.hide();
          }
          
          // Iterates through selection, either
          // selecting or deselecting points
          for(var i = 0; i < selection.length; i++) {
          
            var obj = selection[i].obj;
          
            if(selecting) {
          
                // select all unselected points, and add to "selected" array
                if(!selection[i].isSelected) {
          
                    obj.footprint.select();
                    obj.point.select();
                    selected.push(obj);
                }
          
            }
            else {
          
                // deselect all selected points
                if(selection[i].isSelected) {
          
                    obj.footprint.deselect();
                    obj.point.deselect();
          
                    // delete from "selected" array
                    var index = selected.indexOf(obj);
                    if (index > -1) {
                        selected.splice(index, 1);
                    }
                }
          
            }
          }
          
          // if deselecting, deselected SBs may need to be
          // removed based on active filters
          if(!selecting) {
            applyFilters();
          }
          
          displayParameters();
          
          });

/*
 *  display of parameters in "selected" array.
 */
function displayParameters() {
    
    var display = $('#parameter-display').empty();
    var count = selected.length;
   
    var scopeNames = [];
    for (var i = 0; i<count; i++){
            for(var j = 0; j<scopeNames.length; j++){
		if(selected[i].data.ESO.observationBlock.Telescope == scopeNames[j]){
                   break;
            	}
	    }
            scopeNames.push(selected[i].data.ESO.observationBlock.Telescope);
    }

    if(count == 1) {
        
        var obj = selected[0];
        console.log(obj);
        var node = JsonHuman.format(obj.data);
        
        display.append(node);
        
    }
    else if(count > 1) {
        
        display.append($('<p>ScheduleBlocks</p>'));
	display.append($('<p>Telescope(s):' + scopeNames.toString() +  '</p>'));
	console.log(scopeNames.toString());
        display.append($('<p>Count: ' + count + '</p>'));
        display.append($('<p>Total Area: </p>'));
    }
    else {
        // display parameters of Everything, here
    }
}

/*
 *  Hides the main filter menu
 */
function hideFilterMenu() {
    $('#filter-container').hide(100);
    $('#toggle-filter-menu').removeClass('glyphicon-resize-small').addClass('glyphicon-resize-full');
    $('#filter-ui').addClass('collapsed');
}

/*
 *  Shows the main filter menu
 */
function showFilterMenu() {
    $('#filter-container').show(100);
    $('#toggle-filter-menu').removeClass('glyphicon-resize-full').addClass('glyphicon-resize-small');
    $('#filter-ui').removeClass('collapsed');
}

/* 
 *  Applies the current filters in variable "filters"
 *  to all cached SBs
 */
function applyFilters() {
    
    // deselect (or delete/hide later on) all SBs
    for (var i = 0; i < obj_cache.length; i++) {
        if(!obj_cache[i].footprint.isSelected) {
            obj_cache[i].footprint.hide();
        }
    };
    
    // Build up an array of the filters applied
    var filterString = "/*";
    for(var key in filters) {
        if(filters[key] != null) {
            filterString += filters[key];
        }
    }
    
    // apply filters TaffyDB-style
    var result = obj_query.select(filterString);
    for (var i = 0; i < result.length; i++) {
        result[i].value.footprint.show();
    };
}

/*
 *  activates/deactivates filter "filter"
 *  with id "id" (for identifying the filter).
 */
function setFilter(filter, id) {
    
    filters[id] = filter;
}

/*
 *  Code that should be activated once document has loaded
 */
$(function() {
  
  /*
   *    Listeners
   */
  
  /*
   *    When a filter heading is clicked,
   *    the filters are minimised.
   */
  $('.well-title').click(function(e) {
                           e.preventDefault();
                           var url = $(this).attr('href');
                         
                            var filters = $('#' + url);
                            filters.toggle();
                         
                            $('#survey-date-slider').resize();  //TEMPORARY FIX ON RESIZING THE SURVEY DATE SIDER
                           });
  
  /*
   *    Toggle list functionality
   *    (might be useful if toggle lists are needed)
   */
  $('#toggle-list a').click(function(e) {
                            e.preventDefault();
                            var url = $(this).attr('href');
                            //setFilter(url);
                            
                            //update highlight
                            $('#toggle-list a').each(function(index) {
                                                     $(this).attr('class', '');
                                                     });
                            $(this).attr('class', 'label label-default');
                            });

  /*
   *    Survey filters.
   *    Will set filters based on "href" and "id" attributes.
   */
    $('#survey-name-filter').on('click', '.btn', function(e) {
                            e.preventDefault();
                            $(this).blur();
                            
                            var filter_string;
                            var id = $(this).attr('id');
                                 
                            if($(this).is('.active')) {
                                filter_string = $(this).attr('href');
                            }
                            else {
                               filter_string = null;
                            }
                                 
                            setFilter(filter_string, id);
                            applyFilters();
                            });
  
  /*
   *    Survey filters.
   *    Will set filters based on "href" and "id" attributes.
   */
  $('#survey-status-filter .btn').click(function(e) {
                                      e.preventDefault();
                                      $(this).blur();
                                      
                                      var filter_string;
                                      var id = $(this).attr('id');
                                      
                                      if($(this).is('.active')) {
                                      filter_string = $(this).attr('href');
                                      }
                                      else {
                                      filter_string = null;
                                      }
                                      
                                      setFilter(filter_string, id);
                                        applyFilters();
                                      });
  
  /*
   *    The selection tool button
   */
  $('#clear-selection-tool').click(function(e) {
                               e.preventDefault();
                               $(this).blur();
                               
                               hideFilterMenu();
                                   
                                   // deselect all SBs
                                   for (var i = 0; i < selected.length; i++) {
                                        selected[i].footprint.deselect();
                                        selected[i].point.deselect();
                                   };
                                   
                                   // remove SBs from selection
                                   selected = [];
                                   
                                   // empty parameter display
                                   $('#parameter-display').empty();
                                   
                                   // apply filters
                                   applyFilters();
                               });
  
  /*
   *    The selection tool button
   */
  $('#deselection-tool').click(function(e) {
                               e.preventDefault();
                               $(this).blur();
                             
                                hideFilterMenu();
                               
                                selecting = false;
                                // show all points of visible SBs
                                for (var i = 0; i < obj_cache.length; i++) {
                                        if(obj_cache[i].footprint.isShowing) {
                                            obj_cache[i].point.show();
                                        }
                                };
                                aladin.select();
                               });
  
  /*
   *    The Select More tool button
   */
  $('#selection-tool').click(function(e) {
                             e.preventDefault();
                             $(this).blur();
                             
                             hideFilterMenu();
                             
                             selecting = true;
                             // show all points of visible SBs
                             for (var i = 0; i < obj_cache.length; i++) {
                                if(obj_cache[i].footprint.isShowing) {
                                    obj_cache[i].point.show();
                                }
                             };
                             aladin.select();
                             });
  
  /*
   *    The button that shows/hides the
   *    main filter menu!
   */
  $('#toggle-filter-menu').click(function(e) {
                                 e.preventDefault();
                                 if ($('#filter-container').is(':visible')) {
                                 hideFilterMenu();
                                 } else {
                                 showFilterMenu();
                                 }
                                 });
  
  /*
   *    Date Slider bar listener
   */
  $('#survey-date-slider').dateRangeSlider();
  $('#survey-date-slider').on('valuesChanged', function(e, data){
                  console.log('Date range changed. min: ' + data.values.min + ' max: ' + data.values.max);
                              var minD = Math.round(Date.parse(data.values.min)/(1000*60*60*24));
                              var maxD = Math.round(Date.parse(data.values.max)/(1000*60*60*24));
                              setFilter('[/data/date>='+minD+'][/data/date<='+maxD+']', 'date-range');
                              applyFilters();
                  });
  
  /*
   *    Some final stuff to execute
   */
  
  hideFilterMenu();
  getJSONData();
  
  });
