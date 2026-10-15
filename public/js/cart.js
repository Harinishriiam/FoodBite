// public/js/cart.js - FoodBite Interactive Cart & Checkout System
(function () {
  const CART_STORAGE_KEY = 'foodbite_cart_v1';

  const cartState = {
    items: [],
    coupon: null, // { code, discountAmount, label }
    customer: {
      name: 'Aditya Sharma',
      phone: '+91 98765 43210',
      address: 'Apt 402, Skyline Residency, Outer Ring Road, Bengaluru',
      paymentMethod: 'UPI (Google Pay / PhonePe)',
      notes: ''
    },
    activeOrder: null
  };

  // Load from localStorage
  function loadCart() {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      if (saved) {
        cartState.items = JSON.parse(saved);
      }
    } catch (e) {
      console.error('Could not load cart from storage', e);
      cartState.items = [];
    }
  }

  // Save to localStorage
  function saveCart() {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartState.items));
    } catch (e) {
      console.error('Could not save cart', e);
    }
    updateCartBadge();
    window.dispatchEvent(new CustomEvent('foodbite:cart-updated', { detail: cartState }));
  }

  // Get total count of items
  function getTotalCount() {
    return cartState.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  // Get Subtotal
  function getSubtotal() {
    return cartState.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }

  // Add Item to Cart
  function addToCart(item, quantity = 1) {
    const existing = cartState.items.find(i => i.id === item.id);
    if (existing) {
      existing.quantity += quantity;
    } else {
      cartState.items.push({
        id: item.id,
        name: item.name,
        price: item.price,
        image: item.image,
        isVeg: item.isVeg,
        category: item.category,
        quantity: Math.max(1, quantity)
      });
    }

    saveCart();
    renderCartDrawer();
    showToast(`Added ${item.name} to cart! 😋`, 'success');
  }

  // Update Item Quantity
  function updateQuantity(itemId, delta) {
    const item = cartState.items.find(i => i.id === itemId);
    if (!item) return;

    item.quantity += delta;
    if (item.quantity <= 0) {
      cartState.items = cartState.items.filter(i => i.id !== itemId);
      showToast(`Removed from cart`, 'info');
    }
    saveCart();
    renderCartDrawer();
  }

  // Remove completely
  function removeItem(itemId) {
    cartState.items = cartState.items.filter(i => i.id !== itemId);
    saveCart();
    renderCartDrawer();
    showToast(`Item removed from cart`, 'info');
  }

  // Clear Cart
  function clearCart() {
    cartState.items = [];
    cartState.coupon = null;
    saveCart();
    renderCartDrawer();
  }

  // Update Cart Header Badge
  function updateCartBadge() {
    const count = getTotalCount();
    const badges = document.querySelectorAll('.cart-count-badge');
    badges.forEach(badge => {
      badge.textContent = count;
      if (count > 0) {
        badge.classList.remove('hidden');
        badge.classList.add('badge-pop');
        setTimeout(() => badge.classList.remove('badge-pop'), 400);
      } else {
        badge.classList.add('hidden');
      }
    });

    const subtotalEl = document.getElementById('nav-cart-subtotal');
    if (subtotalEl) {
      subtotalEl.textContent = `₹${getSubtotal()}`;
    }
  }

  // Open & Close Drawer
  function openCartDrawer() {
    const drawer = document.getElementById('cart-drawer');
    const backdrop = document.getElementById('cart-backdrop');
    if (drawer && backdrop) {
      renderCartDrawer();
      backdrop.classList.remove('hidden');
      setTimeout(() => {
        backdrop.classList.remove('opacity-0');
        drawer.classList.remove('translate-x-full');
      }, 10);
      document.body.style.overflow = 'hidden';
    }
  }

  function closeCartDrawer() {
    const drawer = document.getElementById('cart-drawer');
    const backdrop = document.getElementById('cart-backdrop');
    if (drawer && backdrop) {
      drawer.classList.add('translate-x-full');
      backdrop.classList.add('opacity-0');
      setTimeout(() => {
        backdrop.classList.add('hidden');
        document.body.style.overflow = '';
      }, 300);
    }
  }

  // Apply Coupon via backend validation
  async function applyCoupon(code) {
    if (!code || !code.trim()) {
      showToast('Please enter a coupon code', 'warning');
      return;
    }

    const subtotal = getSubtotal();
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim(), subtotal })
      });
      const data = await res.json();
      if (data.success) {
        cartState.coupon = {
          code: data.code,
          discountAmount: data.discountAmount,
          label: data.label
        };
        showToast(`🎉 Coupon ${data.code} applied! Saved ₹${data.discountAmount}`, 'success');
        renderCartDrawer();
      } else {
        showToast(data.message || 'Invalid coupon code', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to validate coupon', 'error');
    }
  }

  function removeCoupon() {
    cartState.coupon = null;
    showToast('Coupon removed', 'info');
    renderCartDrawer();
  }

  // Render Cart Drawer
  function renderCartDrawer() {
    const container = document.getElementById('cart-drawer-items');
    const emptyState = document.getElementById('cart-drawer-empty');
    const footer = document.getElementById('cart-drawer-footer');
    const countHeader = document.getElementById('cart-drawer-count');

    if (!container || !emptyState || !footer) return;

    const count = getTotalCount();
    if (countHeader) countHeader.textContent = `${count} ${count === 1 ? 'item' : 'items'}`;

    if (cartState.items.length === 0) {
      container.classList.add('hidden');
      footer.classList.add('hidden');
      emptyState.classList.remove('hidden');
      return;
    }

    emptyState.classList.add('hidden');
    container.classList.remove('hidden');
    footer.classList.remove('hidden');

    // Free delivery progress bar (Target: ₹399)
    const subtotal = getSubtotal();
    const freeDeliveryThreshold = 399;
    const deliveryBanner = document.getElementById('free-delivery-banner');
    if (deliveryBanner) {
      if (subtotal >= freeDeliveryThreshold) {
        deliveryBanner.innerHTML = `
          <div class="flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-xl">
            <span class="text-base">🎉</span>
            <span>You've unlocked <strong>FREE Delivery</strong> on this order!</span>
          </div>
        `;
      } else {
        const remaining = freeDeliveryThreshold - subtotal;
        const percent = Math.min(100, Math.round((subtotal / freeDeliveryThreshold) * 100));
        deliveryBanner.innerHTML = `
          <div class="bg-slate-900/80 border border-slate-800 p-3 rounded-xl space-y-1.5">
            <div class="flex justify-between items-center text-xs">
              <span class="text-slate-300">Add <strong class="text-orange-400">₹${remaining}</strong> more for <strong>FREE Delivery</strong></span>
              <span class="text-slate-400 text-[11px] font-mono">${percent}%</span>
            </div>
            <div class="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div class="bg-gradient-to-r from-orange-500 to-amber-400 h-1.5 rounded-full transition-all duration-500" style="width: ${percent}%"></div>
            </div>
          </div>
        `;
      }
    }

    // Render items list
    container.innerHTML = cartState.items.map(item => `
      <div class="flex items-center gap-3 p-3 bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 rounded-2xl transition-all">
        <img src="${item.image}" alt="${item.name}" class="w-16 h-16 rounded-xl object-cover border border-slate-800 flex-shrink-0" />
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-sm flex items-center justify-center border ${item.isVeg ? 'border-emerald-500' : 'border-rose-500'}">
              <span class="w-1 h-1 rounded-full ${item.isVeg ? 'bg-emerald-500' : 'bg-rose-500'}"></span>
            </span>
            <h4 class="text-sm font-semibold text-slate-100 truncate">${item.name}</h4>
          </div>
          <div class="text-xs text-slate-400 mt-0.5">₹${item.price} each</div>
          <div class="text-xs font-bold text-orange-400 mt-1">₹${item.price * item.quantity}</div>
        </div>
        <!-- Quantity Selector -->
        <div class="flex items-center bg-slate-800 border border-slate-700/80 rounded-xl p-0.5">
          <button onclick="window.FoodBiteCart.updateQuantity('${item.id}', -1)" class="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors font-bold text-sm">−</button>
          <span class="w-7 text-center font-bold text-xs text-white">${item.quantity}</span>
          <button onclick="window.FoodBiteCart.updateQuantity('${item.id}', 1)" class="w-7 h-7 flex items-center justify-center text-orange-400 hover:text-orange-300 hover:bg-slate-700 rounded-lg transition-colors font-bold text-sm">+</button>
        </div>
      </div>
    `).join('');

    // Bill calculations
    const deliveryFee = subtotal >= freeDeliveryThreshold ? 0 : 39;
    const discount = cartState.coupon ? cartState.coupon.discountAmount : 0;
    const taxableAmount = Math.max(0, subtotal - discount);
    const gst = Math.round(taxableAmount * 0.05);
    const platformFee = 7;
    const grandTotal = Math.max(0, taxableAmount + deliveryFee + gst + platformFee);

    // Update bill breakdown UI
    const billEl = document.getElementById('cart-bill-details');
    if (billEl) {
      billEl.innerHTML = `
        <div class="space-y-1.5 text-xs text-slate-400 pt-2 border-t border-slate-800">
          <div class="flex justify-between">
            <span>Item Subtotal</span>
            <span class="font-medium text-slate-200">₹${subtotal}</span>
          </div>
          ${cartState.coupon ? `
            <div class="flex justify-between text-emerald-400 font-medium">
              <span class="flex items-center gap-1">
                🏷️ Coupon (${cartState.coupon.code})
                <button onclick="window.FoodBiteCart.removeCoupon()" class="text-rose-400 hover:underline text-[10px] ml-1">Remove</button>
              </span>
              <span>− ₹${discount}</span>
            </div>
          ` : ''}
          <div class="flex justify-between">
            <span>Delivery Partner Fee</span>
            <span class="font-medium ${deliveryFee === 0 ? 'text-emerald-400' : 'text-slate-200'}">
              ${deliveryFee === 0 ? '<span class="line-through text-slate-500 mr-1">₹39</span> FREE' : `₹${deliveryFee}`}
            </span>
          </div>
          <div class="flex justify-between">
            <span>Taxes & Restaurant GST (5%)</span>
            <span class="font-medium text-slate-200">₹${gst}</span>
          </div>
          <div class="flex justify-between">
            <span>Platform Service Fee</span>
            <span class="font-medium text-slate-200">₹${platformFee}</span>
          </div>
          <div class="flex justify-between items-center text-sm font-bold text-white pt-2 border-t border-slate-800">
            <span>To Pay</span>
            <span class="text-lg text-orange-400 font-extrabold">₹${grandTotal}</span>
          </div>
        </div>
      `;
    }

    // Update button text
    const checkoutBtn = document.getElementById('cart-checkout-btn');
    if (checkoutBtn) {
      checkoutBtn.innerHTML = `
        <span>Proceed to Checkout</span>
        <span class="bg-black/30 px-2.5 py-1 rounded-lg text-xs font-mono font-bold">₹${grandTotal}</span>
      `;
    }
  }

  // Open Checkout Modal
  function openCheckoutModal() {
    if (cartState.items.length === 0) {
      showToast('Your cart is empty!', 'warning');
      return;
    }
    closeCartDrawer();

    const modal = document.getElementById('checkout-modal');
    if (modal) {
      modal.classList.remove('hidden');
      document.body.style.overflow = 'hidden';

      const subtotal = getSubtotal();
      const freeDeliveryThreshold = 399;
      const deliveryFee = subtotal >= freeDeliveryThreshold ? 0 : 39;
      const discount = cartState.coupon ? cartState.coupon.discountAmount : 0;
      const gst = Math.round(Math.max(0, subtotal - discount) * 0.05);
      const platformFee = 7;
      const grandTotal = Math.max(0, subtotal - discount + deliveryFee + gst + platformFee);

      const payBtn = document.getElementById('checkout-pay-btn');
      if (payBtn) {
        payBtn.textContent = `Pay ₹${grandTotal} & Place Order`;
      }

      const totalPreview = document.getElementById('checkout-total-preview');
      if (totalPreview) {
        totalPreview.textContent = `₹${grandTotal}`;
      }

      const itemCountPreview = document.getElementById('checkout-items-preview');
      if (itemCountPreview) {
        itemCountPreview.textContent = `${getTotalCount()} items`;
      }
    }
  }

  function closeCheckoutModal() {
    const modal = document.getElementById('checkout-modal');
    if (modal) {
      modal.classList.add('hidden');
      document.body.style.overflow = '';
    }
  }

  // Submit Order to backend
  async function submitOrder() {
    const payBtn = document.getElementById('checkout-pay-btn');
    if (payBtn) {
      payBtn.disabled = true;
      payBtn.innerHTML = `<span class="inline-block animate-spin mr-2">⏳</span> Cooking & Placing Order...`;
    }

    const customerData = {
      name: document.getElementById('checkout-cust-name')?.value || cartState.customer.name,
      phone: document.getElementById('checkout-cust-phone')?.value || cartState.customer.phone,
      address: document.getElementById('checkout-cust-address')?.value || cartState.customer.address,
      notes: document.getElementById('checkout-cust-notes')?.value || '',
      paymentMethod: document.querySelector('input[name="paymentMethod"]:checked')?.value || 'UPI (Google Pay / PhonePe)'
    };

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cartState.items,
          customer: customerData,
          couponCode: cartState.coupon?.code || null
        })
      });

      const data = await response.json();
      if (data.success) {
        cartState.activeOrder = data.order;
        // Clear cart
        cartState.items = [];
        cartState.coupon = null;
        saveCart();
        closeCheckoutModal();
        triggerConfetti();
        openOrderConfirmationModal(data.order);
      } else {
        showToast(data.message || 'Could not place order', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error placing order. Please try again.', 'error');
    } finally {
      if (payBtn) {
        payBtn.disabled = false;
      }
    }
  }

  // Order Confirmation & Live Tracker Modal
  function openOrderConfirmationModal(order) {
    const modal = document.getElementById('order-tracker-modal');
    if (!modal) return;

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    // Populate order details
    const orderIdEl = document.getElementById('tracker-order-id');
    const etaEl = document.getElementById('tracker-eta');
    const itemsListEl = document.getElementById('tracker-items-list');
    const grandTotalEl = document.getElementById('tracker-grand-total');
    const addressEl = document.getElementById('tracker-address');

    if (orderIdEl) orderIdEl.textContent = order.orderId;
    if (etaEl) etaEl.textContent = `${order.etaMinutes} mins`;
    if (grandTotalEl) grandTotalEl.textContent = `₹${order.bill.grandTotal}`;
    if (addressEl) addressEl.textContent = order.customer.address;

    if (itemsListEl) {
      itemsListEl.innerHTML = order.items.map(item => `
        <div class="flex justify-between items-center text-xs py-1 text-slate-300">
          <span>${item.quantity}x ${item.name}</span>
          <span class="font-semibold text-slate-100">₹${item.itemTotal}</span>
        </div>
      `).join('');
    }

    startLiveOrderTracker(order.orderId);
  }

  function closeOrderConfirmationModal() {
    const modal = document.getElementById('order-tracker-modal');
    if (modal) {
      modal.classList.add('hidden');
      document.body.style.overflow = '';
    }
  }

  // Simulated live step progression
  let trackerInterval = null;
  function startLiveOrderTracker(orderId) {
    if (trackerInterval) clearInterval(trackerInterval);

    let currentStep = 1; // 0: Placed, 1: Preparing, 2: Out for delivery, 3: Arrived
    const steps = [
      document.getElementById('step-1-dot'),
      document.getElementById('step-2-dot'),
      document.getElementById('step-3-dot'),
      document.getElementById('step-4-dot')
    ];
    const statusText = document.getElementById('tracker-status-text');

    trackerInterval = setInterval(() => {
      currentStep++;
      if (currentStep === 2) {
        if (steps[1]) {
          steps[1].classList.remove('bg-slate-700', 'text-slate-400');
          steps[1].classList.add('bg-orange-500', 'text-white', 'ring-4', 'ring-orange-500/20');
        }
        if (statusText) statusText.textContent = 'Chef is preparing your fresh meal 👨‍🍳🔥';
      } else if (currentStep === 3) {
        if (steps[2]) {
          steps[2].classList.remove('bg-slate-700', 'text-slate-400');
          steps[2].classList.add('bg-orange-500', 'text-white', 'ring-4', 'ring-orange-500/20');
        }
        if (statusText) statusText.textContent = 'Delivery Partner Rahul has picked up your order 🛵💨';
      } else if (currentStep >= 4) {
        if (steps[3]) {
          steps[3].classList.remove('bg-slate-700', 'text-slate-400');
          steps[3].classList.add('bg-emerald-500', 'text-white', 'ring-4', 'ring-emerald-500/20');
        }
        if (statusText) statusText.textContent = 'Delivered! Bon Appétit! 😋🍴';
        clearInterval(trackerInterval);
      }
    }, 12000); // Progresses smoothly for demonstration
  }

  // Confetti Animation Trigger
  function triggerConfetti() {
    const container = document.getElementById('confetti-container');
    if (!container) return;
    container.innerHTML = '';
    const colors = ['#f97316', '#ef4444', '#10b981', '#3b82f6', '#f59e0b', '#ec4899'];

    for (let i = 0; i < 60; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';
      piece.style.left = `${Math.random() * 100}%`;
      piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      piece.style.width = `${Math.random() * 8 + 6}px`;
      piece.style.height = `${Math.random() * 8 + 6}px`;
      piece.style.animation = `confettiDrop ${Math.random() * 1.5 + 1.5}s linear forwards`;
      piece.style.animationDelay = `${Math.random() * 0.4}s`;
      container.appendChild(piece);
    }

    setTimeout(() => {
      container.innerHTML = '';
    }, 4000);
  }

  // Toast Notification
  function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;

    const toast = document.createElement('div');
    const colorClasses = {
      success: 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200',
      error: 'bg-rose-950/90 border-rose-500/40 text-rose-200',
      warning: 'bg-amber-950/90 border-amber-500/40 text-amber-200',
      info: 'bg-slate-900/90 border-slate-700 text-slate-200'
    }[type] || 'bg-slate-900 border-slate-700 text-slate-200';

    toast.className = `flex items-center gap-2 px-4 py-3 rounded-xl border shadow-xl text-xs sm:text-sm font-medium backdrop-blur-md transform translate-y-2 opacity-0 transition-all duration-300 pointer-events-auto ${colorClasses}`;
    toast.innerHTML = `<span>${message}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.remove('translate-y-2', 'opacity-0');
    }, 10);

    setTimeout(() => {
      toast.classList.add('translate-y-2', 'opacity-0');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // Initialize
  loadCart();

  // Expose to window for global access
  window.FoodBiteCart = {
    addToCart,
    removeFromCart: removeItem,
    updateQuantity,
    clearCart,
    openCartDrawer,
    closeCartDrawer,
    openCheckoutModal,
    closeCheckoutModal,
    submitOrder,
    openOrderConfirmationModal,
    closeOrderConfirmationModal,
    applyCoupon,
    removeCoupon,
    showToast,
    getState: () => cartState,
    getItemQuantity: (id) => {
      const it = cartState.items.find(i => i.id === id);
      return it ? it.quantity : 0;
    }
  };

  // Setup DOM Event Listeners when ready
  document.addEventListener('DOMContentLoaded', () => {
    updateCartBadge();

    // Drawer backdrop click
    const backdrop = document.getElementById('cart-backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', closeCartDrawer);
    }

    // Coupon form
    const couponBtn = document.getElementById('cart-apply-coupon-btn');
    const couponInput = document.getElementById('cart-coupon-input');
    if (couponBtn && couponInput) {
      couponBtn.addEventListener('click', () => {
        applyCoupon(couponInput.value);
      });
      couponInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') applyCoupon(couponInput.value);
      });
    }

    // Quick coupon chips
    document.querySelectorAll('.quick-coupon-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const code = chip.getAttribute('data-code');
        if (couponInput) couponInput.value = code;
        applyCoupon(code);
      });
    });
  });
})();
