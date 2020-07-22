var dayBtn = document.querySelector(".btn_day"),
    dayInput = document.querySelector(".input_day"),
    map_gis = document.querySelector("#viewDiv"),
    formDay = document.querySelector(".formDay");
container = document.querySelector(".container");
bodyr = document.querySelector("body");

dayBtn.addEventListener("click", () => {
    formDay.style.display = "none";
    container.style.display = "none";
    map_gis.style.width = "100%";
    map_gis.style.height = "100%";
    bodyr.classList.remove('body_background');
    var day = dayInput.value;
    console.log(day);


    //Путь от общаги до 12 корпуса
    // [37.5550149, 55.8319731],
    // [37.555162, 55.83201],
    // [37.554703, 55.83244],
    // [37.555572, 55.832678],
    // [37.555317, 55.833007],
    // [37.554928, 55.832927]

    //===========================
    //Начало скрипта ArcGis
    //============================
    require([
        "esri/Map",
        "esri/views/MapView",
        "esri/widgets/BasemapToggle",
        "esri/widgets/BasemapGallery",
        "esri/tasks/RouteTask",
        "esri/tasks/support/RouteParameters",
        "esri/tasks/support/FeatureSet",
        "esri/widgets/Search",
        "esri/layers/FeatureLayer",
        "esri/Graphic",
        "esri/layers/GraphicsLayer",
        "esri/widgets/CoordinateConversion",
        "esri/widgets/Locate",
        "esri/widgets/Track",
        "esri/widgets/Compass"
    ], function (Map, MapView, BasemapToggle, BasemapGallery, RouteTask, RouteParameters, FeatureSet, Search, FeatureLayer, Graphic, GraphicsLayer, CoordinateConversion, Locate, Track, Compass) {

        var map = new Map({
            basemap: "dark-gray-vector"
        });

        var view = new MapView({
            container: "viewDiv",
            map: map,
            center: [37.550720, 55.833149],
            zoom: 16
        });


        var graphicsLayer = new GraphicsLayer();
        map.add(graphicsLayer);

        //Маршрут
        var routeTask = new RouteTask({
            url: "https://route.arcgis.com/arcgis/rest/services/World/Route/NAServer/Route_World"
        });

        view.on("click", function (event) {
            if (view.graphics.length === 0) {
                addGraphic("start", event.mapPoint);
            } else if (view.graphics.length === 1) {
                addGraphic("finish", event.mapPoint);

                getRoute();
            } else {
                view.graphics.removeAll();
                addGraphic("start", event.mapPoint);
            }
        });

        function addGraphic(type, point) {
            var graphic = new Graphic({
                symbol: {
                    type: "simple-marker",
                    color: (type === "start") ? "white" : "black",
                    size: "8px"
                },
                geometry: point
            });
            view.graphics.add(graphic);
        }

        function getRoute() {
            // Setup the route parameters
            var routeParams = new RouteParameters({
                stops: new FeatureSet({
                    features: view.graphics.toArray() // Pass the array of graphics
                }),
                returnDirections: true
            });
            // Get the route
            routeTask.solve(routeParams).then(function (data) {
                // Display the route
                data.routeResults.forEach(function (result) {
                    result.route.symbol = {
                        type: "simple-line",
                        color: [5, 150, 255],
                        width: 3
                    };
                    view.graphics.add(result.route);
                });
            });
        }

        //Конец маршрута

        //ПОИСК
        var search = new Search({
            view: view
        });

        search.sources.push({
            layer: trailsLayer,
            searchFields: ["TRL_NAME"],
            displayField: "TRL_NAME",
            exactMatch: false,
            outFields: ["TRL_NAME", "PARK_NAME"],
            resultGraphicEnabled: true,
            name: "Trailheads",
            placeholder: "Example: Medea Creek Trail",
        });

        view.ui.add(search, "top-right");

        var trailsLayer = new FeatureLayer({
            url: "https://services3.arcgis.com/GVgbJbqm8hXASVYi/arcgis/rest/services/Trailheads/FeatureServer/0",
        });

        map.add(trailsLayer); // Optionally add layer to map

        view.on("click", function (evt) {
            search.clear();
            view.popup.clear();
            if (search.activeSource) {
                var geocoder = search.activeSource.locator; // World geocode service
                var params = {
                    location: evt.mapPoint
                };
                geocoder.locationToAddress(params)
                    .then(function (response) { // Show the address found
                        var address = response.address;
                        showPopup(address, evt.mapPoint);
                    }, function (err) { // Show no address found
                        showPopup("No address found.", evt.mapPoint);
                    });
            }
        });

        function showPopup(address, pt) {
            view.popup.open({
                title: +Math.round(pt.longitude * 100000) / 100000 + "," + Math.round(pt.latitude * 100000) / 100000,
                content: address,
                location: pt
            });
        }
        //КОНЕЦ ПОИСКА



        //basemap
        var basemapToggle = new BasemapToggle({
            view: view,
            nextBasemap: "satellite"
        });

        view.ui.add(basemapToggle, "bottom-right");

        var coordsWidget = document.createElement("div");
        coordsWidget.id = "coordsWidget";
        coordsWidget.className = "esri-widget esri-component";
        coordsWidget.style.padding = "7px 15px 5px";

        view.ui.add(coordsWidget, "bottom-right");

        function showCoordinates(pt) {
            var coords = "Lat/Lon " + pt.x.toFixed(3) + " " + pt.y.toFixed(3) +
                " | Scale 1:" + Math.round(view.scale * 1) / 1 +
                " | Zoom " + view.zoom;
            coordsWidget.innerHTML = coords;
        };

        view.watch("stationary", function (isStationary) {
            showCoordinates(view.center);
        });

        view.on("pointer-move", function (evt) {
            showCoordinates(view.toMap({
                x: evt.x,
                y: evt.y
            }));
        });

        var coordinateConversionWidget = new CoordinateConversion({
            view: view
        });

        view.ui.add(coordinateConversionWidget, "bottom-right");

        var track = new Track({
            view: view,
            graphic: new Graphic({
                symbol: {
                    type: "simple-marker",
                    size: "12px",
                    color: "green",
                    outline: {
                        color: "#efefef",
                        width: "1.5px"
                    }
                }
            }),
            useHeadingEnabled: true // Don't change orientation of the map
        });

        view.ui.add(track, "top-left");

        var compass = new Compass({
            view: view
        });

        view.ui.add(compass, "top-left");

        //==========graphics==============

        //Общага - 2а
        //Полигон
        var polygon2a = {
            type: "polygon",
            rings: [
                [37.55491, 55.83182],
                [37.555109, 55.831869],
                [37.554921, 55.832071],
                [37.554822, 55.832041],

                [37.554569, 55.832281],
                [37.55439, 55.832217],
                [37.554689, 55.831902],
                [37.554799, 55.83193],
            ]
        };

        var simpleFillSymbol = {
            type: "simple-fill",
            color: [0, 255, 255, 0.1], // green opacity 10%
            outline: {
                color: [0, 255, 0],
                width: 3
            }
        };

        var polygonGraphic = new Graphic({
            geometry: polygon2a,
            symbol: simpleFillSymbol
        });

        graphicsLayer.add(polygonGraphic);

        //Точка
        var point2a = {
            type: "point",
            longitude: 37.554691,
            latitude: 55.832028
        };

        var simpleMarkerSymbol2a = {
            type: "simple-marker",
            color: [226, 119, 40], // orange
            outline: {
                color: [255, 255, 255], // white
                width: 1
            }
        };

        var attributes2a = {
            Name: "Общежитие №7", // The name of the
            Location: "Листенничная аллея, д2а", // The owner of the
        };

        var popupTemplate2a = {
            title: "{Name}",
            content: "Адрес: <b>{Location}</b>."
        };

        var pointGraphic = new Graphic({
            geometry: point2a,
            symbol: simpleMarkerSymbol2a,
            attributes: attributes2a,
            popupTemplate: popupTemplate2a
        });

        graphicsLayer.add(pointGraphic);

        //Подпись
        var textGraphic2a = new Graphic({
            geometry: {
                type: "point",
                longitude: 37.554691,
                latitude: 55.832028
            },
            symbol: {
                type: "text",
                color: [25, 25, 25],
                haloColor: [255, 255, 255],
                haloSize: "1px",
                text: "Общежитие №7",
                xoffset: 0,
                yoffset: -25,
                font: {
                    size: 12
                }
            }
        });

        graphicsLayer.add(textGraphic2a);


        if (day.toLowerCase() === "понедельник") {
            //line 7to6
            var simpleLineSymbol_7to6 = {
                type: "simple-line",
                color: [226, 119, 40],
                style: "short-dash",
                width: 1
            };

            var polyline_7to6 = {
                type: "polyline",
                paths: [
                    [37.5550149, 55.8319731],
                    [37.555162, 55.83201],
                    [37.554703, 55.83244],
                    [37.554317, 55.83233],
                    [37.553148, 55.833668],
                    [37.55174, 55.833404],
                    [37.551452, 55.833902],
                    [37.551817, 55.833954]
                ]
            };

            var polylineGraphic_7to6 = new Graphic({
                geometry: polyline_7to6,
                symbol: simpleLineSymbol_7to6
            });

            graphicsLayer.add(polylineGraphic_7to6);


            //line 6to12
            var simpleLineSymbol_6to12 = {
                type: "simple-line",
                color: [226, 119, 40],
                style: "short-dash",
                width: 1
            };

            var polyline_6to12 = {
                type: "polyline",
                paths: [
                    [37.551841, 55.833925],
                    [37.551525, 55.833889],
                    [37.551774, 55.833451],
                    [37.55378, 55.833818],
                    [37.554167, 55.833589],
                    [37.554601, 55.83346],
                    [37.554912, 55.83305],
                    [37.554869, 55.83304]

                ]
            };

            var polylineGraphic_6to12 = new Graphic({
                geometry: polyline_6to12,
                symbol: simpleLineSymbol_6to12
            });

            graphicsLayer.add(polylineGraphic_6to12);

            //line 12to28
            var simpleLineSymbol_12to28 = {
                type: "simple-line",
                color: [226, 119, 40],
                style: "short-dash",
                width: 1
            };

            var polyline_12to28 = {
                type: "polyline",
                paths: [
                    [37.554912, 55.83305],
                    [37.555835, 55.833949],
                    [37.555663, 55.834184],
                    [37.554864, 55.834018],
                    [37.554521, 55.834076],
                    [37.553791, 55.834461],
                    [37.553705, 55.834558],
                    [37.552369, 55.834814],
                    [37.551109, 55.834546],
                    [37.550481, 55.835492],
                    [37.549757, 55.835323],
                    [37.549591, 55.835558]
                ]
            };

            var polylineGraphic_12to28 = new Graphic({
                geometry: polyline_12to28,
                symbol: simpleLineSymbol_12to28
            });

            graphicsLayer.add(polylineGraphic_12to28);


            //12 Корпус - д2
            //Полигон
            var polygon12 = {
                type: "polygon",
                rings: [
                    [37.554856, 55.832706],
                    [37.555409, 55.832818],
                    [37.555328, 55.832923],
                    [37.555173, 55.832896],

                    [37.555189, 55.832869],
                    [37.554991, 55.832833],
                    [37.554685, 55.833297],
                    [37.554154, 55.833194],

                    [37.553971, 55.83348],
                    [37.554084, 55.833499],
                    [37.553993, 55.833616],
                    [37.553725, 55.833565],

                    [37.554073, 55.833047],
                    [37.554551, 55.833134],
                    [37.55462, 55.833035],

                    [37.554454, 55.832989],
                    [37.554384, 55.832887],
                    [37.554438, 55.832776],
                    [37.55462, 55.832709],
                    [37.554851, 55.832703],
                ]
            };

            var simpleFillSymbol12 = {
                type: "simple-fill",
                color: [202, 0, 2, 0.1], // green opacity 10%
                outline: {
                    color: [202, 0, 2],
                    width: 3
                }
            };

            var polygonGraphic12 = new Graphic({
                geometry: polygon12,
                symbol: simpleFillSymbol12
            });

            graphicsLayer.add(polygonGraphic12);

            //Точка
            var point12 = {
                type: "point",
                longitude: 37.55462,
                latitude: 55.83286
            };

            var simpleMarkerSymbol12 = {
                type: "simple-marker",
                color: [226, 119, 40], // orange
                outline: {
                    color: [255, 255, 255], // white
                    width: 1
                }
            };

            var attributes12 = {
                Name: "Корпус №12", // The name of the
                Location: "Листенничная аллея, д2", // The owner of the
            };

            var popupTemplate12 = {
                title: "{Name}",
                content: "Адрес: <b>{Location}</b>. <br><br> 2. Управление ИТ-сервисами и контентом <br> 3. Эффективность ИТ"
            };

            var pointGraphic12 = new Graphic({
                geometry: point12,
                symbol: simpleMarkerSymbol12,
                attributes: attributes12,
                popupTemplate: popupTemplate12
            });

            graphicsLayer.add(pointGraphic12);

            //Подпись
            var textGraphic12 = new Graphic({
                geometry: {
                    type: "point",
                    longitude: 37.55462,
                    latitude: 55.83286
                },
                symbol: {
                    type: "text",
                    color: [25, 25, 25],
                    haloColor: [255, 255, 255],
                    haloSize: "1px",
                    text: "Корпус №12",
                    xoffset: 0,
                    yoffset: -25,
                    font: {
                        size: 12
                    }
                }
            });

            graphicsLayer.add(textGraphic12);

            //6 Корпус - д2
            //Полигон
            var polygon6 = {
                type: "polygon",
                rings: [
                    [37.552196, 55.83377],
                    [37.552083, 55.833902],
                    [37.552678, 55.834038],
                    [37.552555, 55.834201],

                    [37.55196, 55.834104],
                    [37.551859, 55.834279],
                    [37.552276, 55.834366],
                    [37.552137, 55.834547],

                    [37.551734, 55.834469],
                    [37.551611, 55.834628],
                    [37.551278, 55.834547],
                    [37.55138, 55.834402],

                    [37.551557, 55.834432],
                    [37.551659, 55.834288],
                    [37.551466, 55.834197],

                    [37.551573, 55.833978],
                    [37.551826, 55.833996],
                    [37.551901, 55.833872],
                    [37.551718, 55.83383],
                    [37.551827, 55.833699],
                ]
            };

            var simpleFillSymbol6 = {
                type: "simple-fill",
                color: [202, 0, 2, 0.1], // green opacity 10%
                outline: {
                    color: [202, 0, 2],
                    width: 3
                }
            };

            var polygonGraphic6 = new Graphic({
                geometry: polygon6,
                symbol: simpleFillSymbol6
            });

            graphicsLayer.add(polygonGraphic6);

            //Точка
            var point6 = {
                type: "point",
                longitude: 37.551693,
                latitude: 55.834169
            };

            var simpleMarkerSymbol6 = {
                type: "simple-marker",
                color: [226, 119, 40], // orange
                outline: {
                    color: [255, 255, 255], // white
                    width: 1
                }
            };

            var attributes6 = {
                Name: "Корпус №6", // The name of the
                Location: "Листенничная аллея, д2", // The owner of the
            };

            var popupTemplate6 = {
                title: "{Name}",
                content: "Адрес: <b>{Location}</b>.<br><br> 1. Деловые коммуникации"
            };

            var pointGraphic6 = new Graphic({
                geometry: point6,
                symbol: simpleMarkerSymbol6,
                attributes: attributes6,
                popupTemplate: popupTemplate6
            });

            graphicsLayer.add(pointGraphic6);

            //Подпись
            var textGraphic6 = new Graphic({
                geometry: {
                    type: "point",
                    longitude: 37.551693,
                    latitude: 55.834169
                },
                symbol: {
                    type: "text",
                    color: [25, 25, 25],
                    haloColor: [255, 255, 255],
                    haloSize: "1px",
                    text: "Корпус №6",
                    xoffset: 0,
                    yoffset: -25,
                    font: {
                        size: 12
                    }
                }
            });

            graphicsLayer.add(textGraphic6);

            //28 Корпус - д19
            //Полигон
            var polygon28 = {
                type: "polygon",
                rings: [
                    [37.550049, 55.835688],
                    [37.549609, 55.836244],
                    [37.549405, 55.836198],
                    [37.549518, 55.836063],

                    [37.548778, 55.835873],
                    [37.549094, 55.835457],

                ]
            };

            var simpleFillSymbol28 = {
                type: "simple-fill",
                color: [202, 0, 2, 0.1], // green opacity 10%
                outline: {
                    color: [202, 0, 2],
                    width: 3
                }
            };

            var polygonGraphic28 = new Graphic({
                geometry: polygon28,
                symbol: simpleFillSymbol28
            });

            graphicsLayer.add(polygonGraphic28);

            //Точка
            var point28 = {
                type: "point",
                longitude: 37.549376,
                latitude: 55.835814
            };

            var simpleMarkerSymbol28 = {
                type: "simple-marker",
                color: [226, 119, 40], // orange
                outline: {
                    color: [255, 255, 255], // white
                    width: 1
                }
            };

            var attributes28 = {
                Name: "Корпус №28", // The name of the
                Location: "Листенничная аллея, д19", // The owner of the
            };

            var popupTemplate28 = {
                title: "{Name}",
                content: "Адрес: <b>{Location}</b>.<br><br> 4. Объектно-ориентированный анализ и программирование"
            };

            var pointGraphic28 = new Graphic({
                geometry: point28,
                symbol: simpleMarkerSymbol28,
                attributes: attributes28,
                popupTemplate: popupTemplate28
            });

            graphicsLayer.add(pointGraphic28);

            //Подпись
            var textGraphic28 = new Graphic({
                geometry: {
                    type: "point",
                    longitude: 37.549462,
                    latitude: 55.835634
                },
                symbol: {
                    type: "text",
                    color: [25, 25, 25],
                    haloColor: [255, 255, 255],
                    haloSize: "1px",
                    text: "Корпус №28",
                    xoffset: 0,
                    yoffset: -25,
                    font: {
                        size: 12
                    }
                }
            });

            graphicsLayer.add(textGraphic28);


        } else if (day.toLowerCase() === "вторник") {

            //line 7to15
            var simpleLineSymbol_7to15 = {
                type: "simple-line",
                color: [226, 119, 40],
                style: "short-dash",
                width: 1
            };

            var polyline_7to15 = {
                type: "polyline",
                paths: [
                    [37.555041, 55.831967],
                    [37.55517, 55.832003],
                    [37.555309, 55.831873],
                    [37.55466, 55.831681],
                    [37.555229, 55.83106],
                    [37.554569, 55.830834],
                    [37.554778, 55.830524]
                ]
            };

            var polylineGraphic_7to15 = new Graphic({
                geometry: polyline_7to15,
                symbol: simpleLineSymbol_7to15
            });

            graphicsLayer.add(polylineGraphic_7to15);

            //line 15to28
            var simpleLineSymbol_15to28 = {
                type: "simple-line",
                color: [226, 119, 40],
                style: "short-dash",
                width: 1
            };

            var polyline_15to28 = {
                type: "polyline",
                paths: [
                    [37.554692, 55.830503],
                    [37.554435, 55.830786],
                    [37.554016, 55.83065],
                    [37.550476, 55.835483],
                    [37.549789, 55.83532],
                    [37.549596, 55.835543]
                ]
            };

            var polylineGraphic_15to28 = new Graphic({
                geometry: polyline_15to28,
                symbol: simpleLineSymbol_15to28
            });

            graphicsLayer.add(polylineGraphic_15to28);


            //15 Корпус - д4
            //Полигон
            var polygon15 = {
                type: "polygon",
                rings: [
                    [37.554517, 55.830064],
                    [37.554257, 55.830391],
                    [37.555263, 55.830629],
                    [37.55552, 55.830302],

                    [37.555346, 55.830257],
                    [37.555174, 55.830454],
                    [37.554584, 55.830307],
                    [37.554729, 55.830111],
                ]
            };

            var simpleFillSymbol15 = {
                type: "simple-fill",
                color: [202, 0, 2, 0.1], // green opacity 10%
                outline: {
                    color: [202, 0, 2],
                    width: 3
                }
            };

            var polygonGraphic15 = new Graphic({
                geometry: polygon15,
                symbol: simpleFillSymbol15
            });

            graphicsLayer.add(polygonGraphic15);

            //Точка
            var point15 = {
                type: "point",
                longitude: 37.554782,
                latitude: 55.830456
            };

            var simpleMarkerSymbol15 = {
                type: "simple-marker",
                color: [226, 119, 40], // orange
                outline: {
                    color: [255, 255, 255], // white
                    width: 1
                }
            };

            var attributes15 = {
                Name: "Корпус №15", // The name of the
                Location: "Листенничная аллея, д4", // The owner of the
            };

            var popupTemplate15 = {
                title: "{Name}",
                content: "Адрес: <b>{Location}</b>.<br><br> 1. Архитектура ВЭБ - приложений <br> 2. Управление ЖЦ ИС"
            };

            var pointGraphic15 = new Graphic({
                geometry: point15,
                symbol: simpleMarkerSymbol15,
                attributes: attributes15,
                popupTemplate: popupTemplate15
            });

            graphicsLayer.add(pointGraphic15);

            //Подпись
            var textGraphic15 = new Graphic({
                geometry: {
                    type: "point",
                    longitude: 37.554782,
                    latitude: 55.830456
                },
                symbol: {
                    type: "text",
                    color: [25, 25, 25],
                    haloColor: [255, 255, 255],
                    haloSize: "1px",
                    text: "Корпус №15",
                    xoffset: 0,
                    yoffset: -25,
                    font: {
                        size: 12
                    }
                }
            });

            graphicsLayer.add(textGraphic15);

            //28 Корпус - д19
            //Полигон
            var polygon28 = {
                type: "polygon",
                rings: [
                    [37.550049, 55.835688],
                    [37.549609, 55.836244],
                    [37.549405, 55.836198],
                    [37.549518, 55.836063],

                    [37.548778, 55.835873],
                    [37.549094, 55.835457],

                ]
            };

            var simpleFillSymbol28 = {
                type: "simple-fill",
                color: [202, 0, 2, 0.1], // green opacity 10%
                outline: {
                    color: [202, 0, 2],
                    width: 3
                }
            };

            var polygonGraphic28 = new Graphic({
                geometry: polygon28,
                symbol: simpleFillSymbol28
            });

            graphicsLayer.add(polygonGraphic28);

            //Точка
            var point28 = {
                type: "point",
                longitude: 37.549376,
                latitude: 55.835814
            };

            var simpleMarkerSymbol28 = {
                type: "simple-marker",
                color: [226, 119, 40], // orange
                outline: {
                    color: [255, 255, 255], // white
                    width: 1
                }
            };

            var attributes28 = {
                Name: "Корпус №28", // The name of the
                Location: "Листенничная аллея, д19", // The owner of the
            };

            var popupTemplate28 = {
                title: "{Name}",
                content: "Адрес: <b>{Location}</b>.<br><br> 3. Открытые системы"
            };

            var pointGraphic28 = new Graphic({
                geometry: point28,
                symbol: simpleMarkerSymbol28,
                attributes: attributes28,
                popupTemplate: popupTemplate28
            });

            graphicsLayer.add(pointGraphic28);

            //Подпись
            var textGraphic28 = new Graphic({
                geometry: {
                    type: "point",
                    longitude: 37.549462,
                    latitude: 55.835634
                },
                symbol: {
                    type: "text",
                    color: [25, 25, 25],
                    haloColor: [255, 255, 255],
                    haloSize: "1px",
                    text: "Корпус №28",
                    xoffset: 0,
                    yoffset: -25,
                    font: {
                        size: 12
                    }
                }
            });

            graphicsLayer.add(textGraphic28);

        } else if (day.toLowerCase() === "среда") {

            //line 7to15
            var simpleLineSymbol_7to15 = {
                type: "simple-line",
                color: [226, 119, 40],
                style: "short-dash",
                width: 1
            };

            var polyline_7to15 = {
                type: "polyline",
                paths: [
                    [37.555041, 55.831967],
                    [37.55517, 55.832003],
                    [37.555309, 55.831873],
                    [37.55466, 55.831681],
                    [37.555229, 55.83106],
                    [37.554569, 55.830834],
                    [37.554778, 55.830524]
                ]
            };

            var polylineGraphic_7to15 = new Graphic({
                geometry: polyline_7to15,
                symbol: simpleLineSymbol_7to15
            });

            graphicsLayer.add(polylineGraphic_7to15);

            //line 15to12
            var simpleLineSymbol_15to12 = {
                type: "simple-line",
                color: [226, 119, 40],
                style: "short-dash",
                width: 1
            };

            var polyline_15to12 = {
                type: "polyline",
                paths: [
                    [37.554692, 55.830503],
                    [37.554435, 55.830786],
                    [37.554016, 55.83065],
                    [37.552954, 55.832012],
                    [37.555572, 55.832681],
                    [37.555315, 55.833006],
                    [37.55495, 55.832952]
                ]
            };

            var polylineGraphic_15to12 = new Graphic({
                geometry: polyline_15to12,
                symbol: simpleLineSymbol_15to12
            });

            graphicsLayer.add(polylineGraphic_15to12);

            //12 Корпус - д2
            //Полигон
            var polygon12 = {
                type: "polygon",
                rings: [
                    [37.554856, 55.832706],
                    [37.555409, 55.832818],
                    [37.555328, 55.832923],
                    [37.555173, 55.832896],

                    [37.555189, 55.832869],
                    [37.554991, 55.832833],
                    [37.554685, 55.833297],
                    [37.554154, 55.833194],

                    [37.553971, 55.83348],
                    [37.554084, 55.833499],
                    [37.553993, 55.833616],
                    [37.553725, 55.833565],

                    [37.554073, 55.833047],
                    [37.554551, 55.833134],
                    [37.55462, 55.833035],

                    [37.554454, 55.832989],
                    [37.554384, 55.832887],
                    [37.554438, 55.832776],
                    [37.55462, 55.832709],
                    [37.554851, 55.832703],
                ]
            };

            var simpleFillSymbol12 = {
                type: "simple-fill",
                color: [202, 0, 2, 0.1], // green opacity 10%
                outline: {
                    color: [202, 0, 2],
                    width: 3
                }
            };

            var polygonGraphic12 = new Graphic({
                geometry: polygon12,
                symbol: simpleFillSymbol12
            });

            graphicsLayer.add(polygonGraphic12);

            //Точка
            var point12 = {
                type: "point",
                longitude: 37.55462,
                latitude: 55.83286
            };

            var simpleMarkerSymbol12 = {
                type: "simple-marker",
                color: [226, 119, 40], // orange
                outline: {
                    color: [255, 255, 255], // white
                    width: 1
                }
            };

            var attributes12 = {
                Name: "Корпус №12", // The name of the
                Location: "Листенничная аллея, д2", // The owner of the
            };

            var popupTemplate12 = {
                title: "{Name}",
                content: "Адрес: <b>{Location}</b>.<br><br> 3. Проектирование ИС"
            };

            var pointGraphic12 = new Graphic({
                geometry: point12,
                symbol: simpleMarkerSymbol12,
                attributes: attributes12,
                popupTemplate: popupTemplate12
            });

            graphicsLayer.add(pointGraphic12);

            //Подпись
            var textGraphic12 = new Graphic({
                geometry: {
                    type: "point",
                    longitude: 37.55462,
                    latitude: 55.83286
                },
                symbol: {
                    type: "text",
                    color: [25, 25, 25],
                    haloColor: [255, 255, 255],
                    haloSize: "1px",
                    text: "Корпус №12",
                    xoffset: 0,
                    yoffset: -25,
                    font: {
                        size: 12
                    }
                }
            });

            graphicsLayer.add(textGraphic12);

            //15 Корпус - д4
            //Полигон
            var polygon15 = {
                type: "polygon",
                rings: [
                    [37.554517, 55.830064],
                    [37.554257, 55.830391],
                    [37.555263, 55.830629],
                    [37.55552, 55.830302],

                    [37.555346, 55.830257],
                    [37.555174, 55.830454],
                    [37.554584, 55.830307],
                    [37.554729, 55.830111],
                ]
            };

            var simpleFillSymbol15 = {
                type: "simple-fill",
                color: [202, 0, 2, 0.1], // green opacity 10%
                outline: {
                    color: [202, 0, 2],
                    width: 3
                }
            };

            var polygonGraphic15 = new Graphic({
                geometry: polygon15,
                symbol: simpleFillSymbol15
            });

            graphicsLayer.add(polygonGraphic15);

            //Точка
            var point15 = {
                type: "point",
                longitude: 37.554782,
                latitude: 55.830456
            };

            var simpleMarkerSymbol15 = {
                type: "simple-marker",
                color: [226, 119, 40], // orange
                outline: {
                    color: [255, 255, 255], // white
                    width: 1
                }
            };

            var attributes15 = {
                Name: "Корпус №15", // The name of the
                Location: "Листенничная аллея, д4", // The owner of the
            };

            var popupTemplate15 = {
                title: "{Name}",
                content: "Адрес: <b>{Location}</b>.<br><br> 2. Проектирование ИС"
            };

            var pointGraphic15 = new Graphic({
                geometry: point15,
                symbol: simpleMarkerSymbol15,
                attributes: attributes15,
                popupTemplate: popupTemplate15
            });

            graphicsLayer.add(pointGraphic15);

            //Подпись
            var textGraphic15 = new Graphic({
                geometry: {
                    type: "point",
                    longitude: 37.554782,
                    latitude: 55.830456
                },
                symbol: {
                    type: "text",
                    color: [25, 25, 25],
                    haloColor: [255, 255, 255],
                    haloSize: "1px",
                    text: "Корпус №15",
                    xoffset: 0,
                    yoffset: -25,
                    font: {
                        size: 12
                    }
                }
            });

            graphicsLayer.add(textGraphic15);
        } else if (day.toLowerCase() === "четверг") {
            //line 7to15
            var simpleLineSymbol_7to15 = {
                type: "simple-line",
                color: [226, 119, 40],
                style: "short-dash",
                width: 1
            };

            var polyline_7to15 = {
                type: "polyline",
                paths: [
                    [37.555041, 55.831967],
                    [37.55517, 55.832003],
                    [37.555309, 55.831873],
                    [37.55466, 55.831681],
                    [37.555229, 55.83106],
                    [37.554569, 55.830834],
                    [37.554778, 55.830524]
                ]
            };

            var polylineGraphic_7to15 = new Graphic({
                geometry: polyline_7to15,
                symbol: simpleLineSymbol_7to15
            });

            graphicsLayer.add(polylineGraphic_7to15);

            //line 15to28
            var simpleLineSymbol_15to28 = {
                type: "simple-line",
                color: [226, 119, 40],
                style: "short-dash",
                width: 1
            };

            var polyline_15to28 = {
                type: "polyline",
                paths: [
                    [37.554692, 55.830503],
                    [37.554435, 55.830786],
                    [37.554016, 55.83065],
                    [37.550476, 55.835483],
                    [37.549789, 55.83532],
                    [37.549596, 55.835543]
                ]
            };

            var polylineGraphic_15to28 = new Graphic({
                geometry: polyline_15to28,
                symbol: simpleLineSymbol_15to28
            });

            graphicsLayer.add(polylineGraphic_15to28);
            //28 Корпус - д19
            //Полигон
            var polygon28 = {
                type: "polygon",
                rings: [
                    [37.550049, 55.835688],
                    [37.549609, 55.836244],
                    [37.549405, 55.836198],
                    [37.549518, 55.836063],

                    [37.548778, 55.835873],
                    [37.549094, 55.835457],

                ]
            };

            var simpleFillSymbol28 = {
                type: "simple-fill",
                color: [202, 0, 2, 0.1], // green opacity 10%
                outline: {
                    color: [202, 0, 2],
                    width: 3
                }
            };

            var polygonGraphic28 = new Graphic({
                geometry: polygon28,
                symbol: simpleFillSymbol28
            });

            graphicsLayer.add(polygonGraphic28);

            //Точка
            var point28 = {
                type: "point",
                longitude: 37.549376,
                latitude: 55.835814
            };

            var simpleMarkerSymbol28 = {
                type: "simple-marker",
                color: [226, 119, 40], // orange
                outline: {
                    color: [255, 255, 255], // white
                    width: 1
                }
            };

            var attributes28 = {
                Name: "Корпус №28", // The name of the
                Location: "Листенничная аллея, д19", // The owner of the
            };

            var popupTemplate28 = {
                title: "{Name}",
                content: "Адрес: <b>{Location}</b>.<br><br> 2. Объектно-ориентированный анализ и программирование"
            };

            var pointGraphic28 = new Graphic({
                geometry: point28,
                symbol: simpleMarkerSymbol28,
                attributes: attributes28,
                popupTemplate: popupTemplate28
            });

            graphicsLayer.add(pointGraphic28);

            //Подпись
            var textGraphic28 = new Graphic({
                geometry: {
                    type: "point",
                    longitude: 37.549462,
                    latitude: 55.835634
                },
                symbol: {
                    type: "text",
                    color: [25, 25, 25],
                    haloColor: [255, 255, 255],
                    haloSize: "1px",
                    text: "Корпус №28",
                    xoffset: 0,
                    yoffset: -25,
                    font: {
                        size: 12
                    }
                }
            });

            graphicsLayer.add(textGraphic28);

            //15 Корпус - д4
            //Полигон
            var polygon15 = {
                type: "polygon",
                rings: [
                    [37.554517, 55.830064],
                    [37.554257, 55.830391],
                    [37.555263, 55.830629],
                    [37.55552, 55.830302],

                    [37.555346, 55.830257],
                    [37.555174, 55.830454],
                    [37.554584, 55.830307],
                    [37.554729, 55.830111],
                ]
            };

            var simpleFillSymbol15 = {
                type: "simple-fill",
                color: [202, 0, 2, 0.1], // green opacity 10%
                outline: {
                    color: [202, 0, 2],
                    width: 3
                }
            };

            var polygonGraphic15 = new Graphic({
                geometry: polygon15,
                symbol: simpleFillSymbol15
            });

            graphicsLayer.add(polygonGraphic15);

            //Точка
            var point15 = {
                type: "point",
                longitude: 37.554782,
                latitude: 55.830456
            };

            var simpleMarkerSymbol15 = {
                type: "simple-marker",
                color: [226, 119, 40], // orange
                outline: {
                    color: [255, 255, 255], // white
                    width: 1
                }
            };

            var attributes15 = {
                Name: "Корпус №15", // The name of the
                Location: "Листенничная аллея, д4", // The owner of the
            };

            var popupTemplate15 = {
                title: "{Name}",
                content: "Адрес: <b>{Location}</b>.<br><br> 1. СППР"
            };

            var pointGraphic15 = new Graphic({
                geometry: point15,
                symbol: simpleMarkerSymbol15,
                attributes: attributes15,
                popupTemplate: popupTemplate15
            });

            graphicsLayer.add(pointGraphic15);

            //Подпись
            var textGraphic15 = new Graphic({
                geometry: {
                    type: "point",
                    longitude: 37.554782,
                    latitude: 55.830456
                },
                symbol: {
                    type: "text",
                    color: [25, 25, 25],
                    haloColor: [255, 255, 255],
                    haloSize: "1px",
                    text: "Корпус №15",
                    xoffset: 0,
                    yoffset: -25,
                    font: {
                        size: 12
                    }
                }
            });

            graphicsLayer.add(textGraphic15);

        } else if (day.toLowerCase() === "пятница") {
            //line 7to15
            var simpleLineSymbol_7to15 = {
                type: "simple-line",
                color: [226, 119, 40],
                style: "short-dash",
                width: 1
            };

            var polyline_7to15 = {
                type: "polyline",
                paths: [
                    [37.555041, 55.831967],
                    [37.55517, 55.832003],
                    [37.555309, 55.831873],
                    [37.55466, 55.831681],
                    [37.555229, 55.83106],
                    [37.554569, 55.830834],
                    [37.554778, 55.830524]
                ]
            };

            var polylineGraphic_7to15 = new Graphic({
                geometry: polyline_7to15,
                symbol: simpleLineSymbol_7to15
            });

            graphicsLayer.add(polylineGraphic_7to15);

            //line 15to12
            var simpleLineSymbol_15to12 = {
                type: "simple-line",
                color: [226, 119, 40],
                style: "short-dash",
                width: 1
            };

            var polyline_15to12 = {
                type: "polyline",
                paths: [
                    [37.554692, 55.830503],
                    [37.554435, 55.830786],
                    [37.554016, 55.83065],
                    [37.552954, 55.832012],
                    [37.555572, 55.832681],
                    [37.555315, 55.833006],
                    [37.55495, 55.832952]
                ]
            };

            var polylineGraphic_15to12 = new Graphic({
                geometry: polyline_15to12,
                symbol: simpleLineSymbol_15to12
            });

            graphicsLayer.add(polylineGraphic_15to12);

            //12 Корпус - д2
            //Полигон
            var polygon12 = {
                type: "polygon",
                rings: [
                    [37.554856, 55.832706],
                    [37.555409, 55.832818],
                    [37.555328, 55.832923],
                    [37.555173, 55.832896],

                    [37.555189, 55.832869],
                    [37.554991, 55.832833],
                    [37.554685, 55.833297],
                    [37.554154, 55.833194],

                    [37.553971, 55.83348],
                    [37.554084, 55.833499],
                    [37.553993, 55.833616],
                    [37.553725, 55.833565],

                    [37.554073, 55.833047],
                    [37.554551, 55.833134],
                    [37.55462, 55.833035],

                    [37.554454, 55.832989],
                    [37.554384, 55.832887],
                    [37.554438, 55.832776],
                    [37.55462, 55.832709],
                    [37.554851, 55.832703],
                ]
            };

            var simpleFillSymbol12 = {
                type: "simple-fill",
                color: [202, 0, 2, 0.1], // green opacity 10%
                outline: {
                    color: [202, 0, 2],
                    width: 3
                }
            };

            var polygonGraphic12 = new Graphic({
                geometry: polygon12,
                symbol: simpleFillSymbol12
            });

            graphicsLayer.add(polygonGraphic12);

            //Точка
            var point12 = {
                type: "point",
                longitude: 37.55462,
                latitude: 55.83286
            };

            var simpleMarkerSymbol12 = {
                type: "simple-marker",
                color: [226, 119, 40], // orange
                outline: {
                    color: [255, 255, 255], // white
                    width: 1
                }
            };

            var attributes12 = {
                Name: "Корпус №12", // The name of the
                Location: "Листенничная аллея, д2", // The owner of the
            };

            var popupTemplate12 = {
                title: "{Name}",
                content: "Адрес: <b>{Location}</b>.<br><br> 2. Управление ИТ-сервисом и контентом"
            };

            var pointGraphic12 = new Graphic({
                geometry: point12,
                symbol: simpleMarkerSymbol12,
                attributes: attributes12,
                popupTemplate: popupTemplate12
            });

            graphicsLayer.add(pointGraphic12);

            //Подпись
            var textGraphic12 = new Graphic({
                geometry: {
                    type: "point",
                    longitude: 37.55462,
                    latitude: 55.83286
                },
                symbol: {
                    type: "text",
                    color: [25, 25, 25],
                    haloColor: [255, 255, 255],
                    haloSize: "1px",
                    text: "Корпус №12",
                    xoffset: 0,
                    yoffset: -25,
                    font: {
                        size: 12
                    }
                }
            });

            graphicsLayer.add(textGraphic12);

            //15 Корпус - д4
            //Полигон
            var polygon15 = {
                type: "polygon",
                rings: [
                    [37.554517, 55.830064],
                    [37.554257, 55.830391],
                    [37.555263, 55.830629],
                    [37.55552, 55.830302],

                    [37.555346, 55.830257],
                    [37.555174, 55.830454],
                    [37.554584, 55.830307],
                    [37.554729, 55.830111],
                ]
            };

            var simpleFillSymbol15 = {
                type: "simple-fill",
                color: [202, 0, 2, 0.1], // green opacity 10%
                outline: {
                    color: [202, 0, 2],
                    width: 3
                }
            };

            var polygonGraphic15 = new Graphic({
                geometry: polygon15,
                symbol: simpleFillSymbol15
            });

            graphicsLayer.add(polygonGraphic15);

            //Точка
            var point15 = {
                type: "point",
                longitude: 37.554782,
                latitude: 55.830456
            };

            var simpleMarkerSymbol15 = {
                type: "simple-marker",
                color: [226, 119, 40], // orange
                outline: {
                    color: [255, 255, 255], // white
                    width: 1
                }
            };

            var attributes15 = {
                Name: "Корпус №15", // The name of the
                Location: "Листенничная аллея, д4", // The owner of the
            };

            var popupTemplate15 = {
                title: "{Name}",
                content: "Адрес: <b>{Location}</b>.<br><br> 3. Электронная коммерция"
            };

            var pointGraphic15 = new Graphic({
                geometry: point15,
                symbol: simpleMarkerSymbol15,
                attributes: attributes15,
                popupTemplate: popupTemplate15
            });

            graphicsLayer.add(pointGraphic15);

            //Подпись
            var textGraphic15 = new Graphic({
                geometry: {
                    type: "point",
                    longitude: 37.554782,
                    latitude: 55.830456
                },
                symbol: {
                    type: "text",
                    color: [25, 25, 25],
                    haloColor: [255, 255, 255],
                    haloSize: "1px",
                    text: "Корпус №15",
                    xoffset: 0,
                    yoffset: -25,
                    font: {
                        size: 12
                    }
                }
            });

            graphicsLayer.add(textGraphic15);
        }
    });
    //===========================
    //Конец скрипта ArcGis
    //============================
});