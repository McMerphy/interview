(function () {
    var londonApp = angular.module('londonApp', ['TransportService', 'ngMap', 'MassAutoComplete', 'ngSanitize']);

    londonApp.constant('Constants', {
        PickingMode: {
            None: 1,
            Departure: 2,
            Arrival: 3
        },
        MARKER_STYLES: {
            FROM: {
                url: 'Content/images/icons.png',
                size: [32, 32],
                origin: [32, 1956],
                anchor: [16, 32]
            },
            TO: {
                url: 'Content/images/icons.png',
                size: [32, 32],
                origin: [0, 1956],
                anchor: [16, 32]
            }
        }
    });

    londonApp.controller('JourneyController', function JourneyController($scope, $sce, $q, $location, $anchorScroll, NgMap, transportService, Constants) {
        $scope.constants = Constants;
        $scope.pickingMode = Constants.PickingMode.None;
        $scope.fromSearchResults = [];
        $scope.toSearchResults = [];
        $scope.journeys = {};
        $scope.currentJourney = {};


        $scope.clickCustomControl = function (mode) {
            $scope.pickingMode = (mode == $scope.pickingMode ? Constants.PickingMode.None : mode);
        };

        $scope.clickOnMap = function (e) {
            if ($scope.pickingMode == Constants.PickingMode.None) {
                return;
            }
            placeMarker(e.latLng.lat(), e.latLng.lng(), $scope.pickingMode);
            setCoordinatesAsNameValue(e.latLng.lat(), e.latLng.lng(), $scope.pickingMode);
            $scope.pickingMode = Constants.PickingMode.None;
        };

        function zoomToLocation(lat, lon) {
            $scope.map.setCenter({ lat: lat, lng: lon });
            $scope.map.setZoom(15);
        };

        function placeMarker(lat, lon, markerType) {
            if (markerType == Constants.PickingMode.Departure) {
                $scope.from.lat = lat;
                $scope.from.lon = lon;
            }
            else {
                $scope.to.lat = lat;
                $scope.to.lon = lon;
            }
        };

        function fitPathToMapBounds() {
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
        };


        $scope.reverseLocations = function () {
            var temp = $scope.from;
            $scope.from = $scope.to;
            $scope.to = temp;
            temp = $scope.fromMarker;
            $scope.fromMarker = $scope.toMarker;
            $scope.toMarker = temp;
        };

        $scope.validateForm = function (form) {
            form.fromName.$touched = true;
            form.toName.$touched = true;
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
                            var match = response[i].matches[j];
                            var label = ' <div class="row vertical-align"><div class="col-xs-7">' +
                                   '<strong>' + match.name + '</strong></div><div class="col-xs-5"><ul class="types-list">';

                            for (var k = 0; k < response[i].matches[j].modes.length; k++) {
                                label += '<li class="icon ' + match.modes[k] + '-icon text-hide"></li>';
                            }
                            results.push({
                                value: match.name, name: match.name, lat: match.lat, lon: match.lon, parameterValue: match.icsId,
                                label: $sce.trustAsHtml(label + '</ul></div></div>')
                            });
                        }
                        else {
                            var match = response[i].matches[j];
                            results.push({
                                value: match.name, name: match.name, lat: match.lat, lon: match.lon,
                                label: $sce.trustAsHtml(
                                     ' <div class="row vertical-align"><div class="col-xs-7">' +
                                   '<strong>' + match.name + '</strong></div><div class="col-xs-5"><ul class="types-list">' +
                                   '<li class="icon ' + match.icon + '-icon text-hide"></li>'
                                 )
                            });
                        }
                    }
                }
                return deffered.resolve(results);
            });
            return deffered.promise;
        };

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

        function selectFromItem(selected) {
            $scope.from = selected;
            if (selected.lat != undefined) {
                placeMarker(selected.lat, selected.lon, Constants.PickingMode.Departure);
                fitPathToMapBounds();
            }
        };
        function selectToItem(selected) {
            $scope.to = selected;
            if (selected.lat != undefined) {
                placeMarker(selected.lat, selected.lon, Constants.PickingMode.Arrival);
                fitPathToMapBounds();
            }
        };

        $scope.getJourneys = function (from, to) {
            $scope.journeys = {};
            $scope.currentJourney = {};
            if (from.name == undefined || to.name == undefined) {
                return;
            }
            if (from.name != from.value) {
                from.parameterValue = undefined;
            }
            if (to.name != to.value) {
                to.parameterValue = undefined;
            }
            var departure = (from.parameterValue == undefined ? from.name : from.parameterValue);
            var arrival = (to.parameterValue == undefined ? to.name : to.parameterValue);
            transportService.getJourneys(departure, arrival).then(function (response) {
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
        };


        $scope.pickDepartureAddress = function (journey) {
            $scope.from = {
                name: journey.place.commonName, parameterValue: journey.parameterValue, label: journey.place.commonName,
                lat: journey.place.lat, lon: journey.place.lon
            };
            placeMarker(journey.place.lat, journey.place.lon, Constants.PickingMode.Departure);
            fitPathToMapBounds();
        };
        $scope.pickArrivalAddress = function (journey) {
            $scope.to = {
                name: journey.place.commonName, parameterValue: journey.parameterValue, label: journey.place.commonName,
                lat: journey.place.lat, lon: journey.place.lon
            };
            placeMarker(journey.place.lat, journey.place.lon, Constants.PickingMode.Arrival);
            fitPathToMapBounds();
        };

        $scope.changeCurrentJourney = function (journey) {
            $location.hash('map');
            
            $anchorScroll();
            $scope.currentJourney = journey;
            $scope.currentJourney.legs.forEach(function (leg) {
                leg.color = getLegColor(leg.mode.name);
            });
            fitPathToMapBounds();
        };

        $scope.formatMinutes = function (i) {
            return (i < 10) ? "0" + i : i;
        };

        function setCoordinatesAsNameValue(lat, lon) {
            if ($scope.pickingMode == Constants.PickingMode.Departure) {
                $scope.from.parameterValue = lat + ',' + lon;
                $scope.from.name = lat + ',' + lon;
                $scope.from.value = lat + ',' + lon;

            }
            else {
                $scope.to.parameterValue = lat + ',' + lon;
                $scope.to.name = lat + ',' + lon;
                $scope.to.value = lat + ',' + lon;
            }

        };

        var getLegColor = function (legType) {
            switch (legType) {
                case 'tube':
                    return '#F00000';
                case 'walking':
                    return '#00FF00';
                case 'bus':
                    return 'FF8800';
                default:
                    return '#0000FF';
            }
        }
    });
})();
