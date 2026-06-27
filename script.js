// Password Manager App - Secure Storage with Encryption

const STORAGE_KEY = 'encrypted_passwords';
const MASTER_KEY = 'master_password_hash';

// DOM Elements
const loginScreen = document.getElementById('loginScreen');
const appScreen = document.getElementById('appScreen');
const setupMode = document.getElementById('setupMode');
const loginMode = document.getElementById('loginMode');
const setupBtn = document.getElementById('setupBtn');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const addPasswordForm = document.getElementById('addPasswordForm');
const searchInput = document.getElementById('searchInput');
const passwordsList = document.getElementById('passwordsList');

let currentMasterPassword = null;

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    setupBtn.addEventListener('click', setupMasterPassword);
    loginBtn.addEventListener('click', loginWithMasterPassword);
    logoutBtn.addEventListener('click', logout);
    addPasswordForm.addEventListener('submit', addPassword);
    searchInput.addEventListener('input', searchPasswords);

    // Check if master password exists
    if (hasMasterPassword()) {
        showLoginMode();
    } else {
        showSetupMode();
    }
});

// ===== Authentication Functions =====

function toggleAuthMode(e) {
    e.preventDefault();
    setupMode.classList.toggle('active');
    loginMode.classList.toggle('active');
}

function showSetupMode() {
    setupMode.classList.add('active');
    loginMode.classList.remove('active');
}

function showLoginMode() {
    setupMode.classList.remove('active');
    loginMode.classList.add('active');
}

function hasMasterPassword() {
    return localStorage.getItem(MASTER_KEY) !== null;
}

function setupMasterPassword() {
    const password = document.getElementById('setupPassword').value;
    const confirmPassword = document.getElementById('setupPasswordConfirm').value;

    if (!password) {
        showNotification('Please enter a master password', 'error');
        return;
    }

    if (password.length < 6) {
        showNotification('Master password must be at least 6 characters', 'error');
        return;
    }

    if (password !== confirmPassword) {
        showNotification('Passwords do not match', 'error');
        return;
    }

    // Hash and store master password
    const hash = CryptoJS.SHA256(password).toString();
    localStorage.setItem(MASTER_KEY, hash);
    currentMasterPassword = password;

    // Clear inputs
    document.getElementById('setupPassword').value = '';
    document.getElementById('setupPasswordConfirm').value = '';

    showNotification('Master password created successfully!');
    showApp();
}

function loginWithMasterPassword() {
    const password = document.getElementById('masterPassword').value;

    if (!password) {
        showNotification('Please enter your master password', 'error');
        return;
    }

    const hash = CryptoJS.SHA256(password).toString();
    const storedHash = localStorage.getItem(MASTER_KEY);

    if (hash === storedHash) {
        currentMasterPassword = password;
        document.getElementById('masterPassword').value = '';
        showNotification('Login successful!');
        showApp();
    } else {
        showNotification('Incorrect master password', 'error');
    }
}

function logout() {
    currentMasterPassword = null;
    loginScreen.classList.add('active');
    appScreen.classList.remove('active');
    document.getElementById('masterPassword').value = '';
    showNotification('Logged out successfully');
}

function showApp() {
    loginScreen.classList.remove('active');
    appScreen.classList.add('active');
    loadPasswords();
}

// ===== Encryption/Decryption Functions =====

function encryptPassword(data) {
    if (!currentMasterPassword) return null;
    const encrypted = CryptoJS.AES.encrypt(
        JSON.stringify(data),
        currentMasterPassword
    ).toString();
    return encrypted;
}

function decryptPassword(encrypted) {
    if (!currentMasterPassword) return null;
    try {
        const decrypted = CryptoJS.AES.decrypt(encrypted, currentMasterPassword).toString(
            CryptoJS.enc.Utf8
        );
        return JSON.parse(decrypted);
    } catch (e) {
        console.error('Decryption failed:', e);
        return null;
    }
}

// ===== Password Management Functions =====

function addPassword(e) {
    e.preventDefault();

    const websiteName = document.getElementById('websiteName').value.trim();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const notes = document.getElementById('notes').value.trim();

    if (!websiteName || !username || !password) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }

    const passwordData = {
        id: Date.now(),
        website: websiteName,
        username: username,
        password: password,
        notes: notes,
        createdAt: new Date().toLocaleString()
    };

    // Get existing passwords
    let allPasswords = [];
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        allPasswords = JSON.parse(stored);
    }

    // Add new password (encrypted)
    allPasswords.push(encryptPassword(passwordData));

    // Save to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allPasswords));

    // Clear form
    addPasswordForm.reset();
    document.getElementById('websiteName').focus();

    showNotification('Password added successfully!');
    loadPasswords();
}

function loadPasswords() {
    const stored = localStorage.getItem(STORAGE_KEY);
    const passwords = stored ? JSON.parse(stored) : [];

    if (passwords.length === 0) {
        passwordsList.innerHTML = '<p class="empty-message">No passwords stored yet. Add one above!</p>';
        return;
    }

    // Decrypt and display
    const decryptedPasswords = passwords.map(encrypted => decryptPassword(encrypted)).filter(p => p !== null);

    // Sort by website name
    decryptedPasswords.sort((a, b) => a.website.localeCompare(b.website));

    passwordsList.innerHTML = decryptedPasswords.map(pwd => createPasswordCard(pwd)).join('');
}

function createPasswordCard(pwd) {
    const maskedPassword = '•'.repeat(pwd.password.length);
    return `
        <div class="password-card">
            <div class="website">🔐 ${escapeHtml(pwd.website)}</div>
            <div class="info-row">
                <div class="info-label">Username/Email:</div>
                <div class="info-value">${escapeHtml(pwd.username)}</div>
            </div>
            <div class="info-row">
                <div class="info-label">Password:</div>
                <div class="info-value">
                    <span class="visible-password">${maskedPassword}</span>
                    <span class="hidden-password">${escapeHtml(pwd.password)}</span>
                </div>
            </div>
            ${pwd.notes ? `<div class="info-row">
                <div class="info-label">Notes:</div>
                <div class="info-value">${escapeHtml(pwd.notes)}</div>
            </div>` : ''}
            <div class="info-row" style="font-size: 12px; color: #999;">
                Added: ${pwd.createdAt}
            </div>
            <div class="password-actions">
                <button class="btn btn-copy" onclick="showPassword('${pwd.id}')">👁️ Show</button>
                <button class="btn btn-copy" onclick="copyPassword('${pwd.id}')">📋 Copy</button>
                <button class="btn btn-delete" onclick="deletePassword('${pwd.id}')">🗑️ Delete</button>
            </div>
        </div>
    `;
}

function showPassword(id) {
    const stored = localStorage.getItem(STORAGE_KEY);
    const passwords = stored ? JSON.parse(stored) : [];
    const decrypted = passwords.map(e => decryptPassword(e)).filter(p => p !== null);
    const pwd = decrypted.find(p => p.id == id);

    if (!pwd) return;

    const cards = document.querySelectorAll('.password-card');
    cards.forEach(card => {
        const visible = card.querySelector('.visible-password');
        const hidden = card.querySelector('.hidden-password');
        if (visible) {
            visible.classList.remove('hidden-password');
            hidden.classList.add('hidden-password');
        }
    });

    // Toggle visibility
    const card = document.querySelector(`[data-id="${id}"]`);
    if (card) {
        const visible = card.querySelector('.visible-password');
        const hidden = card.querySelector('.hidden-password');
        visible.classList.add('hidden-password');
        hidden.classList.remove('hidden-password');
    } else {
        // Reload and find again
        loadPasswords();
        setTimeout(() => {
            const updatedCard = Array.from(document.querySelectorAll('.password-card')).find(c => {
                const website = c.querySelector('.website').textContent;
                return website.includes(pwd.website);
            });
            if (updatedCard) {
                const visible = updatedCard.querySelector('.visible-password');
                const hidden = updatedCard.querySelector('.hidden-password');
                if (visible && hidden) {
                    visible.classList.add('hidden-password');
                    hidden.classList.remove('hidden-password');
                }
            }
        }, 10);
    }
}

function copyPassword(id) {
    const stored = localStorage.getItem(STORAGE_KEY);
    const passwords = stored ? JSON.parse(stored) : [];
    const decrypted = passwords.map(e => decryptPassword(e)).filter(p => p !== null);
    const pwd = decrypted.find(p => p.id == id);

    if (pwd) {
        navigator.clipboard.writeText(pwd.password).then(() => {
            showNotification('Password copied to clipboard!');
        }).catch(() => {
            showNotification('Failed to copy password', 'error');
        });
    }
}

function deletePassword(id) {
    if (!confirm('Are you sure you want to delete this password? This cannot be undone.')) {
        return;
    }

    const stored = localStorage.getItem(STORAGE_KEY);
    let passwords = stored ? JSON.parse(stored) : [];
    const decrypted = passwords.map((e, i) => ({
        encrypted: e,
        decrypted: decryptPassword(e),
        index: i
    })).filter(item => item.decrypted !== null);

    const itemToDelete = decrypted.find(item => item.decrypted.id == id);
    if (itemToDelete) {
        passwords.splice(itemToDelete.index, 1);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(passwords));
        showNotification('Password deleted successfully');
        loadPasswords();
    }
}

function searchPasswords() {
    const query = searchInput.value.toLowerCase();
    const stored = localStorage.getItem(STORAGE_KEY);
    const passwords = stored ? JSON.parse(stored) : [];

    if (!query) {
        loadPasswords();
        return;
    }

    const decrypted = passwords.map(e => decryptPassword(e)).filter(p => p !== null);
    const filtered = decrypted.filter(pwd =>
        pwd.website.toLowerCase().includes(query) ||
        pwd.username.toLowerCase().includes(query) ||
        pwd.notes.toLowerCase().includes(query)
    );

    if (filtered.length === 0) {
        passwordsList.innerHTML = '<p class="empty-message">No passwords found matching your search.</p>';
        return;
    }

    filtered.sort((a, b) => a.website.localeCompare(b.website));
    passwordsList.innerHTML = filtered.map(pwd => createPasswordCard(pwd)).join('');
}

function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    if (input.type === 'password') {
        input.type = 'text';
    } else {
        input.type = 'password';
    }
}

// ===== Utility Functions =====

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideUp 0.3s ease-out reverse';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
