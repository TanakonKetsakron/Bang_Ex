function toggleChat() {
    document.getElementById('chatPopup').classList.toggle('open');
  }

  function switchTab(el, type) {
    document.querySelectorAll('.track-tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    const placeholders = {
      code: 'กรอกรหัสสินค้า เช่น BEX-2025-00142',
      order: 'กรอกหมายเลขออเดอร์ เช่น ORD-20250226-001',
      vehicle: 'กรอกทะเบียนรถ เช่น กข 8821'
    };
    document.getElementById('trackInput').placeholder = placeholders[type];
    document.getElementById('trackResult').classList.remove('show');
  }

  function doTrack() {
    const val = document.getElementById('trackInput').value.trim();
    if (val.length < 3) {
      document.getElementById('trackInput').style.borderColor = '#D0021B';
      setTimeout(() => { document.getElementById('trackInput').style.borderColor = ''; }, 1500);
      return;
    }
    document.getElementById('trackResult').classList.add('show');
    document.getElementById('trackResult').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  document.getElementById('trackInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doTrack();
  });

  // Animate sections on scroll
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.style.opacity = 1;
        e.target.style.transform = 'translateY(0)';
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.service-card, .feature-item, .info-box').forEach(el => {
    el.style.opacity = 0;
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    observer.observe(el);
  });