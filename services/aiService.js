// services/aiService.js - Intelligent Food Recommendation Engine
const { menuItems } = require('../data/menu');

/**
 * Parses user natural language query and extracts culinary intents:
 * - maxPrice (e.g., "under 200", "under rs.200", "below 300", "budget 150")
 * - dietary ("veg", "non-veg", "vegan")
 * - spice ("spicy", "fiery", "mild", "none")
 * - category / foodType ("dessert", "biryani", "burger", "pizza", "drink", "snack", etc.)
 * - mood / attributes ("sweet", "healthy", "high protein", "cheesy", "crispy", "bestseller")
 */
function parseIntent(query) {
  const q = query.toLowerCase();
  const intent = {
    maxPrice: null,
    isVeg: null, // true, false, or null (any)
    spicy: null, // true (hot/fiery), false (mild/0), or null
    minRating: null,
    categories: [],
    keywords: [],
    isDessert: false,
    isBeverage: false,
    isHealthy: false,
    isCrispy: false,
    isCheesy: false,
    isBestseller: false
  };

  // 1. Budget / Price detection
  // Matches "under 200", "under rs 200", "below ₹200", "< 200", "less than 200", "within 200"
  const priceRegex = /(?:under|below|less than|within|within rs\.?|under rs\.?|below rs\.?|<|max|budget)\s*(?:rs\.?|inr|₹)?\s*(\d+)/i;
  const priceMatch = q.match(priceRegex);
  if (priceMatch) {
    intent.maxPrice = parseInt(priceMatch[1], 10);
  } else {
    // Check for "cheap" or "affordable" or "budget"
    if (q.includes("cheap") || q.includes("affordable") || q.includes("budget friendly")) {
      intent.maxPrice = 180;
    }
  }

  // 2. Dietary preferences
  if (q.includes("pure veg") || q.includes("vegetarian") || q.includes("only veg") || (/\bveg\b/.test(q) && !q.includes("non-veg") && !q.includes("non veg"))) {
    intent.isVeg = true;
  } else if (q.includes("non-veg") || q.includes("non veg") || q.includes("chicken") || q.includes("meat") || q.includes("pepperoni")) {
    intent.isVeg = false;
  }

  // 3. Spice preferences
  if (q.includes("spicy") || q.includes("fiery") || q.includes("hot") || q.includes("masala") || q.includes("peri-peri") || q.includes("schezwan") || q.includes("chili") || q.includes("chilli")) {
    intent.spicy = true;
  } else if (q.includes("mild") || q.includes("not spicy") || q.includes("less spicy") || q.includes("no spice") || q.includes("sweet")) {
    intent.spicy = false;
  }

  // 4. Category & Food Item preferences
  if (q.includes("dessert") || q.includes("sweet") || q.includes("cake") || q.includes("chocolate") || q.includes("ice cream") || q.includes("rasmalai") || q.includes("cheesecake") || q.includes("brownie") || q.includes("pastry")) {
    intent.isDessert = true;
    intent.categories.push("Desserts & Bakery");
  }

  if (q.includes("drink") || q.includes("beverage") || q.includes("shake") || q.includes("coffee") || q.includes("cooler") || q.includes("mojito") || q.includes("smoothie") || q.includes("lemonade") || q.includes("soda")) {
    intent.isBeverage = true;
    intent.categories.push("Beverages & Coolers");
  }

  if (q.includes("biryani") || q.includes("rice") || q.includes("bowl") || q.includes("dal")) {
    intent.categories.push("Biryani & Bowls");
  }

  if (q.includes("burger") || q.includes("wrap") || q.includes("roll") || q.includes("sandwich")) {
    intent.categories.push("Burgers & Wraps");
  }

  if (q.includes("pizza") || q.includes("pasta") || q.includes("italian")) {
    intent.categories.push("Pizzas & Italian");
  }

  if (q.includes("snack") || q.includes("momos") || q.includes("momo") || q.includes("wings") || q.includes("pakora") || q.includes("fries") || q.includes("finger food")) {
    intent.categories.push("Street Food & Snacks");
  }

  // 5. Special attributes
  if (q.includes("healthy") || q.includes("protein") || q.includes("salad") || q.includes("light")) {
    intent.isHealthy = true;
  }
  if (q.includes("crispy") || q.includes("crunchy") || q.includes("fried")) {
    intent.isCrispy = true;
  }
  if (q.includes("cheesy") || q.includes("cheese")) {
    intent.isCheesy = true;
  }
  if (q.includes("best") || q.includes("top rated") || q.includes("bestseller") || q.includes("famous") || q.includes("popular")) {
    intent.isBestseller = true;
  }

  // Extract raw search tokens (exclude stop words)
  const stopWords = new Set(["i", "want", "something", "under", "rs", "inr", "for", "a", "an", "the", "with", "and", "or", "me", "recommend", "show", "give", "suggest", "some", "like", "to", "have", "eat", "order", "can", "you", "please", "food", "bite"]);
  const tokens = q.replace(/[^\w\s]/g, "").split(/\s+/).filter(t => t.length > 2 && !stopWords.has(t) && isNaN(Number(t)));
  intent.keywords = tokens;

  return intent;
}

/**
 * Score and rank menu items according to extracted user intent
 */
function getRecommendations(query, limit = 4) {
  const intent = parseIntent(query);
  const qLower = query.toLowerCase().trim();

  // Handle pure conversational greetings
  if (/^(hi|hello|hey|yo|namaste|sup|good morning|good evening|good afternoon)\b/i.test(qLower) && qLower.length < 15) {
    return {
      message: "Hey there, foodie! 👋 Welcome to FoodBite! I'm your personal AI culinary assistant. Tell me what you're craving—for instance: *'Spicy snacks under ₹200'*, *'Recommend a dessert'*, or *'Healthy veg dinner'*!",
      intent,
      recommendations: menuItems.filter(i => i.rating >= 4.8).slice(0, 3),
      suggestedQueries: [
        "Spicy chicken under ₹200",
        "Recommend a rich dessert",
        "Pure veg dinner options",
        "Best burgers & fries"
      ]
    };
  }

  const scoredItems = menuItems.map(item => {
    let score = 0;
    let matchReasons = [];

    // 1. Strict Price Filter check
    if (intent.maxPrice !== null) {
      if (item.price <= intent.maxPrice) {
        score += 40;
        matchReasons.push(`₹${item.price} (within ₹${intent.maxPrice} budget)`);
      } else {
        // Penalty if over budget
        score -= 100;
      }
    }

    // 2. Strict / Preferred Dietary check
    if (intent.isVeg !== null) {
      if (item.isVeg === intent.isVeg) {
        score += 35;
        matchReasons.push(item.isVeg ? "100% Vegetarian" : "Non-Veg delight");
      } else {
        // High penalty if user specifically asked for veg and this is non-veg, or vice versa
        score -= 80;
      }
    }

    // 3. Category matching
    if (intent.categories.length > 0) {
      if (intent.categories.includes(item.category)) {
        score += 50;
        matchReasons.push(`Matches ${item.category}`);
      }
    }

    // 4. Spice level matching
    if (intent.spicy === true) {
      if (item.spicyLevel >= 2) {
        score += 35;
        matchReasons.push(`Spicy kick (Level ${item.spicyLevel}/3) 🌶️`);
      } else if (item.spicyLevel === 1) {
        score += 10;
      } else {
        score -= 20;
      }
    } else if (intent.spicy === false) {
      if (item.spicyLevel === 0) {
        score += 25;
        matchReasons.push("Mild & smooth flavor");
      } else if (item.spicyLevel > 1) {
        score -= 40;
      }
    }

    // 5. Keyword & Tag matching
    for (const kw of intent.keywords) {
      if (item.name.toLowerCase().includes(kw)) {
        score += 30;
      }
      if (item.description.toLowerCase().includes(kw)) {
        score += 15;
      }
      if (item.tags.some(tag => tag.toLowerCase().includes(kw))) {
        score += 25;
      }
    }

    // 6. Special craving traits
    if (intent.isHealthy && (item.tags.includes("healthy") || item.tags.includes("vegan") || parseInt(item.calories) < 400)) {
      score += 25;
      matchReasons.push("Healthy choice");
    }
    if (intent.isCheesy && (item.description.toLowerCase().includes("cheese") || item.tags.includes("cheese") || item.tags.includes("cheesy"))) {
      score += 25;
      matchReasons.push("Cheesy goodness");
    }
    if (intent.isCrispy && (item.tags.includes("crispy") || item.description.toLowerCase().includes("crunchy") || item.description.toLowerCase().includes("crispy"))) {
      score += 20;
      matchReasons.push("Super crispy");
    }
    if (intent.isBestseller && (item.rating >= 4.8 || item.tags.includes("bestseller"))) {
      score += 20;
      matchReasons.push(`Top Rated (${item.rating} ★)`);
    }

    // Baseline rating boost (quality bias)
    score += item.rating * 5;

    return {
      ...item,
      _score: score,
      matchReason: matchReasons.slice(0, 2).join(" • ")
    };
  });

  // Sort descending by score
  const filtered = scoredItems
    .filter(item => item._score > 0)
    .sort((a, b) => b._score - a._score);

  const topItems = filtered.length > 0 ? filtered.slice(0, limit) : menuItems.slice(0, limit);

  // Craft personalized natural language response
  let responseText = "";
  if (filtered.length === 0) {
    responseText = `I couldn't find an exact match for "${query}", but here are our top-rated customer favorites you'll absolutely love:`;
  } else {
    const descriptors = [];
    if (intent.spicy) descriptors.push("fiery & flavorful");
    if (intent.isVeg === true) descriptors.push("pure vegetarian");
    if (intent.isVeg === false) descriptors.push("succulent non-veg");
    if (intent.isDessert) descriptors.push("scrumptious sweet");
    if (intent.isBeverage) descriptors.push("chilled & refreshing");
    if (intent.maxPrice) descriptors.push(`under ₹${intent.maxPrice}`);

    const descriptorStr = descriptors.length > 0 ? descriptors.join(" ") : "mouthwatering";
    responseText = `Here are the best ${descriptorStr} picks from our menu crafted just for you:`;
  }

  // Dynamic suggested follow-ups
  const suggestedQueries = [];
  if (!intent.isBeverage && !intent.isDessert) {
    suggestedQueries.push("Pair with a refreshing drink");
    suggestedQueries.push("Recommend a dessert to finish");
  } else if (intent.isDessert) {
    suggestedQueries.push("Show dark chocolate specials");
    suggestedQueries.push("Desserts under ₹150");
  } else {
    suggestedQueries.push("Spicy snacks to pair");
  }
  if (intent.maxPrice === null) {
    suggestedQueries.push("Items under ₹200");
  }

  return {
    message: responseText,
    intent,
    recommendations: topItems.map(item => ({
      id: item.id,
      name: item.name,
      category: item.category,
      price: item.price,
      rating: item.rating,
      isVeg: item.isVeg,
      spicyLevel: item.spicyLevel,
      prepTime: item.prepTime,
      image: item.image,
      description: item.description,
      matchReason: item.matchReason || `Customer favorite • ${item.rating} ★`
    })),
    suggestedQueries: suggestedQueries.slice(0, 3)
  };
}

module.exports = {
  parseIntent,
  getRecommendations
};
