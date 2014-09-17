var aladin = A.aladin('#aladin-lite-div', {survey: "P/DSS2/color", fov:180});

// Add SB footprint object to Aladin
var SB_overlay = aladin.createOverlay({color: '#0066AA'});
aladin.addOverlay(SB_overlay);

// Add catalog object to Aladin
// The catalog should only appear when selecting surveys/SBs
var catalog = aladin.createCatalog({name: 'SBs'});
aladin.addCatalog(catalog);

// Adds a catalog entry
sources = [];
sources.push(aladin.createSource(0.0, 0.0));
catalog.addSources(sources);

// Cache
var survey_cache = TAFFY([]);
var sb_cache = TAFFY([]);
var filters = {};

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
              for(var i = 0; i < sb_data.length; i++) {
              var sb = sb_data[i];
              
              // Retrieve coordinates from the JSON object
              var points = sb.ESO.observationBlock.tileCoverage[0];
              
              // For Aladin to create a footprint, a string must be parsed with
              // the format "Polygon J2000 X1 Y1 X2 Y2 .... Xn Yn"
              var sb_string = 'Polygon J2000';
              for(var p = 0; p < points.length; p++) {
                sb_string += ' ' + points[p][0];
                sb_string += ' ' + points[p][1];
              }
              
              // Create the Aladin footprint(s) using the string
              // NOTE: sb_footprints is an array!
              var sb_footprints = aladin.createFootprintsFromSTCS(sb_string);
              
              // add footprint to Aladin
              SB_overlay.addFootprints(sb_footprints);
              
              // link footprint(s) to SB
              sb.footprints = sb_footprints;
              
              // cache SB
              sb_cache.insert(sb);
              }
              
              // apply the filters once SBs are loaded in
              applyFilters();
              });
}

/*
 *  This function parses selected points after
 *  using Aladin's selection tool.
 */
aladin.on('select', function(selection) {
          
          console.log(selection);
          
          for(var i = 0; i < selection.length; i++) {
            var s = selection[i];
            s.select();
            console.log(s);
          }
          
          });

/*
 *  Hides the main filter menu
 */
function hideFilterMenu() {
    $('#filter-container').hide(100);
    $('#toggle-filter-menu').removeClass('glyphicon-resize-small').addClass('glyphicon-resize-full');
    $('#facet-ui').addClass('collapsed');
}

/*
 *  Shows the main filter menu
 */
function showFilterMenu() {
    $('#filter-container').show(100);
    $('#toggle-filter-menu').removeClass('glyphicon-resize-full').addClass('glyphicon-resize-small');
    $('#facet-ui').removeClass('collapsed');
}

// deselects filters (DEPRECATED)
function deselectFacets() {
    //update highlight
    $('#facet-list a').each(function(index) {
                            $(this).attr('class', '');
                            });
    //$('#year-label').hide();
}

/* 
 *  Applies the current filters in variable "filters"
 *  to all cached SBs
 */
function applyFilters() {
    
    // deselect (or delete/hide later on) all SBs
    sb_cache().each(function (sb) {
                    sb.footprints[0].hide();
                    });
    
    // Build up an array of the filters applied
    var filterArray = [];
    for(var key in filters) {
        filterArray.push(filters[key]);
    }
    
    sb_cache.apply(null, filterArray).each(function (sb) {
                    sb.footprints[0].show();
                    });
}

/*
 *  activates/deactivates filter "filter"
 *  with id "id" (for identifying the filter).
 */
function setFilter(filter, id) {
    
    if(filters[id]) {
        filters[id] = null;
    }
    else {
        filters[id] = filter;
    }
    
    // Apply all filters
    applyFilters();
}

/*
 *  Code that should be activated once document has loaded
 */
$(function() {
  
  hideFilterMenu();
  getJSONData();
  
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
                         //console.log(url);
                         
                         var filters = $('#' + url);
                         if(filters.is(":visible")) {
                            filters.hide();
                         }
                         else {
                            filters.show();
                         }
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
    $('#survey-list .btn').click(function(e) {
                            e.preventDefault();
                            $(this).blur();
                            
                            var json = $(this).attr('href');
                            var id = $(this).attr('id');
                            var filter = JSON.parse(json);
                                 
                            setFilter(filter, id);
                            });
  
  /*
   *    The selection tool button
   */
  $('#selection-tool').click(function(e) {
                               e.preventDefault();
                               $(this).blur();
                             
                                hideFilterMenu();
                                aladin.select();
                               });
  
  /*
   *    Some crappy facet-list that has its own function "deselectFacets()".
   *    This one was grabbed from ADSASS WWT.
   */
  $('#facet-list a').click(function(e) {
                           e.preventDefault();
                           var url = $(this).attr('href');
                           setFilter(url);
                           deselectFacets();
                           $(this).attr('class', 'label label-default');
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
  
  });