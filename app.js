angular.module('journey-planning', ['moment-picker', 'ui.select', 'ngSanitize'])
.controller('journeyPlanningCtrl', function($scope, $http) {

    // Define API endpoints
    const API = "http://localhost:8080/api/";
    const ENTRY_SLIP_ROAD_API = API + "entrySlipRoad/all";
    const EXIT_SLIP_ROAD_API = API + "exitSlipRoad/all";

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

    // Define functions
    $scope.onFromRoadNumberSelected = onFromRoadNumberSelected;
    $scope.onToRoadNumberSelected = onToRoadNumberSelected;
    $scope.onStartDateChanged = onStartDateChanged;
    $scope.isPlanJourneyButtonEnabled = isPlanJourneyButtonEnabled;

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

    function isPlanJourneyButtonEnabled() {
        return $scope.startDateHasChanged 
        && $scope.selectedFromJunction != null 
        && $scope.selectedToJunction != null;
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