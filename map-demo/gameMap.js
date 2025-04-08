class GameMap {
    constructor() {
      // Ustawienia i dane mapy
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
      this.isScrolling = false;
      this.isMovementActive = false;
      this.lastMouseX = 0;
      this.lastMouseY = 0;
  
      // Pobierz referencje do elementów DOM
      this.mapSVG = document.getElementById("gameMap");
      this.minimap = document.getElementById("minimap");
      this.tooltip = document.getElementById("tooltip");
      this.overlay = document.getElementById("mapOverlay");
      this.infoBtn = document.getElementById("infoBtn");
      this.closeBtn = document.getElementById("closeBtn");
  
      // Stwórz obiekty SVG dla gracza
      this.minimapPlayer = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      this.fullMapPlayer = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  
      // Bindowanie metod, aby zachować `this` w callbackach
      this.onMouseMove = this.onMouseMove.bind(this);
      this.onMouseUp = this.onMouseUp.bind(this);
      this.keyDown = this.keyDown.bind(this);
      this.keyUp = this.keyUp.bind(this);
  
      // Inicjalizacja
      this.init();
    }
  
    init() {
      // Stworzenie kafelków na minimapie i na pełnej mapie
      this.createTiles(this.minimap, true);
      this.createTiles(this.mapSVG, false);
  
      // Ustawienia i dodanie elementu gracza na minimapie
      this.minimapPlayer.setAttribute("r", this.tileSize / 2);
      this.minimapPlayer.setAttribute("fill", "red");
      this.minimap.appendChild(this.minimapPlayer);
  
      // Ustawienia i dodanie elementu gracza na pełnej mapie
      this.fullMapPlayer.setAttribute("r", this.tileSize / 3);
      this.fullMapPlayer.setAttribute("fill", "red");
      this.mapSVG.appendChild(this.fullMapPlayer);
  
      // Uaktualnienie pozycji gracza
      this.updatePlayer();
  
      // Obsługa kliknięcia "i" (otwarcie mapy)
      this.infoBtn.addEventListener("click", () => {
        this.overlay.style.display = "flex";
        this.startMovement();
      });
  
      // Obsługa przycisku zamknięcia mapy
      this.closeBtn.addEventListener("click", () => {
        this.overlay.style.display = "none";
        this.stopMovement();
      });
  
      // Obsługa przybliżania/oddalania na pełnej mapie
      this.mapSVG.addEventListener("wheel", (event) => {
        this.onWheel(event);
      });
  
      // Obsługa przeciągania mapy (mousedown)
      this.mapSVG.addEventListener("mousedown", (event) => {
        this.onMouseDown(event);
      });
  
      // Globalne eventy myszy (move, up)
      document.addEventListener("mousemove", this.onMouseMove);
      document.addEventListener("mouseup", this.onMouseUp);
  
      // Ustawienie kursora
      this.mapSVG.style.cursor = "grab";
  
      // Obsługa widoczności strony
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
          this.stopMovement();
        } else if (this.overlay.style.display === "flex") {
          this.startMovement();
        }
      });
  
      // Obsługa utraty i odzyskania fokusu w oknie
      window.addEventListener("blur", () => this.stopMovement());
      window.addEventListener("focus", () => {
        if (this.overlay.style.display === "flex") {
          this.startMovement();
        }
      });
    }
  
    createTiles(svgEl, isMini = false) {
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
  
          // Tooltip tylko na pełnej mapie
          if (!isMini) {
            rect.addEventListener("mouseover", (e) => {
              this.showTooltip(e, `Tile (${x}, ${y}): Type ${this.tiles[y][x]}`);
            });
            rect.addEventListener("mousemove", (e) => {
              this.showTooltip(e, `Tile (${x}, ${y}): Type ${this.tiles[y][x]}`);
            });
            rect.addEventListener("mouseout", () => {
              this.hideTooltip();
            });
          }
  
          svgEl.appendChild(rect);
        }
      }
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
  
    updatePlayer() {
      const cx = this.playerX * this.tileSize + this.tileSize / 2;
      const cy = this.playerY * this.tileSize + this.tileSize / 2;
  
      this.fullMapPlayer.setAttribute("cx", cx);
      this.fullMapPlayer.setAttribute("cy", cy);
      this.minimapPlayer.setAttribute("cx", cx);
      this.minimapPlayer.setAttribute("cy", cy);
  
      // Przewijaj widok tylko gdy gracz się porusza
      if (Object.values(this.keysPressed).includes(true)) {
        const viewWidth = 512 / this.scale;
        const viewHeight = 512 / this.scale;
        const borderThreshold = viewWidth * 0.3; // 30% szerokości widoku
  
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
  
        this.mapSVG.setAttribute(
          "viewBox",
          `${this.offsetX} ${this.offsetY} ${viewWidth} ${viewHeight}`
        );
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
  
    onWheel(event) {
      event.preventDefault();
  
      const currentWidth = 512 / this.scale;
      const currentHeight = 512 / this.scale;
      const pt = this.mapSVG.createSVGPoint();
      pt.x = event.clientX;
      pt.y = event.clientY;
  
      const svgP = pt.matrixTransform(this.mapSVG.getScreenCTM().inverse());
      const mouseX = svgP.x;
      const mouseY = svgP.y;
  
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
  
      this.mapSVG.setAttribute(
        "viewBox",
        `${this.offsetX} ${this.offsetY} ${newWidth} ${newHeight}`
      );
    }
  
    onMouseDown(event) {
      if (event.button === 0) { // lewy przycisk myszy
        this.isDragging = true;
        this.lastMouseX = event.clientX;
        this.lastMouseY = event.clientY;
        this.mapSVG.style.cursor = "grabbing";
        this.isScrolling = false;
      }
    }
  
    onMouseMove(event) {
      if (this.isDragging) {
        const dx = event.clientX - this.lastMouseX;
        const dy = event.clientY - this.lastMouseY;
  
        const viewWidth = 512 / this.scale;
        const viewHeight = 512 / this.scale;
  
        this.offsetX = Math.max(0, Math.min(this.offsetX - dx, 512 - viewWidth));
        this.offsetY = Math.max(0, Math.min(this.offsetY - dy, 512 - viewHeight));
  
        this.mapSVG.setAttribute(
          "viewBox",
          `${this.offsetX} ${this.offsetY} ${viewWidth} ${viewHeight}`
        );
  
        this.lastMouseX = event.clientX;
        this.lastMouseY = event.clientY;
      } else if (!this.isDragging && !this.isScrolling) {
        // Automatyczne przewijanie przy krawędziach
        const rect = this.mapSVG.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
  
        const viewWidth = 512 / this.scale;
        const viewHeight = 512 / this.scale;
        const borderThreshold = 50;
  
        if (
          mouseX < borderThreshold ||
          mouseX > rect.width - borderThreshold ||
          mouseY < borderThreshold ||
          mouseY > rect.height - borderThreshold
        ) {
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
  
          this.mapSVG.setAttribute(
            "viewBox",
            `${this.offsetX} ${this.offsetY} ${viewWidth} ${viewHeight}`
          );
        }
      }
    }
  
    onMouseUp() {
      if (this.isDragging) {
        this.isDragging = false;
        this.mapSVG.style.cursor = "grab";
      }
      this.isScrolling = false;
    }
  
    startMovement() {
      if (!this.isMovementActive) {
        document.addEventListener("keydown", this.keyDown);
        document.addEventListener("keyup", this.keyUp);
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
  
        const cx = this.playerX * this.tileSize + this.tileSize / 2;
        const cy = this.playerY * this.tileSize + this.tileSize / 2;
        const viewWidth = 512 / this.scale;
        const viewHeight = 512 / this.scale;
  
        const isVisible =
          cx >= this.offsetX &&
          cx <= this.offsetX + viewWidth &&
          cy >= this.offsetY &&
          cy <= this.offsetY + viewHeight;
  
        // Jeśli gracz jest poza widokiem, wyśrodkuj
        if (!isVisible) {
          this.offsetX = Math.max(0, Math.min(cx - viewWidth / 2, 512 - viewWidth));
          this.offsetY = Math.max(0, Math.min(cy - viewHeight / 2, 512 - viewHeight));
          this.mapSVG.setAttribute(
            "viewBox",
            `${this.offsetX} ${this.offsetY} ${viewWidth} ${viewHeight}`
          );
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
  }
//   window.GameMap = GameMap;
  