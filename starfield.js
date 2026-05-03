// Starfield & Fly-by Animation Logic
// Centralized for Enzo Peres Afonso CV Website

const canvas = document.getElementById('starfield');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// --- Stars ---
const stars = [];
const numStars = 200;
for (let i = 0; i < numStars; i++) {
    stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 1.5,
        alpha: Math.random(),
        speed: Math.random() * 0.2 + 0.1
    });
}

// --- Telescopes ---
const telescopeImages = [];
const telescopeSources = [
    'jwst.png', 'hubble.png', 'voyager.png', 
    'chandra.png', 'swift.png', 'plato.png', 
    'tess.webp', 'gaia.png'
];

// Detect if we are in a subfolder
const isSubfolder = window.location.pathname.includes('/projects/') || window.location.pathname.includes('/outreach/') || window.location.pathname.includes('/models/');
const basePath = isSubfolder ? '../assets/images/telescopes/' : 'assets/images/telescopes/';

telescopeSources.forEach(src => {
    const img = new Image();
    img.src = basePath + src;
    telescopeImages.push(img);
});

const flyingTelescopes = [];

function triggerFlyBy() {
    if (flyingTelescopes.length === 0) {
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
                telescope.x = Math.random() * canvas.width;
                telescope.y = -telescope.size;
                telescope.vx = (Math.random() * 2 - 1) * 0.35;
                telescope.vy = (Math.random() * 2 + 1) * 0.35;
                break;
            case 1: // right
                telescope.x = canvas.width + telescope.size;
                telescope.y = Math.random() * canvas.height;
                telescope.vx = -(Math.random() * 2 + 1) * 0.35;
                telescope.vy = (Math.random() * 2 - 1) * 0.35;
                break;
            case 2: // bottom
                telescope.x = Math.random() * canvas.width;
                telescope.y = canvas.height + telescope.size;
                telescope.vx = (Math.random() * 2 - 1) * 0.35;
                telescope.vy = -(Math.random() * 2 + 1) * 0.35;
                break;
            case 3: // left
                telescope.x = -telescope.size;
                telescope.y = Math.random() * canvas.height;
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
const remnantImages = [];
const remnantSources = ['m1.png'];
const remnantPath = isSubfolder ? '../assets/images/ui/' : 'assets/images/ui/';

remnantSources.forEach(src => {
    const img = new Image();
    img.src = remnantPath + src;
    remnantImages.push(img);
});
const remnants = [];

let activeBubble = null;

document.addEventListener('dblclick', (e) => {
    const x = e.clientX;
    const y = e.clientY;

    // Check for telescope click
    for (const tele of flyingTelescopes) {
        if (x >= tele.x && x <= tele.x + tele.size && y >= tele.y && y <= tele.y + tele.size) {
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
            const randomMessage = messages[Math.floor(Math.random() * messages.length)];
            const telescopeName = tele.img.src.split('/').pop().split('.')[0].toUpperCase();
            const message = `${randomMessage} \n - ${telescopeName}`;
            showBubble(tele, message);
            return;
        }
    }

    // Star supernova
    let closestStar = null;
    let minDistance = Infinity;
    stars.forEach(star => {
        const distance = Math.sqrt(Math.pow(star.x - x, 2) + Math.pow(star.y - y, 2));
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
    const bubbleX = tele.x + (tele.size / 2) - (bubble.offsetWidth / 2);
    const bubbleY = tele.y - bubble.offsetHeight - 15;
    bubble.style.left = `${bubbleX}px`;
    bubble.style.top = `${bubbleY}px`;
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    stars.forEach(star => {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(224, 224, 224, ${star.alpha})`;
        ctx.fill();
    });

    remnants.forEach(rem => {
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
            star.y = canvas.height;
            star.x = Math.random() * canvas.width;
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
        if (tele.x < -tele.size || tele.x > canvas.width + tele.size ||
            tele.y < -tele.size || tele.y > canvas.height + tele.size) {
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

// Initialize
animate();
setTimeout(triggerFlyBy, 5000);

// --- Outreach Gallery Cycle ---
const outreachImages = [
    'assets/images/outreach/2c92294f-cd52-4d86-9981-72e35136c579.JPG',
    'assets/images/outreach/3f6d1a23-efad-4f03-9e80-19e5553c1f65.JPG',
    'assets/images/outreach/44f1f4d8-eddb-48ca-9597-26f79fd78796.JPG',
    'assets/images/outreach/4f89cbcc-8e4c-4481-8b9a-891400eebd69.JPG',
    'assets/images/outreach/6a027e73-e50d-4716-961a-98c5ed3f7835.JPG',
    'assets/images/outreach/7f4484b8-b9ff-4b14-a43e-09ac39823b90.JPG',
    'assets/images/outreach/a1df614b-168c-4b37-9f0a-83364c45a8cc.JPG',
    'assets/images/outreach/a620e04e-4d85-4fc1-8534-72413829b7af.JPG',
    'assets/images/outreach/af910a02-9707-4595-98a6-9b89616f219f.JPG',
    'assets/images/outreach/ccc935db-5878-464f-b22b-667b99de55d4.JPG',
    'assets/images/outreach/db9fa27e-7815-4971-84d5-b97b5805f414.JPG',
    'assets/images/outreach/dbcdbf43-180f-4dc4-88b7-9f25814883c0.JPG',
    'assets/images/outreach/IMG_0681.jpg',
    'assets/images/outreach/IMG_0684.jpg',
    'assets/images/outreach/IMG_0685.jpg',
    'assets/images/outreach/IMG_3018.jpg',
    'assets/images/outreach/IMG_3114.jpg',
    'assets/images/outreach/IMG_3125.jpg',
    'assets/images/outreach/IMG_6350.jpg',
    'assets/images/outreach/IMG_8654.jpg',
    'assets/images/outreach/IMG_8657.jpg',
];

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

let lastShownImages = [];

function changeGalleryImages() {
    // Multi-image gallery (outreach.html)
    const galleryImages = document.querySelectorAll('.gallery-grid img');
    if (galleryImages.length > 0) {
        let availableImages = outreachImages.filter(img => !lastShownImages.includes(img));
        if (availableImages.length < 3) availableImages = [...outreachImages];

        const shuffledImages = shuffle(availableImages);
        const newImages = shuffledImages.slice(0, 3);

        galleryImages.forEach((img, i) => {
            img.classList.add('fade-out');
            setTimeout(() => {
                img.src = newImages[i];
                img.classList.remove('fade-out');
            }, 500);
        });
        lastShownImages = newImages;
    }

    // Single image window (index.html)
    const homeOutreachImg = document.getElementById('home-outreach-img');
    if (homeOutreachImg) {
        const currentImg = homeOutreachImg.getAttribute('src');
        let nextImages = outreachImages.filter(img => img !== currentImg);
        const nextImg = nextImages[Math.floor(Math.random() * nextImages.length)];
        
        homeOutreachImg.style.opacity = '0';
        setTimeout(() => {
            homeOutreachImg.src = nextImg;
            homeOutreachImg.style.opacity = '1';
        }, 800);
    }
}
setInterval(changeGalleryImages, 5000);

// --- Scroll Reveal Animation ---
const revealElements = document.querySelectorAll('.reveal, .card, .project-item-full, .model-card, .project-card');
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('reveal-visible');
        }
    });
}, { threshold: 0.1 });

revealElements.forEach(el => {
    // Only add reveal if it doesn't have it, but don't force it on all sections
    if (!el.classList.contains('reveal')) {
        el.classList.add('reveal');
    }
    revealObserver.observe(el);
});

// Fallback: If after 2 seconds things aren't revealed, reveal them anyway
setTimeout(() => {
    revealElements.forEach(el => {
        el.classList.add('reveal-visible');
    });
}, 2000);
