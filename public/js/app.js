// public/js/app.js - Main Menu Dashboard & Filter Engine for FoodBite
(function () {
  let allMenuItems = [];
  let displayedItems = [];
  let activeCategory = 'All';
  let activeDietFilter = 'all'; // 'all', 'veg', 'non-veg'
  let activeMaxPrice = 500;
  let activeSpicyOnly = false;
  let activeSortBy = 'popular';
  let searchQuery = '';
  let aiFilteredItemIds = null;

  // Fetch Menu from API
  async function fetchMenu() {
    const grid = document.getElementById('menu-grid');
    if (grid) {
      grid.innerHTML = renderSkeletonLoaders(8);
    }

    try {
      const res = await fetch('/api/menu');
      const data = await res.json();
      if (data.success) {
        allMenuItems = data.items;
        renderCategoryTabs(data.categories);
        applyFilters();
      } else {
        showError('Could not load menu items.');
      }
    } catch (err) {
      console.error(err);
      showError('Unable to connect to FoodBite server. Ensure backend is running.');
    }
  }

  // Render Category Filter Tabs
  function renderCategoryTabs(categories) {
    const container = document.getElementById('category-pills');
    if (!container) return;

    container.innerHTML = categories.map(cat => {
      const count = cat === 'All' ? allMenuItems.length : allMenuItems.filter(i => i.category === cat).length;
      const isActive = cat === activeCategory;
      return `
        <button
          onclick="window.FoodBiteApp.setCategory('${cat}')"
          class="category-tab-btn flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
            isActive
              ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/25 scale-[1.02]'
              : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800'
          }">
          <span>${cat}</span>
          <span class="text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? 'bg-black/25 text-white' : 'bg-slate-800 text-slate-400'}">${count}</span>
        </button>
      `;
    }).join('');
  }

  // Set Category
  function setCategory(cat, callback) {
    activeCategory = cat;
    aiFilteredItemIds = null; // reset AI override when category clicked
    hideAiFilterBanner();
    renderCategoryTabs(['All', 'Biryani & Bowls', 'Burgers & Wraps', 'Pizzas & Italian', 'Street Food & Snacks', 'Desserts & Bakery', 'Beverages & Coolers']);
    applyFilters();
    if (callback) callback();
  }

  // Filter and Sort Items
  function applyFilters() {
    let result = [...allMenuItems];

    // AI filter override
    if (aiFilteredItemIds && Array.isArray(aiFilteredItemIds)) {
      result = result.filter(item => aiFilteredItemIds.includes(item.id));
    } else {
      // Category
      if (activeCategory !== 'All') {
        result = result.filter(item => item.category === activeCategory);
      }
    }

    // Dietary filter
    if (activeDietFilter === 'veg') {
      result = result.filter(item => item.isVeg === true);
    } else if (activeDietFilter === 'non-veg') {
      result = result.filter(item => item.isVeg === false);
    }

    // Max Price
    if (activeMaxPrice < 500) {
      result = result.filter(item => item.price <= activeMaxPrice);
    }

    // Spicy only
    if (activeSpicyOnly) {
      result = result.filter(item => item.spicyLevel >= 2);
    }

    // Search query
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(item =>
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.tags.some(t => t.toLowerCase().includes(q))
      );
    }

    // Sorting
    if (activeSortBy === 'price_asc') {
      result.sort((a, b) => a.price - b.price);
    } else if (activeSortBy === 'price_desc') {
      result.sort((a, b) => b.price - a.price);
    } else if (activeSortBy === 'rating') {
      result.sort((a, b) => b.rating - a.rating);
    } else if (activeSortBy === 'prep_time') {
      result.sort((a, b) => parseInt(a.prepTime) - parseInt(b.prepTime));
    }

    displayedItems = result;
    renderMenuGrid(displayedItems);
    updateResultCount(displayedItems.length);
  }

  // Render Grid Cards
  function renderMenuGrid(items) {
    const grid = document.getElementById('menu-grid');
    const emptyState = document.getElementById('menu-empty-state');
    if (!grid || !emptyState) return;

    if (items.length === 0) {
      grid.classList.add('hidden');
      emptyState.classList.remove('hidden');
      return;
    }

    grid.classList.remove('hidden');
    emptyState.classList.add('hidden');

    grid.innerHTML = items.map(item => {
      const cartQty = window.FoodBiteCart ? window.FoodBiteCart.getItemQuantity(item.id) : 0;
      const spiceIcons = item.spicyLevel === 3 ? '🌶️🌶️🌶️' : item.spicyLevel === 2 ? '🌶️🌶️' : item.spicyLevel === 1 ? '🌶️' : '';

      return `
        <div id="menu-card-${item.id}" class="glass-card rounded-2xl overflow-hidden flex flex-col justify-between group transition-all duration-300">
          <div>
            <!-- Image & Badge header -->
            <div class="relative h-44 sm:h-48 overflow-hidden bg-slate-900 cursor-pointer" onclick="window.FoodBiteApp.openDishDetail('${item.id}')">
              <img
                src="${item.image}"
                alt="${item.name}"
                loading="lazy"
                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div class="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/30"></div>

              <!-- Top floating badges -->
              <div class="absolute top-3 left-3 flex items-center gap-2">
                <!-- Veg / Non-Veg Indicator -->
                <span class="w-5 h-5 rounded-md bg-slate-950/80 backdrop-blur-md border ${item.isVeg ? 'border-emerald-500' : 'border-rose-500'} flex items-center justify-center shadow-md">
                  <span class="w-2 h-2 rounded-full ${item.isVeg ? 'bg-emerald-500' : 'bg-rose-500'}"></span>
                </span>
                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-md ${
                  item.isVeg ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/30' : 'bg-rose-950/70 text-rose-300 border border-rose-500/30'
                }">
                  ${item.isVeg ? 'Veg' : 'Non-Veg'}
                </span>
              </div>

              <!-- Top Right: Prep time & Spice -->
              <div class="absolute top-3 right-3 flex items-center gap-1.5">
                ${spiceIcons ? `<span class="text-xs bg-slate-950/80 backdrop-blur-md px-2 py-0.5 rounded-full border border-orange-500/30 text-orange-300 font-bold">${spiceIcons}</span>` : ''}
                <span class="text-[11px] bg-slate-950/80 backdrop-blur-md px-2 py-0.5 rounded-full border border-slate-700/80 text-slate-300 font-medium">
                  ⏱️ ${item.prepTime}
                </span>
              </div>

              <!-- Bottom of image: Category & Calories -->
              <div class="absolute bottom-2 left-3 right-3 flex justify-between items-center text-[11px] text-slate-300 font-medium">
                <span class="bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-md text-slate-300">${item.category}</span>
                <span class="text-slate-400">${item.calories}</span>
              </div>
            </div>

            <!-- Content Area -->
            <div class="p-4">
              <div class="flex items-start justify-between gap-2">
                <h3 class="font-heading font-bold text-base sm:text-lg text-slate-100 group-hover:text-orange-400 transition-colors leading-snug cursor-pointer" onclick="window.FoodBiteApp.openDishDetail('${item.id}')">
                  ${item.name}
                </h3>
                <!-- Rating Pill -->
                <div class="flex items-center gap-1 bg-amber-500/15 border border-amber-500/30 text-amber-300 px-2 py-0.5 rounded-lg text-xs font-bold flex-shrink-0">
                  <span>★</span>
                  <span>${item.rating}</span>
                </div>
              </div>

              <p class="text-xs text-slate-400 line-clamp-2 mt-2 leading-relaxed">
                ${item.description}
              </p>
            </div>
          </div>

          <!-- Bottom Footer Bar -->
          <div class="p-4 pt-0 flex items-center justify-between border-t border-slate-800/60 mt-2">
            <div>
              <span class="text-[11px] text-slate-400 uppercase tracking-wider block">Price</span>
              <span class="text-lg sm:text-xl font-heading font-extrabold text-orange-400">₹${item.price}</span>
            </div>

            <!-- Add to Cart or Stepper -->
            <div id="btn-container-${item.id}">
              ${renderCartButtonHTML(item, cartQty)}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Helper for button HTML
  function renderCartButtonHTML(item, cartQty) {
    if (cartQty > 0) {
      return `
        <div class="flex items-center bg-slate-800 border border-orange-500/50 rounded-xl p-0.5 shadow-md">
          <button onclick="window.FoodBiteCart.updateQuantity('${item.id}', -1)" class="w-8 h-8 flex items-center justify-center text-slate-200 hover:text-white hover:bg-slate-700 rounded-lg transition-colors font-extrabold text-base">−</button>
          <span class="w-8 text-center font-bold text-sm text-white">${cartQty}</span>
          <button onclick="window.FoodBiteCart.updateQuantity('${item.id}', 1)" class="w-8 h-8 flex items-center justify-center text-orange-400 hover:text-orange-300 hover:bg-slate-700 rounded-lg transition-colors font-extrabold text-base">+</button>
        </div>
      `;
    }

    return `
      <button
        onclick="window.FoodBiteCart.addToCart({ id: '${item.id}', name: '${escapeHtml(item.name)}', price: ${item.price}, image: '${item.image}', isVeg: ${item.isVeg}, category: '${item.category}' })"
        class="flex items-center gap-1.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 active:scale-95 text-white font-bold text-xs sm:text-sm px-4 py-2 rounded-xl shadow-lg shadow-orange-500/20 transition-all">
        <span>+ Add</span>
      </button>
    `;
  }

  // Update card buttons when cart updates
  function syncCardButtons() {
    allMenuItems.forEach(item => {
      const btnContainer = document.getElementById(`btn-container-${item.id}`);
      if (btnContainer) {
        const qty = window.FoodBiteCart ? window.FoodBiteCart.getItemQuantity(item.id) : 0;
        btnContainer.innerHTML = renderCartButtonHTML(item, qty);
      }
    });
  }

  // Skeleton Loader markup
  function renderSkeletonLoaders(count = 8) {
    let skeletons = '';
    for (let i = 0; i < count; i++) {
      skeletons += `
        <div class="glass-card rounded-2xl overflow-hidden p-4 space-y-3">
          <div class="w-full h-44 rounded-xl shimmer-loading"></div>
          <div class="h-4 w-3/4 rounded shimmer-loading"></div>
          <div class="h-3 w-full rounded shimmer-loading"></div>
          <div class="h-3 w-2/3 rounded shimmer-loading"></div>
          <div class="flex justify-between items-center pt-2">
            <div class="h-5 w-16 rounded shimmer-loading"></div>
            <div class="h-8 w-20 rounded shimmer-loading"></div>
          </div>
        </div>
      `;
    }
    return skeletons;
  }

  function updateResultCount(count) {
    const el = document.getElementById('menu-item-count');
    if (el) {
      el.textContent = `Showing ${count} ${count === 1 ? 'dish' : 'dishes'}`;
    }
  }

  // AI Filter Override banner
  function filterByItemIds(itemIds) {
    aiFilteredItemIds = itemIds;
    const banner = document.getElementById('ai-active-filter-banner');
    if (banner) {
      banner.classList.remove('hidden');
    }
    applyFilters();
    // Scroll smoothly to menu section
    const menuSec = document.getElementById('menu-section');
    if (menuSec) {
      menuSec.scrollIntoView({ behavior: 'smooth' });
    }
  }

  function hideAiFilterBanner() {
    const banner = document.getElementById('ai-active-filter-banner');
    if (banner) banner.classList.add('hidden');
  }

  function resetAllFilters() {
    activeCategory = 'All';
    activeDietFilter = 'all';
    activeMaxPrice = 500;
    activeSpicyOnly = false;
    activeSortBy = 'popular';
    searchQuery = '';
    aiFilteredItemIds = null;

    // Reset controls
    const searchInput = document.getElementById('search-input');
    const heroSearchInput = document.getElementById('hero-search-input');
    const priceSlider = document.getElementById('price-range-slider');
    const priceVal = document.getElementById('price-range-value');
    const spicyCheck = document.getElementById('spicy-only-checkbox');
    const sortSelect = document.getElementById('sort-select');

    if (searchInput) searchInput.value = '';
    if (heroSearchInput) heroSearchInput.value = '';
    if (priceSlider) priceSlider.value = 500;
    if (priceVal) priceVal.textContent = '₹500';
    if (spicyCheck) spicyCheck.checked = false;
    if (sortSelect) sortSelect.value = 'popular';

    // Reset diet buttons
    updateDietFilterUI('all');
    hideAiFilterBanner();
    renderCategoryTabs(['All', 'Biryani & Bowls', 'Burgers & Wraps', 'Pizzas & Italian', 'Street Food & Snacks', 'Desserts & Bakery', 'Beverages & Coolers']);
    applyFilters();
  }

  function updateDietFilterUI(diet) {
    activeDietFilter = diet;
    document.querySelectorAll('.diet-filter-btn').forEach(btn => {
      const bDiet = btn.getAttribute('data-diet');
      if (bDiet === diet) {
        btn.classList.add('bg-orange-500', 'text-white', 'border-transparent');
        btn.classList.remove('bg-slate-900', 'text-slate-400', 'border-slate-800');
      } else {
        btn.classList.remove('bg-orange-500', 'text-white', 'border-transparent');
        btn.classList.add('bg-slate-900', 'text-slate-400', 'border-slate-800');
      }
    });
  }

  // Dish Detail Modal
  function openDishDetail(itemId) {
    const item = allMenuItems.find(i => i.id === itemId);
    if (!item) return;

    const modal = document.getElementById('dish-detail-modal');
    if (!modal) return;

    const img = document.getElementById('dish-modal-img');
    const title = document.getElementById('dish-modal-title');
    const category = document.getElementById('dish-modal-category');
    const price = document.getElementById('dish-modal-price');
    const rating = document.getElementById('dish-modal-rating');
    const reviews = document.getElementById('dish-modal-reviews');
    const prep = document.getElementById('dish-modal-prep');
    const calories = document.getElementById('dish-modal-calories');
    const desc = document.getElementById('dish-modal-desc');
    const tagsContainer = document.getElementById('dish-modal-tags');
    const addBtn = document.getElementById('dish-modal-add-btn');

    if (img) img.src = item.image;
    if (title) title.textContent = item.name;
    if (category) category.textContent = item.category;
    if (price) price.textContent = `₹${item.price}`;
    if (rating) rating.textContent = `★ ${item.rating}`;
    if (reviews) reviews.textContent = `(${item.reviewsCount} reviews)`;
    if (prep) prep.textContent = item.prepTime;
    if (calories) calories.textContent = item.calories;
    if (desc) desc.textContent = item.description;

    if (tagsContainer) {
      tagsContainer.innerHTML = item.tags.map(t => `
        <span class="text-[11px] bg-slate-800 text-slate-300 border border-slate-700/80 px-2 py-0.5 rounded-md">#${t}</span>
      `).join('');
    }

    if (addBtn) {
      addBtn.onclick = () => {
        window.FoodBiteCart.addToCart({
          id: item.id,
          name: item.name,
          price: item.price,
          image: item.image,
          isVeg: item.isVeg,
          category: item.category
        });
        closeDishDetail();
      };
    }

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeDishDetail() {
    const modal = document.getElementById('dish-detail-modal');
    if (modal) {
      modal.classList.add('hidden');
      document.body.style.overflow = '';
    }
  }

  function showError(msg) {
    const grid = document.getElementById('menu-grid');
    if (grid) {
      grid.innerHTML = `
        <div class="col-span-full text-center py-12 text-slate-400">
          <div class="text-4xl mb-3">⚠️</div>
          <div class="text-base font-bold text-slate-200">${msg}</div>
          <button onclick="window.FoodBiteApp.fetchMenu()" class="mt-4 px-4 py-2 bg-orange-500 text-white rounded-xl text-xs font-bold hover:bg-orange-600 transition-colors">
            Retry Loading Menu
          </button>
        </div>
      `;
    }
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

  // Expose
  window.FoodBiteApp = {
    fetchMenu,
    setCategory,
    applyFilters,
    filterByItemIds,
    resetAllFilters,
    openDishDetail,
    closeDishDetail
  };

  // Setup Event Listeners
  document.addEventListener('DOMContentLoaded', () => {
    fetchMenu();

    // Listen to cart updates to refresh card buttons
    window.addEventListener('foodbite:cart-updated', syncCardButtons);

    // Search bar
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        applyFilters();
      });
    }

    // Hero search bar sync
    const heroSearch = document.getElementById('hero-search-input');
    if (heroSearch) {
      heroSearch.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        if (searchInput) searchInput.value = searchQuery;
        applyFilters();
      });
      heroSearch.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const menuSec = document.getElementById('menu-section');
          if (menuSec) menuSec.scrollIntoView({ behavior: 'smooth' });
        }
      });
    }

    // Dietary filter toggle buttons
    document.querySelectorAll('.diet-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const diet = btn.getAttribute('data-diet');
        updateDietFilterUI(diet);
        applyFilters();
      });
    });

    // Price range slider
    const priceSlider = document.getElementById('price-range-slider');
    const priceVal = document.getElementById('price-range-value');
    if (priceSlider && priceVal) {
      priceSlider.addEventListener('input', (e) => {
        activeMaxPrice = Number(e.target.value);
        priceVal.textContent = activeMaxPrice >= 500 ? 'All' : `₹${activeMaxPrice}`;
        applyFilters();
      });
    }

    // Spicy only checkbox
    const spicyCheckbox = document.getElementById('spicy-only-checkbox');
    if (spicyCheckbox) {
      spicyCheckbox.addEventListener('change', (e) => {
        activeSpicyOnly = e.target.checked;
        applyFilters();
      });
    }

    // Sort select
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        activeSortBy = e.target.value;
        applyFilters();
      });
    }

    // AI filter clear banner button
    const clearAiFilterBtn = document.getElementById('clear-ai-filter-btn');
    if (clearAiFilterBtn) {
      clearAiFilterBtn.addEventListener('click', () => {
        aiFilteredItemIds = null;
        hideAiFilterBanner();
        applyFilters();
      });
    }

    // Dish modal close
    const closeDishBtn = document.getElementById('dish-modal-close-btn');
    if (closeDishBtn) closeDishBtn.addEventListener('click', closeDishDetail);

    // Empty state reset button
    const resetEmptyBtn = document.getElementById('reset-empty-btn');
    if (resetEmptyBtn) resetEmptyBtn.addEventListener('click', resetAllFilters);
  });
})();
