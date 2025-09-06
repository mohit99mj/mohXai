document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element Selection ---
    const header = document.querySelector('.header');
    const hamburger = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    const themeToggle = document.getElementById('theme-toggle');
    const html = document.documentElement;
    const typingText = document.querySelector('.typing-text');
    const contactForm = document.querySelector('.contact-form');

    // --- Initializations ---
    AOS.init({
        duration: 800,
        easing: 'ease-in-out',
        once: true
    });

    // --- Header Scroll Effect ---
    const handleScroll = () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    };
    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial check

    // --- Mobile Menu ---
    hamburger?.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navLinks.classList.toggle('active');
        document.body.style.overflow = navLinks.classList.contains('active') ? 'hidden' : '';
    });

    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            if (navLinks.classList.contains('active')) {
                hamburger?.classList.remove('active');
                navLinks?.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    });

    // --- Smooth Scrolling ---
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                const y = targetElement.getBoundingClientRect().top + window.scrollY - 80;
                window.scrollTo({ top: y, behavior: 'smooth' });
            }
        });
    });
    
    // --- Active Nav Link on Scroll ---
    const sections = document.querySelectorAll('section[id]');
    const navLi = document.querySelectorAll('.nav-links li a');
    window.addEventListener('scroll', () => {
        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            if (scrollY >= sectionTop - 100) {
                current = section.getAttribute('id');
            }
        });
        navLi.forEach(a => {
            a.classList.remove('active');
            if (a.getAttribute('href').includes(current)) {
                a.classList.add('active');
            }
        });
    });


    // --- Dark/Light Mode Theme ---
    const currentTheme = localStorage.getItem('theme') || 'dark';
    html.setAttribute('data-theme', currentTheme);
    themeToggle.checked = currentTheme === 'light';

    themeToggle?.addEventListener('change', (e) => {
        const newTheme = e.target.checked ? 'light' : 'dark';
        html.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    });

    // --- Hero Section Typing Animation ---
    if (typingText) {
        const texts = [
            'AI & Machine Learning Engineer',
            'Python Developer',
            'Data Scientist',
            'Creative Problem Solver'
        ];
        let textIndex = 0;
        let charIndex = 0;
        let isDeleting = false;

        function type() {
            const currentText = texts[textIndex];
            const typingSpeed = isDeleting ? 75 : 150;

            typingText.textContent = currentText.substring(0, charIndex);

            if (!isDeleting && charIndex < currentText.length) {
                charIndex++;
            } else if (isDeleting && charIndex > 0) {
                charIndex--;
            } else {
                isDeleting = !isDeleting;
                if (!isDeleting) {
                    textIndex = (textIndex + 1) % texts.length;
                }
            }
            setTimeout(type, isDeleting ? typingSpeed : (charIndex === currentText.length ? 2000 : typingSpeed));
        }
        type();
    }

    // --- Animate Skill Bars on Scroll ---
    const animateSkillBars = () => {
        document.querySelectorAll('.skills-v3 .skill-fill').forEach(bar => {
            const rect = bar.getBoundingClientRect();
            if (rect.top < window.innerHeight && !bar.classList.contains('animated')) {
                const width = bar.getAttribute('data-width');
                if (width) {
                    bar.style.width = width + '%';
                    bar.classList.add('animated');
                }
            }
        });
    };
    window.addEventListener('scroll', animateSkillBars);
    animateSkillBars();

    // --- Contact Form Submission ---
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = contactForm.querySelector('button[type="submit"]');
            const originalBtnContent = submitBtn.innerHTML;
            
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Sending...</span>';
            
            try {
                // Simulate API call delay
                await new Promise(resolve => setTimeout(resolve, 1500));
                // Replace with actual form submission logic (e.g., fetch API)
                showNotification('Message sent successfully!', 'success');
                contactForm.reset();
            } catch (error) {
                console.error('Error:', error);
                showNotification('Failed to send message. Please try again.', 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnContent;
            }
        });
    }

    // --- Notification Function ---
    function showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i><span>${message}</span>`;
        document.body.appendChild(notification);
        
        setTimeout(() => notification.classList.add('show'), 10);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 500);
        }, 3000);
    }

    // --- Custom Cursor & Interactive Effects ---
    const dot = document.querySelector('.cursor-dot');
    const ring = document.querySelector('.cursor-ring');
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (dot && ring && !prefersReducedMotion) {
        let mouseX = window.innerWidth / 2, mouseY = window.innerHeight / 2;
        let ringX = mouseX, ringY = mouseY;

        window.addEventListener('mousemove', e => {
            mouseX = e.clientX;
            mouseY = e.clientY;
        });

        const loop = () => {
            const lerp = (a, b, n) => (1 - n) * a + n * b;
            dot.style.transform = `translate(${mouseX}px, ${mouseY}px)`;
            ringX = lerp(ringX, mouseX, 0.15);
            ringY = lerp(ringY, mouseY, 0.15);
            ring.style.transform = `translate(${ringX - 20}px, ${ringY - 20}px)`;
            requestAnimationFrame(loop);
        };
        loop();

        document.querySelectorAll('a, button, .btn, .project-card, .certificate-card, .skills-card').forEach(el => {
            el.addEventListener('mouseenter', () => ring.classList.add('active'));
            el.addEventListener('mouseleave', () => ring.classList.remove('active'));
        });
    }

    // --- Card Tilt + Shine Effect ---
    document.querySelectorAll('.project-card, .certificate-card, .skills-card').forEach(card => {
        if (prefersReducedMotion) return;
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width;
            const y = (e.clientY - rect.top) / rect.height;
            const tiltX = (y - 0.5) * -15;
            const tiltY = (x - 0.5) * 15;
            card.style.transform = `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale(1.02)`;
            card.style.setProperty('--mx', `${x * 100}%`);
            card.style.setProperty('--my', `${y * 100}%`);
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)';
        });
    });


    // --- Advanced 3D Particle Background Scene ---
    let scene, camera, renderer, particles, clock;
    const mouse = new THREE.Vector2();

    function init3DScene() {
        const container = document.getElementById('3d-scene');
        if (!container) return;

        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.z = 2;

        renderer = new THREE.WebGLRenderer({ alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(window.innerWidth, window.innerHeight);
        container.appendChild(renderer.domElement);
        
        clock = new THREE.Clock();

        const particleCount = 5000;
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);

        const color1 = new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue('--primary').trim());
        const color2 = new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue('--secondary').trim());

        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 10;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 10;

            const mixedColor = color1.clone().lerp(color2, Math.random());
            colors[i * 3] = mixedColor.r;
            colors[i * 3 + 1] = mixedColor.g;
            colors[i * 3 + 2] = mixedColor.b;
            
            sizes[i] = Math.random() * 0.05 + 0.01;
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        const material = new THREE.ShaderMaterial({
            uniforms: { time: { value: 0 } },
            vertexShader: `
                attribute float size;
                varying vec3 vColor;
                void main() { 
                    vColor = color;
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = size * (300.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying vec3 vColor;
                void main() {
                    gl_FragColor = vec4(vColor, smoothstep(0.5, 0.1, length(gl_PointCoord - vec2(0.5))));
                }
            `,
            blending: THREE.AdditiveBlending,
            depthTest: false,
            transparent: true,
        });

        particles = new THREE.Points(geometry, material);
        scene.add(particles);

        window.addEventListener('resize', onWindowResize, false);
        window.addEventListener('mousemove', onMouseMove, false);
    }

    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    function onMouseMove(event) {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    }

    function animate3DScene() {
        requestAnimationFrame(animate3DScene);
        
        const elapsedTime = clock.getElapsedTime();
        
        // Update particles
        particles.rotation.y = elapsedTime * 0.05;
        particles.rotation.x = elapsedTime * 0.02;
        
        // Make scene react to mouse
        camera.position.x += (mouse.x * 0.5 - camera.position.x) * 0.05;
        camera.position.y += (mouse.y * 0.5 - camera.position.y) * 0.05;
        camera.lookAt(scene.position);

        renderer.render(scene, camera);
    }

    // Run the 3D scene
    init3DScene();
    animate3DScene();

    // --- PDF Modal Logic ---
    const pdfModal = document.getElementById('pdf-modal');
    const pdfViewer = document.getElementById('pdf-viewer');
    const closeModalBtn = document.querySelector('.modal-close-button');
    const certificateLinks = document.querySelectorAll('.certificate-link');

    const openModal = (pdfSrc) => {
        if (pdfModal && pdfViewer) {
            // Add #view=FitH to make the PDF fit the width of the container
            pdfViewer.setAttribute('src', `${pdfSrc}#view=FitH`);
            pdfModal.style.display = 'block';
            document.body.classList.add('modal-open');
        }
    };

    const closeModal = () => {
        if (pdfModal && pdfViewer) {
            pdfModal.style.display = 'none';
            pdfViewer.setAttribute('src', ''); // Stop loading
            document.body.classList.remove('modal-open');
        }
    };

    certificateLinks.forEach(link => {
        link.addEventListener('click', () => {
            const pdfSrc = link.getAttribute('data-pdf-src');
            if (pdfSrc) {
                openModal(pdfSrc);
            }
        });
    });

    if(closeModalBtn) {
        closeModalBtn.addEventListener('click', closeModal);
    }

    // Close modal if user clicks outside of the content
    window.addEventListener('click', (event) => {
        if (event.target === pdfModal) {
            closeModal();
        }
    });

    // Close modal with Escape key
    window.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && pdfModal.style.display === 'block') {
            closeModal();
        }
    });
});