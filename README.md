# 🍔 FoodBite — AI-Integrated Food Ordering Platform

FoodBite is a local full-stack food ordering platform featuring a restaurant menu dashboard, interactive cart drawer, mock checkout, live order tracking, and an integrated AI food recommendation chatbot.

---

## 🌟 Key Features

1. **Restaurant Menu Dashboard**:
   - 24 handcrafted gourmet food items across 6 categories: *Biryani & Bowls*, *Burgers & Wraps*, *Pizzas & Italian*, *Street Food & Snacks*, *Desserts & Bakery*, and *Beverages & Coolers*.
   - Filter by Category, Pure Veg / Non-Veg, Spice Level (🌶️), and Max Price slider.
   - Live search by dish name, description, and culinary tags.
   - Sort by Popularity, Rating, Price (Low to High / High to Low), and Fastest Prep Time.
   - Quick Dish Details modal with nutritional information, calories, and reviews.

2. **Interactive Cart & Checkout Mock**:
   - Sliding right-side cart drawer with real-time subtotal and quantity stepper (+ / -).
   - Free delivery unlock meter (Target: ₹399).
   - Promo discount coupon engine with validation (`TASTY50`, `FOODBITE`).
   - Checkout modal with delivery address customization, instructions, and payment mode selector (Instant UPI, Card, Cash on Delivery).
   - Order confirmation with celebratory confetti and live 4-step delivery progress tracker.

3. **AI Food Recommendation Chatbot ("BiteBot")**:
   - Floating corner widget with animated pulsing ring.
   - Natural language intent parsing:
     - Budget parsing: *"I want something spicy under Rs.200"*, *"cheap dessert"*.
     - Dietary constraints: *"pure veg"*, *"non-veg"*, *"high protein"*.
     - Spice tolerance: *"spicy"*, *"fiery"*, *"mild"*.
     - Craving / meal type: *"recommend a dessert"*, *"cheesy pizza"*, *"drinks"*.
   - Instant response with interactive food cards, 1-click **Add to Cart**, and **Show on Menu** with radiant spotlight animation.
   - Instant **Filter Main Menu** action to display only AI-recommended dishes on the dashboard.

---

## 🛠️ Tech Stack

- **Backend**: Node.js & Express.js
- **Frontend**: HTML5, Vanilla JavaScript, Tailwind CSS v4 runtime engine, Google Fonts (`Outfit` & `Plus Jakarta Sans`)
- **Architecture**: REST API (`/api/menu`, `/api/ai/recommend`, `/api/coupons/validate`, `/api/orders`)

---

## 🚀 Running Locally

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the server:
   ```bash
   npm start
   ```

3. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```
