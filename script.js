document.addEventListener('DOMContentLoaded', () => {
    // --- NUEVO: Lógica del precargador ---
    const preloader = document.querySelector('.preloader');
    if (preloader) {
        window.addEventListener('load', () => {
            preloader.classList.add('fade-out');
            setTimeout(() => {
                preloader.style.display = 'none';
            }, 500); // Coincide con la duración de la animación
        });
    }

    // --- DOM Element Selection ---
    const header = document.querySelector('.header');
    const hamburger = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    const themeToggle = document.getElementById('theme-toggle');
    const html = document.documentElement;
    const typingText = document.querySelector('.typing-text');
    const contactForm = document.querySelector('.contact-form');
    const jobTitleCycler = document.querySelector('.job-title-cycler');

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
    handleScroll();

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

    // --- Smooth Scrolling for anchor links ---
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
    if (sections.length > 0) {
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
                if(a.getAttribute('href').includes('#')) {
                    a.classList.remove('active');
                }
                if (current && a.getAttribute('href').includes(current)) {
                    a.classList.add('active');
                }
            });
        });
    }

    // --- Dark/Light Mode Theme ---
    const currentTheme = localStorage.getItem('theme') || 'dark';
    html.setAttribute('data-theme', currentTheme);
    if(themeToggle) {
       themeToggle.checked = currentTheme === 'light';
    }

    themeToggle?.addEventListener('change', (e) => {
        const newTheme = e.target.checked ? 'light' : 'dark';
        html.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    });

    // --- Hero Section Typing Animation (for name) ---
    if (typingText) {
        const texts = ['Mohit Singh ']; 
        let textIndex = 0;
        let charIndex = 0;
        let isDeleting = false;

        function type() {
            const currentText = texts[textIndex];
            const typingSpeed = isDeleting ? 100 : 200;
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
            setTimeout(type, isDeleting ? typingSpeed : (charIndex === currentText.length ? 3000 : typingSpeed));
        }
        type();
    }

    // --- Job Title Cycler Animation ---
    if (jobTitleCycler) {
        const jobTitles = [
            'AI & Machine Learning Engineer',
            'Python Developer',
            'Data Scientist',
            'Creative Problem Solver'
        ];
        let titleIndex = 0;
        function cycleTitles() {
            jobTitleCycler.classList.add('fade-out');
            setTimeout(() => {
                titleIndex = (titleIndex + 1) % jobTitles.length;
                jobTitleCycler.textContent = jobTitles[titleIndex];
                jobTitleCycler.classList.remove('fade-out');
            }, 500);
        }
        jobTitleCycler.textContent = jobTitles[0];
        setInterval(cycleTitles, 3000);
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
                await new Promise(resolve => setTimeout(resolve, 1500));
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
        let mouseX = 0, mouseY = 0;
        let ringX = 0, ringY = 0;
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
        document.querySelectorAll('a, button, .btn, .project-card, .certificate-card, .skills-card, .theme-toggle').forEach(el => {
            el.addEventListener('mouseenter', () => ring.classList.add('active'));
            el.addEventListener('mouseleave', () => ring.classList.remove('active'));
        });
    }

    // --- Card Tilt + Shine Effect ---
    document.querySelectorAll('.project-card, .certificate-card, .skills-card').forEach(card => {
        if (prefersReducedMotion) return;
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const tiltX = (y / rect.height - 0.5) * -20;
            const tiltY = (x / rect.width - 0.5) * 20;
            card.style.transform = `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale(1.03)`;
            card.style.setProperty('--mx', `${x}px`);
            card.style.setProperty('--my', `${y}px`);
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)';
        });
    });
    
    // --- CAMBIO COMPLETO: Advanced 3D Particle Background Scene (MEJORADO) ---
    let scene, camera, renderer, particles, velocities;
    const mouse = new THREE.Vector2(-100, -100); // Start off-screen
    const particleCount = 3000;
    const boxSize = 10;

    function init3DScene() {
        const container = document.getElementById('3d-scene');
        if (!container) return;

        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.z = 5;

        renderer = new THREE.WebGLRenderer({ alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(window.innerWidth, window.innerHeight);
        container.appendChild(renderer.domElement);
        
        const positions = new Float32Array(particleCount * 3);
        velocities = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);

        const color1 = new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue('--primary').trim());
        const color2 = new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue('--secondary').trim());

        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * boxSize;
            positions[i * 3 + 1] = (Math.random() - 0.5) * boxSize;
            positions[i * 3 + 2] = (Math.random() - 0.5) * boxSize;
            
            velocities[i * 3] = (Math.random() - 0.5) * 0.005;
            velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.005;
            velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.005;

            const mixedColor = color1.clone().lerp(color2, Math.random());
            colors[i * 3] = mixedColor.r;
            colors[i * 3 + 1] = mixedColor.g;
            colors[i * 3 + 2] = mixedColor.b;
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        const material = new THREE.PointsMaterial({
            size: 0.04,
            vertexColors: true,
            blending: THREE.AdditiveBlending,
            transparent: true,
            depthWrite: false,
        });

        particles = new THREE.Points(geometry, material);
        scene.add(particles);

        window.addEventListener('resize', onWindowResize, false);
        window.addEventListener('mousemove', onMouseMove, false);
        window.addEventListener('mouseout', () => {
            mouse.x = -100; mouse.y = -100;
        });
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
        
        const positions = particles.geometry.attributes.position.array;
        const mouseRadius = 0.5; // Radio de influencia del ratón
        const repulsionForce = 0.0005; // Fuerza con la que se apartan
        const halfBox = boxSize / 2;

        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            // Actualizar posición con velocidad
            positions[i3] += velocities[i3];
            positions[i3 + 1] += velocities[i3 + 1];
            positions[i3 + 2] += velocities[i3 + 2];
            
            // Rebotar en los bordes de una caja invisible
            if (positions[i3] > halfBox || positions[i3] < -halfBox) velocities[i3] *= -1;
            if (positions[i3 + 1] > halfBox || positions[i3 + 1] < -halfBox) velocities[i3 + 1] *= -1;
            if (positions[i3 + 2] > halfBox || positions[i3 + 2] < -halfBox) velocities[i3 + 2] *= -1;

            // Interacción con el ratón
            const particleVec = new THREE.Vector3(positions[i3], positions[i3 + 1], positions[i3 + 2]);
            const mouseVec = new THREE.Vector3(mouse.x * (halfBox / 2), mouse.y * (halfBox / 2), 0);
            const dist = particleVec.distanceTo(mouseVec);

            if (dist < mouseRadius) {
                const dx = positions[i3] - mouseVec.x;
                const dy = positions[i3 + 1] - mouseVec.y;
                const force = (mouseRadius - dist) * repulsionForce;
                velocities[i3] += dx * force;
                velocities[i3 + 1] += dy * force;
            }

            // Fricción para que no aceleren infinitamente
            velocities[i3] *= 0.995;
            velocities[i3 + 1] *= 0.995;
            velocities[i3 + 2] *= 0.995;
        }

        particles.geometry.attributes.position.needsUpdate = true;
        scene.rotation.y += 0.0002;
        renderer.render(scene, camera);
    }
    init3DScene();
    animate3DScene();


    // --- PDF Modal Logic ---
    const pdfModal = document.getElementById('pdf-modal');
    const pdfViewer = document.getElementById('pdf-viewer');
    const closeModalBtn = document.querySelector('.modal-close-button');
    const certificateLinks = document.querySelectorAll('.certificate-link');

    const openModal = (pdfSrc) => {
        if (pdfModal && pdfViewer) {
            pdfViewer.setAttribute('src', `${pdfSrc}#view=FitH`);
            pdfModal.style.display = 'block';
            document.body.classList.add('modal-open');
        }
    };

    const closeModal = () => {
        if (pdfModal && pdfViewer) {
            pdfModal.style.display = 'none';
            pdfViewer.setAttribute('src', ''); 
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

    window.addEventListener('click', (event) => {
        if (event.target === pdfModal) {
            closeModal();
        }
    });

    window.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && pdfModal.style.display === 'block') {
            closeModal();
        }
    });
});