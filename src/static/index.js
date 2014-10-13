var aladin = A.aladin('#aladin-lite-div', {survey: "P/DSS2/color", fov:180, showReticle:false});

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

// overlays reference
var overlays = [];

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
 *  Generates unique colour from a string seed. (DEPRECATED)
 *  'mod' will increase the brightness.
 */
/*
var stringToColor = function(str, mod) {
    
    // str to hash
    for (var i = 0, hash = 0; i < str.length; hash = str.charCodeAt(i++) + ((hash << 5) - hash));
    
    // int/hash to hex
    for (var i = 0, colour = "#"; i < 3; ) {
        var c = ((hash >> i++ * 8) & 0xFF);
        c = c - (mod * 30) + 20;
        if(c < 0) {
            c = 0;
        }
        colour += ("00" + c.toString(16)).slice(-2);
    }
    
    return colour;
}
function statusIndex(status) {
    
    if(status == "PLANNED") {
        return 3;
    }
    else if(status == "OBSERVED") {
        return 2;
    }
    else if(status == "QUALITY CONTROL") {
        return 1;
    }
    else if(status == "PROCESSED") {
        return 0;
    }
    return 0;
}
 */

/*
 *  Converts dd/mm/yyyy to mm/dd/yyyy and vice versa.
 */
function formatDateString(date_str) {
    var dateArray = date_str.split("/");
    return (dateArray[1] + "/" + dateArray[0] + "/" + dateArray[2]);
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
              
              // items to determine what color surveys are,
              // and to see if filter buttons need to be created
              var surveys = {};
              var creators = {};
              
              // create default overlay
              var overlay = aladin.createOverlay({color: "#3793BE"});
              overlays.push(overlay);
              aladin.addOverlay(overlay);
              
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
              var sb_point = aladin.createSource(points_average[0], points_average[1]);
              var sb_points = [];
              sb_points.push(sb_point);
              
              // Check if the project exists
              // If it doesnt, add the button
              if(!surveys[sb.project]) {
                var button = $('<button id="project_'+sb.project+'" href=\'[/data/project!="'+sb.project+'"]\' type="button" class="simple-filter-button btn active" data-toggle="button">'+sb.project+'</button>');
                $('#survey-name-filter').append(button);
                surveys[sb.project] = {};
              }
              // Creator filter button
              if(!creators[sb.creator]) {
              var button = $('<button id="creator_'+sb.creator+'" href=\'[/data/creator!="'+sb.creator+'"]\' type="button" class="simple-filter-button btn active" data-toggle="button">'+sb.creator+'</button>');
              $('#survey-creator-filter').append(button);
              creators[sb.creator] = {};
              }
              
              // Add footprint/point to aladin for display
              overlay.addFootprints(sb_footprints);
              catalog.addSources(sb_points);
              
              // Date filter, update ranges if new date is outside range
              var date = Date.parse(formatDateString(sb.date));
              if(minDate == null || minDate > date) {
              minDate = date;
              }
              if(maxDate == null || maxDate < date) {
              maxDate = date;
              }
              
              // link data to object
              var obj = {};
              obj.footprints = sb_footprints;
              obj.point = sb_point;
              obj.data = sb;
              
              // Used for filtering
              obj.date_filter = date;
              
              // link selectable point to object
              sb_point.obj = obj;
              
              // hides the overlays by default
              sb_point.hide();
              hideFootprints(sb_footprints);
              
              // cache SB
              obj_cache.push(obj);
              }
              
              // update date filter range
              // This will automatically call 'set' on the slider too
              $('#survey-date-slider').noUiSlider({
                                                  range: {
                                                  min: minDate,
                                                  max: maxDate
                                                  },
                                                  start: [ minDate, maxDate ]
                                                  }, true);
              
              // apply the tab filter
              setFilter('[/footprints/*/overlay/isShowing }~{ {true}]', 'tab_filter');
              
              // apply the filters once objects are loaded in, and display parameters
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
          
            var point = selection[i];
            var obj = selection[i].obj;
          
            if(selecting) {
          
                // select all unselected points, and add to "selected" array
                if(!point.isSelected) {
          
                    selectFootprints(obj.footprints);
                    obj.point.select();
                    selected.push(obj);
                }
          
            }
            else {
          
                // deselect all selected points
                if(point.isSelected) {
          
                    deselectFootprints(obj.footprints);
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
    
    if(count == 1) {
        
        var obj = selected[0];
        var node = JsonHuman.format(obj.data);
        
        display.append(node);
        
    }
    else if(count > 1) {
        var QCStatus = []; //matrix of [QCStatus name, count of status]
        var scopeNames = []; //array of scope names selected
        for (var i = 0; i<count; i++){ //for all selected
            foundName = 0;
            for(var j = 0; j<scopeNames.length; j++){ //check if scope has been listed already
                if(selected[i].data.ESO.observationBlock.telescope == scopeNames[j]){
                    foundName = 1;
                    j = scopeNames.length;
                }
            }
            if(foundName == 0) //if not, add scope name to scope array
                scopeNames.push(selected[i].data.ESO.observationBlock.telescope);
            
            var addedStatus = 0;
            for(index in QCStatus){ //check if status has already been found, then add to count of that status
                if(QCStatus[index][0] == selected[i].data.ESO.observationBlock.currentQCStatus){
                    QCStatus[index][1]++;
                    addedStatus = 1;
                    break;
                }
            }
            if(addedStatus == 0){ //status is new, needs new value with count = 1
                QCStatus.push([selected[i].data.ESO.observationBlock.currentQCStatus, 1]);
            }
        }
        
        var QCStatusString =''; //create string out of quality control matrix
        for(index in QCStatus){
            QCStatusString += QCStatus[index][0] + ': ' + QCStatus[index][1] + '<br>';
        }
        
        display.append($('<p>ScheduleBlocks</p>'));
        display.append($('<p>Telescope(s):' + scopeNames.toString() +  '</p>'));
        display.append($('<p>Count: ' + count + '</p>'));
        display.append($('<p>QC Status:<br>'+ QCStatusString + '</p>'));
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

function hideUnselectedFootprints(fps) {
    
    for(var i=0; i < fps.length; i++) {
        if(!fps[i].isSelected) {
            fps[i].hide();
        }
    }
}
function showFootprints(fps) {
    
    for(var i=0; i < fps.length; i++) {
        fps[i].show();
    }
}
function hideFootprints(fps) {
    
    for(var i=0; i < fps.length; i++) {
        fps[i].hide();
    }
}
function deselectFootprints(fps) {
    
    for(var i=0; i < fps.length; i++) {
        fps[i].deselect();
    }
}
function selectFootprints(fps) {
    
    for(var i=0; i < fps.length; i++) {
        fps[i].select();
    }
}
function hasVisibleFootprint(fps) {
    
    for(var i=0; i < fps.length; i++) {
        if(fps[i].isShowing) {
            return true;
        }
    }
    return false;
}
function showOverlay(index) {
    
    // Will find where to insert the overlay
    var insertAt = 0;
    for(var i = 0; i < aladin.view.overlays.length; i++) {
        if(overlays.indexOf(aladin.view.overlays[i]) > index) {
            break;
        }
        insertAt = i + 1;
    }
    
    // for filtering
    overlays[index].isShowing = true;
    
    // add the overlay to Aladin in the correct position
    aladin.view.overlays.splice(insertAt, 0, overlays[index]);
    
    // apply filters and show footprints
    applyFilters();
}
function hideOverlay(index) {
    // hide the overlay's footprints
    var footprints = overlays[index].overlays;
    for(var i = 0; i < footprints.length; i++) {
        footprints[i].hide();
    }
    
    // for filtering
    overlays[index].isShowing = false;
    
    // removes the overlay from aladin
    var removeFrom = aladin.view.overlays.indexOf(overlays[index]);
    aladin.view.overlays.splice(removeFrom, 1);
}
function removeOverlay(index) {
    hideOverlay(index);
    overlays.splice(index, 1);
}

function getRandomColor() {
    var letters = '0123456789ABCDEF'.split('');
    var color = '#';
    for (var i = 0; i < 6; i++ ) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

function createNewTabUsingSelection() {
    
    if(selected.length > 0) {
        
        var overlayIndex = overlays.length;
        var overlayColor = getRandomColor();
        
        // create new overlay
        var overlay = aladin.createOverlay({color: overlayColor});
        overlays.push(overlay);
        aladin.addOverlay(overlay);
        
        for(var i = 0; i < selected.length; i++) {
            
            // Retrieve coordinates from the JSON object
            var points = selected[i].data.ESO.observationBlock.tileCoverage[0];
            var coord_string = 'Polygon J2000';
            for(var p = 0; p < points.length; p++) {
                coord_string += ' ' + points[p][0];
                coord_string += ' ' + points[p][1];
            }
            var newFootprints = aladin.createFootprintsFromSTCS(coord_string);
            var currentFootprints = selected[i].footprints;
            
            currentFootprints.push.apply(currentFootprints, newFootprints);
            overlay.addFootprints(newFootprints);
            selectFootprints(currentFootprints);
        }
        
        var button = $('<button id="tab_'+overlayIndex+'" type="button" class="layer-tab btn active" data-toggle="button">'+(overlayIndex+1)+'</button>');
        button.css('background-color', overlayColor);
        button.css('border-color', overlayColor);
        $('#layer-tabs').append(button);
    }
    else {
        
    }
}

/* 
 *  Applies the current filters in variable "filters"
 *  to all cached SBs
 */
function applyFilters() {
    
    // deselect (or delete/hide later on) all SBs
    for (var i = 0; i < obj_cache.length; i++) {
        hideUnselectedFootprints(obj_cache[i].footprints);
    };
    
    // Build up an array of the filters applied
    var filterString = "/*";
    for(var key in filters) {
        if(filters[key] != null) {
            filterString += filters[key];
        }
    }
    
    // apply filters
    var result = obj_query.select(filterString);
    for (var i = 0; i < result.length; i++) {
        showFootprints(result[i].value.footprints);
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
                           });
  
  /*
   *    Tab functionality
   */
  $('#layer-tabs').on('click', '.layer-tab', function(e) {
                        e.preventDefault();
                        $(this).blur();
                      
                        var index = $('.layer-tab').index(this);
                        if($(this).is('.active')) {
                            $(this).addClass('inactive');
                            hideOverlay(index);
                        }
                        else {
                            $(this).removeClass('inactive');
                            showOverlay(index);
                        }
                        
                        });

  /*
   *    Survey filters.
   *    Will set filters based on "href" and "id" attributes.
   */
    $('#filter-container').on('click', '.simple-filter-button', function(e) {
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
                                   
                                   // deselect all SBs
                                   for (var i = 0; i < selected.length; i++) {
                                        deselectFootprints(selected[i].footprints);
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
                                    if(hasVisibleFootprint(obj_cache[i].footprints)) {
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
                                if(hasVisibleFootprint(obj_cache[i].footprints)) {
                                    obj_cache[i].point.show();
                                }
                             };
                             aladin.select();
                             });
  
  /*
   *    The Create Tab tool
   */
  $('#tab-tool').click(function(e) {
                             e.preventDefault();
                             $(this).blur();
                            createNewTabUsingSelection();
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
  $('#survey-date-slider').noUiSlider({
                                      range: {
                                      min: Date.parse("10/06/2010 02:44 PM"),
                                      max: Date.parse("10/06/2014 02:44 PM")
                                      },
                                      step: 24 * 60 * 60 * 1000,
                                      start: [ Date.parse("10/06/2011 02:44 PM"), Date.parse("10/06/2013 02:44 PM") ]
                                      });
  $('#survey-date-slider').on('slide', function() {
                              
                              var range = $(this).val();
                              var min = new Date(Math.round(range[0]));
                              var max = new Date(Math.round(range[1]));
                              
                              $('#survey-date-slider-start').val(
                                                                 ("0" + min.getDate()).slice(-2) +"/"+
                                                                 ("0" + (min.getMonth()+1)).slice(-2) +"/"+
                                                                 min.getFullYear()
                                                                 );
                              $('#survey-date-slider-end').val(
                                                               ("0" + max.getDate()).slice(-2) +"/"+
                                                               ("0" + (max.getMonth()+1)).slice(-2) +"/"+
                                                               max.getFullYear()
                                                               );
                              });
  $('#survey-date-slider').on('set', function() {
                              
                              var range = $(this).val();
                              var min = new Date(Math.round(range[0]));
                              var max = new Date(Math.round(range[1]));
                              
                              $('#survey-date-slider-start').val(
                                                                    ("0" + min.getDate()).slice(-2) +"/"+
                                                                    ("0" + (min.getMonth()+1)).slice(-2) +"/"+
                                                                    min.getFullYear()
                                                                    );
                              $('#survey-date-slider-end').val(
                                                                  ("0" + max.getDate()).slice(-2) +"/"+
                                                                  ("0" + (max.getMonth()+1)).slice(-2) +"/"+
                                                                  max.getFullYear()
                                                                  );
                              
                              setFilter('[/date_filter>='+min.getTime()+']', 'date_min');
                              setFilter('[/date_filter<='+max.getTime()+']', 'date_max');
                              applyFilters();
                              
                              });
  
  $('#survey-date-slider-start').change(function() {
                                        
                                        var newMin = Date.parse(formatDateString($(this).val()));
                                        if(newMin) {
                                            $('#survey-date-slider').val([newMin, null]);
                                        }
                                        });
  $('#survey-date-slider-end').change(function() {
                                        
                                        var newMax = Date.parse(formatDateString($(this).val()));
                                        if(newMax) {
                                            $('#survey-date-slider').val([null, newMax]);
                                        }
                                        });
  
  
  /*
   *    Some final stuff to execute
   */
  hideFilterMenu();
  getJSONData();
  
  });
