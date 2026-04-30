document.addEventListener('DOMContentLoaded', () => {
    function appendCell(row, text) {
        const cell = document.createElement('td');
        cell.textContent = text == null ? '' : String(text);
        row.appendChild(cell);
        return cell;
    }

    function setMessage(element, success, text) {
        element.className = `message ${success ? 'success' : 'error'}`;
        element.textContent = text;
        element.style.display = 'block';
    }

    function validateJsonArrayField(data, key, label) {
        try {
            const parsed = JSON.parse(data[key] || '[]');
            if (!Array.isArray(parsed)) {
                throw new Error();
            }
        } catch (err) {
            throw new Error(`${label} phải là JSON array hợp lệ.`);
        }
    }

    // Tab Switching
    const tabs = document.querySelectorAll('.sidebar-nav a[data-tab]');
    const tabContents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            tab.classList.add('active');
            document.getElementById(`${tab.dataset.tab}-tab`).classList.add('active');
        });
    });

    // Load Leads
    function loadLeads() {
        fetch('/api/admin/leads')
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    const tbody = document.getElementById('leadsTableBody');
                    tbody.innerHTML = '';
                    data.data.forEach(lead => {
                        const tr = document.createElement('tr');
                        const date = new Date(lead.created_at).toLocaleString('vi-VN');

                        appendCell(tr, lead.id);
                        appendCell(tr, lead.name);
                        appendCell(tr, lead.phone);
                        appendCell(tr, lead.message);
                        appendCell(tr, date);

                        const statusCell = document.createElement('td');
                        const statusSelect = document.createElement('select');
                        ['mới', 'đã liên hệ', 'không nghe máy', 'đã tư vấn'].forEach(status => {
                            const option = document.createElement('option');
                            option.value = status;
                            option.textContent = status === 'mới' ? 'Mới' : status.charAt(0).toUpperCase() + status.slice(1);
                            option.selected = lead.status === status;
                            statusSelect.appendChild(option);
                        });
                        statusSelect.addEventListener('change', () => updateLead(lead.id, 'status', statusSelect.value));
                        statusCell.appendChild(statusSelect);
                        tr.appendChild(statusCell);

                        const noteCell = document.createElement('td');
                        const noteInput = document.createElement('input');
                        noteInput.type = 'text';
                        noteInput.className = 'edit-note';
                        noteInput.value = lead.note || '';
                        noteInput.placeholder = 'Ghi chú...';
                        noteInput.addEventListener('blur', () => updateLead(lead.id, 'note', noteInput.value));
                        noteCell.appendChild(noteInput);
                        tr.appendChild(noteCell);

                        const actionCell = document.createElement('td');
                        const deleteButton = document.createElement('button');
                        deleteButton.type = 'button';
                        deleteButton.className = 'btn btn-sm';
                        deleteButton.style.background = '#ff4d4f';
                        deleteButton.style.color = '#fff';
                        deleteButton.textContent = 'Xóa';
                        deleteButton.addEventListener('click', () => deleteLead(lead.id));
                        actionCell.appendChild(deleteButton);
                        tr.appendChild(actionCell);

                        tbody.appendChild(tr);
                    });
                }
            });
    }

    // Export Excel
    document.getElementById('exportBtn').addEventListener('click', () => {
        window.location.href = '/api/admin/leads/export';
    });

    // Content Update Form
    const contentForm = document.getElementById('contentForm');
    if (contentForm) {
        contentForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(contentForm);
            const data = Object.fromEntries(formData.entries());
            const msg = document.getElementById('contentMessage');

            try {
                validateJsonArrayField(data, 'benefitCards', 'Benefit Cards');
                validateJsonArrayField(data, 'processCards', 'Process Cards');
                validateJsonArrayField(data, 'faqItems', 'FAQ Items');
            } catch (err) {
                setMessage(msg, false, err.message);
                return;
            }

            fetch('/api/admin/content', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            })
            .then(res => res.json())
            .then(data => {
                setMessage(msg, data.success, data.success ? 'Cập nhật thành công!' : 'Có lỗi xảy ra.');
                setTimeout(() => msg.style.display = 'none', 3000);
            });
        });
    }

    document.querySelectorAll('.upload-btn').forEach(button => {
        button.addEventListener('click', () => {
            const fileInput = document.getElementById(button.dataset.file);
            const targetInput = document.getElementById(button.dataset.target);
            const preview = document.getElementById(`${button.dataset.target}Preview`);
            const msg = document.getElementById('contentMessage');

            if (!fileInput.files.length) {
                setMessage(msg, false, 'Vui lòng chọn ảnh trước khi upload.');
                return;
            }

            const formData = new FormData();
            formData.append('image', fileInput.files[0]);
            button.disabled = true;
            button.textContent = 'Đang upload...';

            fetch('/api/admin/upload', {
                method: 'POST',
                body: formData
            })
                .then(res => res.json())
                .then(data => {
                    button.disabled = false;
                    button.textContent = 'Upload ảnh';
                    if (data.success) {
                        targetInput.value = data.imageUrl;
                        preview.src = data.imageUrl;
                        setMessage(msg, true, 'Upload ảnh thành công. Nhấn Lưu Nội dung để áp dụng.');
                    } else {
                        setMessage(msg, false, data.error || 'Upload thất bại.');
                    }
                })
                .catch(() => {
                    button.disabled = false;
                    button.textContent = 'Upload ảnh';
                    setMessage(msg, false, 'Lỗi kết nối khi upload.');
                });
        });
    });

    // Init
    loadLeads();

    // Make functions global for inline handlers
    function updateLead(id, field, value) {
        const payload = {};
        payload[field] = value;
        
        fetch(`/api/admin/leads/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }).then(() => {
            if(field === 'status') {
                // optional: show small toast
            }
        });
    }

    function deleteLead(id) {
        if(confirm('Bạn có chắc muốn xóa lead này?')) {
            fetch(`/api/admin/leads/${id}`, { method: 'DELETE' })
                .then(res => res.json())
                .then(data => {
                    if (data.success) loadLeads();
                });
        }
    }
});
