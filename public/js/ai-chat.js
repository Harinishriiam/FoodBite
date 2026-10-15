// public/js/ai-chat.js - FoodBite AI Recommendation Chatbot Widget
(function () {
  let isChatOpen = false;
  let isGenerating = false;

  const chatHistory = [
    {
      sender: 'ai',
      message: "Hey foodie! 👋 I'm **BiteBot**, your AI culinary concierge. Craving something specific? Try asking me:\n\n• *'I want something spicy under Rs.200'*\n• *'Recommend a dessert'*\n• *'Pure veg dinner options'*",
      recommendations: [],
      suggestedQueries: [
        "Spicy snacks under ₹200",
        "Recommend a dessert",
        "Cheesy pizzas for dinner",
        "Cold drinks & shakes"
      ]
    }
  ];

  function toggleChat() {
    isChatOpen = !isChatOpen;
    const windowEl = document.getElementById('ai-chat-window');
    const badgeEl = document.getElementById('ai-chat-floating-btn');

    if (isChatOpen) {
      windowEl.classList.remove('hidden');
      setTimeout(() => {
        windowEl.classList.remove('scale-95', 'opacity-0', 'pointer-events-none');
        windowEl.classList.add('scale-100', 'opacity-100');
        document.getElementById('ai-chat-input')?.focus();
      }, 10);
    } else {
      windowEl.classList.remove('scale-100', 'opacity-100');
      windowEl.classList.add('scale-95', 'opacity-0', 'pointer-events-none');
      setTimeout(() => {
        windowEl.classList.add('hidden');
      }, 200);
    }
  }

  function renderMessages() {
    const container = document.getElementById('ai-chat-messages');
    if (!container) return;

    container.innerHTML = chatHistory.map((msg, index) => {
      const isAI = msg.sender === 'ai';
      return `
        <div class="flex flex-col gap-1.5 ${isAI ? 'items-start' : 'items-end'} mb-3">
          <div class="flex items-center gap-2 text-[11px] text-slate-400 font-medium">
            ${isAI ? '<span class="flex items-center gap-1 text-orange-400 font-bold">🤖 BiteBot AI</span>' : '<span>You</span>'}
          </div>
          <div class="max-w-[88%] p-3 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-sm ${
            isAI ? 'chat-bubble-ai' : 'chat-bubble-user font-medium'
          }">
            <div>${formatMarkdown(msg.message)}</div>
            ${msg.recommendations && msg.recommendations.length > 0 ? renderFoodCards(msg.recommendations) : ''}
          </div>

          <!-- Suggested Query Chips -->
          ${isAI && msg.suggestedQueries && msg.suggestedQueries.length > 0 && index === chatHistory.length - 1 ? `
            <div class="flex flex-wrap gap-1.5 mt-1">
              ${msg.suggestedQueries.map(q => `
                <button onclick="window.FoodBiteChat.sendQuery('${escapeHtml(q)}')" class="text-[11px] bg-slate-800/90 hover:bg-orange-500/20 hover:text-orange-300 text-slate-300 border border-slate-700/80 px-2.5 py-1 rounded-full transition-colors">
                  💡 ${escapeHtml(q)}
                </button>
              `).join('')}
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
  }

  function renderFoodCards(items) {
    return `
      <div class="mt-3 space-y-2">
        <div class="text-[11px] font-semibold text-orange-300 uppercase tracking-wider flex items-center justify-between">
          <span>AI Matched Dishes (${items.length})</span>
          <button onclick="window.FoodBiteChat.applyMenuFilter(${escapeHtml(JSON.stringify(items.map(i => i.id)))})" class="text-[10px] text-orange-400 hover:underline">
            Filter Main Menu ↗
          </button>
        </div>
        <div class="grid grid-cols-1 gap-2">
          ${items.map(item => `
            <div class="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 flex items-center gap-2.5 transition-all hover:border-slate-700">
              <img src="${item.image}" alt="${item.name}" class="w-14 h-14 rounded-lg object-cover flex-shrink-0 border border-slate-800" />
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-sm border ${item.isVeg ? 'border-emerald-500' : 'border-rose-500'} flex items-center justify-center">
                    <span class="w-0.5 h-0.5 rounded-full ${item.isVeg ? 'bg-emerald-500' : 'bg-rose-500'}"></span>
                  </span>
                  <div class="text-xs font-bold text-slate-100 truncate">${item.name}</div>
                </div>
                <div class="text-[10px] text-amber-400 mt-0.5 font-medium flex items-center gap-1">
                  <span>★ ${item.rating}</span>
                  <span class="text-slate-500">•</span>
                  <span class="text-orange-400 font-bold">₹${item.price}</span>
                  ${item.spicyLevel >= 2 ? '<span class="text-[10px]">🌶️ Spicy</span>' : ''}
                </div>
                <div class="text-[10px] text-slate-400 line-clamp-1 italic mt-0.5">${item.matchReason}</div>
              </div>
              <div class="flex flex-col gap-1 flex-shrink-0">
                <button onclick="window.FoodBiteCart.addToCart({ id: '${item.id}', name: '${escapeHtml(item.name)}', price: ${item.price}, image: '${item.image}', isVeg: ${item.isVeg}, category: '${item.category}' })" class="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-[10px] px-2 py-1 rounded-lg transition-all shadow-sm">
                  + Add
                </button>
                <button onclick="window.FoodBiteChat.highlightItem('${item.id}')" class="text-[9px] text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-1.5 py-0.5 rounded text-center transition-colors">
                  View
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function showTypingIndicator() {
    const container = document.getElementById('ai-chat-messages');
    if (!container) return;

    const typingEl = document.createElement('div');
    typingEl.id = 'ai-typing-indicator';
    typingEl.className = 'flex items-center gap-1.5 p-3 rounded-2xl chat-bubble-ai w-fit mb-3';
    typingEl.innerHTML = `
      <span class="text-xs text-slate-400 mr-1.5">BiteBot is thinking</span>
      <span class="w-1.5 h-1.5 bg-orange-400 rounded-full typing-dot"></span>
      <span class="w-1.5 h-1.5 bg-orange-400 rounded-full typing-dot"></span>
      <span class="w-1.5 h-1.5 bg-orange-400 rounded-full typing-dot"></span>
    `;
    container.appendChild(typingEl);
    container.scrollTop = container.scrollHeight;
  }

  function removeTypingIndicator() {
    const indicator = document.getElementById('ai-typing-indicator');
    if (indicator) indicator.remove();
  }

  async function sendMessage(text) {
    if (!text || !text.trim() || isGenerating) return;
    const query = text.trim();

    // Add user message
    chatHistory.push({
      sender: 'user',
      message: query
    });
    renderMessages();

    const input = document.getElementById('ai-chat-input');
    if (input) input.value = '';

    isGenerating = true;
    showTypingIndicator();

    try {
      const res = await fetch('/api/ai/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      const data = await res.json();

      removeTypingIndicator();

      if (data.success) {
        chatHistory.push({
          sender: 'ai',
          message: data.message,
          recommendations: data.recommendations || [],
          suggestedQueries: data.suggestedQueries || []
        });
      } else {
        chatHistory.push({
          sender: 'ai',
          message: "Oops! I ran into a slight hiccup checking the kitchen shelves. Please try again in a second!",
          recommendations: []
        });
      }
    } catch (err) {
      removeTypingIndicator();
      console.error(err);
      chatHistory.push({
        sender: 'ai',
        message: "Sorry, I lost connection to the pantry server. Please make sure the local server is running!",
        recommendations: []
      });
    } finally {
      isGenerating = false;
      renderMessages();
    }
  }

  // Scroll to and highlight a dish card on the main menu
  function highlightItem(itemId) {
    // If chat is open on mobile, close or minimize to see
    if (window.innerWidth < 768) {
      toggleChat();
    }

    const card = document.getElementById(`menu-card-${itemId}`);
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.classList.add('spotlight-active');
      setTimeout(() => {
        card.classList.remove('spotlight-active');
      }, 5000);
      window.FoodBiteCart.showToast("Highlighted on menu! 🌟", "info");
    } else {
      // If card not in current view, reset category filter to 'All'
      if (window.FoodBiteApp) {
        window.FoodBiteApp.setCategory('All', () => {
          setTimeout(() => {
            const el = document.getElementById(`menu-card-${itemId}`);
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              el.classList.add('spotlight-active');
              setTimeout(() => el.classList.remove('spotlight-active'), 5000);
            }
          }, 200);
        });
      }
    }
  }

  // Filter main dashboard to show only the AI recommended items
  function applyMenuFilter(itemIds) {
    if (window.FoodBiteApp) {
      window.FoodBiteApp.filterByItemIds(itemIds);
      if (window.innerWidth < 768) {
        toggleChat();
      }
    }
  }

  function clearChat() {
    chatHistory.length = 0;
    chatHistory.push({
      sender: 'ai',
      message: "Chat refreshed! How can I satisfy your cravings right now? 🍲",
      recommendations: [],
      suggestedQueries: [
        "Spicy chicken under ₹200",
        "Recommend a dessert",
        "Healthy veg options",
        "Pizzas for two"
      ]
    });
    renderMessages();
  }

  // Helper markdown parser
  function formatMarkdown(text) {
    if (!text) return '';
    let html = escapeHtml(text)
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n\n/g, '<br/><br/>')
      .replace(/\n/g, '<br/>');
    return html;
  }

  function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Public API
  window.FoodBiteChat = {
    toggleChat,
    sendQuery: (query) => {
      // If chat is closed, open it
      if (!isChatOpen) toggleChat();
      sendMessage(query);
    },
    highlightItem,
    applyMenuFilter,
    clearChat
  };

  document.addEventListener('DOMContentLoaded', () => {
    renderMessages();

    // Chat toggle buttons
    const triggerBtn = document.getElementById('ai-chat-floating-btn');
    const closeBtn = document.getElementById('ai-chat-close-btn');
    const navAIBtn = document.getElementById('nav-ai-btn');
    const heroAIBtn = document.getElementById('hero-ai-btn');

    if (triggerBtn) triggerBtn.addEventListener('click', toggleChat);
    if (closeBtn) closeBtn.addEventListener('click', toggleChat);
    if (navAIBtn) navAIBtn.addEventListener('click', toggleChat);
    if (heroAIBtn) heroAIBtn.addEventListener('click', toggleChat);

    // Chat Form
    const form = document.getElementById('ai-chat-form');
    const input = document.getElementById('ai-chat-input');
    if (form && input) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        sendMessage(input.value);
      });
    }

    // Clear chat button
    const clearBtn = document.getElementById('ai-chat-clear-btn');
    if (clearBtn) clearBtn.addEventListener('click', clearChat);

    // Hero quick prompts
    document.querySelectorAll('.hero-prompt-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        const query = btn.getAttribute('data-query');
        window.FoodBiteChat.sendQuery(query);
      });
    });
  });
})();
