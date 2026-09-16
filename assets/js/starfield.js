// Starfield background: drifting stars, the occasional passing space telescope,
// and a supernova (with a lingering remnant) when you double-click near a star.

(() => {
    const canvas = document.getElementById('starfield');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const assets = canvas.dataset.assets || '/assets/images/';
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let width = 0;
    let height = 0;

    function resizeCanvas() {
        const oldWidth = width;
        const oldHeight = height;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        // Keep the stars spread over the new viewport instead of bunched in the old one.
        if (oldWidth && oldHeight) {
            stars.forEach(star => {
                star.x *= width / oldWidth;
                star.y *= height / oldHeight;
            });
        }
    }

    // --- Stars ---
    const stars = [];
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const numStars = Math.max(90, Math.min(220, Math.round((width * height) / 6500)));
    for (let i = 0; i < numStars; i++) {
        stars.push({
            x: Math.random() * width,
            y: Math.random() * height,
            radius: Math.random() * 1.5,
            alpha: Math.random(),
            speed: reduceMotion ? 0 : Math.random() * 0.2 + 0.1
        });
    }

    // --- Telescopes ---
    const telescopeSources = [
        'jwst.png', 'hubble.png', 'voyager.png',
        'chandra.png', 'swift.png', 'plato.png',
        'tess.webp', 'gaia.png'
    ];
    const telescopeImages = telescopeSources.map(src => {
        const img = new Image();
        img.src = assets + 'telescopes/' + src;
        return img;
    });

    const flyingTelescopes = [];

    function triggerFlyBy() {
        if (flyingTelescopes.length === 0 && !document.hidden) {
            const edge = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left
            const telescope = {
                img: telescopeImages[Math.floor(Math.random() * telescopeImages.length)],
                x: 0,
                y: 0,
                vx: 0,
                vy: 0,
                size: 75,
                rotation: Math.random() * Math.PI * 2,
            };

            switch (edge) {
                case 0: // top
                    telescope.x = Math.random() * width;
                    telescope.y = -telescope.size;
                    telescope.vx = (Math.random() * 2 - 1) * 0.35;
                    telescope.vy = (Math.random() * 2 + 1) * 0.35;
                    break;
                case 1: // right
                    telescope.x = width + telescope.size;
                    telescope.y = Math.random() * height;
                    telescope.vx = -(Math.random() * 2 + 1) * 0.35;
                    telescope.vy = (Math.random() * 2 - 1) * 0.35;
                    break;
                case 2: // bottom
                    telescope.x = Math.random() * width;
                    telescope.y = height + telescope.size;
                    telescope.vx = (Math.random() * 2 - 1) * 0.35;
                    telescope.vy = -(Math.random() * 2 + 1) * 0.35;
                    break;
                case 3: // left
                    telescope.x = -telescope.size;
                    telescope.y = Math.random() * height;
                    telescope.vx = (Math.random() * 2 + 1) * 0.35;
                    telescope.vy = (Math.random() * 2 - 1) * 0.35;
                    break;
            }

            flyingTelescopes.push(telescope);
        }
        setTimeout(triggerFlyBy, Math.random() * 15000 + 5000);
    }

    // --- Supernovas & Remnants ---
    const supernovas = [];
    const remnantImages = ['m1.webp'].map(src => {
        const img = new Image();
        img.src = assets + 'ui/' + src;
        return img;
    });
    const remnants = [];

    let activeBubble = null;

    const messages = [
        "Just passing through, don't mind me.",
        "Is it just me, or is the universe getting bigger?",
        "Scanning for snacks... I mean, stars.",
        "Still looking for the edge of the map.",
        "One person's noise is another's PhD thesis.",
        "My error bars are actually quite fashionable.",
        "Wait, was that a planet or a smudge on my lens?",
        "The stars are being very quiet today.",
        "I'm 99% sure that's a galaxy. 1% sure it's dust.",
        "Perspective is everything out here.",
        "Just a bucket of mirrors doing its best.",
        "Wait, is my lens cap still on?",
        "Collecting photons and cosmic vibes.",
        "I'm not lost, I'm 'exploring'.",
        "Data looks good, expectations are managed.",
        "The void is surprisingly chatty.",
        "Trying my best to stay in focus.",
        "Space is big. You just won't believe how vastly, hugely, mind-bogglingly big it is.",
        "Is Overleaf still down?",
        "I'm here for the science, staying for the view.",
        "Within uncertainty, everything is possible.",
        "Just a humble observer of the grand design.",
        "Beep beep... I mean, science."
    ];

    document.addEventListener('dblclick', (e) => {
        const x = e.clientX;
        const y = e.clientY;

        // Check for telescope click
        for (const tele of flyingTelescopes) {
            if (x >= tele.x && x <= tele.x + tele.size && y >= tele.y && y <= tele.y + tele.size) {
                const randomMessage = messages[Math.floor(Math.random() * messages.length)];
                const telescopeName = tele.img.src.split('/').pop().split('.')[0].toUpperCase();
                showBubble(tele, `${randomMessage} \n - ${telescopeName}`);
                return;
            }
        }

        // Star supernova
        let closestStar = null;
        let minDistance = Infinity;
        stars.forEach(star => {
            const distance = Math.hypot(star.x - x, star.y - y);
            if (distance < minDistance) {
                minDistance = distance;
                closestStar = star;
            }
        });

        if (closestStar && minDistance < 20) {
            if (remnants.length === 0 && Math.random() < 0.50) {
                supernovas.push({
                    x: closestStar.x, y: closestStar.y, radius: 0, alpha: 1,
                    maxRadius: Math.random() * 100 + 100,
                });
                const index = stars.indexOf(closestStar);
                if (index > -1) stars.splice(index, 1);

                const maxAlphaValue = 0.8;
                remnants.push({
                    x: closestStar.x, y: closestStar.y, speed: closestStar.speed * 0.5,
                    img: remnantImages[Math.floor(Math.random() * remnantImages.length)],
                    size: 0, maxSize: (Math.random() * 80 + 40) * 2,
                    alpha: maxAlphaValue, maxAlpha: maxAlphaValue,
                    state: 'growing', rotation: Math.random() * Math.PI * 2,
                });
            }
        }
    });

    function showBubble(telescope, message) {
        if (activeBubble) {
            if (activeBubble.element.parentNode) document.body.removeChild(activeBubble.element);
            activeBubble = null;
        }

        const bubble = document.createElement('div');
        bubble.className = 'telescope-bubble';
        bubble.textContent = message;
        document.body.appendChild(bubble);

        activeBubble = { element: bubble, telescope: telescope };
        updateBubblePosition();
        setTimeout(() => bubble.classList.add('visible'), 10);

        setTimeout(() => {
            if (activeBubble && activeBubble.element === bubble) {
                bubble.classList.remove('visible');
                setTimeout(() => {
                    if (activeBubble && activeBubble.element === bubble && bubble.parentNode) {
                        document.body.removeChild(bubble);
                        activeBubble = null;
                    }
                }, 300);
            }
        }, 4000);
    }

    function updateBubblePosition() {
        if (!activeBubble) return;
        const tele = activeBubble.telescope;
        const bubble = activeBubble.element;
        bubble.style.left = `${tele.x + (tele.size / 2) - (bubble.offsetWidth / 2)}px`;
        bubble.style.top = `${tele.y - bubble.offsetHeight - 15}px`;
    }

    function draw() {
        ctx.clearRect(0, 0, width, height);
        stars.forEach(star => {
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(224, 224, 224, ${star.alpha})`;
            ctx.fill();
        });

        remnants.forEach(rem => {
            if (!rem.img.complete) return;
            ctx.save();
            ctx.globalAlpha = rem.alpha;
            ctx.translate(rem.x, rem.y);
            ctx.rotate(rem.rotation);
            ctx.drawImage(rem.img, -rem.size / 2, -rem.size / 2, rem.size, rem.size);
            ctx.restore();
        });

        for (let i = supernovas.length - 1; i >= 0; i--) {
            const sn = supernovas[i];
            ctx.beginPath();
            ctx.arc(sn.x, sn.y, sn.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${sn.alpha})`;
            ctx.shadowColor = 'white';
            ctx.shadowBlur = 20;
            ctx.fill();
            ctx.shadowBlur = 0;
        }

        flyingTelescopes.forEach(tele => {
            if (!tele.img.complete) return;
            ctx.save();
            ctx.translate(tele.x + tele.size / 2, tele.y + tele.size / 2);
            ctx.rotate(tele.rotation);
            ctx.drawImage(tele.img, -tele.size / 2, -tele.size / 2, tele.size, tele.size);
            ctx.restore();
        });
    }

    function update() {
        stars.forEach(star => {
            star.y -= star.speed;
            if (star.y < 0) {
                star.y = height;
                star.x = Math.random() * width;
            }
        });

        for (let i = remnants.length - 1; i >= 0; i--) {
            const rem = remnants[i];
            rem.y -= rem.speed * 3;
            if (rem.state === 'growing') {
                rem.size += 1.0;
                if (rem.size >= rem.maxSize) {
                    rem.state = 'lingering';
                    rem.lingerTime = Date.now();
                }
            } else if (rem.state === 'lingering') {
                if (!rem.lingerDuration) rem.lingerDuration = Math.random() * 10000 + 5000;
                if (Date.now() - rem.lingerTime > rem.lingerDuration) rem.state = 'fading';
            } else if (rem.state === 'fading') {
                rem.alpha -= 0.002;
                if (rem.alpha <= 0) remnants.splice(i, 1);
            }
        }

        for (let i = supernovas.length - 1; i >= 0; i--) {
            const sn = supernovas[i];
            sn.radius += 2;
            sn.alpha -= 0.01;
            if (sn.alpha <= 0) supernovas.splice(i, 1);
        }

        for (let i = flyingTelescopes.length - 1; i >= 0; i--) {
            const tele = flyingTelescopes[i];
            tele.x += tele.vx;
            tele.y += tele.vy;
            if (tele.x < -tele.size || tele.x > width + tele.size ||
                tele.y < -tele.size || tele.y > height + tele.size) {
                flyingTelescopes.splice(i, 1);
            }
        }
        updateBubblePosition();
    }

    function animate() {
        draw();
        update();
        requestAnimationFrame(animate);
    }

    animate();
    if (!reduceMotion) setTimeout(triggerFlyBy, 5000);
})();
