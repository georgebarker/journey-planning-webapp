angular.module('journey-planning', ['moment-picker', 'ui.select', 'ngSanitize', 'chart.js'])
.controller('journeyPlanningCtrl', function($scope, $http) {

    // Define API endpoints
    const STATIC_DATA_API = "http://localhost:8080/api/";
    const JOURNEY_PLANNING_API = "http://localhost:8081/route/"
    const ENTRY_SLIP_ROAD_API = STATIC_DATA_API + "entrySlipRoad/all";
    const EXIT_SLIP_ROAD_API = STATIC_DATA_API + "exitSlipRoad/all";
    const STRING_DATE_TIME_FORMAT = "HH:mm a";

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

    // Functions
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
        then(function(response) {
            $scope.entrySlipRoadMap = response.data;
            $scope.entrySlipRoadArray = $.map($scope.entrySlipRoadMap, function(value, key) {
                return {text: key};
            });
        });
    }

    function getExitSlipRoads() {
        $http.get(EXIT_SLIP_ROAD_API).
        then(function(response) {
            $scope.exitSlipRoadMap = response.data;
            $scope.exitSlipRoadArray = $.map($scope.exitSlipRoadMap, function(value, key) {
                return {text: key};
            });
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
        then(function(response) {
            removeLoadingUI();
            $scope.returnedRoutes = response.data;
            setOptimalRoute();
            setDepartureArrivalTimeText();
            setTravelTimeText();
            createGraphData();
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