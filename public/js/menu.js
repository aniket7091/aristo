const menuGrid = document.querySelector('[data-menu-grid]');
const categoryFilter = document.querySelector('[data-category-filter]');
const searchInput = document.querySelector('[data-menu-search]');
const cartList = document.querySelector('[data-cart-list]');
const orderForm = document.querySelector('[data-order-form]');
const totalAmountEl = document.querySelector('[data-total-amount]');
const orderFeedback = document.querySelector('[data-order-feedback]');
const clearCartButton = document.querySelector('[data-clear-cart]');
const placeOrderButton = document.querySelector('[data-place-order]');

let allMenuItems = [];
let cart = [];

const formatCurrency = (value) => `₹${Number(value).toFixed(0)}`;

const showOrderFeedback = (message, type) => {
  orderFeedback.textContent = message;
  orderFeedback.className = `feedback ${type}`;
  orderFeedback.classList.remove('hidden');
};

const getCartTotal = () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

const updateSummary = () => {
  totalAmountEl.textContent = formatCurrency(getCartTotal());
};

const renderCart = () => {
  if (!cart.length) {
    cartList.innerHTML = '<div class="empty-state">Your order summary will appear here once you add items.</div>';
    updateSummary();
    return;
  }

  cartList.innerHTML = cart
    .map(
      (item) => `
        <div class="cart-item">
          <div class="item-row">
            <div>
              <strong>${item.name}</strong>
              <div class="small">${formatCurrency(item.price)} each</div>
            </div>
            <div class="quantity-control">
              <button type="button" data-cart-action="decrease" data-id="${item._id}">-</button>
              <span>${item.quantity}</span>
              <button type="button" data-cart-action="increase" data-id="${item._id}">+</button>
            </div>
          </div>
        </div>
      `
    )
    .join('');

  updateSummary();
};

const addToCart = (menuItemId) => {
  const existingItem = cart.find((item) => item._id === menuItemId);
  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    const menuItem = allMenuItems.find((item) => item._id === menuItemId);
    if (!menuItem) return;
    cart.push({ ...menuItem, quantity: 1 });
  }
  renderCart();
};

const changeQuantity = (menuItemId, direction) => {
  cart = cart
    .map((item) => {
      if (item._id !== menuItemId) return item;
      return { ...item, quantity: item.quantity + direction };
    })
    .filter((item) => item.quantity > 0);

  renderCart();
};

const renderCategories = () => {
  const categories = ['All', ...new Set(allMenuItems.map((item) => item.category))];
  categoryFilter.innerHTML = categories
    .map((category) => `<option value="${category === 'All' ? '' : category}">${category}</option>`)
    .join('');

  const categoryFromUrl = new URLSearchParams(window.location.search).get('category');
  if (categoryFromUrl && categories.includes(categoryFromUrl)) {
    categoryFilter.value = categoryFromUrl;
  }
};

const renderMenu = (items) => {
  if (!items.length) {
    menuGrid.innerHTML = '<div class="empty-state">No menu items match your current search.</div>';
    return;
  }

  menuGrid.innerHTML = items
    .map(
      (item) => `
        <article class="menu-card">
          <img src="${item.imageUrl}" alt="${item.name}" loading="lazy" />
          <div class="menu-meta">
            <span class="badge">${item.category}</span>
            <span class="price">${formatCurrency(item.price)}</span>
          </div>
          <div>
            <h3>${item.name}</h3>
            <p>${item.description || 'Freshly prepared and cafe favorite.'}</p>
          </div>
          <button class="btn btn-primary" type="button" data-add-to-cart="${item._id}">Add to Order</button>
        </article>
      `
    )
    .join('');
};

const applyFilters = () => {
  const search = searchInput.value.trim().toLowerCase();
  const category = categoryFilter.value;

  const filtered = allMenuItems.filter((item) => {
    const matchesSearch = !search || `${item.name} ${item.description}`.toLowerCase().includes(search);
    const matchesCategory = !category || item.category === category;
    return matchesSearch && matchesCategory;
  });

  renderMenu(filtered);
};

const loadMenu = async () => {
  try {
    menuGrid.innerHTML = '<div class="empty-state">Loading menu...</div>';
    const data = await BristoAPI.request(BristoAPI.API.menu);
    allMenuItems = data.menuItems;
    renderCategories();
    applyFilters();
  } catch (error) {
    menuGrid.innerHTML = `<div class="empty-state">${error.message}</div>`;
  }
};

menuGrid?.addEventListener('click', (event) => {
  const button = event.target.closest('[data-add-to-cart]');
  if (!button) return;
  addToCart(button.dataset.addToCart);
});

cartList?.addEventListener('click', (event) => {
  const button = event.target.closest('[data-cart-action]');
  if (!button) return;

  const direction = button.dataset.cartAction === 'increase' ? 1 : -1;
  changeQuantity(button.dataset.id, direction);
});

categoryFilter?.addEventListener('change', applyFilters);
searchInput?.addEventListener('input', applyFilters);
clearCartButton?.addEventListener('click', () => {
  cart = [];
  renderCart();
});

orderForm?.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!cart.length) {
    showOrderFeedback('Please add at least one item before placing an order.', 'error');
    return;
  }

  const button = placeOrderButton;
  const payload = Object.fromEntries(new FormData(orderForm).entries());
  payload.items = cart.map((item) => ({ menuItemId: item._id, quantity: item.quantity }));

  try {
    button.disabled = true;
    button.textContent = 'Placing Order...';
    const data = await BristoAPI.request(BristoAPI.API.orders, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    showOrderFeedback(`${data.message} Total: ${formatCurrency(data.order.totalAmount)}`, 'success');
    cart = [];
    orderForm.reset();
    renderCart();
  } catch (error) {
    showOrderFeedback(error.message, 'error');
  } finally {
    button.disabled = false;
    button.textContent = 'Place Order';
  }
});

renderCart();
loadMenu();
