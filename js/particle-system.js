// Particle System and Path Optimization

// Douglas-Peucker Algorithm Implementation
function douglasPeucker(points, epsilon) {
    if (points.length <= 2) return points;
    
    let dmax = 0;
    let index = 0;
    const end = points.length - 1;
    
    for (let i = 1; i < end; i++) {
        const d = perpendicularDistance(points[i], points[0], points[end]);
        if (d > dmax) {
            index = i;
            dmax = d;
        }
    }
    
    if (dmax > epsilon) {
        const recResults1 = douglasPeucker(points.slice(0, index + 1), epsilon);
        const recResults2 = douglasPeucker(points.slice(index), epsilon);
        
        return recResults1.slice(0, -1).concat(recResults2);
    } else {
        return [points[0], points[end]];
    }
}

function perpendicularDistance(point, lineStart, lineEnd) {
    const A = lineEnd.x - lineStart.x;
    const B = lineEnd.y - lineStart.y;
    const C = point.x - lineStart.x;
    const D = point.y - lineStart.y;
    
    const dot = A * C + B * D;
    const lenSq = A * A + B * B;
    let param = -1;
    
    if (lenSq !== 0) param = dot / lenSq;
    
    let xx, yy;
    if (param < 0) {
        xx = lineStart.x;
        yy = lineStart.y;
    } else if (param > 1) {
        xx = lineEnd.x;
        yy = lineEnd.y;
    } else {
        xx = lineStart.x + param * A;
        yy = lineStart.y + param * B;
    }
    
    const dx = point.x - xx;
    const dy = point.y - yy;
    return Math.sqrt(dx * dx + dy * dy);
}

// Visvalingam-Whyatt Algorithm Implementation
function visvalingamWhyatt(points, minArea) {
    if (points.length <= 3) return points;
    
    const result = [...points];
    const areas = [];
    
    // Calculate initial areas
    for (let i = 1; i < result.length - 1; i++) {
        areas[i] = triangleArea(result[i-1], result[i], result[i+1]);
    }
    
    while (result.length > 3) {
        let minIndex = 1;
        let minValue = areas[1];
        
        for (let i = 2; i < result.length - 1; i++) {
            if (areas[i] < minValue) {
                minValue = areas[i];
                minIndex = i;
            }
        }
        
        if (minValue > minArea) break;
        
        // Remove point and recalculate neighboring areas
        result.splice(minIndex, 1);
        areas.splice(minIndex, 1);
        
        if (minIndex > 1) {
            areas[minIndex - 1] = triangleArea(result[minIndex-2], result[minIndex-1], result[minIndex]);
        }
        if (minIndex < result.length - 1) {
            areas[minIndex] = triangleArea(result[minIndex-1], result[minIndex], result[minIndex+1]);
        }
    }
    
    return result;
}

function triangleArea(p1, p2, p3) {
    return Math.abs((p1.x * (p2.y - p3.y) + p2.x * (p3.y - p1.y) + p3.x * (p1.y - p2.y)) / 2);
}

function optimizeStroke(points, algorithm) {
    if (points.length < 3) return points;
    
    const quality = document.getElementById('quality').value;
    let epsilon, minArea;
    
    switch (quality) {
        case 'high':
            epsilon = 2;
            minArea = 4;
            break;
        case 'medium':
            epsilon = 5;
            minArea = 15;
            break;
        case 'low':
            epsilon = 10;
            minArea = 30;
            break;
    }
    
    switch (algorithm) {
        case 'douglas-peucker':
            return douglasPeucker(points, epsilon);
        case 'visvalingam':
            return visvalingamWhyatt(points, minArea);
        case 'none':
            return points.filter((_, index) => index % 3 === 0);
        default:
            return points;
    }
}

function generateGradientColors(baseColor, count) {
    const colors = [];
    
    // Create bright, vibrant colors for gradient
    const hsl = {};
    baseColor.getHSL(hsl);
    
    // Create vibrant color stops with high saturation
    const colorStops = [
        new THREE.Color().setHSL(hsl.h, 1.0, 0.6), // Bright base
        new THREE.Color().setHSL((hsl.h + 0.15) % 1, 0.9, 0.65), // Vibrant shift
        new THREE.Color().setHSL((hsl.h + 0.3) % 1, 0.95, 0.7), // Electric variant
        new THREE.Color().setHSL((hsl.h + 0.45) % 1, 1.0, 0.55), // Neon finish
        new THREE.Color().setHSL((hsl.h - 0.2 + 1) % 1, 0.9, 0.6) // Bright contrast
    ];
    
    for (let i = 0; i < count; i++) {
        const t = i / (count - 1);
        
        // Choose color stops based on position for more variation
        let color1, color2, localT;
        
        if (t < 0.25) {
            color1 = colorStops[0];
            color2 = colorStops[1];
            localT = t / 0.25;
        } else if (t < 0.5) {
            color1 = colorStops[1];
            color2 = colorStops[2];
            localT = (t - 0.25) / 0.25;
        } else if (t < 0.75) {
            color1 = colorStops[2];
            color2 = colorStops[3];
            localT = (t - 0.5) / 0.25;
        } else {
            color1 = colorStops[3];
            color2 = colorStops[4];
            localT = (t - 0.75) / 0.25;
        }
        
        // Interpolate between colors
        const gradientColor = new THREE.Color();
        gradientColor.lerpColors(color1, color2, localT);
        
        colors.push(gradientColor);
    }
    
    return colors;
}

function createParticleSystem(strokePoints, color, particleCount) {
    if (strokePoints.length < 2) return null;

    try {
        // Convert stroke points to 3D path
        const path3D = strokePoints.map(point => new THREE.Vector3(
            (point.x - canvas.width / 2) * 0.02,
            -(point.y - canvas.height / 2) * 0.02,
            0
        ));

        // Create curve for smooth interpolation
        const curve = new THREE.CatmullRomCurve3(path3D);
        
        // Create instance group for spheres
        const sphereGeometry = new THREE.SphereGeometry(0.15, 8, 8);
        const spheres = [];
        const targetPositions = [];
        const originalPositions = [];
        
        const baseColor = new THREE.Color(color);
        
        // Create gradient colors along the stroke
        const gradientColors = generateGradientColors(baseColor, particleCount);
        
        for (let i = 0; i < particleCount; i++) {
            try {
                // Position along curve (0 to 1)
                const t = i / (particleCount - 1);
                const pointOnCurve = curve.getPoint(t);
                
                // Target position (where particles should form the shape)
                targetPositions.push(pointOnCurve.x, pointOnCurve.y, pointOnCurve.z);
                
                // Starting position (random scattered)
                const startX = pointOnCurve.x + (Math.random() - 0.5) * 20;
                const startY = pointOnCurve.y + (Math.random() - 0.5) * 20;
                const startZ = pointOnCurve.z + (Math.random() - 0.5) * 20;
                
                originalPositions.push(startX, startY, startZ);
                
                // Create individual sphere with safe material
                const gradientColor = gradientColors[i];
                const material = new THREE.MeshBasicMaterial({
                    color: gradientColor.clone(),
                    transparent: true,
                    opacity: 0.8
                });
                
                // Safely add emission for glowing effect
                try {
                    material.emissive = gradientColor.clone();
                    material.emissiveIntensity = 0.2;
                } catch (emissiveError) {
                    console.warn('Could not set emissive properties:', emissiveError);
                }
                
                const sphere = new THREE.Mesh(sphereGeometry.clone(), material);
                sphere.position.set(startX, startY, startZ);
                
                // Add random size variation
                const scale = 0.7 + Math.random() * 0.6;
                sphere.scale.setScalar(scale);
                
                // Add to scene with error handling
                if (scene) {
                    scene.add(sphere);
                    spheres.push(sphere);
                }
                
            } catch (sphereError) {
                console.warn(`Error creating particle sphere ${i}:`, sphereError);
            }
        }

        return {
            spheres: spheres,
            targetPositions: targetPositions,
            originalPositions: originalPositions,
            formationProgress: 0,
            isForming: true,
            gradientColors: gradientColors,
            particleCount: particleCount,
            geometry: sphereGeometry // Keep reference for cleanup
        };
        
    } catch (error) {
        console.error('Error creating particle system:', error);
        return null;
    }
}

function updateParticleSystems() {
    if (!particleSystems || particleSystems.length === 0) return;
    
    particleSystems.forEach((system, systemIndex) => {
        try {
            if (!system || !system.spheres) return;
            
            for (let i = 0; i < system.particleCount && i < system.spheres.length; i++) {
                try {
                    const sphere = system.spheres[i];
                    if (!sphere || !sphere.position || !sphere.material) continue;
                    
                    const i3 = i * 3;
                    
                    if (system.isForming && system.formationProgress < 1) {
                        // Animate particles toward target positions
                        if (system.targetPositions && system.targetPositions.length > i3 + 2) {
                            const targetX = system.targetPositions[i3];
                            const targetY = system.targetPositions[i3 + 1];
                            const targetZ = system.targetPositions[i3 + 2];
                            
                            const currentX = sphere.position.x;
                            const currentY = sphere.position.y;
                            const currentZ = sphere.position.z;
                            
                            // Very smooth interpolation toward target
                            const speed = 0.015;
                            sphere.position.x += (targetX - currentX) * speed;
                            sphere.position.y += (targetY - currentY) * speed;
                            sphere.position.z += (targetZ - currentZ) * speed;
                        }
                        
                    } else {
                        // Particles are in formation - very subtle floating animation
                        if (system.targetPositions && system.targetPositions.length > i3 + 2) {
                            const time = Date.now() * 0.0003;
                            const targetX = system.targetPositions[i3];
                            const targetY = system.targetPositions[i3 + 1];
                            const targetZ = system.targetPositions[i3 + 2];
                            
                            // Extremely subtle movements
                            sphere.position.x = targetX + Math.sin(time + i * 0.05) * 0.05;
                            sphere.position.y = targetY + Math.cos(time + i * 0.03) * 0.05;
                            sphere.position.z = targetZ + Math.sin(time * 0.7 + i * 0.02) * 0.08;
                        }
                    }
                    
                    // Subtle rotation
                    if (sphere.rotation) {
                        sphere.rotation.x += 0.01;
                        sphere.rotation.y += 0.005;
                        sphere.rotation.z += 0.008;
                    }
                    
                    // Subtle breathing effect on material opacity
                    try {
                        const time = Date.now() * 0.001;
                        const breathe = 0.7 + Math.sin(time + i * 0.02) * 0.1;
                        if (sphere.material && typeof sphere.material.opacity !== 'undefined') {
                            sphere.material.opacity = breathe;
                        }
                    } catch (materialError) {
                        // Skip material updates if there's an error
                    }
                    
                    // Subtle size pulsing
                    try {
                        const time = Date.now() * 0.001;
                        const pulse = 0.9 + Math.sin(time * 2 + i * 0.1) * 0.1;
                        const baseScale = 0.7 + (i % 10) * 0.06; // More consistent scaling
                        if (sphere.scale && sphere.scale.setScalar) {
                            sphere.scale.setScalar(pulse * baseScale);
                        }
                    } catch (scaleError) {
                        // Skip scale updates if there's an error
                    }
                    
                } catch (sphereError) {
                    console.warn(`Error updating particle ${i} in system ${systemIndex}:`, sphereError);
                }
            }
            
            // Update formation progress very smoothly
            if (system.isForming) {
                system.formationProgress += 0.003;
                if (system.formationProgress >= 1) {
                    system.isForming = false;
                }
            }
            
        } catch (systemError) {
            console.warn(`Error updating particle system ${systemIndex}:`, systemError);
        }
    });
}

function generateParticleShapes() {
    if (strokes.length === 0) {
        alert('Draw something first!');
        return;
    }

    clearThreeJS();
    
    const algorithm = document.getElementById('algorithm').value;
    const particleCount = parseInt(document.getElementById('particleCount').value);

    strokes.forEach((stroke, strokeIndex) => {
        if (stroke.length < 2) return;
        
        // Optimize the stroke
        const optimizedStroke = optimizeStroke(stroke, algorithm);
        const strokeColor = stroke[0].color || currentColor;
        
        // Create particle system for this stroke
        const particleSystem = createParticleSystem(optimizedStroke, strokeColor, particleCount);
        
        if (particleSystem) {
            particleSystems.push(particleSystem);
        }
    });

    updateDebugInfo();
}