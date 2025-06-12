// Google AutoDraw API Integration

async function callAutoDrawAPI(drawingData) {
    try {
        const apiUrl = 'https://inputtools.google.com/request?ime=handwriting&app=autodraw&dbg=1&cs=1&oe=UTF-8';
        
        // Convert drawing data to Google's format
        const payload = {
            input_type: 0,
            requests: [{
                language: "autodraw",
                writing_guide: {
                    width: canvas.width,
                    height: canvas.height
                },
                ink: convertToGoogleFormat(drawingData)
            }]
        };

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error('AutoDraw API request failed');
        }

        const data = await response.json();
        return parseAutoDrawResponse(data);
        
    } catch (error) {
        console.error('AutoDraw API error:', error);
        return [];
    }
}

function convertToGoogleFormat(drawingData) {
    // Convert our drawing data to Google's ink format
    const ink = [];
    
    for (let stroke of drawingData) {
        if (stroke.length < 2) continue;
        
        const x = [];
        const y = [];
        const t = [];
        
        for (let point of stroke) {
            x.push(Math.round(point.x));
            y.push(Math.round(point.y));
            t.push(point.time || 0);
        }
        
        ink.push([x, y, t]);
    }
    
    return ink;
}

function parseAutoDrawResponse(data) {
    try {
        if (!data || !data[1] || !data[1][0] || !data[1][0][1]) {
            return [];
        }
        
        const suggestions = data[1][0][1];
        const results = [];
        
        for (let suggestion of suggestions) {
            if (suggestion && suggestion.length >= 2) {
                results.push({
                    name: suggestion[0],
                    confidence: suggestion[1] || 0
                });
            }
        }
        
        return results.slice(0, 8); // Top 8 suggestions
    } catch (error) {
        console.error('Error parsing AutoDraw response:', error);
        return [];
    }
}

async function triggerAutoDrawSuggestions() {
    if (predictionTimeout) {
        clearTimeout(predictionTimeout);
    }
    
    predictionTimeout = setTimeout(async () => {
        if (strokes.length > 0) {
            updateSuggestionsStatus('Getting suggestions...');
            
            // Use both current strokes and in-progress stroke
            const allStrokes = [...strokes];
            if (currentStroke.length > 1) {
                allStrokes.push(currentStroke);
            }
            
            try {
                const suggestions = await callAutoDrawAPI(allStrokes);
                autoDrawSuggestions = suggestions;
                updateSuggestionsDisplay(suggestions);
            } catch (error) {
                console.error('AutoDraw suggestions error:', error);
                updateSuggestionsStatus('Could not get suggestions');
            }
        }
    }, 800);
}

function updateSuggestionsDisplay(suggestions) {
    const suggestionsContainer = document.getElementById('suggestions-list');
    
    if (suggestions.length === 0) {
        suggestionsContainer.innerHTML = `
            <div style="color: #666; font-size: 12px; text-align: center; margin-top: 20px;">
                Draw something to see AutoDraw suggestions!
            </div>
        `;
        return;
    }
    
    let html = '';
    suggestions.forEach((suggestion, index) => {
        // Create SVG icon URL (this would normally come from Google's stencils)
        const iconUrl = generateIconUrl(suggestion.name);
        
        html += `
            <div class="suggestion-item" onclick="applySuggestion('${suggestion.name}')" title="${suggestion.name}">
                <img src="${iconUrl}" alt="${suggestion.name}" onerror="this.style.display='none'">
            </div>
        `;
    });
    
    suggestionsContainer.innerHTML = html;
}

function updateSuggestionsStatus(message) {
    const suggestionsContainer = document.getElementById('suggestions-list');
    suggestionsContainer.innerHTML = `
        <div style="color: #4ecdc4; font-size: 12px; text-align: center; margin-top: 20px;">
            ${message}
        </div>
    `;
}

function generateIconUrl(itemName) {
    // This would normally use Google's stencil URLs, but for demo we'll use placeholder
    // Real AutoDraw uses: https://storage.googleapis.com/artlab-public.appspot.com/stencils/[artist]/[item].svg
    return `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="50" font-size="40" text-anchor="middle" x="50">${getEmojiForItem(itemName)}</text></svg>`;
}

function getEmojiForItem(itemName) {
    const emojiMap = {
        'circle': '⭕', 'square': '⬜', 'triangle': '🔺', 'line': '📏',
        'star': '⭐', 'heart': '❤️', 'house': '🏠', 'car': '🚗',
        'tree': '🌳', 'face': '😊', 'cat': '🐱', 'dog': '🐕',
        'flower': '🌸', 'sun': '☀️', 'moon': '🌙', 'fish': '🐠',
        'bird': '🐦', 'apple': '🍎', 'envelope': '✉️', 'clock': '🕐',
        'crown': '👑', 'lightning': '⚡', 'cloud': '☁️', 'rainbow': '🌈',
        'shoe': '👞', 'book': '📚', 'key': '🔑', 'guitar': '🎸',
        'camera': '📷', 'umbrella': '☂️', 'butterfly': '🦋', 'rocket': '🚀',
        'pizza': '🍕', 'hamburger': '🍔', 'ice cream': '🍦', 'coffee': '☕',
        'airplane': '✈️', 'train': '🚂', 'bicycle': '🚲', 'sailboat': '⛵',
        'mountain': '⛰️', 'tent': '⛺', 'cactus': '🌵', 'mushroom': '🍄',
        'snowflake': '❄️', 'flame': '🔥', 'water drop': '💧', 'leaf': '🍃'
    };
    
    return emojiMap[itemName.toLowerCase()] || '🎨';
}

function applySuggestion(suggestionName) {
    console.log('Applying suggestion:', suggestionName);
    
    // Clear current drawing
    clearCanvas();
    
    // Draw the suggested shape
    drawSuggestedShape(suggestionName);
    
    // Generate particles for the new shape
    setTimeout(() => {
        generateParticleShapes();
    }, 500);
}

function drawSuggestedShape(shapeName) {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const size = 100;
    
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    
    const shapePoints = [];
    
    switch (shapeName.toLowerCase()) {
        case 'circle':
            for (let i = 0; i <= 360; i += 5) {
                const x = centerX + Math.cos(i * Math.PI / 180) * size;
                const y = centerY + Math.sin(i * Math.PI / 180) * size;
                shapePoints.push({ x, y, color: currentColor, size: brushSize });
            }
            break;
            
        case 'square':
            const coords = [
                [centerX - size, centerY - size],
                [centerX + size, centerY - size],
                [centerX + size, centerY + size],
                [centerX - size, centerY + size],
                [centerX - size, centerY - size]
            ];
            coords.forEach(([x, y]) => {
                shapePoints.push({ x, y, color: currentColor, size: brushSize });
            });
            break;
            
        case 'triangle':
            const triCoords = [
                [centerX, centerY - size],
                [centerX + size, centerY + size],
                [centerX - size, centerY + size],
                [centerX, centerY - size]
            ];
            triCoords.forEach(([x, y]) => {
                shapePoints.push({ x, y, color: currentColor, size: brushSize });
            });
            break;
            
        case 'star':
            for (let i = 0; i < 10; i++) {
                const angle = (i * Math.PI) / 5;
                const radius = i % 2 === 0 ? size : size * 0.5;
                const x = centerX + Math.cos(angle) * radius;
                const y = centerY + Math.sin(angle) * radius;
                shapePoints.push({ x, y, color: currentColor, size: brushSize });
            }
            break;
            
        case 'heart':
            for (let t = 0; t <= 2 * Math.PI; t += 0.1) {
                const x = centerX + size * 0.5 * (16 * Math.sin(t) ** 3);
                const y = centerY - size * 0.5 * (13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t));
                shapePoints.push({ x, y, color: currentColor, size: brushSize });
            }
            break;
            
        case 'house':
            // Draw house outline
            const houseCoords = [
                // Base rectangle
                [centerX - size, centerY + size/2],
                [centerX + size, centerY + size/2],
                [centerX + size, centerY - size/4],
                [centerX - size, centerY - size/4],
                [centerX - size, centerY + size/2],
                // Roof triangle
                [centerX - size, centerY - size/4],
                [centerX, centerY - size],
                [centerX + size, centerY - size/4]
            ];
            houseCoords.forEach(([x, y]) => {
                shapePoints.push({ x, y, color: currentColor, size: brushSize });
            });
            break;
            
        case 'flower':
            // Draw flower petals
            for (let i = 0; i < 8; i++) {
                const angle = (i * Math.PI) / 4;
                for (let r = size * 0.3; r <= size; r += 10) {
                    const x = centerX + Math.cos(angle) * r;
                    const y = centerY + Math.sin(angle) * r;
                    shapePoints.push({ x, y, color: currentColor, size: brushSize });
                }
            }
            // Center circle
            for (let i = 0; i <= 360; i += 10) {
                const x = centerX + Math.cos(i * Math.PI / 180) * size * 0.2;
                const y = centerY + Math.sin(i * Math.PI / 180) * size * 0.2;
                shapePoints.push({ x, y, color: currentColor, size: brushSize });
            }
            break;
            
        case 'car':
            // Draw car outline
            const carCoords = [
                // Body
                [centerX - size, centerY + size/3],
                [centerX + size, centerY + size/3],
                [centerX + size, centerY - size/3],
                [centerX + size/2, centerY - size/2],
                [centerX - size/2, centerY - size/2],
                [centerX - size, centerY - size/3],
                [centerX - size, centerY + size/3]
            ];
            carCoords.forEach(([x, y]) => {
                shapePoints.push({ x, y, color: currentColor, size: brushSize });
            });
            // Wheels
            for (let i = 0; i <= 360; i += 15) {
                const wheel1X = centerX - size/2 + Math.cos(i * Math.PI / 180) * size/6;
                const wheel1Y = centerY + size/3 + Math.sin(i * Math.PI / 180) * size/6;
                const wheel2X = centerX + size/2 + Math.cos(i * Math.PI / 180) * size/6;
                const wheel2Y = centerY + size/3 + Math.sin(i * Math.PI / 180) * size/6;
                shapePoints.push({ x: wheel1X, y: wheel1Y, color: currentColor, size: brushSize });
                shapePoints.push({ x: wheel2X, y: wheel2Y, color: currentColor, size: brushSize });
            }
            break;
            
        case 'tree':
            // Tree trunk
            const trunkCoords = [
                [centerX - size/8, centerY + size],
                [centerX + size/8, centerY + size],
                [centerX + size/8, centerY + size/4],
                [centerX - size/8, centerY + size/4],
                [centerX - size/8, centerY + size]
            ];
            trunkCoords.forEach(([x, y]) => {
                shapePoints.push({ x, y, color: currentColor, size: brushSize });
            });
            // Tree crown (circle)
            for (let i = 0; i <= 360; i += 5) {
                const x = centerX + Math.cos(i * Math.PI / 180) * size * 0.7;
                const y = centerY - size/4 + Math.sin(i * Math.PI / 180) * size * 0.7;
                shapePoints.push({ x, y, color: currentColor, size: brushSize });
            }
            break;
            
        default:
            // Default to circle for unknown shapes
            for (let i = 0; i <= 360; i += 5) {
                const x = centerX + Math.cos(i * Math.PI / 180) * size;
                const y = centerY + Math.sin(i * Math.PI / 180) * size;
                shapePoints.push({ x, y, color: currentColor, size: brushSize });
            }
    }
    
    // Draw the shape
    if (shapePoints.length > 0) {
        ctx.beginPath();
        ctx.moveTo(shapePoints[0].x, shapePoints[0].y);
        
        for (let i = 1; i < shapePoints.length; i++) {
            ctx.lineTo(shapePoints[i].x, shapePoints[i].y);
        }
        
        ctx.stroke();
        
        // Store as stroke data
        strokes = [shapePoints];
    }
}