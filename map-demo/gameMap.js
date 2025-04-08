class GameMap {
    constructor() {
        this.mapWidth = 64;
        this.mapHeight = 64;
        this.tileSize = 8;
        this.playerX = 4;
        this.playerY = 4;
        this.scale = 1.0;
        this.offsetX = 0;
        this.offsetY = 0;
        this.colors = ["green", "blue", "gray"];
        this.tiles = [];
        
        this.keysPressed = {};
        this.moveInterval = null;
        this.isDragging = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        this.isScrolling = false;
        this.isMovementActive = false;
        
        // Elementy DOM
        this.mapSVG = document.getElementById("gameMap");
        this.minimap = document.getElementById("minimap");
        this.tooltip = document.getElementById("tooltip");
        this.overlay = document.getElementById("mapOverlay");
        
        // Elementy postaci
        this.minimapPlayer = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        this.fullMapPlayer = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        
        // Ustawienie początkowych atrybutów postaci
        this.setupPlayers();
    }

    setupPlayers() {
        // Konfiguracja postaci na minimapie
        this.minimapPlayer.setAttribute("r", this.tileSize / 2);
        this.minimapPlayer.setAttribute("fill", "red");
        this.minimapPlayer.setAttribute("cx", this.playerX * this.tileSize + this.tileSize / 2);
        this.minimapPlayer.setAttribute("cy", this.playerY * this.tileSize + this.tileSize / 2);
        this.minimap.appendChild(this.minimapPlayer);

        // Konfiguracja postaci na głównej mapie
        this.fullMapPlayer.setAttribute("r", this.tileSize / 3);
        this.fullMapPlayer.setAttribute("fill", "red");
        this.fullMapPlayer.setAttribute("cx", this.playerX * this.tileSize + this.tileSize / 2);
        this.fullMapPlayer.setAttribute("cy", this.playerY * this.tileSize + this.tileSize / 2);
        this.mapSVG.appendChild(this.fullMapPlayer);
    }

    init() {
        console.log("Inicjalizacja mapy...");
        console.log("Minimap:", this.minimap);
        console.log("GameMap:", this.mapSVG);
        
        // Tworzenie kafelków
        this.createTiles(this.minimap, true);
        this.createTiles(this.mapSVG);
        
        // Konfiguracja zdarzeń
        this.setupEventListeners();
        
        // Aktualizacja pozycji postaci
        this.updatePlayer();
        
        console.log("Inicjalizacja zakończona");
    }

    createTiles(svgEl, isMini = false) {
        console.log("Tworzenie kafelków dla:", svgEl.id);
        for (let y = 0; y < this.mapHeight; y++) {
            this.tiles[y] = this.tiles[y] || [];
            for (let x = 0; x < this.mapWidth; x++) {
                if (!this.tiles[y][x]) {
                    this.tiles[y][x] = this.colors[Math.floor(Math.random() * this.colors.length)];
                }

                const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                rect.setAttribute("x", x * this.tileSize);
                rect.setAttribute("y", y * this.tileSize);
                rect.setAttribute("width", this.tileSize);
                rect.setAttribute("height", this.tileSize);
                rect.setAttribute("fill", this.tiles[y][x]);

                if (!isMini) {
                    rect.addEventListener("mouseover", (e) => {
                        this.showTooltip(e, `Tile (${x}, ${y}): Type ${this.tiles[y][x]}`);
                    });
                    rect.addEventListener("mousemove", (e) => {
                        this.showTooltip(e, `Tile (${x}, ${y}): Type ${this.tiles[y][x]}`);
                    });
                    rect.addEventListener("mouseout", () => this.hideTooltip());
                }

                svgEl.appendChild(rect);
            }
        }
        console.log("Kafelki utworzone dla:", svgEl.id);
    }

    setupEventListeners() {
        // Map dragging
        this.mapSVG.addEventListener("mousedown", (event) => {
            if (event.button === 0) {
                this.isDragging = true;
                this.lastMouseX = event.clientX;
                this.lastMouseY = event.clientY;
                this.mapSVG.style.cursor = "grabbing";
            }
        });

        document.addEventListener("mousemove", (event) => {
            if (this.isDragging) {
                const dx = event.clientX - this.lastMouseX;
                const dy = event.clientY - this.lastMouseY;
                
                const viewWidth = 512 / this.scale;
                const viewHeight = 512 / this.scale;
                
                this.offsetX = Math.max(0, Math.min(this.offsetX - dx, 512 - viewWidth));
                this.offsetY = Math.max(0, Math.min(this.offsetY - dy, 512 - viewHeight));
                
                this.mapSVG.setAttribute("viewBox", `${this.offsetX} ${this.offsetY} ${viewWidth} ${viewHeight}`);
                
                this.lastMouseX = event.clientX;
                this.lastMouseY = event.clientY;
            } else if (!this.isScrolling) {
                const rect = this.mapSVG.getBoundingClientRect();
                const mouseX = event.clientX - rect.left;
                const mouseY = event.clientY - rect.top;
                
                const viewWidth = 512 / this.scale;
                const viewHeight = 512 / this.scale;
                
                const borderThreshold = 50;
                
                if (mouseX < borderThreshold || mouseX > rect.width - borderThreshold ||
                    mouseY < borderThreshold || mouseY > rect.height - borderThreshold) {
                    this.isScrolling = true;
                    
                    if (mouseX < borderThreshold) {
                        this.offsetX = Math.max(0, this.offsetX - 5);
                    } else if (mouseX > rect.width - borderThreshold) {
                        this.offsetX = Math.min(512 - viewWidth, this.offsetX + 5);
                    }
                    
                    if (mouseY < borderThreshold) {
                        this.offsetY = Math.max(0, this.offsetY - 5);
                    } else if (mouseY > rect.height - borderThreshold) {
                        this.offsetY = Math.min(512 - viewHeight, this.offsetY + 5);
                    }
                    
                    this.mapSVG.setAttribute("viewBox", `${this.offsetX} ${this.offsetY} ${viewWidth} ${viewHeight}`);
                }
            }
        });

        document.addEventListener("mouseup", () => {
            if (this.isDragging) {
                this.isDragging = false;
                this.mapSVG.style.cursor = "grab";
            }
            this.isScrolling = false;
        });

        // Zooming
        this.mapSVG.addEventListener("wheel", (event) => {
            event.preventDefault();
            let currentWidth = 512 / this.scale;
            let currentHeight = 512 / this.scale;

            const pt = this.mapSVG.createSVGPoint();
            pt.x = event.clientX;
            pt.y = event.clientY;
            const svgP = pt.matrixTransform(this.mapSVG.getScreenCTM().inverse());
            const mouseX = svgP.x, mouseY = svgP.y;

            const relX = (mouseX - this.offsetX) / currentWidth;
            const relY = (mouseY - this.offsetY) / currentHeight;

            const zoomFactor = event.deltaY < 0 ? 1.1 : 1 / 1.1;
            let newScale = this.scale * zoomFactor;
            newScale = Math.max(1, Math.min(newScale, 4));

            let newWidth = 512 / newScale;
            let newHeight = 512 / newScale;

            let newOffsetX = mouseX - relX * newWidth;
            let newOffsetY = mouseY - relY * newHeight;

            newOffsetX = Math.max(0, Math.min(newOffsetX, 512 - newWidth));
            newOffsetY = Math.max(0, Math.min(newOffsetY, 512 - newHeight));

            this.scale = newScale;
            this.offsetX = newOffsetX;
            this.offsetY = newOffsetY;

            this.mapSVG.setAttribute("viewBox", `${this.offsetX} ${this.offsetY} ${newWidth} ${newHeight}`);
        });

        // Open and close map
        document.getElementById("infoBtn").addEventListener("click", () => {
            this.overlay.style.display = "flex";
            this.startMovement();
        });

        document.getElementById("closeBtn").addEventListener("click", () => {
            this.overlay.style.display = "none";
            this.stopMovement();
        });

        // Visibility change
        document.addEventListener("visibilitychange", () => {
            if (document.hidden) {
                this.stopMovement();
            } else if (this.overlay.style.display === "flex") {
                this.startMovement();
            }
        });

        // Window focus
        window.addEventListener("blur", () => this.stopMovement());
        window.addEventListener("focus", () => {
            if (this.overlay.style.display === "flex") {
                this.startMovement();
            }
        });

        // Set initial cursor style
        this.mapSVG.style.cursor = "grab";
    }

    showTooltip(event, text) {
        this.tooltip.style.left = `${event.pageX + 10}px`;
        this.tooltip.style.top = `${event.pageY + 10}px`;
        this.tooltip.textContent = text;
        this.tooltip.style.display = "block";
    }

    hideTooltip() {
        this.tooltip.style.display = "none";
    }

    startMovement() {
        if (!this.isMovementActive) {
            document.addEventListener("keydown", (e) => this.keyDown(e));
            document.addEventListener("keyup", (e) => this.keyUp(e));
            this.isMovementActive = true;
        }
    }

    stopMovement() {
        if (this.isMovementActive) {
            document.removeEventListener("keydown", this.keyDown);
            document.removeEventListener("keyup", this.keyUp);
            this.keysPressed = {};
            if (this.moveInterval) {
                clearInterval(this.moveInterval);
                this.moveInterval = null;
            }
            this.isMovementActive = false;
        }
    }

    keyDown(event) {
        if (!event.repeat) {
            this.keysPressed[event.key] = true;
            
            // Sprawdź czy postać jest poza widokiem
            const cx = this.playerX * this.tileSize + this.tileSize / 2;
            const cy = this.playerY * this.tileSize + this.tileSize / 2;
            const viewWidth = 512 / this.scale;
            const viewHeight = 512 / this.scale;
            
            const isVisible = 
                cx >= this.offsetX && 
                cx <= this.offsetX + viewWidth && 
                cy >= this.offsetY && 
                cy <= this.offsetY + viewHeight;
            
            // Centruj widok tylko gdy postać jest poza widokiem
            if (!isVisible) {
                this.offsetX = Math.max(0, Math.min(cx - viewWidth / 2, 512 - viewWidth));
                this.offsetY = Math.max(0, Math.min(cy - viewHeight / 2, 512 - viewHeight));
                
                this.mapSVG.setAttribute("viewBox", `${this.offsetX} ${this.offsetY} ${viewWidth} ${viewHeight}`);
            }
            
            if (!this.moveInterval) {
                this.movePlayer();
                this.moveInterval = setInterval(() => this.movePlayer(), 200);
            }
        }
    }

    keyUp(event) {
        this.keysPressed[event.key] = false;
        if (!Object.values(this.keysPressed).includes(true)) {
            clearInterval(this.moveInterval);
            this.moveInterval = null;
        }
    }

    movePlayer() {
        let moved = false;
        if (this.keysPressed["ArrowUp"] && this.playerY > 0) {
            this.playerY--;
            moved = true;
        }
        else if (this.keysPressed["ArrowDown"] && this.playerY < this.mapHeight - 1) {
            this.playerY++;
            moved = true;
        }
        else if (this.keysPressed["ArrowLeft"] && this.playerX > 0) {
            this.playerX--;
            moved = true;
        }
        else if (this.keysPressed["ArrowRight"] && this.playerX < this.mapWidth - 1) {
            this.playerX++;
            moved = true;
        }

        if (moved) {
            this.updatePlayer();
        }
    }

    updatePlayer() {
        const cx = this.playerX * this.tileSize + this.tileSize / 2;
        const cy = this.playerY * this.tileSize + this.tileSize / 2;
        
        this.fullMapPlayer.setAttribute("cx", cx);
        this.fullMapPlayer.setAttribute("cy", cy);
        this.minimapPlayer.setAttribute("cx", cx);
        this.minimapPlayer.setAttribute("cy", cy);

        // Przewijaj widok tylko gdy gracz jest blisko krawędzi
        if (Object.values(this.keysPressed).includes(true)) {
            const viewWidth = 512 / this.scale;
            const viewHeight = 512 / this.scale;
            
            const borderThreshold = viewWidth * 0.3;
            
            // Prawa krawędź
            if (cx - this.offsetX > viewWidth - borderThreshold && this.offsetX + viewWidth < 512) {
                this.offsetX = Math.min(this.offsetX + this.tileSize, 512 - viewWidth);
            }
            // Lewa krawędź
            else if (cx - this.offsetX < borderThreshold && this.offsetX > 0) {
                this.offsetX = Math.max(this.offsetX - this.tileSize, 0);
            }
            
            // Dolna krawędź
            if (cy - this.offsetY > viewHeight - borderThreshold && this.offsetY + viewHeight < 512) {
                this.offsetY = Math.min(this.offsetY + this.tileSize, 512 - viewHeight);
            }
            // Górna krawędź
            else if (cy - this.offsetY < borderThreshold && this.offsetY > 0) {
                this.offsetY = Math.max(this.offsetY - this.tileSize, 0);
            }
            
            this.mapSVG.setAttribute("viewBox", `${this.offsetX} ${this.offsetY} ${viewWidth} ${viewHeight}`);
        }
    }
} 