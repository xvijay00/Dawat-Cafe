/* ═══════════════════════════════════════════════════════════════
   DAWAT CAFE — Main JavaScript
   All menu data, cart logic, form validation, and API submission
   ═══════════════════════════════════════════════════════════════ */

// ── Google Apps Script Web App URL (change this after deploying) ──
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyuY4yIpCimZ-kTv5zoS69Kl3tqxbWePOQdCm-ywGOCv0p9HW0NTi-tFOn6_4XEZwn-/exec";

// ═══════════════════════════════════════════════════
// MENU ITEMS — Edit this array to change items/prices
// ═══════════════════════════════════════════════════
const MENU_ITEMS = [
  {
    id: "pizza",
    name: "Pizza",
    desc: "Hand-tossed dough, rich tomato sauce, and melted mozzarella with fresh basil.",
    price: 249,
    image: "images/pizza.jpg"
  },
  {
    id: "burger",
    name: "Burger",
    desc: "Juicy grilled patty with fresh lettuce, tomato, cheese, and our special sauce.",
    price: 179,
    image: "images/burger.jpg"
  },
  {
    id: "chowmin",
    name: "Chowmin",
    desc: "Stir-fried noodles tossed with crunchy vegetables and savory soy glaze.",
    price: 129,
    image: "images/chowmin.jpg"
  },
  {
    id: "momos",
    name: "Momos",
    desc: "Steamed dumplings filled with spiced veggies, served with fiery red chutney.",
    price: 99,
    image: "images/momos.jpg"
  },
  {
    id: "fries",
    name: "French Fries",
    desc: "Golden crispy fries seasoned with herbs and served with tangy ketchup.",
    price: 89,
    image: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500&h=500&fit=crop"
  },
  {
    id: "sandwich",
    name: "Club Sandwich",
    desc: "Triple-layered with grilled chicken, fresh veggies, cheese, and mayo.",
    price: 149,
    image: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=500&h=500&fit=crop"
  },
  {
    id: "cold-coffee",
    name: "Cold Coffee",
    desc: "Creamy blended iced coffee topped with whipped cream and chocolate drizzle.",
    price: 109,
    image: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=500&h=500&fit=crop"
  },
  {
    id: "pasta",
    name: "Pasta",
    desc: "Penne in creamy Alfredo sauce with herbs, mushrooms, and parmesan.",
    price: 199,
    image: "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=500&h=500&fit=crop"
  }
];


// ═══════════════════════════════════════════════════
// DOM REFERENCES
// ═══════════════════════════════════════════════════
const $  = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const navbar        = $('#navbar');
const navToggle     = $('#navToggle');
const navLinks      = $('#navLinks');
const swiperWrapper = $('#menuSwiperWrapper');
const cartBar       = $('#cartBar');
const cartCount     = $('#cartCount');
const cartItemsLabel= $('#cartItemsLabel');
const cartTotal     = $('#cartTotal');
const cartOrderBtn  = $('#cartOrderBtn');
const orderModal    = $('#orderModal');
const modalClose    = $('#modalClose');
const modalBody     = $('#modalBody');
const modalSuccess  = $('#modalSuccess');
const orderSummary  = $('#orderSummary');
const orderForm     = $('#orderForm');
const submitBtn     = $('#submitBtn');
const submitSpinner = $('#submitSpinner');
const successOrderId= $('#successOrderId');
const successCloseBtn=$('#successCloseBtn');
const timePickerWrap= $('#timePickerWrap');
const heroParticles = $('#heroParticles');


// ═══════════════════════════════════════════════════
// CART STATE
// ═══════════════════════════════════════════════════
// Each item: { id, name, price, qty, selected }
let cart = MENU_ITEMS.map(item => ({
  id: item.id,
  name: item.name,
  price: item.price,
  qty: 1,
  selected: false
}));


// ═══════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  initAOS();
  initParticles();
  renderMenuCards();
  initSwiper();
  initNavbar();
  initDeliveryRadios();
  initFormSubmit();
  initModalControls();
});


// ── AOS (Animate on Scroll) ──
function initAOS() {
  AOS.init({
    duration: 800,
    once: true,
    offset: 80,
    easing: 'ease-out-cubic'
  });
}


// ── Hero Floating Particles ──
function initParticles() {
  for (let i = 0; i < 15; i++) {
    const p = document.createElement('div');
    p.className = 'hero-particle';
    p.style.left = Math.random() * 100 + '%';
    p.style.top  = 60 + Math.random() * 40 + '%';
    p.style.animationDelay = Math.random() * 6 + 's';
    p.style.animationDuration = 4 + Math.random() * 4 + 's';
    heroParticles.appendChild(p);
  }
}


// ═══════════════════════════════════════════════════
// MENU CARDS — Render into Swiper
// ═══════════════════════════════════════════════════
function renderMenuCards() {
  swiperWrapper.innerHTML = MENU_ITEMS.map((item, i) => `
    <div class="swiper-slide">
      <div class="menu-card" data-index="${i}" id="card-${item.id}">
        <div class="menu-card-image">
          <img src="${item.image}" alt="${item.name}" loading="lazy">
          <div class="menu-card-price">₹${item.price}</div>
        </div>
        <div class="menu-card-body">
          <h3 class="menu-card-name">${item.name}</h3>
          <p class="menu-card-desc">${item.desc}</p>
          <div class="menu-card-actions">
            <label class="menu-checkbox" for="check-${item.id}">
              <input type="checkbox" id="check-${item.id}" data-index="${i}">
              <span class="checkmark"><i class="fas fa-check"></i></span>
              <span class="checkbox-label">Add</span>
            </label>
            <div class="qty-stepper" id="stepper-${item.id}">
              <button type="button" class="qty-btn qty-minus" data-index="${i}" aria-label="Decrease quantity">−</button>
              <span class="qty-value" id="qty-${item.id}">1</span>
              <button type="button" class="qty-btn qty-plus" data-index="${i}" aria-label="Increase quantity">+</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `).join('');

  // Attach event listeners
  $$('.menu-checkbox input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', handleCheckboxToggle);
  });

  $$('.qty-minus').forEach(btn => {
    btn.addEventListener('click', (e) => { e.preventDefault(); handleQty(btn.dataset.index, -1); });
  });

  $$('.qty-plus').forEach(btn => {
    btn.addEventListener('click', (e) => { e.preventDefault(); handleQty(btn.dataset.index, 1); });
  });
}


function handleCheckboxToggle(e) {
  const idx = parseInt(e.target.dataset.index);
  cart[idx].selected = e.target.checked;

  const card = $(`#card-${MENU_ITEMS[idx].id}`);
  const stepper = $(`#stepper-${MENU_ITEMS[idx].id}`);

  if (e.target.checked) {
    card.classList.add('selected');
    stepper.classList.add('active');
    cart[idx].qty = 1;
    $(`#qty-${MENU_ITEMS[idx].id}`).textContent = '1';
  } else {
    card.classList.remove('selected');
    stepper.classList.remove('active');
    cart[idx].qty = 1;
    $(`#qty-${MENU_ITEMS[idx].id}`).textContent = '1';
  }

  updateCartBar();
}


function handleQty(index, delta) {
  const idx = parseInt(index);
  const newQty = cart[idx].qty + delta;
  if (newQty < 1 || newQty > 20) return;

  cart[idx].qty = newQty;
  $(`#qty-${MENU_ITEMS[idx].id}`).textContent = newQty;
  updateCartBar();
}


// ═══════════════════════════════════════════════════
// CART BAR — Update count, total, visibility
// ═══════════════════════════════════════════════════
function updateCartBar() {
  const selectedItems = cart.filter(item => item.selected);
  const count = selectedItems.length;
  const total = selectedItems.reduce((sum, item) => sum + item.price * item.qty, 0);

  cartCount.textContent = count;
  cartTotal.textContent = `₹${total}`;
  cartItemsLabel.textContent = count === 0 ? 'No items selected'
                             : count === 1 ? '1 item selected'
                             : `${count} items selected`;

  cartOrderBtn.disabled = count === 0;

  if (count > 0) {
    cartBar.classList.add('visible');
  } else {
    cartBar.classList.remove('visible');
  }
}


// ═══════════════════════════════════════════════════
// SWIPER INITIALIZATION — 3D Coverflow Effect
// ═══════════════════════════════════════════════════
function initSwiper() {
  const swiper = new Swiper('.menu-swiper', {
    effect: 'coverflow',
    grabCursor: true,
    centeredSlides: true,
    slidesPerView: 'auto',
    initialSlide: 1,
    loop: false,
    coverflowEffect: {
      rotate: 0,
      stretch: 0,
      depth: 160,
      modifier: 2,
      slideShadows: false
    },
    pagination: {
      el: '.swiper-pagination',
      clickable: true
    },
    navigation: {
      prevEl: '#swiperPrev',
      nextEl: '#swiperNext'
    },
    breakpoints: {
      320: { slidesPerView: 1.2 },
      480: { slidesPerView: 1.5 },
      768: { slidesPerView: 2.2 },
      1024: { slidesPerView: 'auto' }
    }
  });
}


// ═══════════════════════════════════════════════════
// NAVBAR — Scroll effects & mobile toggle
// ═══════════════════════════════════════════════════
function initNavbar() {
  // Scroll shrink
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 60);
    updateActiveNavLink();
  });

  // Mobile toggle
  navToggle.addEventListener('click', () => {
    navToggle.classList.toggle('active');
    navLinks.classList.toggle('open');
  });

  // Close on link click
  $$('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      navToggle.classList.remove('active');
      navLinks.classList.remove('open');
    });
  });

  // Cart bar order button
  cartOrderBtn.addEventListener('click', openOrderModal);
}

function updateActiveNavLink() {
  const sections = ['home', 'menu', 'about', 'contact'];
  const scrollPos = window.scrollY + 120;

  sections.forEach(id => {
    const section = document.getElementById(id);
    if (!section) return;
    const top = section.offsetTop;
    const bottom = top + section.offsetHeight;
    const link = $(`.nav-link[href="#${id}"]`);
    if (link) {
      link.classList.toggle('active', scrollPos >= top && scrollPos < bottom);
    }
  });
}


// ═══════════════════════════════════════════════════
// DELIVERY OPTION RADIOS — Show time picker for "Tomorrow"
// ═══════════════════════════════════════════════════
function initDeliveryRadios() {
  $$('input[name="deliveryOption"]').forEach(radio => {
    radio.addEventListener('change', () => {
      timePickerWrap.style.display = radio.value === 'Tomorrow' ? 'block' : 'none';
    });
  });
}


// ═══════════════════════════════════════════════════
// ORDER MODAL — Open / Close / Success
// ═══════════════════════════════════════════════════
function initModalControls() {
  modalClose.addEventListener('click', closeOrderModal);

  // Click outside modal to close
  orderModal.addEventListener('click', (e) => {
    if (e.target === orderModal) closeOrderModal();
  });

  // Escape key to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && orderModal.classList.contains('active')) {
      closeOrderModal();
    }
  });

  successCloseBtn.addEventListener('click', () => {
    closeOrderModal();
    clearCart();
  });
}


function openOrderModal() {
  // Build order summary
  const selectedItems = cart.filter(item => item.selected);
  const total = selectedItems.reduce((sum, item) => sum + item.price * item.qty, 0);

  orderSummary.innerHTML = `
    <div class="order-summary-title"><i class="fas fa-list"></i> Order Summary</div>
    ${selectedItems.map(item => `
      <div class="summary-item">
        <span class="summary-item-name">
          <span class="summary-qty">${item.qty}x</span> ${item.name}
        </span>
        <span>₹${item.price * item.qty}</span>
      </div>
    `).join('')}
    <div class="summary-total">
      <span>Total</span>
      <span>₹${total}</span>
    </div>
  `;

  // Reset form state
  orderForm.reset();
  clearFieldErrors();
  timePickerWrap.style.display = 'none';
  modalBody.style.display = 'block';
  modalSuccess.style.display = 'none';

  // Show modal
  orderModal.classList.add('active');
  document.body.style.overflow = 'hidden';
}


function closeOrderModal() {
  orderModal.classList.remove('active');
  document.body.style.overflow = '';
}


function clearCart() {
  cart.forEach(item => {
    item.selected = false;
    item.qty = 1;
  });

  $$('.menu-checkbox input[type="checkbox"]').forEach(cb => {
    cb.checked = false;
  });

  $$('.menu-card').forEach(card => card.classList.remove('selected'));
  $$('.qty-stepper').forEach(s => s.classList.remove('active'));

  MENU_ITEMS.forEach(item => {
    const qtyEl = $(`#qty-${item.id}`);
    if (qtyEl) qtyEl.textContent = '1';
  });

  updateCartBar();
}


// ═══════════════════════════════════════════════════
// FORM VALIDATION & SUBMISSION
// ═══════════════════════════════════════════════════
function initFormSubmit() {
  orderForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    // Collect data
    const selectedItems = cart.filter(item => item.selected);
    const total = selectedItems.reduce((sum, item) => sum + item.price * item.qty, 0);

    const deliveryOption = $('input[name="deliveryOption"]:checked')?.value || '';
    const deliveryTime = deliveryOption === 'Tomorrow'
      ? ($('#deliveryTime')?.value || '')
      : '';

    const payload = {
      name:           $('#custName').value.trim(),
      address:        $('#custAddress').value.trim(),
      phone:          $('#custPhone').value.trim(),
      email:          $('#custEmail').value.trim(),
      deliveryOption: deliveryOption,
      deliveryTime:   deliveryTime,
      notes:          $('#custNotes').value.trim(),
      items:          selectedItems.map(item => ({
        name: item.name,
        qty:  item.qty,
        price: item.price
      })),
      total: total
    };

    // Show loading
    submitBtn.disabled = true;
    submitBtn.querySelector('.btn-text').style.display = 'none';
    submitSpinner.style.display = 'inline-flex';

    try {
      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        redirect: 'follow',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (result.status === 'success') {
        // Show success screen
        successOrderId.textContent = `Order ID: ${result.orderId}`;
        modalBody.style.display = 'none';
        modalSuccess.style.display = 'block';
      } else {
        showToast('error', result.message || 'Something went wrong. Please try again.');
      }
    } catch (err) {
      showToast('error', 'Network error. Please check your connection and try again.');
      console.error('Submission error:', err);
    } finally {
      // Reset button
      submitBtn.disabled = false;
      submitBtn.querySelector('.btn-text').style.display = 'inline';
      submitSpinner.style.display = 'none';
    }
  });
}


function validateForm() {
  let isValid = true;
  clearFieldErrors();

  const name    = $('#custName').value.trim();
  const address = $('#custAddress').value.trim();
  const phone   = $('#custPhone').value.trim();
  const email   = $('#custEmail').value.trim();
  const delivery= $('input[name="deliveryOption"]:checked');

  // Name
  if (!name) {
    showFieldError('errName', 'Please enter your full name.');
    $('#custName').classList.add('error');
    isValid = false;
  }

  // Address
  if (!address) {
    showFieldError('errAddress', 'Please enter your delivery address.');
    $('#custAddress').classList.add('error');
    isValid = false;
  }

  // Phone: exactly 10 digits, starts with 6-9
  if (!phone) {
    showFieldError('errPhone', 'Please enter your phone number.');
    $('#custPhone').classList.add('error');
    isValid = false;
  } else if (!/^[6-9]\d{9}$/.test(phone)) {
    showFieldError('errPhone', 'Enter a valid 10-digit Indian mobile number (starting with 6-9).');
    $('#custPhone').classList.add('error');
    isValid = false;
  }

  // Email (optional, validate if filled)
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showFieldError('errEmail', 'Please enter a valid email address.');
    $('#custEmail').classList.add('error');
    isValid = false;
  }

  // Delivery option
  if (!delivery) {
    showFieldError('errDelivery', 'Please select a delivery time preference.');
    isValid = false;
  }

  // Shake form on error
  if (!isValid) {
    orderForm.classList.add('shake');
    setTimeout(() => orderForm.classList.remove('shake'), 400);

    // Scroll to first error
    const firstError = orderForm.querySelector('.error');
    if (firstError) firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  return isValid;
}


function showFieldError(id, message) {
  const el = document.getElementById(id);
  if (el) {
    el.textContent = message;
    el.classList.add('show');
  }
}


function clearFieldErrors() {
  $$('.field-error').forEach(el => {
    el.textContent = '';
    el.classList.remove('show');
  });
  $$('.form-group input, .form-group textarea').forEach(el => {
    el.classList.remove('error');
  });
}


// ═══════════════════════════════════════════════════
// TOAST NOTIFICATIONS
// ═══════════════════════════════════════════════════
function showToast(type, message) {
  // Remove existing toasts
  $$('.toast').forEach(t => t.remove());

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">
      <i class="fas fa-${type === 'error' ? 'exclamation-circle' : 'check-circle'}"></i>
    </span>
    <span class="toast-message">${message}</span>
  `;

  document.body.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  // Auto-remove after 5s
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 5000);
}
