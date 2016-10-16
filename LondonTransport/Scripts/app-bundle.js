(function () {
    var londonApp = angular.module('londonApp', ['TransportService', 'ngMap', 'MassAutoComplete','ngSanitize']);


    londonApp.controller('JourneyController', function JourneyController($scope, $sce, $q, NgMap, transportService) {
    $scope.fromSearchResults = [];
    $scope.toSearchResults = [];
    $scope.journeys = {};
    $scope.currentJourney = {};

    $scope.init = function () {
    }

    $scope.placeMarker = function (e) {
        $scope.fromMarker =  [ e.latLng.lat(), e.latLng.lng() ] ;
    }

    $scope.reverseLocations = function () {
        var temp = $scope.from;
        $scope.from = $scope.to;
        $scope.to = temp;
    };

    $scope.getJourneys = function (from, to) {
        $scope.journeys = {};
        var departure = (from.parameterValue == undefined ? from.name : from.parameterValue);
        var arrival = (to.parameterValue == undefined ? to.name : to.parameterValue);
        transportService.getJourneys(departure , arrival).then(function (response) {
            if (response.hasOwnProperty('journeys')) {
                response.journeys.forEach(function (j) {
                    var date = new Date(j.startDateTime);
                    j.startDateTime = date;
                    date = new Date(j.arrivalDateTime);
                    j.arrivalDateTime = date;

                    j.isDetailsVisible = false;
                });
            }
            $scope.journeys = response;
        });
    }

    $scope.from = {};
    $scope.to = {};
    function search(query) {
        var deffered = $q.defer();
        transportService.search(query).then(function (response) {
            var results = [];
            for (var i = 0; i < response.length; i++) {
                for (var j = 0; j < response[i].matches.length; j++) {
                    if (response[i].matches[j].modes != undefined) {
                        for (var k = 0; k < response[i].matches[j].modes.length; k++) {
                            results.push({
                                value: response[i].matches[j].name, name: response[i].matches[j].name,
                                label: $sce.trustAsHtml(
                                   ' <div class="icon ' + response[i].matches[j].modes[k] + '-icon"></div>' +
                                   '  <strong>' + response[i].matches[j].name + '</strong>'
                                 )
                            });
                        }
                    }
                    else {
                            results.push({
                                value: response[i].matches[j].name, name: response[i].matches[j].name,
                                label: $sce.trustAsHtml(
                                   '  <div class="icon ' + response[i].matches[j].icon + '-icon"></div>' +
                                   '  <strong>' + response[i].matches[j].name + '</strong>'
                                 )
                            });
                    }
                }
            }
            return deffered.resolve(results);
        });
        return deffered.promise;
    }

    function selectFromItem(selected) {
        $scope.from = selected;
    }
    function selectToItem(selected) {
        $scope.to = selected;
    }

    $scope.autocomplete_from_options = {
        suggest: search,
        on_error: console.log,
        on_select: selectFromItem
    };
    $scope.autocomplete_to_options = {
        suggest: search,
        on_error: console.log,
        on_select: selectToItem,
    };


    $scope.pickDepartureAddress = function (journey) {
        $scope.from = { name: journey.place.commonName, parameterValue: journey.parameterValue, label: journey.place.commonName };
    }
    $scope.pickArrivalAddress = function (journey) {
        $scope.to = { name: journey.place.commonName, parameterValue: journey.parameterValue, label: journey.place.commonName };;
    }

    $scope.changeCurrentJourney = function (journey) {
        if (!journey.hasStopCoordinates) {
            loadStopCoordinates(journey);
        }
        $scope.currentJourney = journey;
    }

    $scope.checkTime = function (i) {
        return (i < 10) ? "0" + i : i;
    }

    var loadStopCoordinates = function (journey) {
        journey.legs.forEach(function (leg) {
            var stopPoints = [];

            leg.color = getLegColor(leg.mode.name)

            leg.path.stopPoints.forEach(function (point) {
                stopPoints.push(point);
            });

            if (stopPoints.length > 0) {
                transportService.getStopsLocations(stopPoints).then(function (locations) {
                    leg.path.stopPoints.forEach(function (point, i) {
                        point.lat = locations[i].lat;
                        point.lon = locations[i].lon;
                    });
                });
            }
        });
        journey.hasStopCoordinates = true;
    }

   var getLegColor = function (legType) {
        switch (legType) {
            case 'tube': 
                return '#F00000';
            case 'walking':
                return '#00FF00';
            default:
                return '#0000FF';
        }
    }
});
})();
