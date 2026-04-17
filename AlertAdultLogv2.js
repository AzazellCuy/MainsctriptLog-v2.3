(function() {
    // Ambil elemen HTML utama
    const overlay = document.getElementById('agegate-overlay');
    const titleEl = document.getElementById('agegate-title');
    const descEl = document.getElementById('agegate-desc');
    const btnYes = document.getElementById('agegate-yes');
    const btnNo = document.getElementById('agegate-no');

    // Jika elemen HTML tidak ada, hentikan script
    if (!overlay || !titleEl || !descEl || !btnYes || !btnNo) return;

    // ⚙️ KONFIGURASI SCRIPT
    // Membaca pengaturan umur langsung dari HTML (data-age-mode)
    const AGE_MODE = parseInt(overlay.getAttribute('data-age-mode')) || 18; 
    const REDIRECT_URL = "/"; // URL tujuan jika klik "Belum Cukup Umur"
    const EXPIRATION_HOURS = 10; // Waktu reset otomatis dalam jam

    const pagePath = window.location.pathname;
    const STORAGE_KEY = "agegate_" + AGE_MODE + "_" + encodeURIComponent(pagePath);

    // 🛑 CEK STATUS VERIFIKASI (KEDALUWARSA 10 JAM)
    const storedData = localStorage.getItem(STORAGE_KEY);
    if (storedData) {
        const savedTime = parseInt(storedData, 10);
        const currentTime = new Date().getTime();
        const expirationMs = EXPIRATION_HOURS * 60 * 60 * 1000;
        
        if (currentTime - savedTime < expirationMs) {
            return; // Belum 10 jam, hentikan script (Popup tidak muncul)
        } else {
            localStorage.removeItem(STORAGE_KEY); // Sudah lewat 10 jam, hapus data lama
        }
    }

    // 📝 KONTEN DINAMIS (18+ / 25+)
    const texts = {
        18: {
            title: "18+ (Adult Content Warning)",
            desc: "Konten ini mengandung materi dewasa. Harap tidak melanjutkan jika Anda belum memenuhi batas usia yang ditentukan. Gunakan internet dengan bijak dan bertanggung jawab."
        },
        25: {
            title: "25+ (Restricted Content Warning)",
            desc: "Konten ini ditujukan untuk usia tertentu dengan batasan lebih tinggi. Pastikan Anda telah memenuhi syarat usia sebelum melanjutkan. Segala risiko menjadi tanggung jawab pribadi."
        }
    };
    
    // Set teks ke dalam HTML
    const activeText = texts[AGE_MODE] || texts[18];
    titleEl.innerText = activeText.title;
    descEl.innerText = activeText.desc;

    // Tampilkan Popup & Kunci Scroll
    overlay.classList.add('show');
    document.body.classList.add('agegate-lock-scroll');

    // 🖱️ LOGIKA TOMBOL & INTERAKSI
    
    // Tombol "Ya"
    btnYes.addEventListener('click', function() {
        const timestamp = new Date().getTime().toString();
        localStorage.setItem(STORAGE_KEY, timestamp);
        
        overlay.style.transition = 'opacity 0.3s ease, backdrop-filter 0.3s ease';
        overlay.style.opacity = '0';
        overlay.style.backdropFilter = 'blur(0px)';
        
        setTimeout(() => {
            overlay.style.display = 'none';
            overlay.classList.remove('show');
            document.body.classList.remove('agegate-lock-scroll');
        }, 300);
    });

    // Tombol "Tidak"
    btnNo.addEventListener('click', function() {
        window.location.href = REDIRECT_URL;
    });

    // Cegah Klik Kanan di background gelap
    overlay.addEventListener('contextmenu', function(e) {
        if(e.target === overlay) {
            e.preventDefault();
        }
    });
})();
