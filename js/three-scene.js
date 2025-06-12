// Three.js Scene Setup and 3D Generation Functions

function initThreeJS() {
    try {
        const container = document.getElementById('threejs-container');
        
        scene = new THREE.Scene();
        
        // Set pure black background
        scene.background = new THREE.Color(0x000000);

        camera = new THREE.PerspectiveCamera(75, (window.innerWidth - 200) / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 0, 30);

        renderer = new THREE.WebGLRenderer({ 
            antialias: true, 
            alpha: true,
            powerPreference: "high-performance"
        });
        renderer.setSize(window.innerWidth - 200, window.innerHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(renderer.domElement);

        // Enhanced lighting setup
        const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(20, 20, 20);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        scene.add(directionalLight);

        // Multiple colored point lights for dynamic effects
        const pointLight1 = new THREE.PointLight(0xff6b6b, 0.6, 100);
        pointLight1.position.set(15, 15, 15);
        scene.add(pointLight1);

        const pointLight2 = new THREE.PointLight(0x4ecdc4, 0.6, 100);
        pointLight2.position.set(-15, -15, 15);
        scene.add(pointLight2);

        // Create background circulating spheres
        createBackgroundSpheres();

        // Initialize simple AI recognition
        initSimpleAI();

        threeJSReady = true;
        animate();
        
        window.addEventListener('resize', () => {
            try {
                camera.aspect = (window.innerWidth - 200) / window.innerHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(window.innerWidth - 200, window.innerHeight);
            } catch (e) {
                console.warn('Resize error:', e);
            }
        });
        
        console.log('Three.js initialized successfully');
    } catch (error) {
        console.error('Three.js initialization failed:', error);
        // Fallback: try to reinitialize after delay
        setTimeout(() => {
            if (!threeJSReady) {
                console.log('Retrying Three.js initialization...');
                initThreeJS();
            }
        }, 1000);
    }
}

function createSafeMaterial(color, options = {}) {
    try {
        // Use MeshBasicMaterial to avoid shader uniform issues
        const material = new THREE.MeshBasicMaterial({
            color: new THREE.Color(color),
            transparent: options.transparent !== false,
            opacity: options.opacity || 0.8,
            side: options.side || THREE.FrontSide
        });
        
        // Only add advanced properties if they're safe
        if (options.wireframe) {
            material.wireframe = true;
        }
        
        return material;
    } catch (error) {
        console.warn('Error creating material, using fallback:', error);
        // Fallback to simplest possible material
        return new THREE.MeshBasicMaterial({ color: color || 0xff6b6b });
    }
}

function createBackgroundSpheres() {
    try {
        const sphereCount = 25;
        const brightColors = [
            0xff0040, 0xff4000, 0xff8000, 0xffff00, 0x80ff00,
            0x00ff00, 0x00ff80, 0x00ffff, 0x0080ff, 0x0040ff,
            0x8000ff, 0xff00ff, 0xff0080, 0xff4080, 0x80ff40,
            0x40ff80, 0x4080ff, 0x8040ff, 0xff8040, 0x40ffff
        ];

        for (let i = 0; i < sphereCount; i++) {
            try {
                // Random size between 0.3 and 1.2
                const size = 0.3 + Math.random() * 0.9;
                
                const geometry = new THREE.SphereGeometry(size, 12, 12);
                const sphereColor = brightColors[Math.floor(Math.random() * brightColors.length)];
                
                // Use safe material creation
                const material = createSafeMaterial(sphereColor, {
                    transparent: true,
                    opacity: 0.7
                });

                const sphere = new THREE.Mesh(geometry, material);
                
                // Random position around the edges of the screen
                const radius = 40 + Math.random() * 20;
                const angle = Math.random() * Math.PI * 2;
                const height = (Math.random() - 0.5) * 40;
                
                sphere.position.set(
                    Math.cos(angle) * radius,
                    height,
                    Math.sin(angle) * radius
                );

                // Animation properties
                sphere.userData = {
                    orbitRadius: radius,
                    orbitSpeed: 0.3 + Math.random() * 0.7,
                    orbitAngle: angle,
                    verticalOffset: height,
                    verticalSpeed: 0.5 + Math.random() * 0.5,
                    rotationSpeed: {
                        x: (Math.random() - 0.5) * 0.02,
                        y: (Math.random() - 0.5) * 0.02,
                        z: (Math.random() - 0.5) * 0.02
                    }
                };

                if (scene) {
                    scene.add(sphere);
                    backgroundSpheres.push(sphere);
                }
            } catch (sphereError) {
                console.warn(`Error creating background sphere ${i}:`, sphereError);
            }
        }
        console.log(`Created ${backgroundSpheres.length} background spheres`);
    } catch (error) {
        console.error('Error creating background spheres:', error);
    }
}

function updateBackgroundSpheres() {
    if (!backgroundSpheres || backgroundSpheres.length === 0) return;
    
    const time = Date.now() * 0.001;
    
    backgroundSpheres.forEach((sphere, index) => {
        try {
            if (!sphere || !sphere.userData || !sphere.position) return;
            
            const userData = sphere.userData;
            
            // Circular orbit motion
            userData.orbitAngle += userData.orbitSpeed * 0.01;
            
            const x = Math.cos(userData.orbitAngle) * userData.orbitRadius;
            const z = Math.sin(userData.orbitAngle) * userData.orbitRadius;
            const y = userData.verticalOffset + Math.sin(time * userData.verticalSpeed) * 3;
            
            sphere.position.set(x, y, z);
            
            // Rotation
            if (sphere.rotation) {
                sphere.rotation.x += userData.rotationSpeed.x;
                sphere.rotation.y += userData.rotationSpeed.y;
                sphere.rotation.z += userData.rotationSpeed.z;
            }
            
            // Subtle size pulsing
            if (sphere.scale && sphere.scale.setScalar) {
                const scale = 1 + Math.sin(time * 2 + userData.orbitAngle) * 0.1;
                sphere.scale.setScalar(scale);
            }
        } catch (sphereError) {
            console.warn(`Error updating background sphere ${index}:`, sphereError);
        }
    });
}

function createTubeFromStroke(strokePoints, color, thickness) {
    if (strokePoints.length < 2) return null;
    
    try {
        // Convert 2D points to 3D path
        const path3D = strokePoints.map(point => new THREE.Vector3(
            (point.x - canvas.width / 2) * 0.02,
            -(point.y - canvas.height / 2) * 0.02,
            (Math.random() - 0.5) * 2
        ));
        
        // Create curve path
        const curve = new THREE.CatmullRomCurve3(path3D);
        
        const geometry = new THREE.TubeGeometry(curve, Math.max(strokePoints.length * 2, 64), thickness, 8, false);
        
        // Use safe material creation
        const material = createSafeMaterial(color, {
            transparent: true,
            opacity: 0.9
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        
        // Add animation properties
        mesh.userData = {
            originalPosition: mesh.position.clone(),
            animationSpeed: Math.random() * 0.01 + 0.005,
            animationOffset: Math.random() * Math.PI * 2,
            strokeColor: color
        };
        
        return mesh;
    } catch (error) {
        console.error('Error creating tube from stroke:', error);
        return null;
    }
}

function generate3DOptimized() {
    if (strokes.length === 0) {
        alert('Draw something first!');
        return;
    }

    clearThreeJS();
    
    const algorithm = document.getElementById('algorithm').value;
    let totalOptimizedPoints = 0;

    strokes.forEach((stroke, index) => {
        if (stroke.length < 2) return;
        
        // Optimize the stroke using selected algorithm
        const optimizedStroke = optimizeStroke(stroke, algorithm);
        totalOptimizedPoints += optimizedStroke.length;
        
        // Get color from first point of stroke
        const strokeColor = stroke[0].color || currentColor;
        
        // Create 3D tube from optimized stroke
        const tube = createTubeFromStroke(optimizedStroke, strokeColor, thickness);
        
        if (tube && scene) {
            scene.add(tube);
            objects3D.push(tube);
        }
    });

    if (document.getElementById('optimizedCount')) {
        document.getElementById('optimizedCount').textContent = totalOptimizedPoints;
    }
    updateDebugInfo();
}

function generate3DSpheres() {
    if (strokes.length === 0) {
        alert('Draw something first!');
        return;
    }

    clearThreeJS();

    // Flatten all strokes into single array for sphere generation
    const allPoints = strokes.flat().filter((_, index) => index % 2 === 0);

    allPoints.forEach((point, index) => {
        setTimeout(() => {
            try {
                const geometry = new THREE.SphereGeometry(
                    Math.max((point.size || 8) * 0.05, 0.2), 
                    12, 
                    12
                );
                
                const material = createSafeMaterial(point.color || currentColor, {
                    transparent: true,
                    opacity: 0.9
                });

                const sphere = new THREE.Mesh(geometry, material);
                
                const x = (point.x - canvas.width / 2) * 0.03;
                const y = -(point.y - canvas.height / 2) * 0.03;
                const z = (Math.random() - 0.5) * 10;

                sphere.position.set(x, y, z);

                sphere.userData = {
                    originalPosition: { x, y, z },
                    animationSpeed: Math.random() * 0.02 + 0.01,
                    animationOffset: Math.random() * Math.PI * 2
                };

                if (scene) {
                    scene.add(sphere);
                    objects3D.push(sphere);
                }
            } catch (sphereError) {
                console.warn(`Error creating sphere ${index}:`, sphereError);
            }
        }, index * 20);
    });

    updateDebugInfo();
}

function safeRender() {
    try {
        if (renderer && scene && camera) {
            renderer.render(scene, camera);
        }
    } catch (renderError) {
        console.warn('Safe render failed, skipping frame:', renderError);
        // Don't throw - just skip this frame
    }
}

function animate() {
    try {
        requestAnimationFrame(animate);

        // Check if Three.js is ready
        if (!threeJSReady || !renderer || !scene || !camera) {
            return;
        }

        // Update particle systems with safety check
        if (typeof updateParticleSystems === 'function' && 
            particleSystems && 
            Array.isArray(particleSystems) && 
            particleSystems.length > 0) {
            try {
                updateParticleSystems();
            } catch (particleError) {
                console.warn('Particle system update error:', particleError);
            }
        }
        
        // Update background spheres with safety check
        if (typeof updateBackgroundSpheres === 'function' && 
            backgroundSpheres && 
            Array.isArray(backgroundSpheres) && 
            backgroundSpheres.length > 0) {
            try {
                updateBackgroundSpheres();
            } catch (backgroundError) {
                console.warn('Background spheres update error:', backgroundError);
            }
        }

        // Animate 3D objects with safety checks
        if (objects3D && Array.isArray(objects3D) && objects3D.length > 0) {
            objects3D.forEach((obj, index) => {
                try {
                    if (!obj || !obj.userData || !obj.position || !obj.rotation) return;
                    
                    const userData = obj.userData;
                    if (userData && userData.animationSpeed) {
                        const time = Date.now() * userData.animationSpeed;
                        
                        if (userData.originalPosition) {
                            obj.position.y = userData.originalPosition.y + 
                                Math.sin(time + userData.animationOffset) * 0.5;
                        }
                        
                        obj.rotation.x += 0.005;
                        obj.rotation.y += 0.01;
                    }
                } catch (objError) {
                    console.warn(`Object animation error at index ${index}:`, objError);
                }
            });
        }

        // Animate point lights with safety checks
        if (scene && scene.children && Array.isArray(scene.children)) {
            const time = Date.now() * 0.001;
            scene.children.forEach((child, index) => {
                try {
                    if (child && child.type === 'PointLight' && child.position) {
                        child.position.x = Math.sin(time + child.position.z * 0.1) * 20;
                        child.position.y = Math.cos(time + child.position.z * 0.1) * 20;
                    }
                } catch (lightError) {
                    console.warn(`Light animation error at index ${index}:`, lightError);
                }
            });
        }

        // Safe render call
        safeRender();

        // Update frame counter if it exists
        if (typeof frameCount !== 'undefined') {
            frameCount++;
        }
        
    } catch (error) {
        console.warn('Animation loop error (continuing):', error);
        // Continue animation even with errors
    }
}