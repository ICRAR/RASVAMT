var aladin = A.aladin('#aladin-lite-div', {survey: "P/DSS2/color", fov:60});

var SB_stuff = [];
var stcsArrayHLA = ['Polygon J2000 0.0 0.0 20.0 0.0 20.0 20.0 0.0 20.0']
for (var k=0, len=stcsArrayHLA.length; k<len; k++) {
    SB_stuff.push(aladin.createFootprintsFromSTCS(stcsArrayHLA[k]));
}
var SB_overlay = aladin.createOverlay({color: '#4484ff'});
aladin.addOverlay(SB_overlay);
for (var k=0, len=SB_stuff.length; k<len; k++) {
    SB_overlay.addFootprints(SB_stuff[k]);
}

var catalog = aladin.createCatalog({name: 'SBs'});
aladin.addCatalog(catalog);

sources = [];
sources.push(aladin.createSource(0.0, 0.0));
catalog.addSources(sources);

console.log(SB_stuff[0]);

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
              
              var points = sb.ESO.observationBlock.tileCoverage[0];
              
              
              
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