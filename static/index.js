var aladin = A.aladin('#aladin-lite-div', {survey: "P/DSS2/color", fov:60});

// Add SB footprint object to Aladin
var SB_overlay = aladin.createOverlay({color: '#4484ff'});
aladin.addOverlay(SB_overlay);

// Add catalog object to Aladin
var catalog = aladin.createCatalog({name: 'SBs'});
aladin.addCatalog(catalog);

// Adds a catalog entry
sources = [];
sources.push(aladin.createSource(0.0, 0.0));
catalog.addSources(sources);

// Cache
var survey_cache = [];
var sb_cache = [];
var filters = [];

function getJSONData() {
    
    $.getJSON("/survey/", function(survey_data) {
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
              });
    
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
              
              // Create the Aladin footprint using the string
              var sb_footprint = aladin.createFootprintsFromSTCS(sb_string);
              
              // add footprint to Aladin, and to the cache
              SB_overlay.addFootprints(sb_footprint);
              sb.footprint = sb_footprint;
              //sb.footprint.hide();
              
              // cache SB
              sb_cache.push(sb);
              }
              });
}

aladin.on('select', function(selection) {
          
          console.log(selection);
          
          for(var i = 0; i < selection.length; i++) {
            var s = selection[i];
            s.isSelected = true;
            console.log(s);
          }
          
          });

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
        
    }
    
    aladin.select();
}

// Code that should be activated once document has loaded
$(function() {
  
  getJSONData();
  //$('.aladin-fullscreenControl').hide();
  
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