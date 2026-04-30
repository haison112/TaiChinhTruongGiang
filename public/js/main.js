document.addEventListener('DOMContentLoaded', () => {
    // Mobile Menu Toggle
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileNav = document.getElementById('mobileNav');

    mobileMenuBtn.addEventListener('click', () => {
        mobileNav.classList.toggle('active');
    });

    // Close mobile nav on click
    document.querySelectorAll('.mobile-nav a').forEach(link => {
        link.addEventListener('click', () => {
            mobileNav.classList.remove('active');
        });
    });

    // Scroll Animation
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.section-animate').forEach(section => {
        observer.observe(section);
    });

    // Lead Form Submission
    const leadForm = document.getElementById('leadForm');
    const formMsg = document.getElementById('formMsg');
    const submitBtn = document.getElementById('submitBtn');

    if (leadForm) {
        leadForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const formData = new FormData(leadForm);
            const data = Object.fromEntries(formData.entries());
            data.name = (data.name || '').trim().slice(0, 100);
            data.phone = (data.phone || '').trim().slice(0, 20);
            data.message = (data.message || '').trim().slice(0, 1000);

            // Basic validation
            if (!data.name || !data.phone || !data.message) {
                formMsg.textContent = 'Vui lòng điền đầy đủ họ tên, số điện thoại và nội dung tư vấn.';
                formMsg.className = 'form-msg error';
                return;
            }

            if (!/^[0-9+\-\s().]{8,20}$/.test(data.phone)) {
                formMsg.textContent = 'Số điện thoại không hợp lệ.';
                formMsg.className = 'form-msg error';
                return;
            }

            formMsg.style.display = '';
            submitBtn.disabled = true;
            submitBtn.textContent = 'Đang gửi...';

            fetch('/api/contact', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            })
            .then(res => res.json())
            .then(resData => {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Nhận tư vấn ngay';
                
                if (resData.success) {
                    formMsg.textContent = resData.message;
                    formMsg.className = 'form-msg success';
                    leadForm.reset();
                } else {
                    formMsg.textContent = resData.error || 'Có lỗi xảy ra, vui lòng thử lại sau.';
                    formMsg.className = 'form-msg error';
                }
                
                setTimeout(() => {
                    formMsg.style.display = 'none';
                }, 5000);
            })
            .catch(err => {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Nhận tư vấn ngay';
                formMsg.textContent = 'Lỗi kết nối, vui lòng thử lại.';
                formMsg.className = 'form-msg error';
                formMsg.style.display = '';
            });
        });
    }
});
