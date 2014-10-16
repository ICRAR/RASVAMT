/*
 This file is part of RASVAMT.
 
 RASVAMT is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.
 
 RASVAMT is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.
 
 You should have received a copy of the GNU General Public License
 along with RASVAMT.  If not, see <http://www.gnu.org/licenses/>.
 */

// Setting up tour page for loading
var tour = new Tour({
  steps: [
  {
    element: "#main-navbar",
    title: "Welcome to the ICRAR Rasvama",
    content : "This is a tool made for monitoring radio astronomy surveys",
    backdrop : true
  },
  {
    element: "#toggle-filter-menu",
    title: "Filter Menu",
    content: "You can filter surveys from here",
    onShow : function (tour) { 
      showFilterMenu();
    }
  },
  {
    element: "#survey-name-filter",
    title: "Project filters",
    content: "You can select which surveys to display by project"
  },
  {
    element: "#survey-date-filter",
    title: "Date filters",
    content: "You can change the date range"
  },
  // TODO : Change the dates automatically
    {
    element: "#survey-date-slider-start",
    title: "Date Input filters",
    content: "You can input the start date",
    onShow : function (tour) { 
      var sampleDate = "28/02/2013"; 
      $("#survey-date-slider-start").change(sampleDate);
      applyFilters();
    },
    onHide : function (tour) {
      var origDate = "10/06/2011";
      $("#survey-date-slider-start").change(origDate);
      applyFilters();
    }
  },
  {
    element: "#survey-status-filter",
    title: "Status filters",
    content: "You can select on status"
  },
  {
    element: "#selection-tool",
    title: "Select SBs",
    content: "Select SBs to get grouped statistics or send to tab"
  },
  {
    element: "#add-selection-tool",
    title: "Add SBs to tab",
    content: "This will add selected SBs to a tab"
  },
  {
    element: "#add-tab",
    title: "New tab",
    content: "Create new tab or add selected SBs to a tab"
  },
  {
    // TODO : Open and demonstrate different  layer options
    element: ".aladin-layersControl",
    title: "Change layers",
    content: "Here you can change the layers",
    onShow : function (tour) {
      hideFilterMenu();
    },
    placement: "left"
  },
  {
    // TODO : Open and demonstate
    element: ".aladin-gotoControl",
    title: "Search for objects",
    content: "Search for VO objects",
    placement : "left"
  },
  {
    element: "#parameter-display",
    title: "Statistics",
    content: "Statistics for SBs will appear down here",
    placement : "top"
  },
  {
    element: ".aladin-frameChoice",
    title: "Frame",
    content: "Change frame for display here",
    placement : "top"
  },
  {
    orphan: true,
    template : "<div class='popover tour'><div class='arrow'></div><h3 class='popover-title'></h3><div class='popover-content'></div><div class='popover-navigation'><button class='btn btn-default' data-role='prev'>« Prev</button><button class='btn btn-default' data-role='end'>End tour</button></div></div>",
    title: "Thank you",
    content: "Enjoy your using the tool for more information please head to the About Us tab"
  }
  //Insert frame choice
  //Insert stuff for tabs more filtering
]});

/* GLOBALS */
/////////////

// The main aladin object
var aladin = A.aladin('#aladin-lite-div', {survey: "P/DSS2/color", fov:180, showReticle:false});

// Add catalog (points overlay) object to Aladin
var catalog = aladin.createCatalog({name: 'Catalog'});
aladin.addCatalog(catalog);

// main object cache, and SpahQL object to query objects
var obj_cache = [];
var obj_query = SpahQL.db(obj_cache);

// Used in selecting objects
var selected = [];
var selecting = true;

// Contains all active filters
var filters = {};

// A reference to the main overlays
var overlays = aladin.view.overlays;

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
              
              // items to determine what filter buttons need to be created
              var surveys = {};
              var creators = {};
              
              // create default overlay
              var overlay = aladin.createOverlay({color: "#3793BE"});
              aladin.addOverlay(overlay);
              
              for(var i = 0; i < sb_data.length; i++) {
              
              // Define new SB object
              var obj = {};
              obj.footprints = [];
              obj.data = sb_data[i];
              
              // Creat object's footprint(s) and point
              newFootprint(obj, overlay);
              newPoint(obj);
              
              // Check if the project exists
              // If it doesnt, add the button
              var project = obj.data.project;
              if(!surveys[project]) {
                var button = $('<button id="project_'+project+'" href=\'[/data/project!="'+project+'"]\' type="button" class="simple-filter-button btn active" data-toggle="button">'+project+'</button>');
                $('#survey-name-filter').append(button);
                surveys[project] = {};
              }
              // Check if the creator exists
              // If it doesnt, add the button
              var creator = obj.data.creator;
              if(!creators[creator]) {
              var button = $('<button id="creator_'+creator+'" href=\'[/data/creator!="'+creator+'"]\' type="button" class="simple-filter-button btn active" data-toggle="button">'+creator+'</button>');
              $('#survey-creator-filter').append(button);
              creators[creator] = {};
              }
              
              // Date filter, update ranges if new date is outside range
              var date = Date.parse(formatDateString(obj.data.date));
              if(minDate == null || minDate > date) {
                minDate = date;
              }
              if(maxDate == null || maxDate < date) {
                maxDate = date;
              }
              
              // Used for filtering
              obj.date_filter = date;
              
              // cache new SB object
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
              
              // apply the tab filter. "only get results that have a visible overlay".
              setFilter('[/footprints/*/overlay/isShowing }~{ {true}]', 'tab_filter');
              
              // apply changes
              applyFilters();
              updateTabOptions();
              });
}

/* HELPER FUNCTIONS */
//////////////////////

/*
 *	CALCULATION OF POINT POSITION
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
 *	CREATION OF FOOTPRINTS/POINTS
 */
function newFootprint(obj, overlay) {
    
    var points = obj.data.ESO.observationBlock.tileCoverage[0];
    var coord_string = 'Polygon J2000';
    for(var p = 0; p < points.length; p++) {
        coord_string += ' ' + points[p][0];
        coord_string += ' ' + points[p][1];
    }
    var newFootprints = aladin.createFootprintsFromSTCS(coord_string);
    var currentFootprints = obj.footprints;
    
    currentFootprints.push.apply(currentFootprints, newFootprints);
    overlay.addFootprints(newFootprints);
}
function newPoint(obj) {
    
    // Create object's selection point
    var points = obj.data.ESO.observationBlock.tileCoverage[0];
    var points_average = getAveragePoint(points);
    obj.point = aladin.createSource(points_average[0], points_average[1]);
    obj.point.obj = obj;
    
    // add point to aladin's catalog (must be in an array)
    var point_to_catalog = [];
    point_to_catalog.push(obj.point);
    catalog.addSources(point_to_catalog);
    
    // Hide point by default
    hidePoint(obj);
}

/*
 *  Converts dd/mm/yyyy to mm/dd/yyyy and vice versa.
 */
function formatDateString(date_str) {
    var dateArray = date_str.split("/");
    return (dateArray[1] + "/" + dateArray[0] + "/" + dateArray[2]);
}

/*
 *  This function parses selected points after
 *  using Aladin's selection tool.
 */
aladin.on('select', function(selection) {
          
          // Hide all points, as the selection is done
          for (var i = 0; i < obj_cache.length; i++) {
                hidePoint(obj_cache[i]);
          }
          
          // Iterates through selection, either
          // selecting or deselecting points
          for(var i = 0; i < selection.length; i++) {
          
            var obj = selection[i].obj;
          
            if(selecting) {
                selectObject(obj);
            }
            else {
                deselectObject(obj);
            }
          }
          
          // if deselecting, deselected SBs may need to be
          // removed based on active filters
          if(!selecting) {
            applyFilters();
          }
          else {
            refreshParameterDisplay();
          }
          
          });

/*
 *  display of parameters in "selected" array.
 */
function refreshParameterDisplay() {
    
    var display = $('#parameter-display').empty();
    var count = selected.length;
    
    if(count == 1) {
        
        var obj = selected[0];
        var node = JsonHuman.format(obj.data);
        
        display.append('<p>ScheduleBlock:  ' + obj.data.id + '</p>');
        display.append('<p>Programm ID: ' + obj.data.ESO.observationBlock.programID + '</p>');
        display.append('<p>Status: ' + obj.data.ESO.observationBlock.currentQCStatus + '</p>');
        display.append('<p>Telescope: ' + obj.data.ESO.observationBlock.telescope + '</p>');
        display.append('<p>Instrument: ' + obj.data.ESO.observationBlock.instrument + '</p>');
        
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
        // display all visible objects here
        var total = 0;
        
        for(var i = 0; i < obj_cache.length; i++) {
            if(isVisible(obj_cache[i])) {
                total++;
            }
        }
        display.append('<p>ScheduleBlocks</p>');
        display.append('<p>'+total+'</p>');
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
 *	Hide an object
 */
function hideObject(o) {
    
    var fps = o.footprints;
    for(var i=0; i < fps.length; i++) {
        fps[i].hide();
    }
}

/*
 *	Show an object
 */
function showObject(o) {
    
    var fps = o.footprints;
    for(var i=0; i < fps.length; i++) {
        if(fps[i].overlay.isShowing) {
            fps[i].show();
        }
    }
}

/*
 *	Show/hide an object's point
 */
function showPoint(o) {
    o.point.show();
}
function hidePoint(o) {
    o.point.hide();
}

/*
 *	Is an object selected?
 */
function isSelected(o) {
    return o.point.isSelected;
}

/*
 *	Select an object
 */
function selectObject(o) {
    
    if(!isSelected(o)) {
        var fps = o.footprints;
        for (var i = 0; i < fps.length; i++) {
            fps[i].select();
        }
        o.point.select();
        
        selected.push(o);
    }
}

/*
 *	Deselect an object
 */
function deselectObject(o) {
    
    if(isSelected(o)) {
        var fps = o.footprints;
        for (var i = 0; i < fps.length; i++) {
            fps[i].deselect();
        }
        o.point.deselect();
        
        // delete from "selected" array
        var index = selected.indexOf(o);
        if (index > -1) {
            selected.splice(index, 1);
        }
    }
}

/*
 *	Selects all visible objects
 */
function selectAllVisibleObjects() {
    
    for(var i = 0; i < obj_cache.length; i++) {
        if(isVisible(obj_cache[i])) {
            selectObject(obj_cache[i]);
        }
    }
}

/*
 *	Deselects all objects
 */
function deselectAllObjects() {
    
    for(var i = 0; i < selected.length; i++) {
        
        var fps = selected[i].footprints;
        for (var f = 0; f < fps.length; f++) {
            fps[f].deselect();
        }
        selected[i].point.deselect();
    }
    
    selected = [];
}

/*
 *	Is an object visible?
 */
function isVisible(obj) {
    
    var fps = obj.footprints;
    for(var i=0; i < fps.length; i++) {
        if(fps[i].isShowing) {
            return true;
        }
    }
    return false;
}

/*
 *	Is an overlay visible?
 */
function overlayIsVisible(index) {
    return overlays[index].isShowing;
}

/*
 *	Show an overlay
 */
function showOverlay(index) {
    if(!overlayIsVisible(index)) {
        // apply filters and show footprints
        overlays[index].isShowing = true;
        applyFilters();
    }
}

/*
 *	Hide an overlay
 */
function hideOverlay(index) {
    if(overlayIsVisible(index)) {
        // apply filters and show footprints
        overlays[index].isShowing = false;
        applyFilters();
    }
}

/*
 *	Delete an overlay
 */
function removeOverlay(index) {
    hideOverlay(index);
    overlays.splice(index, 1);
}

/*
 *	Returns a random colour.
 *  Used for overlays and tabs
 */
function getRandomColor() {

    var color = '#';
    for (var i = 0; i < 3; i++) {
        var c = Math.floor(Math.random() * 128);
        c += 64;
        color += ("00" + c.toString(16)).slice(-2);
    }
    
    return color;
}

/*
 *	Does this object belong to this overlay?
 */
function objectHasOverlay(obj, overlay) {
    
    var fps = obj.footprints
    for (var i = 0; i < fps.length; i++) {
        
        if(fps[i].overlay == overlay) {
            return true;
        }
    }
    return false;
}

/*
 *	Remove an object's footprints from
 *  an overlay.
 */
function removeFootprint(obj, overlay) {
    var fps = obj.footprints
    for (var i = 0; i < fps.length; i++) {
        
        if(fps[i].overlay == overlay) {
            fps[i].hide();
            fps.splice(i, 1);
        }
    }
}

/*
 *	Adds selected objects to all active overlays
 */
function addSelectionToActiveOverlays() {
    
    if(selected.length > 0) {
        
        for (var i = 0; i < selected.length; i++) {
            
            for(var k = 1; k < overlays.length; k++) {
                
                if(overlayIsVisible(k) && !objectHasOverlay(selected[i], overlays[k])) {
                    newFootprint(selected[i], overlays[k]);
                }
            }
        }
        deselectAllObjects();
        refreshParameterDisplay();
    }
}

/*
 *	Removes selected objects from all active overlays
 */
function removeSelectionFromActiveOverlays() {
    
    if(selected.length > 0) {
        
        for (var i = 0; i < selected.length; i++) {
            
            for(var k = 1; k < overlays.length; k++) {
                
                if(overlayIsVisible(k)) {
                    removeFootprint(selected[i], overlays[k]);
                }
            }
        }
        deselectAllObjects();
        applyFilters();
    }
}

/*
 *	Creates new overlay/tab using selection
 */
function createNewTabUsingSelection() {
    
    var overlayIndex = overlays.length;
    var overlayColor = getRandomColor();
    
    // create new overlay
    var overlay = aladin.createOverlay({color: overlayColor});
    aladin.addOverlay(overlay);
    
    if(selected.length > 0) {
        
        for(var i = 0; i < selected.length; i++) {
            
            if(isVisible(selected[i])) {
                newFootprint(selected[i], overlay);
            }
        }
        
        deselectAllObjects();
        refreshParameterDisplay();
        
    }
    
    var button = $('<button type="button" class="layer-tab btn active" data-toggle="button">'+(overlayIndex+1)+'  <span class="glyphicon glyphicon-remove"></span></button>');
    button.css('background-color', overlayColor);
    button.css('border-color', overlayColor);
    //button.draggable({cancel:false, axis:"x"});
    button.insertBefore('#add-tab');
}

/*
 *  Applies the current filters in variable "filters"
 *  to all cached SBs
 */
function applyFilters() {
    
    // hide (or delete, if using server-side queries) all unselected SBs
    for (var i = 0; i < obj_cache.length; i++) {
        if(!isSelected(obj_cache[i])) {
            hideObject(obj_cache[i]);
        }
    };
    
    // Build up an array of the filters to apply
    var filterString = "/*";
    for(var key in filters) {
        if(filters[key] != null) {
            filterString += filters[key];
        }
    }
    
    // apply filters
    var result = obj_query.select(filterString);
    for (var i = 0; i < result.length; i++) {
        showObject(result[i].value);
    };
    
    // display the parameters
    refreshParameterDisplay();
}

/*
 *  activates/deactivates filter "filter"
 *  with id "id" (for identifying the filter).
 */
function setFilter(filter, id) {
    filters[id] = filter;
}

/*
 *  Changes the colour of a tab, and its matching overlay
 */
function changeTabColor(color_str) {
    
    var activeTab = getActiveTab();
    if(activeTab > -1) {
        overlays[activeTab].color = color_str;
        var tab = $($('#layer-tabs .layer-tab').get(activeTab));
        tab.css('background-color', color_str);
        tab.css('border-color', color_str);
        aladin.view.forceRedraw();
    }
}

/*
 *  Updates the tabs with numbers based on their position
 */
function updateTabs() {
    
    $('#layer-tabs .layer-tab').each( function(i) {
                         
                         if(i > 0) {
                         $(this).html(i+1 + '  <span class="glyphicon glyphicon-remove"></span>');
                         }
                         
                         });
}

/*
 *  Updates the "TAB OPTIONS" tab.
 *  If one tab is active, show the options.
 *  Else, hide the options.
 */
function updateTabOptions() {
    
    if(getActiveTab() > -1) {
        
        $('#tab-options-filter-options').show();
        $('#tab-options-filter-message').hide();
    }
    else {
        
        $('#tab-options-filter-options').hide();
        $('#tab-options-filter-message').show();
    }
}

/*
 *  Returns the index of the active tab.
 *  If more than one tab is active, or no tabs
 *  are active, returns -1.
 */
function getActiveTab() {
    
    var index = -1;
    for(var i = 0; i < overlays.length; i++) {
        if(overlayIsVisible(i)) {
            if(index > -1) {
                return -1;
            }
            index = i;
        }
    }
    return index;
}

/*
 *  Moves a tab left, and its overlay towards the back
 */
function moveTabLeft() {
    
    var activeTab = getActiveTab();
    if(activeTab > 1) {
        
        var temp = overlays[activeTab - 1];
        overlays[activeTab-1] = overlays[activeTab];
        overlays[activeTab] = temp;
        
        var tab = $($('#layer-tabs .layer-tab').get(activeTab));
        tab.insertBefore($($('#layer-tabs .layer-tab').get(activeTab-1)));
        updateTabs();
        
        activeTab = activeTab - 1;
        aladin.view.forceRedraw();
    }
}

/*
 *  Moves a tab right, and its overlay towards the front
 */
function moveTabRight() {
    
    var activeTab = getActiveTab();
    if(activeTab > 0 && activeTab < overlays.length - 1) {
        
        var temp = overlays[activeTab + 1];
        overlays[activeTab + 1] = overlays[activeTab];
        overlays[activeTab] = temp;
        
        var tab = $($('#layer-tabs .layer-tab').get(activeTab));
        tab.insertAfter($($('#layer-tabs .layer-tab').get(activeTab+1)));
        updateTabs();
        
        activeTab = activeTab + 1;
        aladin.view.forceRedraw();
    }
}

/*
 *  Code that should be activated once document has loaded
 */
$(function() {
  
  /*
   *    Listeners
   */

  /* When tour tab is clicked play tour again
  *
  */
  $('#play-tour').click(function(e) {
    tour.restart();
  });


  /*
   *    When a filter heading is clicked,
   *    the filters are minimised.
   */
  $('#filter-ui .well-title').click(function(e) {
                           e.preventDefault();
                           var url = $(this).attr('href');
                         
                            var filters = $('#filter-ui #' + url);
                            filters.toggle();
                           });
  
  /*
   *    When a tab is clicked, it will show/hide the overlay.
   *    If the tab is being activated, the "TAB OPTIONS" tab will be
   *    set to the tab.
   */
  $('#layer-tabs').on('click', '.layer-tab', function(e) {
                        e.preventDefault();
                        $(this).blur();
                      
                        var index = $('#layer-tabs .layer-tab').index($(this));
                        if($(this).is('.active')) {
                            $(this).addClass('inactive');
                            hideOverlay(index);
                        }
                        else {
                            $(this).removeClass('inactive');
                            showOverlay(index);
                        }
                      
                        updateTabOptions();
                      
                        });
  
  /*
   *    When the 'X' on a tab is clicked, the
   *    tab and overlay is removed.
   */
  $('#layer-tabs').on('click', '.glyphicon-remove', function(e) {
                      e.stopPropagation();
                      
                      var tab = $(this).parent();
                      var index = $('#layer-tabs .layer-tab').index(tab);
                      
                      removeOverlay(index);
                      tab.remove();
                      updateTabs();
                      updateTabOptions();
                      
                      });
  /*
   *    The "+" sign. When clicked, will create
   *    a new tab and set the "TAB OPTIONS" to this tab.
   */
  $('#add-tab').click(function(e) {
                      e.preventDefault();
                      $(this).blur();
                      $(this).toggleClass('active');
                      
                      createNewTabUsingSelection();
                      updateTabOptions();
                      });
  
  /*
   *    The buttons under "TAB OPTIONS" that will
   *    change the colour of the current tab.
   */
  $('.tab-colour-button').click(function(e) {
                                e.preventDefault();
                                $(this).blur();
                                $(this).toggleClass('active');
                                
                                changeTabColor($(this).attr('color-str'));
                                });
  
  /*
   *    The (?) button under "TAB OPTIONS" that
   *    will set the tab to a random colour.
   */
  $('#tab-colour-button-random').click(function(e) {
                                e.preventDefault();
                                $(this).blur();
                                $(this).toggleClass('active');
                                
                                changeTabColor(getRandomColor());
                                });
  
  /*
   *    Left button in "TAB OPTIONS" to
   *     move a tab left
   */
  $('#move-tab-left').click(function(e) {
                                       e.preventDefault();
                                       $(this).blur();
                                       $(this).toggleClass('active');
                                       
                                        moveTabLeft();
                                       });
  
  /*
   *    Right button in "TAB OPTIONS" to
   *    move a tab right
   */
  $('#move-tab-right').click(function(e) {
                            e.preventDefault();
                            $(this).blur();
                            $(this).toggleClass('active');
                            
                            moveTabRight();
                            });

  /*
   *    Simple filter button class. Will set a filter under 'id'
   *    using filter string 'href'
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
   *    The Clear Selection button
   */
  $('#clear-selection-tool').click(function(e) {
                               e.preventDefault();
                               $(this).blur();
                                   
                                   // deselect all SBs
                                   deselectAllObjects();
                                   
                                   // apply filters
                                   applyFilters();
                               });
  /*
   *    The Select All button
   */
  $('#all-selection-tool').click(function(e) {
                                   e.preventDefault();
                                   $(this).blur();
                                   
                                   // select all SBs
                                    selectAllVisibleObjects();
                                 
                                   // apply filters
                                   applyFilters();
                                   });
  
  /*
   *    The "-" deselect button
   */
  $('#deselection-tool').click(function(e) {
                               e.preventDefault();
                               $(this).blur();
                             
                                //hideFilterMenu();
                               
                                selecting = false;
                                // show all points of visible SBs
                                for (var i = 0; i < obj_cache.length; i++) {
                                    if(isVisible(obj_cache[i])) {
                                        showPoint(obj_cache[i]);
                                    }
                                };
                                aladin.select();
                               });
  
  /*
   *    The "+" selection button
   */
  $('#selection-tool').click(function(e) {
                             e.preventDefault();
                             $(this).blur();
                             
                             //hideFilterMenu();
                             
                             selecting = true;
                             // show all points of visible SBs
                             for (var i = 0; i < obj_cache.length; i++) {
                                if(isVisible(obj_cache[i])) {
                                    showPoint(obj_cache[i]);
                                }
                             };
                             aladin.select();
                             });
  
  /*
   *    The Up Arrow button to add selection
   *    to active tabs
   */
  $('#add-selection-tool').click(function(e) {
                             e.preventDefault();
                             $(this).blur();

                                 addSelectionToActiveOverlays();
                             });
  
  /*
   *    The Down Arrow to remove selection
   *    from active tabs
   */
  $('#remove-selection-tool').click(function(e) {
                                 e.preventDefault();
                                 $(this).blur();
                                 
                                    removeSelectionFromActiveOverlays();
                                 });
  
  /*
   *    The button that shows/hides the
   *    main filter menu
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
   *    The date slider bar
   */
  $('#survey-date-slider').noUiSlider({
                                      range: {
                                      min: Date.parse("10/06/2010 02:44 PM"),
                                      max: Date.parse("10/06/2014 02:44 PM")
                                      },
                                      step: 24 * 60 * 60 * 1000,
                                      start: [ Date.parse("10/06/2011 02:44 PM"), Date.parse("10/06/2013 02:44 PM") ]
                                      });
  
  /*
   *    When the date slider is slid, the dates will be
   *    updated
   */
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
  
  /*
   *    After the date slider is modified, will
   *    set the date filter
   */
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
  
  /*
   *    The Min date form for inputting dates as text
   */
  $('#survey-date-slider-start').change(function() {
                                        
                                        var newMin = Date.parse(formatDateString($(this).val()));
                                        if(newMin) {
                                            $('#survey-date-slider').val([newMin, null]);
                                        }
                                        });
  
  /*
   *    The Max date form for inputting dates as text
   */
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
  
  // Initialize the tour
  tour.init();
  
  // Start the tour
  tour.start();
  
  });