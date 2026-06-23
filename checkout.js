// Shopping Cart & Stripe Checkout Integration

const DELIVERY_OPTIONS = [
  { id: 'standard', name: 'Standard Delivery (UK)', time: '5-7 business days', price: 5.99 },
  { id: 'express', name: 'Express Delivery (UK)', time: '2-3 business days', price: 12.99 },
  { id: 'international', name: 'International', time: '10-15 business days', price: 24.99 }
];

function getCart() {
  return JSON.parse(localStorage.getItem('safeCart')) || [];
}

function saveCart(cart) {
  localStorage.setItem('safeCart', JSON.stringify(cart));
}

function initCheckout() {
  const cart = getCart();
  const container = document.getElementById('checkoutContainer');

  if (cart.length === 0) {
    container.innerHTML = `
      <div class="empty-cart">
        <div class="empty-cart-icon">🛒</div>
        <p style="font-size: 16px;">Your cart is empty</p>
        <a href="shop.html">Continue Shopping</a>
      </div>
    `;
    return;
  }

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  let deliveryOption = DELIVERY_OPTIONS[0];
  let total = subtotal + deliveryOption.price;

  // Build order review
  const html = `
    <div class="checkout-section">
      <h2 class="checkout-title">Order Summary</h2>
      <div>
        ${cart.map(item => `
          <div class="cart-item">
            <div class="item-details">
              <h4>${item.name}</h4>
              <p>${item.quantity} × £${item.price.toFixed(2)}</p>
            </div>
            <div class="item-price">£${(item.price * item.quantity).toFixed(2)}</div>
          </div>
        `).join('')}
      </div>

      <h3 class="checkout-title" style="margin-top: 32px;">Delivery</h3>
      ${DELIVERY_OPTIONS.map(option => `
        <label class="delivery-option">
          <input type="radio" name="delivery" value="${option.id}" ${option.id === 'standard' ? 'checked' : ''} onchange="updateDelivery(this)">
          <span class="delivery-label">
            <span class="delivery-info">
              <div class="delivery-name">${option.name}</div>
              <div class="delivery-time">${option.time}</div>
            </span>
            <span class="delivery-price">£${option.price.toFixed(2)}</span>
          </span>
        </label>
      `).join('')}

      <div class="order-summary">
        <div class="summary-row">
          <span>Subtotal</span>
          <span>£${subtotal.toFixed(2)}</span>
        </div>
        <div class="summary-row">
          <span>Delivery</span>
          <span id="deliveryPrice">£${deliveryOption.price.toFixed(2)}</span>
        </div>
        <div class="summary-row">
          <span>Total</span>
          <span id="totalPrice">£${total.toFixed(2)}</span>
        </div>
      </div>

      <button class="checkout-btn" id="checkoutBtn" onclick="proceedToPayment()">
        Proceed to Payment — £${total.toFixed(2)}
      </button>
    </div>
  `;

  container.innerHTML = html;
  window.currentSubtotal = subtotal;
}

function updateDelivery(radio) {
  const option = DELIVERY_OPTIONS.find(o => o.id === radio.value);
  const subtotal = window.currentSubtotal;
  const total = subtotal + option.price;

  document.getElementById('deliveryPrice').textContent = '£' + option.price.toFixed(2);
  document.getElementById('totalPrice').textContent = '£' + total.toFixed(2);
  
  const btn = document.getElementById('checkoutBtn');
  btn.textContent = `Pay £${total.toFixed(2)} with Stripe`;

  window.selectedDelivery = option;
}

async function proceedToPayment() {
  const btn = document.getElementById('checkoutBtn');
  const cart = getCart();
  const delivery = window.selectedDelivery || DELIVERY_OPTIONS[0];

  btn.disabled = true;
  btn.classList.add('loading');
  btn.textContent = 'Loading secure checkout...';

  const orderData = { items: cart };

  try {
    const response = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    });

    const session = await response.json();

    if (session.error) {
      alert('Error: ' + session.error);
      btn.disabled = false;
      btn.classList.remove('loading');
      btn.textContent = 'Proceed to Payment';
      return;
    }

    // Redirect to Stripe's hosted checkout
    window.location.href = session.url;

  } catch (error) {
    console.error('Checkout error:', error);
    alert('Unable to start checkout. Please try again.');
    btn.disabled = false;
    btn.classList.remove('loading');
    btn.textContent = 'Proceed to Payment';
  }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', initCheckout);

// Initialize delivery option
window.selectedDelivery = DELIVERY_OPTIONS[0];
