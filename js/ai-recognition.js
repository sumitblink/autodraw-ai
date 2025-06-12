// Simple AI Drawing Recognition Functions (No TensorFlow needed!)

function initSimpleAI() {
    try {
        updatePredictionStatus('AI ready! Start drawing...');
        modelLoaded = true;
        console.log('Simple AI recognition initialized');
    } catch (error) {
        console.error('Failed to initialize AI:', error);
        updatePredictionStatus('AI initialization failed');
    }
}

function analyzeDrawingGeometry() {
    if (strokes.length === 0) return null;
    
    // Flatten all strokes into single point array
    const allPoints = strokes.flat();
    if (allPoints.length < 3) return null;
    
    // Calculate bounding box
    const minX = Math.min(...allPoints.map(p => p.x));
    const maxX = Math.max(...allPoints.map(p => p.x));
    const minY = Math.min(...allPoints.map(p => p.y));
    const maxY = Math.max(...allPoints.map(p => p.y));
    
    const width = maxX - minX;
    const height = maxY - minY;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    
    // Calculate aspect ratio
    const aspectRatio = width / height;
    
    // Calculate stroke count and total points
    const strokeCount = strokes.length;
    const totalPoints = allPoints.length;
    
    // Calculate average distance from center (circularity measure)
    const avgDistanceFromCenter = allPoints.reduce((sum, point) => {
        const dx = point.x - centerX;
        const dy = point.y - centerY;
        return sum + Math.sqrt(dx * dx + dy * dy);
    }, 0) / allPoints.length;
    
    // Calculate variance in distance (regularity measure)
    const distances = allPoints.map(point => {
        const dx = point.x - centerX;
        const dy = point.y - centerY;
        return Math.sqrt(dx * dx + dy * dy);
    });
    const avgDistance = distances.reduce((a, b) => a + b) / distances.length;
    const variance = distances.reduce((sum, d) => sum + Math.pow(d - avgDistance, 2), 0) / distances.length;
    
    // Calculate path length
    let pathLength = 0;
    for (let stroke of strokes) {
        for (let i = 1; i < stroke.length; i++) {
            const dx = stroke[i].x - stroke[i-1].x;
            const dy = stroke[i].y - stroke[i-1].y;
            pathLength += Math.sqrt(dx * dx + dy * dy);
        }
    }
    
    return {
        width, height, aspectRatio, strokeCount, totalPoints,
        avgDistanceFromCenter, variance, pathLength,
        boundingBox: { minX, maxX, minY, maxY, centerX, centerY }
    };
}

function predictDrawingFromGeometry(geometry) {
    if (!geometry) return [];
    
    const predictions = [];
    
    // Circle detection
    if (geometry.strokeCount <= 2 && geometry.variance < 1000 && 
        Math.abs(geometry.aspectRatio - 1) < 0.3) {
        predictions.push({ name: '🔵 Circle', confidence: 95 - geometry.variance/50 });
    }
    
    // Square/Rectangle detection
    if (geometry.strokeCount >= 3 && geometry.strokeCount <= 5) {
        if (Math.abs(geometry.aspectRatio - 1) < 0.2) {
            predictions.push({ name: '🟦 Square', confidence: 90 });
        } else if (geometry.aspectRatio > 1.5 || geometry.aspectRatio < 0.67) {
            predictions.push({ name: '📄 Rectangle', confidence: 85 });
        }
    }
    
    // Triangle detection
    if (geometry.strokeCount >= 2 && geometry.strokeCount <= 4 && 
        geometry.aspectRatio > 0.5 && geometry.aspectRatio < 2) {
        predictions.push({ name: '🔺 Triangle', confidence: 80 });
    }
    
    // Line detection
    if (geometry.strokeCount <= 2 && (geometry.aspectRatio > 3 || geometry.aspectRatio < 0.33)) {
        predictions.push({ name: '📏 Line', confidence: 90 });
    }
    
    // Star detection (multiple strokes, high variance)
    if (geometry.strokeCount >= 5 && geometry.variance > 2000) {
        predictions.push({ name: '⭐ Star', confidence: 75 });
    }
    
    // Heart detection (2-3 strokes, specific aspect ratio)
    if (geometry.strokeCount >= 2 && geometry.strokeCount <= 4 && 
        geometry.aspectRatio > 0.8 && geometry.aspectRatio < 1.3) {
        predictions.push({ name: '❤️ Heart', confidence: 70 });
    }
    
    // House detection (multiple strokes, tall rectangle)
    if (geometry.strokeCount >= 4 && geometry.aspectRatio > 0.7 && geometry.aspectRatio < 1.4) {
        predictions.push({ name: '🏠 House', confidence: 65 });
    }
    
    // Car detection (wide rectangle, multiple strokes)
    if (geometry.strokeCount >= 3 && geometry.aspectRatio > 1.5) {
        predictions.push({ name: '🚗 Car', confidence: 60 });
    }
    
    // Tree detection (multiple strokes, tall shape)
    if (geometry.strokeCount >= 3 && geometry.aspectRatio < 0.8) {
        predictions.push({ name: '🌳 Tree', confidence: 65 });
    }
    
    // Face detection (circular with multiple strokes for features)
    if (geometry.strokeCount >= 3 && Math.abs(geometry.aspectRatio - 1) < 0.4 && 
        geometry.variance < 2000) {
        predictions.push({ name: '😊 Face', confidence: 70 });
    }
    
    // Flower detection
    if (geometry.strokeCount >= 4 && geometry.variance > 1500 && 
        Math.abs(geometry.aspectRatio - 1) < 0.5) {
        predictions.push({ name: '🌸 Flower', confidence: 65 });
    }
    
    // Sun detection
    if (geometry.strokeCount >= 5 && geometry.variance > 3000) {
        predictions.push({ name: '☀️ Sun', confidence: 60 });
    }
    
    // Cat detection (multiple strokes, wider than tall)
    if (geometry.strokeCount >= 4 && geometry.aspectRatio > 1.2) {
        predictions.push({ name: '🐱 Cat', confidence: 55 });
    }
    
    // Fish detection (oval with tail)
    if (geometry.strokeCount >= 2 && geometry.strokeCount <= 4 && 
        geometry.aspectRatio > 1.5) {
        predictions.push({ name: '🐠 Fish', confidence: 60 });
    }
    
    // Add some creative interpretations based on complexity
    if (geometry.strokeCount >= 10) {
        predictions.push({ name: '🎨 Complex Art', confidence: 80 });
    }
    
    if (geometry.pathLength > 2000) {
        predictions.push({ name: '✍️ Signature', confidence: 70 });
    }
    
    // Sort by confidence and add some randomization for fun
    predictions.forEach(pred => {
        pred.confidence = Math.max(30, Math.min(98, pred.confidence + (Math.random() - 0.5) * 10));
    });
    
    return predictions.sort((a, b) => b.confidence - a.confidence);
}

async function predictDrawing() {
    try {
        if (strokes.length === 0) return;
        
        // Analyze drawing geometry
        const geometry = analyzeDrawingGeometry();
        if (!geometry) return;
        
        // Get predictions based on geometric analysis
        const predictions = predictDrawingFromGeometry(geometry);
        
        // Update display
        updatePredictionsDisplay(predictions.slice(0, 5));
        
    } catch (error) {
        console.error('Prediction error:', error);
    }
}

function updatePredictionsDisplay(predictions) {
    const predictionsDiv = document.getElementById('predictions');
    
    if (predictions.length === 0) {
        predictionsDiv.innerHTML = '<div class="prediction-status">Keep drawing...</div>';
        return;
    }
    
    let html = '';
    predictions.forEach((pred, index) => {
        const isTop = index === 0;
        const confidence = pred.confidence.toFixed(1);
        html += `
            <div class="prediction-item ${isTop ? 'top' : ''}">
                <span>${pred.name}</span>
                <span class="prediction-confidence">${confidence}%</span>
            </div>
        `;
    });
    
    predictionsDiv.innerHTML = html;
}

function updatePredictionStatus(message) {
    const predictionsDiv = document.getElementById('predictions');
    predictionsDiv.innerHTML = `<div class="prediction-status">${message}</div>`;
}

function triggerPrediction() {
    // Only predict if simple AI is loaded
    if (!modelLoaded) {
        return;
    }
    
    if (predictionTimeout) {
        clearTimeout(predictionTimeout);
    }
    
    // Debounce predictions to avoid too many calls
    predictionTimeout = setTimeout(() => {
        if (strokes.length > 0) {
            predictDrawing();
        }
    }, 300);
}