angular.module('journey-planning', ['moment-picker', 'ui.select', 'ngSanitize', 'chart.js'])
.controller('journeyPlanningCtrl', function($scope, $http) {

    // Define API endpoints
    const STATIC_DATA_API = "http://localhost:8080/api/";
    const JOURNEY_PLANNING_API = "http://localhost:8081/route/"
    const ENTRY_SLIP_ROAD_API = STATIC_DATA_API + "entrySlipRoad/all";
    const EXIT_SLIP_ROAD_API = STATIC_DATA_API + "exitSlipRoad/all";
    const STRING_DATE_TIME_FORMAT = "HH:mm a";
    const MAPBOX_ACCESS_TOKEN = 'pk.eyJ1IjoiZ2VvcmdlYmFya2VyIiwiYSI6ImNqcmRza29jZTFtcWU0M24wc2s0dWxjZDYifQ.JrJ4RjCq-I0fJ9gxJ87SjA';

    // Define variables
    
    //Slip road variables
    $scope.entrySlipRoadMap = {};
    $scope.entrySlipRoadArray = [];
    $scope.junctionsForSelectedFromRoadNumber = [];
    $scope.exitSlipRoadMap = {};
    $scope.exitSlipRoadArray = [];
    $scope.junctionsForSelectedToRoadNumber = [];

    //Start & end date variables
    $scope.selectedStartDate = {};
    $scope.selectedEndDate = {};
    $scope.startDateHasChanged = false;
    $scope.minStartDate = moment();
    $scope.minEndDate = moment();
    $scope.maxEndDate = moment();

    //Journey data variables
    $scope.returnedRoutes = null;
    $scope.optimalRoute = null;

    // Define functions
    $scope.onFromRoadNumberSelected = onFromRoadNumberSelected;
    $scope.onToRoadNumberSelected = onToRoadNumberSelected;
    $scope.onStartDateChanged = onStartDateChanged;
    $scope.isPlanJourneyButtonDisabled = isPlanJourneyButtonDisabled;
    $scope.getRoutes = getRoutes;

    //UI Variables
    var loadingSpinner = $('#loading-spinner');
    var planJourneyButton = $('#plan-journey-button');
    var entrySlipErrorText = $('#entry-slip-error-text');
    var exitSlipErrorText = $('#exit-slip-error-text');
    var serviceOfflineErrorText = $('#service-offline-error-text');
    var unableToFindRouteErrorText = $('#route-error-text');

    //Map variables
    var map = L.map('map');
    $scope.layerGroup = {};

    var southWestBounds = L.latLng(49.937457, -5.577327);
    var northEastBounds = L.latLng(58.989541, 2.696686);
    var bounds = L.latLngBounds(southWestBounds, northEastBounds);

    //Line graph variables
    $scope.labels = [];
    $scope.data = [];
    $scope.options = {
        scales: {
          yAxes: [
            {
                scaleLabel: { 
                display: true,
                labelString: 'Journey time (mins)' 
                }
            }
          ],
          xAxes: [
              {
                  scaleLabel: {
                      display: true,
                      labelString: 'Departure time'
                  }
              }
          ]
        }
      }; 

    // Run functions
    getEntrySlipRoads();
    getExitSlipRoads();
    setupMap();

    // Functions
    function setupMap() {
        map.setView(bounds.getCenter(), 6);
        L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        minZoom: 6,
        maxZoom: 18,
        center: bounds.getCenter(),
        id: 'mapbox.streets',
        accessToken: MAPBOX_ACCESS_TOKEN
        }).addTo(map);
        map.setMaxBounds(bounds);
    }

    function setMapToOptimalRoute() {
        //remove all previous layers
        map.removeLayer($scope.layerGroup);

        if ($scope.optimalRoute == null) {
            return;
        }

        var pointList = [];
        $.each($scope.optimalRoute.route, function(index, routePoint) {
            var start = [routePoint.startNode.longitude, routePoint.startNode.latitude];
            var end = [routePoint.endNode.longitude, routePoint.endNode.latitude];
            pointList.push(start, end);
        });
        var polylineOptions = { color: '#4286f4' };
        var polyline = new L.Polyline(pointList, polylineOptions);

        var startMarker = new L.Marker(pointList[0])
        .bindPopup($scope.selectedFromJunction.roadName);

        var endMarker = new L.Marker(pointList[pointList.length - 1])
        .bindPopup($scope.selectedToJunction.roadName);

        $scope.layerGroup = L.layerGroup([polyline, startMarker, endMarker]);
        $scope.layerGroup.addTo(map);
        map.fitBounds(polyline.getBounds());
    }

    function onStartDateChanged(newValue, oldValue) {
        $scope.startDateHasChanged = true;
        $scope.minEndDate = moment(newValue).add(15, 'minutes');
        $scope.maxEndDate = moment($scope.selectedStartDate).add(1, 'days');
    }

    function onFromRoadNumberSelected(selectedFromRoadNumber) {
        $scope.selectedFromJunction = null;
        $scope.junctionsForSelectedFromRoadNumber = $scope.entrySlipRoadMap[selectedFromRoadNumber.text];
    }

    function onToRoadNumberSelected(selectedToRoadNumber) {
        $scope.selectedToJunction = null;
        $scope.junctionsForSelectedToRoadNumber = $scope.exitSlipRoadMap[selectedToRoadNumber.text];
    }

    function setLoadingUI() {
        serviceOfflineErrorText.hide();
        unableToFindRouteErrorText.hide();
        loadingSpinner.show();
        planJourneyButton.text('Loading...');
        planJourneyButton.prop('disabled', true);
    }

    function removeLoadingUI() {
        loadingSpinner.hide();
        planJourneyButton.text('Plan my journey');
        planJourneyButton.prop('disabled', false);
    }

    function isPlanJourneyButtonDisabled() {
        return $.isEmptyObject($scope.selectedStartDate)
                || $.isEmptyObject($scope.selectedEndDate)
                || $.isEmptyObject($scope.selectedFromJunction)
                || $.isEmptyObject($scope.selectedToJunction);
    }

    function getEntrySlipRoads() {
        $http.get(ENTRY_SLIP_ROAD_API).
        then(function onSuccess(response) {
            $scope.entrySlipRoadMap = response.data;
            $scope.entrySlipRoadArray = $.map($scope.entrySlipRoadMap, function(value, key) {
                return {text: key};
            });
        }).catch(function onError(response) {
            entrySlipErrorText.show();
        });
    }

    function getExitSlipRoads() {
        $http.get(EXIT_SLIP_ROAD_API).
        then(function onSuccess(response) {
            $scope.exitSlipRoadMap = response.data;
            $scope.exitSlipRoadArray = $.map($scope.exitSlipRoadMap, function(value, key) {
                return {text: key};
            });
        }).catch(function onError(response) {
            exitSlipErrorText.show();
        });
    }

    function getRoutes() {
        setLoadingUI();
        var URL = JOURNEY_PLANNING_API 
        + $scope.selectedFromJunction.linkId 
        + "/" 
        + $scope.selectedToJunction.linkId
        + "/"
        + $scope.selectedStartDate
        + "/"
        + $scope.selectedEndDate;

        $http.get(URL).
        then(function onSuccess(response) {
            removeLoadingUI();
            $scope.returnedRoutes = response.data;
            setOptimalRoute();
            setDepartureArrivalTimeText();
            setTravelTimeText();
            createGraphData();
            setMapToOptimalRoute();
        }).catch(function onError(response) {
            removeLoadingUI();
            $scope.optimalRoute = null; //clear the journey information
            setMapToOptimalRoute(); //clear the map

            if (response.data != null) {
                unableToFindRouteErrorText.show();
            } else {
                serviceOfflineErrorText.show();
            }
        });
    }

    function createGraphData() {
        $scope.labels = [];
        $scope.data = [];
        $.each($scope.returnedRoutes, function(index, route) {
            $scope.labels.push(route.departureTimeText);
            $scope.data.push(route.minutesToTravel.toFixed(2));
        });
    }

    function setOptimalRoute() {
        $.each($scope.returnedRoutes, function(index, route) {
            if (route.optimalRoute) {
                $scope.optimalRoute = route;
                return false;
            }
        });
    }

    function setDepartureArrivalTimeText() {
        $.each($scope.returnedRoutes, function(index, route) {
            var departureTime = moment(route.departureTimeMillis);
        var arrivalTime = moment(route.arrivalTimeMillis);
        route.departureTimeText = departureTime.format(STRING_DATE_TIME_FORMAT);
        route.arrivalTimeText = arrivalTime.format(STRING_DATE_TIME_FORMAT);
        });
    }

    function setTravelTimeText() {
        $.each($scope.returnedRoutes, function(index, route) {
            var travelTimeText = null;
            var minutes = Math.round(route.minutesToTravel);
            var hours = Math.floor(minutes / 60);
    
            if (hours > 0) {
                var minutesOfTheHour = minutes - (hours * 60);
                if (minutesOfTheHour == 0) {
                    travelTimeText = hours + " hours";
                } else {
                    travelTimeText = hours + " hours, " + minutesOfTheHour + " minutes";
                }
            } else {
                travelTimeText = minutes + " minutes";
            }
            route.travelTimeText = travelTimeText;
        });
    }

})
.config(['momentPickerProvider', function (momentPickerProvider) {
    momentPickerProvider.options({
        minutesStep: 15,
        format: "lll",
        locale: "en-gb",
        minView: "month",
        maxView: "hour"
    });
}])
;