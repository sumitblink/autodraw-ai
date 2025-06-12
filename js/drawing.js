// Canvas and Drawing Functions

function initCanvas() {
    canvas = document.getElementById('drawingCanvas');
    ctx = canvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
}

function resizeCanvas() {
    canvas.width = window.innerWidth - 200; // Account for suggestions panel
    canvas.height = window.innerHeight;
    ctx.globalCompositeOperation = 'source-over';
}

function setupEventListeners() {
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseUp);

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

    canvas.addEventListener('wheel', handleWheel, { passive: false });

    // Device motion for shake detection
    if (window.DeviceMotionEvent) {
        let lastAcceleration = { x: 0, y: 0, z: 0 };
        
        window.addEventListener('devicemotion', (e) => {
            const acceleration = e.accelerationIncludingGravity;
            const threshold = 7.5;
            
            if (Math.abs(acceleration.x - lastAcceleration.x) > threshold ||
                Math.abs(acceleration.y - lastAcceleration.y) > threshold ||
                Math.abs(acceleration.z - lastAcceleration.z) > threshold) {
                clearAll();
            }
            
            lastAcceleration = acceleration;
        });
    }
}

function handleMouseDown(e) {
    mouseDown = true;
    const pos = getMousePos(e);
    lastMousePos = pos;

    if (currentMode === 'draw') {
        isDrawing = true;
        currentStroke = [pos];
        drawPoint(pos.x, pos.y);
    }
}

function handleMouseMove(e) {
    const pos = getMousePos(e);

    if (currentMode === 'draw' && isDrawing) {
        drawLine(lastMousePos.x, lastMousePos.y, pos.x, pos.y);
        drawPoint(pos.x, pos.y);
        currentStroke.push({...pos, color: currentColor, size: brushSize, time: Date.now()});
        
        // Trigger AutoDraw suggestions
        triggerAutoDrawSuggestions();
    } else if (currentMode === 'rotate' && mouseDown) {
        const deltaX = pos.x - lastMousePos.x;
        const deltaY = pos.y - lastMousePos.y;
        
        scene.rotation.y += deltaX * 0.01;
        scene.rotation.x += deltaY * 0.01;
    }

    lastMousePos = pos;
}

function handleMouseUp() {
    if (isDrawing && currentStroke.length > 1) {
        strokes.push([...currentStroke]);
        currentStroke = [];
        
        // Trigger both AI prediction and AutoDraw suggestions
        triggerPrediction();
        triggerAutoDrawSuggestions();
    }
    
    isDrawing = false;
    mouseDown = false;
    updateDebugInfo();
}

function handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousedown', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    handleMouseDown(mouseEvent);
}

function handleTouchMove(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousemove', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    handleMouseMove(mouseEvent);
}

function handleTouchEnd(e) {
    e.preventDefault();
    handleMouseUp();
}

function handleWheel(e) {
    if (currentMode === 'rotate') {
        e.preventDefault();
        camera.position.z += e.deltaY * 0.1;
        camera.position.z = Math.max(5, Math.min(100, camera.position.z));
    }
}

function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    };
}

function drawPoint(x, y) {
    ctx.globalAlpha = opacity;
    ctx.fillStyle = currentColor;
    ctx.beginPath();
    ctx.arc(x, y, brushSize / 2, 0, 2 * Math.PI);
    ctx.fill();
}

function drawLine(x1, y1, x2, y2) {
    ctx.globalAlpha = opacity;
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
}

// Drawing utility functions
function smoothStroke(stroke) {
    if (stroke.length < 3) return stroke;
    
    const smoothed = [stroke[0]];
    
    for (let i = 1; i < stroke.length - 1; i++) {
        const prev = stroke[i - 1];
        const curr = stroke[i];
        const next = stroke[i + 1];
        
        const smoothedPoint = {
            x: (prev.x + curr.x + next.x) / 3,
            y: (prev.y + curr.y + next.y) / 3,
            color: curr.color,
            size: curr.size,
            time: curr.time
        };
        
        smoothed.push(smoothedPoint);
    }
    
    smoothed.push(stroke[stroke.length - 1]);
    return smoothed;
}

function calculateStrokeLength(stroke) {
    if (stroke.length < 2) return 0;
    
    let length = 0;
    for (let i = 1; i < stroke.length; i++) {
        const dx = stroke[i].x - stroke[i-1].x;
        const dy = stroke[i].y - stroke[i-1].y;
        length += Math.sqrt(dx * dx + dy * dy);
    }
    
    return length;
}

function getStrokeBoundingBox(stroke) {
    if (stroke.length === 0) return null;
    
    const minX = Math.min(...stroke.map(p => p.x));
    const maxX = Math.max(...stroke.map(p => p.x));
    const minY = Math.min(...stroke.map(p => p.y));
    const maxY = Math.max(...stroke.map(p => p.y));
    
    return {
        minX, maxX, minY, maxY,
        width: maxX - minX,
        height: maxY - minY,
        centerX: (minX + maxX) / 2,
        centerY: (minY + maxY) / 2
    };
}

function normalizeStroke(stroke, targetWidth = 100, targetHeight = 100) {
    const bbox = getStrokeBoundingBox(stroke);
    if (!bbox) return stroke;
    
    const scaleX = targetWidth / bbox.width;
    const scaleY = targetHeight / bbox.height;
    const scale = Math.min(scaleX, scaleY);
    
    return stroke.map(point => ({
        x: (point.x - bbox.centerX) * scale + targetWidth / 2,
        y: (point.y - bbox.centerY) * scale + targetHeight / 2,
        color: point.color,
        size: point.size,
        time: point.time
    }));
}

function getStrokeDirection(stroke) {
    if (stroke.length < 2) return 0;
    
    const start = stroke[0];
    const end = stroke[stroke.length - 1];
    
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    
    return Math.atan2(dy, dx);
}

function isClockwise(stroke) {
    if (stroke.length < 3) return false;
    
    let area = 0;
    for (let i = 0; i < stroke.length; i++) {
        const j = (i + 1) % stroke.length;
        area += (stroke[j].x - stroke[i].x) * (stroke[j].y + stroke[i].y);
    }
    
    return area > 0;
}

function detectShapeType(stroke) {
    if (stroke.length < 3) return 'line';
    
    const bbox = getStrokeBoundingBox(stroke);
    const aspectRatio = bbox.width / bbox.height;
    const length = calculateStrokeLength(stroke);
    const area = bbox.width * bbox.height;
    const compactness = (length * length) / area;
    
    // Circle detection
    if (Math.abs(aspectRatio - 1) < 0.2 && compactness < 50) {
        return 'circle';
    }
    
    // Square detection
    if (Math.abs(aspectRatio - 1) < 0.2 && compactness > 50) {
        return 'square';
    }
    
    // Rectangle detection
    if (aspectRatio > 1.5 || aspectRatio < 0.67) {
        return 'rectangle';
    }
    
    // Line detection
    if (aspectRatio > 3 || aspectRatio < 0.33) {
        return 'line';
    }
    
    return 'freeform';
}

function interpolateStroke(stroke, targetPoints = 100) {
    if (stroke.length <= targetPoints) return stroke;
    
    const totalLength = calculateStrokeLength(stroke);
    const segmentLength = totalLength / targetPoints;
    
    const interpolated = [stroke[0]];
    let currentLength = 0;
    let targetLength = segmentLength;
    
    for (let i = 1; i < stroke.length; i++) {
        const prev = stroke[i - 1];
        const curr = stroke[i];
        
        const dx = curr.x - prev.x;
        const dy = curr.y - prev.y;
        const segLen = Math.sqrt(dx * dx + dy * dy);
        
        currentLength += segLen;
        
        while (currentLength >= targetLength && interpolated.length < targetPoints) {
            const ratio = (targetLength - (currentLength - segLen)) / segLen;
            
            const interpolatedPoint = {
                x: prev.x + dx * ratio,
                y: prev.y + dy * ratio,
                color: curr.color,
                size: prev.size + (curr.size - prev.size) * ratio,
                time: prev.time + (curr.time - prev.time) * ratio
            };
            
            interpolated.push(interpolatedPoint);
            targetLength += segmentLength;
        }
    }
    
    // Add the last point if we haven't reached the target count
    if (interpolated.length < targetPoints) {
        interpolated.push(stroke[stroke.length - 1]);
    }
    
    return interpolated;
}

function drawDebugInfo(stroke) {
    if (!stroke || stroke.length === 0) return;
    
    const bbox = getStrokeBoundingBox(stroke);
    const shapeType = detectShapeType(stroke);
    const length = calculateStrokeLength(stroke);
    
    // Draw bounding box
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(bbox.minX, bbox.minY, bbox.width, bbox.height);
    ctx.setLineDash([]);
    
    // Draw center point
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.beginPath();
    ctx.arc(bbox.centerX, bbox.centerY, 3, 0, 2 * Math.PI);
    ctx.fill();
    
    // Display info
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(bbox.minX, bbox.minY - 60, 150, 50);
    
    ctx.fillStyle = 'white';
    ctx.font = '12px Arial';
    ctx.fillText(`Type: ${shapeType}`, bbox.minX + 5, bbox.minY - 40);
    ctx.fillText(`Length: ${Math.round(length)}px`, bbox.minX + 5, bbox.minY - 25);
    ctx.fillText(`Points: ${stroke.length}`, bbox.minX + 5, bbox.minY - 10);
}