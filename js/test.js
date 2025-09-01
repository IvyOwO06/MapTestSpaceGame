fetch("json/planetData.json")
    .then((response) => response.json())
    .then((data) => {
        console.log("Data loaded successfully:", data);

        const canvas = document.getElementById("mapCanvas");
        const ctx = canvas.getContext("2d");
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        let mapScale = 1.6;
        const minScale = 0.1;
        const maxScale = 5;
        let panX = 0,
            panY = 0;
        let isDragging = false;
        let startX, startY;

        // 🔥 Center on "The Citadel"

        function getColorFromSpice(spice) {
            const spiceColors = {
                Red: "#FF0000",
                Blue: "#0000FF",
                Green: "#00FF00",
                Yellow: "#FFFF00",
                Purple: "#800080",
                Orange: "#FFA500",
                Black: "#000000",
                White: "#FFFFFF",
            };
            return spiceColors[spice] || "#808080";
        }

        function getColorFromSecurity(security) {
            const securityColors = {
                Core: "#21cb21",
                Secure: "#217ccb",
                Wild: "#a820cb",
                Contested: "#cb6c20",
                Unsecure: "#cb2020",
            };
            return securityColors[security] || "#808080";
        }

        function getColorFromSpectralClass(spectralClass) {
            const spectralColors = {
                K: "#ffaa00",
                M: "#ff0000",
                B: "#00aaff",
                F: "#ffffcc",
                A: "#00ffff",
                G: "#ffff00",
            };
            return spectralColors[spectralClass] || "#808080";
        }

        // Precompute positions of planets to optimize drawing
        const positions = {}; // Store precomputed positions
        function updatePlanetPositions() {
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;

            Object.keys(data).forEach((key) => {
                const planet = data[key];
                const [x, y] = planet.position;

                // Translate to center, rotate, and translate back
                const shiftedX = x - centerX;
                const shiftedY = y - centerY;

                // const rotatedX = -shiftedY;
                // const rotatedY = shiftedX;

                positions[key] = {
                    scaledX: shiftedX * mapScale + panX,
                    scaledY: shiftedY * mapScale + panY,
                };
            });
        }

        const citadel = data["The Citadel"];
        if (citadel) {
            const [citadelX, citadelY] = citadel.position;

            // Apply the same 90-degree rotation
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;

            const shiftedX = citadelX - centerX;
            const shiftedY = citadelY - centerY;
            

            // Center on the rotated Citadel position
            panX = canvas.width / 2 - shiftedX * mapScale;
            panY = canvas.height / 2 - shiftedY * mapScale;
        } else {
            console.error("The Citadel not found in data!");
            panX = canvas.width / 2;
            panY = canvas.height / 2;
        }

        function drawMap() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // 🟢 Draw connections first
            ctx.strokeStyle = "#37ff1430"; // Neon Green for better visibility
            ctx.lineWidth = 1;
            ctx.beginPath();

            Object.keys(data).forEach((key) => {
                const planet = data[key];
                if (!planet.links) return;

                const { scaledX, scaledY } = positions[key];

                planet.links.forEach((linkName) => {
                    if (positions[linkName]) {
                        const { scaledX: linkedX, scaledY: linkedY } =
                            positions[linkName];
                        ctx.moveTo(scaledX, scaledY);
                        ctx.lineTo(linkedX, linkedY);
                    }
                });
            });

            ctx.stroke(); // Draw all connections at once

            // 🔵 Draw planets
            const securityChecked =
                document.getElementById("securityStatus").checked;
            const spectralChecked =
                document.getElementById("SpectralClass").checked;
            const spiceChecked = document.getElementById("spiceColor").checked;

            Object.keys(data).forEach((key) => {
                const planet = data[key];
                const { scaledX, scaledY } = positions[key];

                const baseRadius = 8;
                const planetRadius = baseRadius * mapScale;

                // ✅ Set color based on selected filter
                if (securityChecked) {
                    ctx.fillStyle = getColorFromSecurity(planet.security);
                } else if (spectralChecked) {
                    ctx.fillStyle = getColorFromSpectralClass(
                        planet.spectralClass
                    );
                } else if (spiceChecked) {
                    ctx.fillStyle = getColorFromSpice(planet.spice);
                } else {
                    ctx.fillStyle = "gray";
                }

                // 🔥 Highlight "The Citadel" in GOLD
                if (planet.name === "The Citadel") {
                    ctx.fillStyle = "gold";
                }

                ctx.beginPath();
                ctx.arc(scaledX, scaledY, planetRadius, 0, Math.PI * 2);
                ctx.fill();

                // Draw planet name
                if (mapScale > 0.7) {
                    ctx.fillStyle = "white";
                    ctx.font = `${10 * mapScale}px Arial`;
                    ctx.textAlign = "center";
                    ctx.textBaseline = "top";
                    ctx.fillText(planet.name, scaledX, scaledY + 10 * mapScale);
                }
            });
        }

        // Request animation frame for smoother rendering
        let animationFrame;
        function requestDraw() {
            if (!animationFrame) {
                animationFrame = requestAnimationFrame(() => {
                    updatePlanetPositions(); // Update planet positions
                    drawMap();
                    animationFrame = null;
                });
            }
        }

        // Draw initial map
        updatePlanetPositions();
        drawMap();

        // ✅ Move this inside .then()
        document
            .querySelectorAll('input[name="planetFilter"]')
            .forEach((radio) => {
                radio.addEventListener("change", () => {
                    console.log("Radio button changed:", radio.id);
                    requestDraw(); // Smooth redraw when filter changes
                });
            });

// Planet clicking functionality
canvas.addEventListener("click", (e) => {
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    console.log("Click position:", clickX, clickY);

    Object.keys(positions).forEach((key) => {
        const { scaledX, scaledY } = positions[key];
        const planet = data[key];
        const baseRadius = 8;
        const planetRadius = baseRadius * mapScale;

        const distance = Math.sqrt(Math.pow(clickX - scaledX, 2) + Math.pow(clickY - scaledY, 2));

        if (distance <= planetRadius) {
            console.log("Planet selected:", key);
            PlanetSelected(key, data);
        }
    });
});

// Function to display planet information and center the map
function PlanetSelected(key, data) {
    const planetInfo = data[key];
    console.log("Planet Info: ", planetInfo);

    const { scaledX, scaledY } = positions[key];
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    panX += (centerX - scaledX);
    panY += (centerY - scaledY);

    requestDraw();

    displayPlanetInfo(planetInfo);
}

// Placeholder for displaying planet info
function displayPlanetInfo(planetInfo) {
    const infoDiv = document.getElementById("planetInfo");
    if (infoDiv) {
        infoDiv.innerHTML = `
            <h3>${planetInfo.name}</h3>
            <p>Security: ${planetInfo.security || 'N/A'}</p>
            <p>Spice: ${planetInfo.spice || 'N/A'}</p>
            <p>Spectral Class: ${planetInfo.spectralClass || 'N/A'}</p>
        `;
    } else {
        console.log("Planet Info Display: ", planetInfo);
    }
}




        // 🎮 Dragging
        canvas.addEventListener("mousedown", (e) => {
            isDragging = true;
            startX = e.clientX - panX;
            startY = e.clientY - panY;
        });

        canvas.addEventListener("mousemove", (e) => {
            if (isDragging) {
                panX = e.clientX - startX;
                panY = e.clientY - startY;
                requestDraw(); // Smooth redraw on dragging
            }
        });

        canvas.addEventListener("mouseup", () => {
            isDragging = false;
        });
        canvas.addEventListener("mouseleave", () => {
            isDragging = false;
        });

        // 📱 Touch Support
        canvas.addEventListener("touchstart", (e) => {
            isDragging = true;
            const touch = e.touches[0];
            startX = touch.clientX - panX;
            startY = touch.clientY - panY;
        });

        canvas.addEventListener("touchmove", (e) => {
            if (isDragging) {
                const touch = e.touches[0];
                panX = touch.clientX - startX;
                panY = touch.clientY - startY;
                requestDraw(); // Smooth redraw on touch move
            }
        });

        canvas.addEventListener("touchend", () => {
            isDragging = false;
        });

        // 🌀 Zooming with Mouse Wheel
        canvas.addEventListener("wheel", (e) => {
            e.preventDefault();

            const zoomFactor = 0.1;
            const zoomIn = e.deltaY < 0;
            const zoomOut = e.deltaY > 0;

            const mouseX = e.clientX - canvas.getBoundingClientRect().left;
            const mouseY = e.clientY - canvas.getBoundingClientRect().top;

            const zoomFactorX = (mouseX - panX) / mapScale;
            const zoomFactorY = (mouseY - panY) / mapScale;

            if (zoomIn) {
                mapScale = Math.min(mapScale + zoomFactor, maxScale);
            } else if (zoomOut) {
                mapScale = Math.max(mapScale - zoomFactor, minScale);
            }

            panX = mouseX - zoomFactorX * mapScale;
            panY = mouseY - zoomFactorY * mapScale;

            requestDraw(); // Smooth redraw on zooming
        });
    })

    .catch((error) => console.error("Error loading the JSON:", error));

function autocomplete(inp, arr) {
    var currentFocus;
    inp.addEventListener("input", function (e) {
        var a,
            b,
            i,
            val = this.value;
        closeAllLists();
        if (!val) return false;
        currentFocus = -1;

        a = document.createElement("DIV");
        a.setAttribute("id", this.id + "autocomplete-list");
        a.setAttribute("class", "autocomplete-items");
        this.parentNode.appendChild(a);

        for (i = 0; i < arr.length; i++) {
            if (
                arr[i].substr(0, val.length).toUpperCase() === val.toUpperCase()
            ) {
                b = document.createElement("DIV");
                b.innerHTML =
                    "<strong>" + arr[i].substr(0, val.length) + "</strong>";
                b.innerHTML += arr[i].substr(val.length);
                b.innerHTML += "<input type='hidden' value='" + arr[i] + "'>";

                b.addEventListener("click", function (e) {
                    inp.value = this.getElementsByTagName("input")[0].value;
                    closeAllLists();
                });

                a.appendChild(b);
            }
        }
    });

    inp.addEventListener("keydown", function (e) {
        var x = document.getElementById(this.id + "autocomplete-list");
        if (x) x = x.getElementsByTagName("div");

        if (e.keyCode == 40) {
            // Arrow Down
            currentFocus++;
            addActive(x);
        } else if (e.keyCode == 38) {
            // Arrow Up
            currentFocus--;
            addActive(x);
        } else if (e.keyCode == 13) {
            // Enter
            e.preventDefault();
            if (currentFocus > -1) {
                if (x) x[currentFocus].click();
            }
        }
    });

    function addActive(x) {
        if (!x) return false;
        removeActive(x);
        if (currentFocus >= x.length) currentFocus = 0;
        if (currentFocus < 0) currentFocus = x.length - 1;
        x[currentFocus].classList.add("autocomplete-active");
    }

    function removeActive(x) {
        for (var i = 0; i < x.length; i++) {
            x[i].classList.remove("autocomplete-active");
        }
    }

    function closeAllLists(elmnt) {
        var x = document.getElementsByClassName("autocomplete-items");
        for (var i = 0; i < x.length; i++) {
            if (elmnt !== x[i] && elmnt !== inp) {
                x[i].parentNode.removeChild(x[i]);
            }
        }
    }

    document.addEventListener("click", function (e) {
        closeAllLists(e.target);
    });
}

// ✅ Wait until data is loaded
fetch("json/planetData.json")
    .then((response) => response.json())
    .then((data) => {
        console.log("Data loaded successfully:", data);
        var planetNames = Object.keys(data);
        autocomplete(document.getElementById("systemSearch"), planetNames);
        const canvas = document.getElementById("mapCanvas");
        const ctx = canvas.getContext("2d");
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        let mapScale = 1.6;
        function getColorFromSpice(spice) {
            const spiceColors = {
                Red: "#FF0000",
                Blue: "#0000FF",
                Green: "#00FF00",
                Yellow: "#FFFF00",
                Purple: "#800080",
                Orange: "#FFA500",
                Black: "#000000",
                White: "#FFFFFF",
            };
            return spiceColors[spice] || "#808080";
        }

        function getColorFromSecurity(security) {
            const securityColors = {
                Core: "#21cb21",
                Secure: "#217ccb",
                Wild: "#a820cb",
                Contested: "#cb6c20",
                Unsecure: "#cb2020",
            };
            return securityColors[security] || "#808080";
        }

        function getColorFromSpectralClass(spectralClass) {
            const spectralColors = {
                K: "#ffaa00",
                M: "#ff0000",
                B: "#00aaff",
                F: "#ffffcc",
                A: "#00ffff",
                G: "#ffff00",
            };
            return spectralColors[spectralClass] || "#808080";
        }
        function drawMap() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // 🟢 Draw connections first
            ctx.strokeStyle = "#37ff1430"; // Neon Green for better visibility
            ctx.lineWidth = 1;
            ctx.beginPath();

            Object.keys(data).forEach((key) => {
                const planet = data[key];
                if (!planet.links) return;

                const { scaledX, scaledY } = positions[key];

                planet.links.forEach((linkName) => {
                    if (positions[linkName]) {
                        const { scaledX: linkedX, scaledY: linkedY } =
                            positions[linkName];
                        ctx.moveTo(scaledX, scaledY);
                        ctx.lineTo(linkedX, linkedY);
                    }
                });
            });

            ctx.stroke(); // Draw all connections at once

            // 🔵 Draw planets
            const securityChecked =
                document.getElementById("securityStatus").checked;
            const spectralChecked =
                document.getElementById("SpectralClass").checked;
            const spiceChecked = document.getElementById("spiceColor").checked;

            Object.keys(data).forEach((key) => {
                const planet = data[key];
                const { scaledX, scaledY } = positions[key];

                const baseRadius = 8;
                const planetRadius = baseRadius * mapScale;

                // ✅ Set color based on selected filter
                if (securityChecked) {
                    ctx.fillStyle = getColorFromSecurity(planet.security);
                } else if (spectralChecked) {
                    ctx.fillStyle = getColorFromSpectralClass(
                        planet.spectralClass
                    );
                } else if (spiceChecked) {
                    ctx.fillStyle = getColorFromSpice(planet.spice);
                } else {
                    ctx.fillStyle = "gray";
                }

                // 🔥 Highlight "The Citadel" in GOLD
                if (planet.name === "The Citadel") {
                    ctx.fillStyle = "gold";
                }

                ctx.beginPath();
                ctx.arc(scaledX, scaledY, planetRadius, 0, Math.PI * 2);
                ctx.fill();

                // Draw planet name
                if (mapScale > 0.7) {
                    ctx.fillStyle = "white";
                    ctx.font = `${10 * mapScale}px Arial`;
                    ctx.textAlign = "center";
                    ctx.textBaseline = "top";
                    ctx.fillText(planet.name, scaledX, scaledY + 10 * mapScale);
                }
            });
        }
        let animationFrame;
        function requestDraw() {
            if (!animationFrame) {
                animationFrame = requestAnimationFrame(() => {
                    updatePlanetPositions(); // Update planet positions
                    drawMap();
                    animationFrame = null;
                });
            }
        }
        const positions = {}; // Store precomputed positions
        function updatePlanetPositions() {
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;

            Object.keys(data).forEach((key) => {
                const planet = data[key];
                const [x, y] = planet.position;

                // Translate to center, rotate, and translate back
                const shiftedX = x - centerX;
                const shiftedY = y - centerY;

                // const rotatedX = -shiftedY;
                // const rotatedY = shiftedX;

                positions[key] = {
                    scaledX: shiftedX * mapScale + panX,
                    scaledY: shiftedY * mapScale + panY,
                };
            });
        }

        // ✅ Function to center the map on a selected planet
        function centerOnPlanet(planetName) {
            const planet = data[planetName]; // ✅ Corrected data access

            if (planet) {
                const [planetX, planetY] = planet.position;

                console.log(
                    `Centering on ${planetName}: (${planetX}, ${planetY})`
                );


                // ✅ Center the view
                panX = canvas.width / 2 - planetX * mapScale;
                panY = canvas.height / 2 - planetY * mapScale;

                console.log(`New pan values: panX=${panX}, panY=${panY}`);

                requestDraw(); // ✅ Redraw the map after centering
            } else {
                console.error(`Planet "${planetName}" not found in data!`);
            }
        }

        // ✅ Add event listener AFTER data is loaded
        document
            .getElementById("systemSearch")
            .addEventListener("change", function () {
                const selectedPlanet = this.value.trim(); // Get input value
                if (selectedPlanet) {
                    centerOnPlanet(selectedPlanet);
                }
            });


            // json file changer for map rotation
            document.getElementById("myfile").addEventListener("change", function(event) {    
                const file = event.target.files[0];  // Get the first selected file
                if (file.type == "application/json") {
                    console.log("File Name:", file.name);
                    console.log("File Type:", file.type);
                    console.log("File Size:", file.size, "bytes");
            
                    const reader = new FileReader();  // FileReader allows us to read files
            
                    reader.onload = function(e) {
                        // Once the file is loaded, we can parse the content as JSON
                        try {
                            const jsonData = JSON.parse(e.target.result);  // Parse the JSON data
                            console.log("Original JSON Data:", jsonData);
            
                            // Loop through all planets and modify only the positions
                            const centerX = canvas.width / 2;
                            const centerY = canvas.height / 2;
            
                            Object.keys(jsonData).forEach((key) => {
                                const planet = jsonData[key];  // Access planet data from jsonData
                                const [x, y] = planet.position;  // Destructure position array
            
                                // Log the original coordinates
                                console.log(`${key} Original Coordinates: x = ${x}, y = ${y}`);
                                
                                const [keyX, keyY] = planetInfo.position; 
                                // ✅ Update the camera (center on the planet)
                                panX = canvas.width / 2 - keyX * mapScale;
                                panY = canvas.height / 2 - keyY * mapScale;
                                requestDraw(); // ✅ Redraw the map after updating position
            
                                // Log the new transformed coordinates
                                console.log(`${key} Transformed Coordinates: scaledX = ${planet.position[0]}, scaledY = ${planet.position[1]}`);
                            });
            
                            // Convert the updated data back to a JSON string
                            const updatedJson = JSON.stringify(jsonData, null, 2); // `null, 2` for pretty-printing
            
                            // Create a Blob from the updated JSON string
                            const blob = new Blob([updatedJson], { type: "application/json" });
            
                            // Create a download link for the new JSON file
                            const link = document.createElement("a");
                            link.href = URL.createObjectURL(blob);
                            link.download = "planetData.json";  // Set the name for the new file
                            link.click();  // Trigger the download
            
                            console.log("New JSON file with updated coordinates is ready for download.");
            
                        } catch (error) {
                            console.error("Error parsing JSON:", error);
                        }
                    };
            
                    reader.readAsText(file);  // Read the file as text (useful for JSON files)
                } else {
                    console.log("Please select a valid JSON file.");
                }
            });
            
    })
    .catch((error) => console.error("Error loading the JSON:", error));
