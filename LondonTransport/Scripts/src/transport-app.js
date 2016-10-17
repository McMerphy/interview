(function () {
    var londonApp = angular.module('londonApp', ['TransportService', 'ngMap', 'MassAutoComplete','ngSanitize']);


    londonApp.controller('JourneyController', function JourneyController($scope, $sce, $q, NgMap, transportService) {
    $scope.fromSearchResults = [];
    $scope.toSearchResults = [];
    $scope.journeys = {};
    $scope.currentJourney = {};
    $scope.fromMarkerIcon =
    {
        url: 'Content/images/icons.png',
        size: [32, 32],
        origin: [32, 1956],
        anchor: [1, 32]
    }
    $scope.toMarkerIcon =
    {
        url: 'Content/images/icons.png',
        size: [32, 32],
        origin: [0, 1956],
        anchor: [1, 32]
    }
        

    $scope.init = function () {
    }

    $scope.onClickOnMap = function (e) {
        placeMarker(e.latLng.lat(), e.latLng.lng());
    }

    function placeMarker(lat, lon, markerType) {
        markerType == 'departure' ? $scope.fromMarker = [lat, lon] : $scope.toMarker = [lat, lon];
    }

    function fitArrivalAndDestinationMarkers() {
        var bounds = new google.maps.LatLngBounds();
        if ($scope.from.lat != undefined) {
            var latlng = new google.maps.LatLng($scope.from.lat, $scope.from.lon);
            bounds.extend(latlng);
        }
        if ($scope.to.lat != undefined) {
            var latlng = new google.maps.LatLng($scope.to.lat, $scope.to.lon);
            bounds.extend(latlng);
        }
        NgMap.getMap().then(function (map) {
            map.setCenter(bounds.getCenter());
            map.fitBounds(bounds);
        });
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
                            var match = response[i].matches[j];
                            results.push({
                                value: match.name, name: match.name, lat: match.lat, lon: match.lon,
                                label: $sce.trustAsHtml(
                                   ' <div class="icon ' + match.modes[k] + '-icon"></div>' +
                                   '  <strong>' + match.name + '</strong>'
                                 )
                            });
                        }
                    }
                    else {
                        var match = response[i].matches[j];
                        results.push({
                            value: match.name, name: match.name, lat: match.lat, lon: match.lon,
                            label: $sce.trustAsHtml(
                               '  <div><div class="icon ' + match.icon + '-icon"></div>' +
                               '  <strong>' + match.name + '</strong></div>'
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
        if (selected.lat != undefined) {
            placeMarker(selected.lat, selected.lon, 'departure');
            fitArrivalAndDestinationMarkers();
        }
    }
    function selectToItem(selected) {
        $scope.to = selected;
        if (selected.lat != undefined) {
            placeMarker(selected.lat, selected.lon, 'arrival');
            fitArrivalAndDestinationMarkers();
        }
    }

    function zoomToLocation(lat, lon) {
        $scope.map.setCenter({ lat: lat, lng: lon });
        $scope.map.setZoom(15);
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
