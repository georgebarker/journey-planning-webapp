angular.module('journey-planning', ['ui.select', 'ngSanitize'])
.controller('journeyPlanningCtrl', function($scope, $http) {

    const API = "http://localhost:8080/api/";
    const ENTRY_SLIP_ROAD_API = API + "entrySlipRoad/all";
    $scope.roadNumberMap = {};
    $scope.roadNumberArray = [];
    $scope.junctionsForSelectedRoadNumber = [];
    $scope.onRoadNumberSelected = onRoadNumberSelected;

    getRoads();

    function onRoadNumberSelected(selectedRoadNumber) {
        $scope.selectedJunction = null;
        $scope.junctionsForSelectedRoadNumber = $scope.roadNumberMap[selectedRoadNumber.text];
    }

    function getRoads() {
        $http.get(ENTRY_SLIP_ROAD_API).
        then(function(response) {
            $scope.roadNumberMap = response.data;
            $scope.roadNumberArray = $.map($scope.roadNumberMap, function(value, key) {
                return {text: key};
            });
        });
    }

});