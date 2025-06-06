from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import login, authenticate, logout
from django.contrib.auth.forms import AuthenticationForm
from django.http import HttpResponseNotFound
from django.db.models import Q
from .forms import RegisterForm
from .models import Product, Category  # Ensure you have both models

# Home Page
def index(request):
    products = Product.objects.filter(available=True)
    return render(request, 'index.html', {'products': products})

# Product Detail Page
def product_detail(request, pk):
    product = get_object_or_404(Product, pk=pk)
    return render(request, 'product_detail.html', {'product': product})

# Add Product to Cart
def add_to_cart(request, pk):
    cart = request.session.get('cart', {})
    cart[str(pk)] = cart.get(str(pk), 0) + 1
    request.session['cart'] = cart
    return redirect('cart_view')

def remove_from_cart(request, pk):
    cart = request.session.get('cart', {})
    pk_str = str(pk)
    if pk_str in cart:
        del cart[pk_str]
        request.session['cart'] = cart
    return redirect('cart_view')

# View Cart
def cart_view(request):
    cart = request.session.get('cart', {})
    items = []
    total = 0
    updated_cart = cart.copy()

    for pk, qty in cart.items():
        try:
            product = Product.objects.get(pk=pk)
            total += product.price * qty
            items.append({'product': product, 'qty': qty})
        except Product.DoesNotExist:
            updated_cart.pop(pk)  # Remove invalid product

    request.session['cart'] = updated_cart
    return render(request, 'cart.html', {'items': items, 'total': total})

# Product Listing with Filters & Search
def product_list(request):
    products = Product.objects.all()
    categories = Category.objects.all()

    query = request.GET.get('q')
    if query:
        products = products.filter(
            Q(name__icontains=query) | Q(description__icontains=query)
        )

    category_id = request.GET.get('category')
    if category_id:
        products = products.filter(category_id=category_id)

    availability = request.GET.get('availability')
    if availability == 'available':
        products = products.filter(available=True)
    elif availability == 'unavailable':
        products = products.filter(available=False)

    min_price = request.GET.get('min_price')
    if min_price:
        try:
            products = products.filter(price__gte=float(min_price))
        except ValueError:
            pass

    max_price = request.GET.get('max_price')
    if max_price:
        try:
            products = products.filter(price__lte=float(max_price))
        except ValueError:
            pass

    context = {
        'products': products,
        'categories': categories,
    }
    return render(request, 'product_list.html', context)

# User Registration
def register_view(request):
    if request.method == 'POST':
        form = RegisterForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            return redirect('product_list')
    else:
        form = RegisterForm()
    return render(request, 'register.html', {'form': form})

# User Login
def login_view(request):
    if request.method == 'POST':
        form = AuthenticationForm(data=request.POST)
        if form.is_valid():
            login(request, form.get_user())
            return redirect('product_list')
    else:
        form = AuthenticationForm()
    return render(request, 'login.html', {'form': form})

# User Logout
def logout_view(request):
    logout(request)
    return redirect('index')

def about_view(request):
    return render(request, 'about.html')

def contact_view(request):
    return render(request, 'contact.html')


def search_view(request):
    query = request.GET.get('q', '')
    results = Product.objects.filter(
        Q(name__icontains=query) | Q(description__icontains=query)
    ) if query else Product.objects.none()
    
    context = {
        'query': query,
        'results': results,
    }
    return render(request, 'search_results.html', context)

def checkout_view(request):
    if request.method == 'POST':
        # Process payment logic here (or simulate it)
        return redirect('payment_success')  # ✅ redirect after payment
    return render(request, 'checkout.html')


def payment_success(request):
    return render(request, 'payment_success.html')
