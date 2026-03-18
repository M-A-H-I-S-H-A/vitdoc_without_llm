document.addEventListener('DOMContentLoaded', () => {
    const chatForm = document.getElementById('chat-form');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const chatMessages = document.getElementById('chat-messages');
    const themeToggle = document.getElementById('theme-toggle');
    const historyList = document.getElementById('history-list');

    // Auth & Image Elements
    const authModal = document.getElementById('auth-modal');
    const closeModal = document.getElementById('close-modal');
    const authForm = document.getElementById('auth-form');
    const authToggleLink = document.getElementById('auth-toggle-link');
    const authTitle = document.getElementById('auth-title');
    const nameGroup = document.getElementById('name-group');
    const authNameInput = document.getElementById('auth-name');
    const authEmailInput = document.getElementById('auth-email');
    const authSubmit = document.getElementById('auth-submit');
    const userProfile = document.querySelector('.user-profile');
    const profileName = document.querySelector('.profile-name');
    const profileStatus = document.querySelector('.profile-status');
    const uploadBtn = document.getElementById('upload-btn');
    const imageUpload = document.getElementById('image-upload');

    // Mobile Elements
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.querySelector('.sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');

    // Questionnaire Elements
    const qModal = document.getElementById('questionnaire-modal');
    const closeQBtn = document.getElementById('close-questionnaire');
    const qForm = document.getElementById('questionnaire-form');
    let currentQStep = 1;

    let isSignUp = false;
    let currentImageBase64 = null;
    let currentSessionId = Date.now().toString();
    let currentSessionMessages = []; // Array of message objects {text, sender, imageUrl}

    // --- State & History Management ---
    function checkAuthState() {
        const storedUser = localStorage.getItem('vitdoc_user');
        if (storedUser) {
            const user = JSON.parse(storedUser);
            profileName.textContent = user.name || user.email.split('@')[0];
            profileStatus.innerHTML = '<span style="color: #10B981;">Online</span> (Free Plan)';
            // Add sign out button if not exists
            if (!document.querySelector('.sign-out-btn')) {
                const signOutBtn = document.createElement('span');
                signOutBtn.className = 'sign-out-btn';
                signOutBtn.textContent = 'Sign Out';
                signOutBtn.style.display = 'block';
                signOutBtn.onclick = (e) => {
                    e.stopPropagation();
                    localStorage.removeItem('vitdoc_user');
                    // Reload to immediately force auth again
                    location.reload();
                };
                document.querySelector('.profile-info').appendChild(signOutBtn);
            }
            
            // Allow closing the auth modal since user is logged in
            closeModal.style.display = 'block';
            
            if (!user.questionnaireCompleted && !qModal.classList.contains('hidden') === false) {
                qModal.classList.remove('hidden');
            }
            renderSidebarHistory(user);
        } else {
            profileName.textContent = 'Guest User';
            profileStatus.textContent = 'Free Plan';
            const signOutBtn = document.querySelector('.sign-out-btn');
            if (signOutBtn) signOutBtn.remove();
            
            // Force Auth Modal open and hide close button
            authModal.classList.remove('hidden');
            closeModal.style.display = 'none';
        }
    }

    // Initialize Auth State
    checkAuthState();

    function renderSidebarHistory(userObj = null) {
        historyList.innerHTML = '<h3 class="history-title">Recent Sessions</h3>';
        
        // Mobile handling function inside render to ensure clicks close sidebar
        const closeSidebarOnMobile = () => {
            if (window.innerWidth <= 900) {
                sidebar.classList.remove('open');
                sidebarOverlay.classList.remove('active');
            }
        };
        
        let sessions = userObj ? (userObj.chatSessions || []) : [];
        
        // Add current session at top
        const currentItem = document.createElement('div');
        currentItem.className = 'history-item active';
        currentItem.innerHTML = `<i class="far fa-message"></i><span>Current Session</span>`;
        currentItem.onclick = () => {
            loadSession(currentSessionId, currentSessionMessages);
            closeSidebarOnMobile();
        };
        historyList.appendChild(currentItem);

        // Sort sessions by newest first
        sessions.sort((a,b) => b.id - a.id).forEach(session => {
            if (session.id === currentSessionId) return; // Skip if it's the active one being built
            
            const item = document.createElement('div');
            item.className = 'history-item';
            item.innerHTML = `<i class="far fa-message"></i><span>${session.title || 'Consultation'}</span>`;
            item.onclick = () => {
                // Remove active class from all
                document.querySelectorAll('.history-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                loadSession(session.id, session.messages);
                closeSidebarOnMobile();
            };
            historyList.appendChild(item);
        });
    }

    function saveCurrentSession() {
        if (currentSessionMessages.length === 0) return; // Don't save empty sessions
        
        const storedUser = localStorage.getItem('vitdoc_user');
        if (storedUser) {
            let user = JSON.parse(storedUser);
            if (!user.chatSessions) user.chatSessions = [];
            
            // Find if exists
            const existingIdx = user.chatSessions.findIndex(s => s.id === currentSessionId);
            
            // Auto-generate title from first user message
            let title = "New Consultation";
            const firstUserMsg = currentSessionMessages.find(m => m.sender === 'user');
            if (firstUserMsg && firstUserMsg.text) {
                title = firstUserMsg.text.length > 25 ? firstUserMsg.text.substring(0, 25) + "..." : firstUserMsg.text;
            } else if (firstUserMsg && firstUserMsg.imageUrl) {
                title = "Image Analysis";
            }

            const sessionObj = {
                id: currentSessionId,
                title: title,
                messages: currentSessionMessages,
                timestamp: Date.now()
            };

            if (existingIdx >= 0) {
                user.chatSessions[existingIdx] = sessionObj;
            } else {
                user.chatSessions.push(sessionObj);
            }
            
            localStorage.setItem('vitdoc_user', JSON.stringify(user));
        }
    }

    function loadSession(sessionId, messagesArr) {
        // Save current session before switching if it has messages and isn't the one we're loading
        if (currentSessionId !== sessionId) {
            saveCurrentSession();
        }
        
        currentSessionId = sessionId;
        currentSessionMessages = messagesArr || [];
        
        chatMessages.innerHTML = `
            <div class="message bot-message">
                <div class="avatar"><i class="fas fa-robot"></i></div>
                <div class="message-content">
                    Hello! 👋 I'm Vitdoc, your AI health assistant. 
                    <br><br>
                    Tell me about any symptoms you're experiencing, such as fatigue, muscle cramps, or skin issues, and I can suggest what vitamins or minerals you might be lacking.
                    <br><br>
                    <em>What symptoms have you been feeling lately?</em>
                </div>
            </div>
        `;

        // Replay messages visually without triggering saves
        currentSessionMessages.forEach(msg => {
            appendMessageHTML(msg.text, msg.sender, msg.imageUrl);
        });
    }

    userProfile.addEventListener('click', () => {
        if (!localStorage.getItem('vitdoc_user')) {
            authModal.classList.remove('hidden');
        }
    });

    closeModal.addEventListener('click', () => {
        authModal.classList.add('hidden');
    });

    authToggleLink.addEventListener('click', () => {
        isSignUp = !isSignUp;
        if (isSignUp) {
            authTitle.textContent = 'Create Account';
            document.getElementById('auth-toggle-text').textContent = 'Already have an account? ';
            authToggleLink.textContent = 'Sign In';
            authSubmit.textContent = 'Sign Up';
            nameGroup.style.display = 'block';
        } else {
            authTitle.textContent = 'Welcome Back';
            document.getElementById('auth-toggle-text').textContent = 'Don\'t have an account? ';
            authToggleLink.textContent = 'Sign Up';
            authSubmit.textContent = 'Sign In';
            nameGroup.style.display = 'none';
        }
    });

    authForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = authEmailInput.value;
        const name = authNameInput.value;
        
        let existingUser = localStorage.getItem('vitdoc_user');
        let userObj = existingUser ? JSON.parse(existingUser) : {};
        userObj.email = email;
        userObj.name = isSignUp ? name : (userObj.name || email.split('@')[0]);
        
        localStorage.setItem('vitdoc_user', JSON.stringify(userObj));
        
        authModal.classList.add('hidden');
        closeModal.style.display = 'block'; // Ensure close button returns for future user profile clicks
        authForm.reset();
        
        if (!userObj.questionnaireCompleted) {
            qModal.classList.remove('hidden');
        } else {
            checkAuthState();
        }
    });

    // --- Mobile Sidebar Logic ---
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            sidebar.classList.add('open');
            sidebarOverlay.classList.add('active');
        });
    }
    
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            sidebarOverlay.classList.remove('active');
        });
    }

    // --- Questionnaire Logic ---
    closeQBtn.addEventListener('click', () => {
        qModal.classList.add('hidden');
        checkAuthState();
    });

    const updateQStep = (step) => {
        document.querySelectorAll('.q-section').forEach(sec => sec.classList.add('hidden'));
        document.querySelectorAll('.q-section').forEach(sec => sec.classList.remove('active'));
        document.getElementById(`q-section-${step}`).classList.remove('hidden');
        document.getElementById(`q-section-${step}`).classList.add('active');
        
        document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
        for(let i=1; i<=step; i++) {
            document.getElementById(`step-${i}`).classList.add('active');
        }
    };

    document.querySelectorAll('.btn-next').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const currentSection = document.getElementById(`q-section-${currentQStep}`);
            const inputs = currentSection.querySelectorAll('input[required]');
            let valid = true;
            inputs.forEach(input => {
                if (!input.checkValidity()) valid = false;
            });
            
            if(valid) {
                currentQStep = parseInt(e.target.closest('.btn-next').getAttribute('data-next'));
                updateQStep(currentQStep);
            } else {
                qForm.reportValidity();
            }
        });
    });

    document.querySelectorAll('.btn-prev').forEach(btn => {
        btn.addEventListener('click', (e) => {
            currentQStep = parseInt(e.target.closest('.btn-prev').getAttribute('data-prev'));
            updateQStep(currentQStep);
        });
    });

    document.getElementsByName('q-surgery-radio').forEach(radio => {
        radio.addEventListener('change', (e) => {
            document.getElementById('q-surgery-details').style.display = e.target.value === 'Yes' ? 'block' : 'none';
        });
    });
    
    document.getElementsByName('q-meds-radio').forEach(radio => {
        radio.addEventListener('change', (e) => {
            document.getElementById('q-meds-details').style.display = e.target.value === 'Yes' ? 'block' : 'none';
        });
    });

    qForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const formData = new FormData(qForm);
        const qData = {};
        for (let [key, value] of formData.entries()) {
            if (qData[key]) {
                if (!Array.isArray(qData[key])) {
                    qData[key] = [qData[key]];
                }
                qData[key].push(value);
            } else {
                qData[key] = value;
            }
        }
        
        let userObj = JSON.parse(localStorage.getItem('vitdoc_user')) || {};
        userObj.profileData = qData;
        userObj.name = document.getElementById('q-name').value;
        userObj.questionnaireCompleted = true;
        localStorage.setItem('vitdoc_user', JSON.stringify(userObj));
        
        qModal.classList.add('hidden');
        checkAuthState();
    });

    // --- Image Upload Logic ---
    uploadBtn.addEventListener('click', () => {
        imageUpload.click();
    });

    imageUpload.addEventListener('change', function() {
        if (this.files && this.files[0]) {
            const reader = new FileReader();
            reader.onload = function(e) {
                currentImageBase64 = e.target.result;
                userInput.placeholder = "Image attached. Add a message or press send...";
                sendBtn.removeAttribute('disabled');
            };
            reader.readAsDataURL(this.files[0]);
        }
    });

    // --- New Consultation Logic ---
    const newChatBtn = document.querySelector('.new-chat-btn');
    if (newChatBtn) {
        newChatBtn.addEventListener('click', () => {
            // Save existing session if it has messages
            saveCurrentSession();
            
            // Setup new session
            currentSessionId = Date.now().toString();
            currentSessionMessages = [];
            
            // Clear chat messages container
            chatMessages.innerHTML = `
                <div class="message bot-message">
                    <div class="avatar"><i class="fas fa-robot"></i></div>
                    <div class="message-content">
                        Hello! 👋 I'm Vitdoc, your AI health assistant. 
                        <br><br>
                        Tell me about any symptoms you're experiencing, such as fatigue, muscle cramps, or skin issues, and I can suggest what vitamins or minerals you might be lacking.
                        <br><br>
                        <em>What symptoms have you been feeling lately?</em>
                    </div>
                </div>
            `;
            
            // Reset state
            currentImageBase64 = null;
            imageUpload.value = '';
            userInput.value = '';
            userInput.style.height = 'auto';
            userInput.placeholder = "Type your symptoms here or upload an image...";
            sendBtn.setAttribute('disabled', 'true');
            
            // Re-render sidebar to show the newly saved session
            const storedUser = localStorage.getItem('vitdoc_user');
            if (storedUser) {
                renderSidebarHistory(JSON.parse(storedUser));
            }
        });
    }

    // Auto-resize textarea
    userInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        
        // Enable/disable send button
        if (this.value.trim().length > 0 || currentImageBase64) {
            sendBtn.removeAttribute('disabled');
        } else {
            sendBtn.setAttribute('disabled', 'true');
        }
    });

    // Handle Enter key (Shift+Enter for new line)
    userInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (this.value.trim().length > 0 || currentImageBase64) {
                chatForm.dispatchEvent(new Event('submit'));
            }
        }
    });

    // Theme toggling
    themeToggle.addEventListener('click', () => {
        const body = document.documentElement;
        if (body.getAttribute('data-theme') === 'light') {
            body.removeAttribute('data-theme');
            themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        } else {
            body.setAttribute('data-theme', 'light');
            themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        }
    });

    // Handle form submission
    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const message = userInput.value.trim();
        if (!message && !currentImageBase64) return;

        // Reset input
        userInput.value = '';
        userInput.style.height = 'auto';
        userInput.placeholder = "Type your symptoms here or upload an image...";
        sendBtn.setAttribute('disabled', 'true');

        // Append user message (and image if exists)
        appendMessage(message, 'user', currentImageBase64);
        
        const hasImage = !!currentImageBase64;
        currentImageBase64 = null; // Clear image state
        imageUpload.value = '';

        // Simulate AI thinking (longer if image)
        showTypingIndicator();

        // Process message and generate response
        setTimeout(() => {
            removeTypingIndicator();
            const response = generateAIResponse(message, hasImage);
            appendMessage(response, 'bot');
        }, hasImage ? 2500 + Math.random() * 1500 : 1500 + Math.random() * 1000); 
    });

    function appendMessage(text, sender, imageUrl = null) {
        // Save to state array
        currentSessionMessages.push({text, sender, imageUrl});
        
        // Save to local storage on every message to prevent loss
        saveCurrentSession();
        
        // If it's the first message, update the sidebar to reflect the new title
        if (currentSessionMessages.length === 1 && sender === 'user') {
            const storedUser = localStorage.getItem('vitdoc_user');
            if (storedUser) renderSidebarHistory(JSON.parse(storedUser));
        }

        appendMessageHTML(text, sender, imageUrl);
    }
    
    function appendMessageHTML(text, sender, imageUrl = null) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        const avatarIcon = sender === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';
        
        let formattedText = text;
        if (sender === 'bot') {
            if (!formattedText.includes('<div class="bot-structured-response">')) {
                // Simple markdown-to-html conversion for bot messages
                formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                formattedText = formattedText.replace(/\n\n/g, '<br><br>');
                formattedText = formattedText.replace(/\n- (.*?)/g, '<li>$1</li>');
                if (formattedText.includes('<li>')) {
                    formattedText = formattedText.replace(/<li>(.*?)<\/li>/g, '<ul><li>$1</li></ul>');
                    formattedText = formattedText.replace(/<\/ul><ul>/g, '');
                }
            }
        }

        let mediaHtml = '';
        if (imageUrl) {
            mediaHtml = `<img src="${imageUrl}" alt="User Uploaded Image" class="message-image">`;
        }
        
        // Only show text div if there is text
        const textHtml = formattedText ? `<div class="message-text">${formattedText}</div>` : '';

        messageDiv.innerHTML = `
            <div class="avatar">${avatarIcon}</div>
            <div class="message-content">
                ${textHtml}
                ${mediaHtml}
            </div>
        `;
        
        chatMessages.appendChild(messageDiv);
        scrollToBottom();
    }

    function showTypingIndicator() {
        const indicatorDiv = document.createElement('div');
        indicatorDiv.className = 'message bot-message typing-container';
        indicatorDiv.id = 'typing-indicator';
        
        indicatorDiv.innerHTML = `
            <div class="avatar"><i class="fas fa-robot"></i></div>
            <div class="typing-indicator">
                <div class="pill"></div>
                <div class="pill"></div>
                <div class="pill"></div>
            </div>
        `;
        
        chatMessages.appendChild(indicatorDiv);
        scrollToBottom();
    }

    function removeTypingIndicator() {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) {
            indicator.remove();
        }
    }

    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function buildDiagnosisHTML(contextHTML, intro, possibilities, outro) {
        possibilities.sort((a, b) => b.match - a.match);
        let html = `<div class="bot-structured-response">`;
        if (contextHTML) html += contextHTML;
        html += `<p>${intro}</p>`;
        
        html += `<div class="diagnoses-container">`;
        possibilities.forEach(p => {
            html += `
            <div class="diagnosis-card">
                <div class="diagnosis-header">
                    <strong>${p.name}</strong>
                    <span class="match-percentage">${p.match}% Match</span>
                </div>
                <div class="progress-bar"><div class="progress-fill" style="width: ${p.match}%;"></div></div>
                <div class="diagnosis-details">
                    <p><strong>Analysis:</strong> ${p.analysis}</p>
                    <p><strong>Action / Dietary Sources:</strong> ${p.sources}</p>
                </div>
            </div>`;
        });
        html += `</div>`;
        
        html += `<div class="diagnosis-result">
            <div class="result-icon"><i class="fas fa-stethoscope"></i></div>
            <div class="result-content">
                <strong>Highest Likelihood: ${possibilities[0].name} (${possibilities[0].match}%)</strong>
                <p>Based on our analysis, <strong>${possibilities[0].name}</strong> is the most highly ranked result. Please focus on this area and consider consulting a healthcare professional.</p>
            </div>
        </div>`;
        
        if (outro) {
            html += `<p class="diagnosis-outro">${outro}</p>`;
        }
        
        html += `</div>`;
        return html;
    }

    // Mock AI Logic with Multiple Diagnoses Support
    function generateAIResponse(input, hasImage = false) {
        const lowercaseInput = input.toLowerCase();
        let userContextMD = "";
        let userContextHTML = "";
        
        const storedUser = localStorage.getItem('vitdoc_user');
        if (storedUser) {
            const user = JSON.parse(storedUser);
            if (user.profileData) {
                const diet = user.profileData['q-diet'] || 'Not specified';
                const conds = user.profileData['q-current-cond'] || 'None';
                const age = user.profileData['q-age'] || 'N/A';
                userContextMD = `*(Personalized Insight based on your profile: Age ${age}, Diet - ${diet}, Medical - ${Array.isArray(conds)?conds.join(', '):conds})*\n\n`;
                userContextHTML = `<div class="user-context"><i class="fas fa-user-circle"></i> Insight based on your profile: Age ${age}, Diet - ${diet}, Medical - ${Array.isArray(conds)?conds.join(', '):conds}</div>`;
            }
        }
        
        if (hasImage) {
            const intro = "I have analyzed the image you uploaded alongside your symptoms. Based on the visual characteristics and context, here is a percentage ranking of potential possibilities:";
            const possibilities = [
                { name: "Iron Deficiency (Anemia)", match: 88, analysis: "The pale appearance in the image, combined with general symptoms, strongly suggests a lack of sufficient red blood cells.", sources: "Consider increasing intake of spinach, red meat, and lentils. A blood test checking ferritin levels is highly recommended." },
                { name: "Vitamin C Deficiency", match: 65, analysis: "If there are accompanying signs of rough skin or easy bruising, Vitamin C aids in collagen production and iron absorption.", sources: "Add citrus fruits, strawberries, and bell peppers to your diet." },
                { name: "Poor Circulation / Dehydration", match: 42, analysis: "Sometimes visual symptoms aren't strictly vitamin-related but are due to lack of water or poor blood flow.", sources: "Ensure you are drinking at least 8 glasses of water a day." }
            ];
            const outro = "Disclaimer: Image analysis is simulated and should be verified by a medical professional.";
            return buildDiagnosisHTML(userContextHTML, intro, possibilities, outro);
        }
        
        if (lowercaseInput.includes('tired') || lowercaseInput.includes('fatigue') || lowercaseInput.includes('exhausted')) {
            const intro = "Fatigue is a complex symptom that can stem from various sources. Based on what you've described, here is a percentage ranking of potential deficiencies to explore:";
            const possibilities = [
                { name: "Vitamin D Deficiency", match: 92, analysis: "Very common, especially in winter or for indoor workers. Low Vitamin D is strongly correlated with daytime sleepiness and fatigue.", sources: "Salmon, egg yolks, and fortified foods (also, try getting 10-15 minutes of sunlight!)." },
                { name: "Vitamin B12 Deficiency", match: 85, analysis: "B12 is crucial for nerve function and the creation of red blood cells. A lack of it can lead to severe exhaustion and a feeling of faintness.", sources: "Meat, fish, milk, cheese, and fortified cereals." },
                { name: "Iron Deficiency (Anemia)", match: 76, analysis: "Without enough iron, your body can't produce enough hemoglobin, leading to exhaustion and potentially pale skin.", sources: "Spinach, red meat, lentils, and pumpkin seeds." }
            ];
            const outro = "Are you experiencing any other symptoms like muscle aches (which might point towards Vitamin D) or tingling in your extremities (pointing to B12)?";
            return buildDiagnosisHTML(userContextHTML, intro, possibilities, outro);
        }
        
        if (lowercaseInput.includes('muscle') || lowercaseInput.includes('cramp') || lowercaseInput.includes('spasm')) {
            const intro = "Muscle cramps and spasms are generally linked to electrolyte imbalances. Here is the ranked breakdown of potential causes:";
            const possibilities = [
                { name: "Magnesium Deficiency", match: 89, analysis: "Magnesium is nature's 'relaxant' mineral. A lack of it causes muscles to remain contracted, leading to spasms.", sources: "Almonds, spinach, black beans, and dark chocolate." },
                { name: "Potassium Deficiency", match: 72, analysis: "Potassium helps conduct electrical signals in the body. Rapid loss (e.g., through sweating) often causes acute cramping.", sources: "Bananas, sweet potatoes, and avocados." },
                { name: "Calcium & Vitamin D Imbalance", match: 58, analysis: "Calcium is needed for muscle contraction, and Vitamin D is essential for calcium absorption.", sources: "Dairy products, leafy greens, and fortified plant milks." }
            ];
            const outro = "Note: Standard dehydration is the #1 cause of muscle cramps. Ensure you are adequately hydrated first!";
            return buildDiagnosisHTML(userContextHTML, intro, possibilities, outro);
        }

        if (lowercaseInput.includes('hair') || lowercaseInput.includes('nail') || lowercaseInput.includes('skin')) {
            const intro = "Structural issues with hair, skin, and nails often overlap. Here is the ranked analysis of primary suspects:";
            const possibilities = [
                { name: "Biotin (Vitamin B7) Deficiency", match: 94, analysis: "Biotin is essential for the production of keratin, the fundamental protein that makes up your hair, skin, and nails.", sources: "Eggs (especially the yolk), organ meats, and nuts." },
                { name: "Iron Deficiency", match: 75, analysis: "Hair thinning and spoon-shaped nails are classic signs of anemia, as hair follicles don't receive enough oxygenated blood.", sources: "Iron-rich foods paired with Vitamin C (to boost absorption)." },
                { name: "Vitamin E & Omega-3 Deficiencies", match: 61, analysis: "If the primary symptom is excessively dry or flaky skin, you might lack these crucial fats and antioxidants.", sources: "Fatty fish, walnuts, flaxseeds, and sunflower seeds." }
            ];
            const outro = "Would you like more targeted advice based on whether the issue is primarily affecting your hair, nails, or skin?";
            return buildDiagnosisHTML(userContextHTML, intro, possibilities, outro);
        }
        
        // Default response
        return userContextMD + `That's interesting. Because symptoms rarely point to just one issue, I can provide a multi-diagnosis breakdown of potential nutritional gaps. 
        
Could you provide a bit more detail? For example:
- Are you experiencing fatigue, weakness, or trouble sleeping?
- Do you have any skin problems, brittle nails, or hair loss?
- Are you dealing with muscle cramps, bone pain, or slow wound healing?
        
The more specific you are, or if you **upload an image**, the better I can provide multiple, accurate potential deficiencies!`;
    }
});
