/**
 * Enhanced Product Filtering System
 * Features:
 * - Debounced input handling
 * - Loading states
 * - Error handling
 * - Dynamic product card rendering
 * - URL state management
 * - Accessibility improvements
 * - Responsive design considerations
 */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize the filter system
  const filterSystem = new ProductFilterSystem({
    formId: 'filter-form',
    productContainerId: 'product-list',
    loadingIndicatorId: 'loading-indicator',
    noResultsId: 'no-results',
    errorContainerId: 'error-message'
  });
  filterSystem.init();
});

class ProductFilterSystem {
  constructor({
    formId,
    productContainerId,
    loadingIndicatorId,
    noResultsId,
    errorContainerId
  }) {
    this.form = document.getElementById(formId);
    this.productContainer = document.getElementById(productContainerId);
    this.loadingIndicator = document.getElementById(loadingIndicatorId);
    this.noResultsElement = document.getElementById(noResultsId);
    this.errorContainer = document.getElementById(errorContainerId);
    this.debounceTimer = null;
    this.currentRequest = null;
    
    // Default values
    this.defaultFilters = {
      category: '',
      min_price: '',
      max_price: '',
      sort_by: 'popularity',
      search_query: '',
      page: 1
    };
    
    // Initialize filters from URL or use defaults
    this.currentFilters = this.getFiltersFromUrl();
  }

  init() {
    this.setupEventListeners();
    this.updateFormInputs();
    this.fetchProducts();
  }

  setupEventListeners() {
    // Form submission
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleFilterChange();
    });

    // Input changes with debounce for better performance
    const debouncedInputs = ['search_query', 'min_price', 'max_price'];
    debouncedInputs.forEach(inputName => {
      const input = this.form.querySelector(`[name="${inputName}"]`);
      if (input) {
        input.addEventListener('input', () => {
          clearTimeout(this.debounceTimer);
          this.debounceTimer = setTimeout(() => {
            this.handleFilterChange();
          }, 500);
        });
      }
    });

    // Instant filter changes
    const instantFilterInputs = ['category', 'sort_by'];
    instantFilterInputs.forEach(inputName => {
      const input = this.form.querySelector(`[name="${inputName}"]`);
      if (input) {
        input.addEventListener('change', () => {
          this.handleFilterChange();
        });
      }
    });

    // Pagination event delegation
    this.productContainer.addEventListener('click', (e) => {
      if (e.target.closest('[data-page]')) {
        e.preventDefault();
        const page = e.target.closest('[data-page]').dataset.page;
        this.currentFilters.page = parseInt(page);
        this.updateUrl();
        this.fetchProducts();
      }
    });
  }

  handleFilterChange() {
    // Update filters from form
    this.updateFiltersFromForm();
    // Reset to first page when filters change
    this.currentFilters.page = 1;
    // Update URL
    this.updateUrl();
    // Fetch products
    this.fetchProducts();
  }

  updateFiltersFromForm() {
    const formData = new FormData(this.form);
    for (const [key, value] of formData.entries()) {
      this.currentFilters[key] = value;
    }
  }

  updateFormInputs() {
    for (const key in this.currentFilters) {
      const input = this.form.querySelector(`[name="${key}"]`);
      if (input) {
        if (input.type === 'checkbox' || input.type === 'radio') {
          input.checked = input.value === this.currentFilters[key];
        } else {
          input.value = this.currentFilters[key];
        }
      }
    }
  }

  getFiltersFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const filters = { ...this.defaultFilters };
    
    for (const key in filters) {
      if (params.has(key)) {
        filters[key] = params.get(key);
      }
    }
    
    return filters;
  }

  updateUrl() {
    const params = new URLSearchParams();
    
    for (const key in this.currentFilters) {
      if (this.currentFilters[key] && this.currentFilters[key] !== this.defaultFilters[key]) {
        params.set(key, this.currentFilters[key]);
      }
    }
    
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.pushState({}, '', newUrl);
  }

  async fetchProducts() {
    // Abort previous request if it exists
    if (this.currentRequest) {
      this.currentRequest.abort();
    }
    
    try {
      // Show loading state
      this.showLoading();
      this.hideError();
      this.hideNoResults();
      
      // Create new AbortController for current request
      const controller = new AbortController();
      this.currentRequest = controller;
      
      // Build query string
      const params = new URLSearchParams();
      for (const key in this.currentFilters) {
        if (this.currentFilters[key]) {
          params.set(key, this.currentFilters[key]);
        }
      }
      
      // Make the request
      const response = await fetch(`/api/products?${params.toString()}`, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      
      // Clear current request
      this.currentRequest = null;
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }
      
      const data = await response.json();
      
      // Hide loading state
      this.hideLoading();
      
      // Handle response
      if (data.products && data.products.length > 0) {
        this.renderProducts(data);
      } else {
        this.showNoResults();
      }
      
    } catch (error) {
      // Ignore abort errors
      if (error.name === 'AbortError') {
        return;
      }
      
      this.hideLoading();
      this.showError(error.message || 'Failed to load products. Please try again.');
      console.error('Error fetching products:', error);
    }
  }

  showLoading() {
    if (this.loadingIndicator) {
      this.loadingIndicator.style.display = 'block';
    }
    this.productContainer.setAttribute('aria-busy', 'true');
  }

  hideLoading() {
    if (this.loadingIndicator) {
      this.loadingIndicator.style.display = 'none';
    }
    this.productContainer.setAttribute('aria-busy', 'false');
  }

  showError(message) {
    if (this.errorContainer) {
      this.errorContainer.textContent = message;
      this.errorContainer.style.display = 'block';
    }
  }

  hideError() {
    if (this.errorContainer) {
      this.errorContainer.style.display = 'none';
    }
  }

  showNoResults() {
    if (this.noResultsElement) {
      this.noResultsElement.style.display = 'block';
    }
    this.productContainer.innerHTML = '';
  }

  hideNoResults() {
    if (this.noResultsElement) {
      this.noResultsElement.style.display = 'none';
    }
  }

  renderProducts(data) {
    // Clear existing products
    this.productContainer.innerHTML = '';
    
    // Render each product
    data.products.forEach(product => {
      const productCard = this.createProductCard(product);
      this.productContainer.appendChild(productCard);
    });
    
    // Render pagination if available
    if (data.pagination) {
      const pagination = this.createPagination(data.pagination);
      this.productContainer.appendChild(pagination);
    }
  }

  createProductCard(product) {
    const card = document.createElement('article');
    card.className = 'product-card';
    card.setAttribute('data-id', product.id);
    
    // Product image
    let imageHtml = '';
    if (product.image) {
      imageHtml = `
        <div class="product-image-container">
          <img src="${product.image}" alt="${product.name}" loading="lazy">
          ${product.on_sale ? '<span class="product-badge">Sale</span>' : ''}
        </div>
      `;
    }
    
    // Price display
    let priceHtml = '';
    if (product.original_price && product.original_price !== product.price) {
      priceHtml = `
        <div class="product-price">
          <span class="current-price">$${product.price.toFixed(2)}</span>
          <span class="original-price">$${product.original_price.toFixed(2)}</span>
        </div>
      `;
    } else {
      priceHtml = `<div class="product-price">$${product.price.toFixed(2)}</div>`;
    }
    
    // Rating stars
    let ratingHtml = '';
    if (product.rating) {
      ratingHtml = `
        <div class="product-rating" aria-label="Rating: ${product.rating} out of 5 stars">
          ${this.generateStarRating(product.rating)}
          <span class="rating-count">(${product.review_count})</span>
        </div>
      `;
    }
    
    card.innerHTML = `
      <a href="/products/${product.slug}" class="product-link">
        ${imageHtml}
        <div class="product-info">
          <h3 class="product-title">${product.name}</h3>
          <div class="product-category">${product.category}</div>
          ${ratingHtml}
          ${priceHtml}
          <button class="btn btn-primary add-to-cart" data-id="${product.id}">
            Add to Cart
          </button>
        </div>
      </a>
    `;
    
    return card;
  }

  generateStarRating(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    let stars = '';
    
    // Full stars
    for (let i = 0; i < fullStars; i++) {
      stars += '<span class="star full" aria-hidden="true">★</span>';
    }
    
    // Half star
    if (hasHalfStar) {
      stars += '<span class="star half" aria-hidden="true">★</span>';
    }
    
    // Empty stars
    for (let i = 0; i < emptyStars; i++) {
      stars += '<span class="star empty" aria-hidden="true">★</span>';
    }
    
    return stars;
  }

  createPagination(pagination) {
    const paginationContainer = document.createElement('div');
    paginationContainer.className = 'pagination';
    
    // Previous button
    const prevDisabled = pagination.current_page === 1 ? 'disabled' : '';
    paginationContainer.innerHTML += `
      <a href="#" data-page="${pagination.current_page - 1}" 
         class="page-link prev ${prevDisabled}" 
         ${prevDisabled ? 'aria-disabled="true"' : ''}>
        Previous
      </a>
    `;
    
    // Page numbers
    for (let i = 1; i <= pagination.total_pages; i++) {
      const active = i === pagination.current_page ? 'active' : '';
      paginationContainer.innerHTML += `
        <a href="#" data-page="${i}" 
           class="page-link number ${active}" 
           ${active ? 'aria-current="page"' : ''}>
          ${i}
        </a>
      `;
    }
    
    // Next button
    const nextDisabled = pagination.current_page === pagination.total_pages ? 'disabled' : '';
    paginationContainer.innerHTML += `
      <a href="#" data-page="${pagination.current_page + 1}" 
         class="page-link next ${nextDisabled}" 
         ${nextDisabled ? 'aria-disabled="true"' : ''}>
        Next
      </a>
    `;
    
    return paginationContainer;
  }
}