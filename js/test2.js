// Utility to fetch JSON systemData (unchanged)
async function fetchData(url) {
    try {
        const response = await fetch(url);
        return await response.json();
    } catch (error) {
        console.error("Error loading JSON:", error);
        return null;
    }
}

// Color mapping functions (unchanged)
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

// Canvas setup and state (unchanged)
function initializeCanvas() {
    const canvas = document.getElementById("mapCanvas");
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    return { canvas, ctx };
}

// Update planet positions (unchanged)
function updatePlanetPositions(systemData, canvas, mapScale, panX, panY) {
    const positions = {};
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    Object.keys(systemData).forEach((key) => {
        const planet = systemData[key];
        const [x, y] = planet.position;
        const shiftedX = x - centerX;
        const shiftedY = y - centerY;
        positions[key] = {
            scaledX: shiftedX * mapScale + panX,
            scaledY: shiftedY * mapScale + panY,
        };
    });
    return positions;
}

// Draw the map with selected planet highlight
function drawMap(ctx, systemData, positions, mapScale, selectedPlanet) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Draw connections
    ctx.strokeStyle = "#37ff1430";
    ctx.lineWidth = 1;
    ctx.beginPath();
    Object.keys(systemData).forEach((key) => {
        const planet = systemData[key];
        if (!planet.links) return;
        const { scaledX, scaledY } = positions[key];
        planet.links.forEach((linkName) => {
            if (positions[linkName]) {
                const { scaledX: linkedX, scaledY: linkedY } = positions[linkName];
                ctx.moveTo(scaledX, scaledY);
                ctx.lineTo(linkedX, linkedY);
            }
        });
    });
    ctx.stroke();

    // Draw connections only for the selected planet using markData
    ctx.strokeStyle = "white"; // Bright green for visibility (remove transparency for clarity)
    ctx.lineWidth = 1;
    ctx.beginPath();

    if (selectedPlanet && window.markData) {
        // Find the mark entry that includes the selected planet
        Object.values(window.markData).forEach((mark) => {
            const systems = mark.systems;
            if (systems.includes(selectedPlanet)) {
                // Draw lines between all systems in this mark entry
                systems.forEach((systemA) => {
                    systems.forEach((systemB) => {
                        if (systemA !== systemB && positions[systemA] && positions[systemB]) {
                            const { scaledX: xA, scaledY: yA } = positions[systemA];
                            const { scaledX: xB, scaledY: yB } = positions[systemB];
                            ctx.moveTo(xA, yA);
                            ctx.lineTo(xB, yB);
                            
                        }
                    });
                });
            }
        });
    }
    ctx.stroke();

    // Draw planets
    const securityChecked = document.getElementById("securityStatus").checked;
    const spectralChecked = document.getElementById("SpectralClass").checked;
    const spiceChecked = document.getElementById("spiceColor").checked;

    Object.keys(systemData).forEach((key) => {
        const planet = systemData[key];
        const { scaledX, scaledY } = positions[key];
        const baseRadius = 8;
        const planetRadius = baseRadius * mapScale;

        ctx.fillStyle = securityChecked ? getColorFromSecurity(planet.security) :
                        spectralChecked ? getColorFromSpectralClass(planet.spectralClass) :
                        spiceChecked ? getColorFromSpice(planet.spice) : "gray";
        if (planet.name === "The Citadel") ctx.fillStyle = "gold";

        ctx.beginPath();
        ctx.arc(scaledX, scaledY, planetRadius, 0, Math.PI * 2);
        ctx.fill();

        // Highlight selected planet with a circle
        if (selectedPlanet && key === selectedPlanet) {
            ctx.strokeStyle = "white";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(scaledX, scaledY, planetRadius + 4 * mapScale, 0, Math.PI * 2);
            ctx.stroke();
        }

        if (mapScale > 0.7) {
            ctx.fillStyle = "white";
            ctx.font = `${10 * mapScale}px Arial`;
            ctx.textAlign = "center";
            ctx.textBaseline = "top";
            ctx.fillText(planet.name, scaledX, scaledY + 10 * mapScale);
        }
    });
}

// Smooth redraw with animation frame
function requestDraw(updatePositions, draw) {
    let animationFrame;
    return function (selectedPlanet) {
        if (!animationFrame) {
            animationFrame = requestAnimationFrame(() => {
                updatePositions();
                draw(selectedPlanet);
                animationFrame = null;
            });
        }
    };
}

// Center map on a planet (unchanged)
function centerOnPlanet(planetName, systemData, canvas, mapScale) {
    const planet = systemData[planetName];
    if (planet) {
        const [planetX, planetY] = planet.position;
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        return {
            panX: centerX - (planetX - centerX) * mapScale,
            panY: centerY - (planetY - centerY) * mapScale,
        };
    } else {
        console.error(`Planet "${planetName}" not found in systemData!`);
        return null;
    }
}

// Display planet info
function displayPlanetInfo(planetInfo) {
    const infoDiv = document.getElementById("planetInfo");
    if (infoDiv) {
        infoDiv.innerHTML = `
            
                <h3>${planetInfo.name}</h3>
                <p>Security: ${planetInfo.security || 'N/A'}</p>
                <p>Spice: ${planetInfo.spice || 'N/A'}</p>
                <p>Spectral Class: ${planetInfo.spectralClass || 'N/A'}</p>
                <p>Region: ${planetInfo.region || 'N/A'}</p>
                <p>Sector: ${planetInfo.sector || 'N/A'}</p>
                <p>Faction: ${planetInfo.faction || 'N/A'}</p>
                <p>Id: ${planetInfo.id || 'N/A'}</p>
                <button class="closeButton" onclick="document.getElementById('planetInfo').innerHTML = ''; window.setSelectedPlanet(null); window.redraw(null);">✖</button>
            
        `;
    } else {
        console.log("Planet Info Display: ", planetInfo);
    }
}

// Main application setup
async function setupApplication() {
    const systemData = await fetchData("json/systemData.json");
    const markData = await fetchData("json/marks.json");
    if (!systemData) return;
    if (!markData) return;

    console.log("Data loaded successfully:", systemData);
    console.log("Data loaded successfully:", markData);

    const { canvas, ctx } = initializeCanvas();
    let mapScale = 1.6;
    const minScale = 0.1;
    const maxScale = 5;
    let panX = 0, panY = 0;
    let isDragging = false;
    let startX, startY;
    let selectedPlanet = null; // Track the selected planet

    // Make these globally accessible
    window.getSelectedPlanet = () => selectedPlanet;
    window.setSelectedPlanet = (value) => { selectedPlanet = value; };

    window.markData = markData;

    // Initial centering on "The Citadel"
    const citadel = systemData["The Citadel"];
    if (citadel) {
        const center = centerOnPlanet("The Citadel", systemData, canvas, mapScale);
        panX = center.panX;
        panY = center.panY;
    } else {
        panX = canvas.width / 2;
        panY = canvas.height / 2;
    }

    // Bind drawing functions
    const updatePositions = () => {
        positions = updatePlanetPositions(systemData, canvas, mapScale, panX, panY);
    };
    const draw = (selPlanet) => drawMap(ctx, systemData, positions, mapScale, selPlanet);
    window.redraw = requestDraw(updatePositions, draw); // Make redraw globally accessible
    let positions = updatePlanetPositions(systemData, canvas, mapScale, panX, panY);

    // Initial draw
    window.redraw(selectedPlanet);

    // Filter change listener
    document.querySelectorAll('input[name="planetFilter"]').forEach((radio) => {
        radio.addEventListener("change", () => {
            console.log("Radio button changed:", radio.id);
            window.redraw(window.getSelectedPlanet());
        });
    });

    // Planet clicking
    canvas.addEventListener("click", (e) => {
        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
        Object.keys(positions).forEach((key) => {
            const { scaledX, scaledY } = positions[key];
            const planetRadius = 8 * mapScale;
            const distance = Math.sqrt(Math.pow(clickX - scaledX, 2) + Math.pow(clickY - scaledY, 2));
            if (distance <= planetRadius) {
                console.log("Planet selected:", key);
                window.setSelectedPlanet(key); // Set the selected planet
                const centerX = canvas.width / 2;
                const centerY = canvas.height / 2;
                panX += (centerX - scaledX);
                panY += (centerY - scaledY);
                window.redraw(window.getSelectedPlanet());
                displayPlanetInfo(systemData[key]);
            }
        });
    });

    // Dragging
    canvas.addEventListener("mousedown", (e) => {
        isDragging = true;
        startX = e.clientX - panX;
        startY = e.clientY - panY;
    });
    canvas.addEventListener("mousemove", (e) => {
        if (isDragging) {
            panX = e.clientX - startX;
            panY = e.clientY - startY;
            window.redraw(window.getSelectedPlanet()); // Pass selectedPlanet to keep the circle
        }
    });
    canvas.addEventListener("mouseup", () => isDragging = false);
    canvas.addEventListener("mouseleave", () => isDragging = false);

    // Touch support
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
            window.redraw(window.getSelectedPlanet()); // Pass selectedPlanet to keep the circle
        }
    });
    canvas.addEventListener("touchend", () => isDragging = false);

    // Zooming
    canvas.addEventListener("wheel", (e) => {
        e.preventDefault();
        const zoomFactor = 0.1;
        const mouseX = e.clientX - canvas.getBoundingClientRect().left;
        const mouseY = e.clientY - canvas.getBoundingClientRect().top;
        const zoomFactorX = (mouseX - panX) / mapScale;
        const zoomFactorY = (mouseY - panY) / mapScale;

        if (e.deltaY < 0) mapScale = Math.min(mapScale + zoomFactor, maxScale);
        else if (e.deltaY > 0) mapScale = Math.max(mapScale - zoomFactor, minScale);

        panX = mouseX - zoomFactorX * mapScale;
        panY = mouseY - zoomFactorY * mapScale;
        window.redraw(window.getSelectedPlanet()); // Pass selectedPlanet to keep the circle
    });

    // Search centering and info display
    document.getElementById("systemSearch").addEventListener("change", function () {
        const selectedPlanetName = this.value.trim();
        if (selectedPlanetName && systemData[selectedPlanetName]) {
            window.setSelectedPlanet(selectedPlanetName); // Set the selected planet
            const center = centerOnPlanet(selectedPlanetName, systemData, canvas, mapScale);
            if (center) {
                panX = center.panX;
                panY = center.panY;
                window.redraw(window.getSelectedPlanet());
                displayPlanetInfo(systemData[selectedPlanetName]);
            }
        } else {
            console.error(`Planet "${selectedPlanetName}" not found in systemData!`);
        }
    });

    // File input (simplified placeholder)
    document.getElementById("myfile").addEventListener("change", async (event) => {
        const file = event.target.files[0];
        if (file.type === "application/json") {
            const newData = await fetchData(URL.createObjectURL(file));
            if (newData) {
                console.log("New JSON loaded:", newData);
                Object.assign(systemData, newData);
                window.redraw(window.getSelectedPlanet()); // Pass selectedPlanet to keep the circle
            }
        } else {
            console.log("Please select a valid JSON file.");
        }
    });
}

// Autocomplete function (unchanged)
function autocomplete(inp, arr) {
    let currentFocus;
    inp.addEventListener("input", function (e) {
        let a, b, val = this.value;
        closeAllLists();
        if (!val) return false;
        currentFocus = -1;

        a = document.createElement("DIV");
        a.setAttribute("id", this.id + "autocomplete-list");
        a.setAttribute("class", "autocomplete-items");
        this.parentNode.appendChild(a);

        for (let i = 0; i < arr.length; i++) {
            if (arr[i].substr(0, val.length).toUpperCase() === val.toUpperCase()) {
                b = document.createElement("DIV");
                b.innerHTML = "<strong>" + arr[i].substr(0, val.length) + "</strong>" + arr[i].substr(val.length);
                b.innerHTML += "<input type='hidden' value='" + arr[i] + "'>";
                b.addEventListener("click", () => {
                    inp.value = this.getElementsByTagName("input")[0].value;
                    closeAllLists();
                });
                a.appendChild(b);
            }
        }
    });

    inp.addEventListener("keydown", function (e) {
        let x = document.getElementById(this.id + "autocomplete-list");
        if (x) x = x.getElementsByTagName("div");

        if (e.keyCode === 40) currentFocus++;
        else if (e.keyCode === 38) currentFocus--;
        else if (e.keyCode === 13) {
            e.preventDefault();
            if (currentFocus > -1 && x) x[currentFocus].click();
        }
        addActive(x);
    });

    function addActive(x) {
        if (!x) return;
        removeActive(x);
        if (currentFocus >= x.length) currentFocus = 0;
        if (currentFocus < 0) currentFocus = x.length - 1;
        x[currentFocus].classList.add("autocomplete-active");
    }

    function removeActive(x) {
        for (let i = 0; i < x.length; i++) x[i].classList.remove("autocomplete-active");
    }

    function closeAllLists(elmnt) {
        const x = document.getElementsByClassName("autocomplete-items");
        for (let i = 0; i < x.length; i++) {
            if (elmnt !== x[i] && elmnt !== inp) x[i].parentNode.removeChild(x[i]);
        }
    }

    document.addEventListener("click", (e) => closeAllLists(e.target));
}

// Start the application
setupApplication();