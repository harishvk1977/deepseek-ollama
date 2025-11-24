/*
 * Standalone Chatbot JavaScript
 * Copy this entire file to your project's static/js/ directory
 * Then include it in your HTML: <script src="static/js/chatbot.js"></script>
 * 
 * Requirements: Your Flask app must have a POST endpoint at '/api/chat'
 * that accepts JSON: {"message": "user message"} and returns JSON: {"response": "bot response"}
 */

class Chatbot {
    constructor() {
        this.isOpen = false;
        this.messageHistory = [];
        this.isTyping = false;
        this.apiEndpoint = '/api/chat'; // Change this if your endpoint is different
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadChatHistory();
        console.log('Chatbot initialized successfully');
    }

    bindEvents() {
        // Handle form submission
        const chatForm = document.querySelector('.chat-input-form');
        if (chatForm) {
            chatForm.addEventListener('submit', (e) => this.sendMessage(e));
        }

        // Handle enter key (but allow Shift+Enter for new lines)
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage(e);
                }
            });

            // Auto-resize input as user types
            messageInput.addEventListener('input', this.autoResize);
        }

        // Handle escape key to close chat
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.toggleChat();
            }
        });

        // Close chat when clicking outside
        document.addEventListener('click', (e) => this.handleOutsideClick(e));
    }

    toggleChat() {
        const chatPopup = document.getElementById('chatPopup');
        const chatButton = document.querySelector('.chatbot-button');
        
        if (!chatPopup) {
            console.error('Chat popup element not found. Make sure you have added the HTML elements.');
            return;
        }
        
        if (!this.isOpen) {
            chatPopup.style.display = 'block';
            this.isOpen = true;
            
            // Focus on input
            const messageInput = document.getElementById('messageInput');
            if (messageInput) {
                setTimeout(() => messageInput.focus(), 100);
            }
            
            // Add pulse effect to button
            if (chatButton) {
                chatButton.classList.add('pulse');
            }
            
            // Send welcome message if no history
            if (this.messageHistory.length === 0) {
                this.addWelcomeMessage();
            }
        } else {
            chatPopup.style.display = 'none';
            this.isOpen = false;
            
            // Remove pulse effect
            if (chatButton) {
                chatButton.classList.remove('pulse');
            }
        }
    }

    addWelcomeMessage() {
        const welcomeMessages = [
            "Hi! I'm your AI assistant. How can I help you today?",
            "Hello! I'm here to help. What can I do for you?",
            "Welcome! Feel free to ask me anything.",
            "Hi there! How can I assist you today?"
        ];
        
        const randomWelcome = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
        this.addMessage(randomWelcome, false);
    }

    addMessage(message, isUser = false, skipHistory = false) {
        const chatMessages = document.getElementById('chatMessages');
        if (!chatMessages) {
            console.error('Chat messages container not found');
            return;
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user' : 'bot'}`;
        
        // Add timestamp
        const now = new Date();
        const timestamp = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        messageDiv.innerHTML = `
            <div class="message-content">${this.escapeHtml(message)}</div>
            <div class="message-status">${timestamp}</div>
        `;
        
        chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
        
        // Store in history (unless it's a restored message)
        if (!skipHistory) {
            this.messageHistory.push({
                message: message,
                isUser: isUser,
                timestamp: now.toISOString()
            });
            this.saveChatHistory();
        }
    }

    addTypingIndicator() {
        if (this.isTyping) return;
        
        this.isTyping = true;
        const chatMessages = document.getElementById('chatMessages');
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message typing';
        typingDiv.id = 'typingIndicator';
        typingDiv.innerHTML = `
            <div class="typing-dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
            <span style="margin-left: 8px;">AI is typing...</span>
        `;
        chatMessages.appendChild(typingDiv);
        this.scrollToBottom();
    }

    removeTypingIndicator() {
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
        this.isTyping = false;
    }

    async sendMessage(event) {
        if (event) {
            event.preventDefault();
        }
        
        const messageInput = document.getElementById('messageInput');
        const sendButton = document.getElementById('sendButton');
        
        if (!messageInput || !sendButton) {
            console.error('Message input or send button not found');
            return;
        }
        
        const message = messageInput.value.trim();
        
        if (!message || this.isTyping) return;
        
        // Add user message to chat
        this.addMessage(message, true);
        messageInput.value = '';
        this.resetInputHeight();
        
        // Disable send button and show typing indicator
        sendButton.disabled = true;
        this.addTypingIndicator();
        
        try {
            // Simulate a small delay for better UX
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Send message to backend
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: message,
                    timestamp: new Date().toISOString(),
                    // You can add more context here if your backend supports it
                    history: this.messageHistory.slice(-5) // Send last 5 messages for context
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Remove typing indicator and add bot response
            this.removeTypingIndicator();
            
            // Handle different response formats
            let botResponse;
            if (data.response) {
                botResponse = data.response;
            } else if (data.message) {
                botResponse = data.message;
            } else if (data.reply) {
                botResponse = data.reply;
            } else {
                botResponse = 'Sorry, I couldn\'t process your request.';
            }
            
            this.addMessage(botResponse);
            
        } catch (error) {
            console.error('Error sending message:', error);
            this.removeTypingIndicator();
            
            let errorMessage = 'Sorry, there was an error processing your request. ';
            
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                errorMessage += 'Please check your internet connection.';
            } else if (error.message.includes('500')) {
                errorMessage += 'The server encountered an error. Please try again later.';
            } else if (error.message.includes('404')) {
                errorMessage += 'The chat service is not available. Please contact support.';
            } else {
                errorMessage += 'Please try again.';
            }
            
            this.addMessage(errorMessage);
        } finally {
            // Re-enable send button and focus input
            sendButton.disabled = false;
            messageInput.focus();
        }
    }

    scrollToBottom() {
        const chatMessages = document.getElementById('chatMessages');
        if (chatMessages) {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    }

    autoResize(event) {
        const input = event.target;
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 80) + 'px';
    }

    resetInputHeight() {
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            messageInput.style.height = 'auto';
        }
    }

    handleOutsideClick(event) {
        const chatPopup = document.getElementById('chatPopup');
        const chatButton = document.querySelector('.chatbot-button');
        
        if (!chatPopup || !chatButton) return;
        
        // Check if click is outside both popup and button
        if (!chatPopup.contains(event.target) && !chatButton.contains(event.target)) {
            if (this.isOpen) {
                this.toggleChat();
            }
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    saveChatHistory() {
        try {
            localStorage.setItem('chatbotHistory', JSON.stringify(this.messageHistory));
        } catch (error) {
            console.warn('Could not save chat history to localStorage:', error);
        }
    }

    loadChatHistory() {
        try {
            const saved = localStorage.getItem('chatbotHistory');
            if (saved) {
                this.messageHistory = JSON.parse(saved);
                // Limit history to last 50 messages to prevent memory issues
                if (this.messageHistory.length > 50) {
                    this.messageHistory = this.messageHistory.slice(-50);
                    this.saveChatHistory();
                }
                this.restoreMessages();
            }
        } catch (error) {
            console.warn('Could not load chat history from localStorage:', error);
            this.messageHistory = [];
        }
    }

    restoreMessages() {
        const chatMessages = document.getElementById('chatMessages');
        if (!chatMessages) return;
        
        // Clear existing messages except welcome
        chatMessages.innerHTML = '';
        
        // Restore messages from history
        this.messageHistory.forEach(msg => {
            this.addMessage(msg.message, msg.isUser, true); // Skip saving to history again
        });
    }

    clearHistory() {
        this.messageHistory = [];
        const chatMessages = document.getElementById('chatMessages');
        if (chatMessages) {
            chatMessages.innerHTML = '';
        }
        this.saveChatHistory();
        this.addWelcomeMessage();
    }

    // Public API methods
    sendPredefinedMessage(message) {
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            messageInput.value = message;
            this.sendMessage();
        }
    }

    setApiEndpoint(endpoint) {
        this.apiEndpoint = endpoint;
    }

    getHistory() {
        return this.messageHistory;
    }

    isOpen() {
        return this.isOpen;
    }
}

// Initialize chatbot when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Create global chatbot instance
    window.chatbot = new Chatbot();
    
    // Make toggle function available globally for backward compatibility
    window.toggleChat = function() {
        if (window.chatbot) {
            window.chatbot.toggleChat();
        } else {
            console.error('Chatbot not initialized');
        }
    };
    
    // Make send message function available globally (for backward compatibility)
    window.sendMessage = function(event) {
        if (window.chatbot) {
            window.chatbot.sendMessage(event);
        } else {
            console.error('Chatbot not initialized');
        }
    };
    
    // Additional utility functions
    window.clearChatHistory = function() {
        if (window.chatbot) {
            if (confirm('Are you sure you want to clear the chat history?')) {
                window.chatbot.clearHistory();
            }
        }
    };
    
    window.sendPredefinedMessage = function(message) {
        if (window.chatbot) {
            window.chatbot.sendPredefinedMessage(message);
        }
    };
    
    console.log('Chatbot scripts loaded successfully');
});

// Export for module systems (optional)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Chatbot;
}

// For debugging purposes - you can remove this in production
window.ChatbotDebug = {
    getChatbot: () => window.chatbot,
    getHistory: () => window.chatbot ? window.chatbot.getHistory() : [],
    clearHistory: () => window.chatbot ? window.chatbot.clearHistory() : null,
    isOpen: () => window.chatbot ? window.chatbot.isOpen : false,
    sendMessage: (msg) => window.chatbot ? window.chatbot.sendPredefinedMessage(msg) : null
};
