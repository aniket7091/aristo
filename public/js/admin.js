const token = BristoAPI.getOwnerToken();
if (!token) {
  window.location.href = '/owner-login';
}

const ownerNameEl = document.querySelector('[data-owner-name]');
const logoutButton = document.querySelector('[data-logout]');
const menuForm = document.querySelector('[data-menu-form]');
const menuFeedback = document.querySelector('[data-menu-feedback]');
const menuList = document.querySelector('[data-admin-menu-list]');
const ordersCurrent = document.querySelector('[data-current-orders]');
const ordersCompleted = document.querySelector('[data-completed-orders]');
const orderFilter = document.querySelector('[data-order-table-filter]');
const formTitle = document.querySelector('[data-menu-form-title]');
const cancelEditButton = document.querySelector('[data-cancel-edit]');
const previewImage = document.querySelector('[data-preview-image]');
const previewPlaceholder = document.querySelector('[data-preview-placeholder]');
const imageInput = document.querySelector('[data-image-input]');
const imageStatus = document.querySelector('[data-image-status]');
const metrics = {
  menuCount: document.querySelector('[data-metric-menu]'),
  currentCount: document.querySelector('[data-metric-current]'),
  completedCount: document.querySelector('[data-metric-completed]'),
  revenue: document.querySelector('[data-metric-revenue]')
};

let menuItems = [];
let orders = [];
let filteredTableNumber = '';
let imageSelection = null;

const formatCurrency = (value) => `₹${Number(value).toFixed(0)}`;

const showMenuFeedback = (message, type) => {
  menuFeedback.textContent = message;
  menuFeedback.className = `feedback ${type}`;
  menuFeedback.classList.remove('hidden');
};

const setPreview = (src) => {
  if (src) {
    previewImage.src = src;
    previewImage.classList.remove('hidden');
    previewPlaceholder.classList.add('hidden');
  } else {
    previewImage.src = '';
    previewImage.classList.add('hidden');
    previewPlaceholder.classList.remove('hidden');
  }
};

const resetForm = () => {
  menuForm.reset();
  menuForm.dataset.editingId = '';
  menuForm.dataset.currentImageUrl = '';
  menuForm.dataset.currentFileId = '';
  imageSelection = null;
  formTitle.textContent = 'Add Menu Item';
  cancelEditButton.classList.add('hidden');
  imageStatus.textContent = 'Upload an item photo to ImageKit before saving.';
  setPreview('');
};

const uploadSelectedImage = async () => {
  if (!imageSelection) {
    return {
      imageUrl: menuForm.dataset.currentImageUrl || '',
      fileId: menuForm.dataset.currentFileId || ''
    };
  }

  imageStatus.textContent = 'Uploading image to ImageKit...';
  const formData = new FormData();
  formData.append('image', imageSelection);

  const response = await fetch(BristoAPI.API.upload, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${BristoAPI.getOwnerToken()}`
    },
    body: formData
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Image upload failed.');
  }

  imageStatus.textContent = 'Image uploaded and ready to save.';
  return {
    imageUrl: data.imageUrl,
    fileId: data.fileId
  };
};

const renderMetrics = () => {
  const currentOrders = orders.filter((order) => order.status === 'current');
  const completedOrders = orders.filter((order) => order.status === 'completed');
  const totalRevenue = completedOrders.reduce((sum, order) => sum + order.totalAmount, 0);

  metrics.menuCount.textContent = menuItems.length;
  metrics.currentCount.textContent = currentOrders.length;
  metrics.completedCount.textContent = completedOrders.length;
  metrics.revenue.textContent = formatCurrency(totalRevenue);
};

const renderMenuList = () => {
  if (!menuItems.length) {
    menuList.innerHTML = '<div class="empty-state">No menu items yet. Add your first signature dish.</div>';
    return;
  }

  menuList.innerHTML = menuItems
    .map(
      (item) => `
        <div class="admin-list-item">
          <div class="admin-card-head">
            <div>
              <strong>${item.name}</strong>
              <div class="small">${item.category} · ${formatCurrency(item.price)}</div>
            </div>
            <span class="badge">${item.isAvailable ? 'Available' : 'Hidden'}</span>
          </div>
          <p class="small">${item.description || 'No description added yet.'}</p>
          <div class="inline-actions">
            <button class="btn btn-secondary" type="button" data-edit-menu="${item._id}">Edit</button>
            <button class="btn btn-danger" type="button" data-delete-menu="${item._id}">Delete</button>
          </div>
        </div>
      `
    )
    .join('');
};

const renderOrderCards = (target, list, canComplete) => {
  if (!list.length) {
    target.innerHTML = '<div class="empty-state">No orders in this view right now.</div>';
    return;
  }

  target.innerHTML = list
    .map(
      (order) => `
        <div class="order-card">
          <div class="order-row">
            <div>
              <strong>${order.customerName}</strong>
              <div class="small">Table ${order.tableNumber} · ${new Date(order.createdAt).toLocaleString()}</div>
            </div>
            <span class="price">${formatCurrency(order.totalAmount)}</span>
          </div>
          <div class="order-list">
            ${order.items
              .map((item) => `<div class="small">${item.quantity} × ${item.name} (${formatCurrency(item.price)})</div>`)
              .join('')}
          </div>
          ${canComplete ? `<button class="btn btn-success" type="button" data-complete-order="${order._id}">Mark Completed</button>` : ''}
        </div>
      `
    )
    .join('');
};

const renderOrders = () => {
  const filteredOrders = filteredTableNumber
    ? orders.filter((order) => String(order.tableNumber) === String(filteredTableNumber))
    : orders;

  renderOrderCards(
    ordersCurrent,
    filteredOrders.filter((order) => order.status === 'current'),
    true
  );
  renderOrderCards(
    ordersCompleted,
    filteredOrders.filter((order) => order.status === 'completed'),
    false
  );
};

const loadProfile = async () => {
  const data = await BristoAPI.request(`${BristoAPI.API.auth}/me`, {
    headers: {
      Authorization: `Bearer ${BristoAPI.getOwnerToken()}`
    }
  });
  ownerNameEl.textContent = data.owner.name;
};

const loadMenu = async () => {
  const data = await BristoAPI.request(BristoAPI.API.menu);
  menuItems = data.menuItems;
  renderMenuList();
  renderMetrics();
};

const loadOrders = async () => {
  const data = await BristoAPI.request(BristoAPI.API.orders, {
    headers: {
      Authorization: `Bearer ${BristoAPI.getOwnerToken()}`
    }
  });
  orders = data.orders;
  renderOrders();
  renderMetrics();
};

menuForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const submitButton = menuForm.querySelector('button[type="submit"]');
  const formData = new FormData(menuForm);
  const payload = Object.fromEntries(formData.entries());

  try {
    submitButton.disabled = true;
    submitButton.textContent = menuForm.dataset.editingId ? 'Updating Item...' : 'Saving Item...';
    const uploadResult = await uploadSelectedImage();
    payload.imageUrl = uploadResult.imageUrl;
    payload.imageFileId = uploadResult.fileId;
    payload.isAvailable = payload.isAvailable === 'on';

    const isEditing = Boolean(menuForm.dataset.editingId);
    const url = isEditing ? `${BristoAPI.API.menu}/${menuForm.dataset.editingId}` : BristoAPI.API.menu;
    const method = isEditing ? 'PUT' : 'POST';

    const data = await BristoAPI.request(url, BristoAPI.authorizedJsonOptions(method, payload));
    showMenuFeedback(data.message, 'success');
    resetForm();
    await loadMenu();
  } catch (error) {
    showMenuFeedback(error.message, 'error');
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = menuForm.dataset.editingId ? 'Update Menu Item' : 'Save Menu Item';
  }
});

imageInput?.addEventListener('change', (event) => {
  const [file] = event.target.files;
  imageSelection = file || null;

  if (file) {
    setPreview(URL.createObjectURL(file));
    imageStatus.textContent = 'Image selected. Save the form to upload it to ImageKit.';
  } else {
    setPreview(menuForm.dataset.currentImageUrl || '');
    imageStatus.textContent = 'Upload an item photo to ImageKit before saving.';
  }
});

cancelEditButton?.addEventListener('click', resetForm);

menuList?.addEventListener('click', async (event) => {
  const editButton = event.target.closest('[data-edit-menu]');
  const deleteButton = event.target.closest('[data-delete-menu]');

  if (editButton) {
    const item = menuItems.find((entry) => entry._id === editButton.dataset.editMenu);
    if (!item) return;

    formTitle.textContent = 'Edit Menu Item';
    cancelEditButton.classList.remove('hidden');
    menuForm.dataset.editingId = item._id;
    menuForm.dataset.currentImageUrl = item.imageUrl || '';
    menuForm.dataset.currentFileId = item.imageFileId || '';
    menuForm.name.value = item.name;
    menuForm.price.value = item.price;
    menuForm.category.value = item.category;
    menuForm.description.value = item.description || '';
    menuForm.isAvailable.checked = Boolean(item.isAvailable);
    imageInput.value = '';
    imageSelection = null;
    imageStatus.textContent = 'Current image loaded. Choose a new file only if you want to replace it.';
    setPreview(item.imageUrl);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (deleteButton) {
    const confirmed = window.confirm('Delete this menu item?');
    if (!confirmed) return;

    try {
      await BristoAPI.request(`${BristoAPI.API.menu}/${deleteButton.dataset.deleteMenu}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${BristoAPI.getOwnerToken()}`
        }
      });
      await loadMenu();
    } catch (error) {
      showMenuFeedback(error.message, 'error');
    }
  }
});

[ordersCurrent, ordersCompleted].forEach((container) => {
  container?.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-complete-order]');
    if (!button) return;

    try {
      await BristoAPI.request(`${BristoAPI.API.orders}/${button.dataset.completeOrder}/complete`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${BristoAPI.getOwnerToken()}`
        }
      });
      await loadOrders();
    } catch (error) {
      showMenuFeedback(error.message, 'error');
    }
  });
});

orderFilter?.addEventListener('input', (event) => {
  filteredTableNumber = event.target.value.trim();
  renderOrders();
});

logoutButton?.addEventListener('click', () => {
  BristoAPI.clearOwnerSession();
  window.location.href = '/owner-login';
});

const initializeDashboard = async () => {
  try {
    await Promise.all([loadProfile(), loadMenu(), loadOrders()]);
  } catch (error) {
    BristoAPI.clearOwnerSession();
    window.location.href = '/owner-login';
  }
};

resetForm();
initializeDashboard();
