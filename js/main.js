// Global variables
let canvas, ctx;
let isDrawing = false;
let currentColor = '#ff6b6b';
let brushSize = 8;
let thickness = 0.8;
let opacity = 0.8;
let currentMode = 'draw';

// Drawing data organized by strokes
let strokes = [];
let currentStroke = [];

// Three.js variables
let scene, camera, renderer;
let objects3D = [];
let particleSystems = [];
let backgroundSpheres = [];
let threeJSReady = false;

// AI Recognition variables
let modelLoaded = false;
let currentPredictions = [];
let predictionTimeout = null;
let autoDrawSuggestions = [];
let currentDrawingData = [];

// Performance tracking
let frameCount = 0;
let lastTime = performance.now();

// Mouse/touch tracking
let lastMousePos = { x: 0, y: 0 };
let mouseDown = false;

// Initialize everything when page loads
document.addEventListener('DOMContentLoaded', () => {
    try {
        console.log('Page loaded, initializing...');
        
        // Initialize all arrays to prevent undefined errors
        strokes = [];
        currentStroke = [];
        objects3D = [];
        particleSystems = [];
        backgroundSpheres = [];
        autoDrawSuggestions = [];
        currentDrawingData = [];
        
        // Initialize canvas and drawing
        initCanvas();
        setupEventListeners();
        updateDebugInfo();
        startPerformanceMonitoring();
        
        // Check if Three.js is available
        if (typeof THREE === 'undefined') {
            console.error('Three.js failed to load');
            setTimeout(() => {
                if (typeof THREE !== 'undefined') {
                    initThreeJS();
                } else {
                    console.error('Three.js still not available after delay');
                }
            }, 2000);
        } else {
            initThreeJS();
        }
    } catch (error) {
        console.error('Initialization error:', error);
        
        // Fallback initialization
        setTimeout(() => {
            try {
                if (typeof THREE !== 'undefined' && !threeJSReady) {
                    initThreeJS();
                }
            } catch (fallbackError) {
                console.error('Fallback initialization failed:', fallbackError);
            }
        }, 3000);
    }
});

// Utility Functions
function updateDebugInfo() {
    const totalPoints = strokes.reduce((sum, stroke) => sum + stroke.length, 0);
    document.getElementById('pointCount').textContent = totalPoints;
    document.getElementById('strokeCount').textContent = strokes.length;
    document.getElementById('objectCount').textContent = objects3D.length + particleSystems.length;
    document.getElementById('currentMode').textContent = currentMode;
}

function startPerformanceMonitoring() {
    setInterval(() => {
        const currentTime = performance.now();
        const deltaTime = currentTime - lastTime;
        const fps = Math.round(1000 / deltaTime);
        
        document.getElementById('fps').textContent = fps;
        lastTime = currentTime;
    }, 1000);
}

// Control Functions
function selectColor(color) {
    currentColor = color;
    document.querySelectorAll('.color-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    updateDebugInfo();
}

function updateBrushSize() {
    brushSize = document.getElementById('brushSize').value;
}

function updateThickness() {
    thickness = document.getElementById('thickness').value;
}

function updateOpacity() {
    opacity = document.getElementById('opacity').value;
}

function setMode(mode) {
    currentMode = mode;
    
    document.querySelectorAll('.mode-toggle button').forEach(btn => 
        btn.classList.remove('active'));
    document.getElementById(mode + 'Mode').classList.add('active');
    
    if (mode === 'draw') {
        canvas.style.cursor = 'crosshair';
    } else {
        canvas.style.cursor = 'grab';
    }
    
    updateDebugInfo();
}

function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    strokes = [];
    currentStroke = [];
    currentDrawingData = [];
    autoDrawSuggestions = [];
    updateSuggestionsDisplay([]);
    updatePredictionStatus('Start drawing to see predictions!');
    updateDebugInfo();
}

function clearAll() {
    clearCanvas();
    clearThreeJS();
}

function clearThreeJS() {
    objects3D.forEach(obj => {
        scene.remove(obj);
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
    });
    objects3D = [];
    
    particleSystems.forEach(system => {
        // Remove individual spheres
        system.spheres.forEach(sphere => {
            scene.remove(sphere);
            if (sphere.geometry) sphere.geometry.dispose();
            if (sphere.material) sphere.material.dispose();
        });
        // Clean up shared geometry
        if (system.geometry) system.geometry.dispose();
    });
    particleSystems = [];
    
    updateDebugInfo();
}