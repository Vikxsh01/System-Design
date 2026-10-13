import { useEffect, useMemo, useState } from 'react'
import {
  Search, ShoppingCart, MapPin, Clock3, Plus, Minus, Trash2,
  Leaf, ArrowRight, PackageCheck, Truck, X, CheckCircle2, Menu
} from 'lucide-react'
import {
  getProducts, searchProducts, addCartItem, getCart,
  updateCartItem, removeCartItem, placeOrder, getDeliveryStatus
} from './services/api'

const categories = ['All', 'Fruits', 'Vegetables', 'Dairy', 'Bakery', 'Snacks', 'Beverages', 'Staples']
const fallbackProducts = [
  { id: 'P201', name: 'Fresh Milk', category: 'Dairy', price: 50, unit: '1 litre', stock: 35, emoji: '🥛', description: 'Fresh everyday dairy' },
  { id: 'P202', name: 'Brown Bread', category: 'Bakery', price: 40, unit: '400 g', stock: 22, emoji: '🍞', description: 'Soft whole-wheat bread' },
  { id: 'P203', name: 'Bananas', category: 'Fruits', price: 60, unit: '6 pieces', stock: 40, emoji: '🍌', description: 'Naturally sweet bananas' },
  { id: 'P204', name: 'Tomatoes', category: 'Vegetables', price: 35, unit: '500 g', stock: 28, emoji: '🍅', description: 'Farm-fresh tomatoes' },
  { id: 'P205', name: 'Eggs', category: 'Dairy', price: 72, unit: '6 pieces', stock: 18, emoji: '🥚', description: 'Farm eggs' },
  { id: 'P206', name: 'Potato Chips', category: 'Snacks', price: 20, unit: '1 pack', stock: 50, emoji: '🥔', description: 'Crunchy salted snack' },
  { id: 'P207', name: 'Apples', category: 'Fruits', price: 120, unit: '500 g', stock: 16, emoji: '🍎', description: 'Crisp red apples' },
  { id: 'P208', name: 'Orange Juice', category: 'Beverages', price: 85, unit: '1 litre', stock: 12, emoji: '🧃', description: 'Refreshing fruit juice' },
  { id: 'P209', name: 'Rice', category: 'Staples', price: 65, unit: '1 kg', stock: 30, emoji: '🍚', description: 'Everyday cooking rice' },
  { id: 'P210', name: 'Spinach', category: 'Vegetables', price: 25, unit: '1 bunch', stock: 14, emoji: '🥬', description: 'Fresh leafy greens' },
]

const money = (amount) => `₹${Number(amount).toFixed(0)}`

export default function App() {
  const [products, setProducts] = useState(fallbackProducts)
  const [cart, setCart] = useState([])
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [cartOpen, setCartOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [apiOnline, setApiOnline] = useState(false)
  const [notice, setNotice] = useState('')
  const [order, setOrder] = useState(null)
  const [delivery, setDelivery] = useState(null)
  const [userId] = useState('DEMO-USER-01')

  useEffect(() => {
    let active = true
    Promise.all([getProducts(), getCart(userId)])
      .then(([p, c]) => {
        if (!active) return
        setProducts(p.data.items)
        setCart(c.data.items.map(i => ({
          id: i.productId, productId: i.productId, name: i.name, price: i.price,
          quantity: i.quantity, emoji: i.emoji,
          unit: p.data.items.find(x => x.id === i.productId)?.unit || 'item',
        })))
        setApiOnline(true)
      })
      .catch(() => setApiOnline(false))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [userId])

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(''), 3000)
    return () => clearTimeout(timer)
  }, [notice])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return products.filter(p =>
      (category === 'All' || p.category === category) &&
      (!q || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q))
    )
  }, [products, query, category])

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const deliveryFee = subtotal > 0 && subtotal < 299 ? 25 : 0
  const total = subtotal + deliveryFee

  async function addProduct(product) {
    const existing = cart.find(item => item.id === product.id)
    try {
      if (apiOnline) {
        const result = await addCartItem({ userId, productId: product.id, quantity: 1 })
        const serverItems = result.data.items
        setCart(serverItems.map(i => ({
          id: i.productId, productId: i.productId, name: i.name, price: i.price,
          quantity: i.quantity, emoji: i.emoji,
          unit: products.find(p => p.id === i.productId)?.unit || 'item',
        })))
      } else {
        setCart(old => existing
          ? old.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
          : [...old, { ...product, id: product.id, productId: product.id, quantity: 1 }])
      }
      setNotice(`${product.name} added to cart`)
    } catch (error) {
      setNotice(error.response?.data?.detail || 'Could not add item. Please try again.')
    }
  }

  async function changeQuantity(item, next) {
    if (next < 1) return removeItem(item)
    try {
      if (apiOnline) {
        const result = await updateCartItem(item.id, { userId, quantity: next })
        setCart(result.data.items.map(i => ({
          id: i.productId, productId: i.productId, name: i.name, price: i.price,
          quantity: i.quantity, emoji: i.emoji,
          unit: products.find(p => p.id === i.productId)?.unit || 'item',
        })))
      } else {
        setCart(old => old.map(x => x.id === item.id ? { ...x, quantity: next } : x))
      }
    } catch (error) {
      setNotice(error.response?.data?.detail || 'Could not update quantity.')
    }
  }

  async function removeItem(item) {
    try {
      if (apiOnline) {
        const result = await removeCartItem(item.id, userId)
        setCart(result.data.items.map(i => ({
          id: i.productId, productId: i.productId, name: i.name, price: i.price,
          quantity: i.quantity, emoji: i.emoji,
          unit: products.find(p => p.id === i.productId)?.unit || 'item',
        })))
      } else setCart(old => old.filter(x => x.id !== item.id))
    } catch {
      setNotice('Could not remove item.')
    }
  }

  async function checkout() {
    if (!cart.length) return
    if (!apiOnline) {
      setNotice('Start the backend to place a saved order.')
      return
    }
    try {
      const response = await placeOrder({ userId, storeId: 'STORE001' })
      setOrder(response.data)
      setCart([])
      setCartOpen(false)
      setNotice(`Order ${response.data.orderId} placed successfully`)
      const status = await getDeliveryStatus(response.data.orderId)
      setDelivery(status.data)
    } catch (error) {
      setNotice(error.response?.data?.detail || 'Order failed. Please try again.')
    }
  }

  async function trackOrder() {
    if (!order?.orderId) return
    try {
      const response = await getDeliveryStatus(order.orderId)
      setDelivery(response.data)
      setNotice(`Delivery status: ${response.data.status.replaceAll('_', ' ')}`)
    } catch {
      setNotice('Could not fetch delivery status.')
    }
  }

  return (
    <div className="app-shell">
      <div className="announcement"><Leaf size={14} /> Fresh essentials, delivered to your door <span>•</span> Free delivery over ₹299</div>
      <header className="site-header">
        <a className="brand" href="#" aria-label="QuickCart home">
          <span className="brand-mark"><ShoppingCart size={23} strokeWidth={2.5} /></span>
          <span>quick<span className="brand-green">cart</span><small>GROCERIES, MADE EASY</small></span>
        </a>
        <div className="location-pill"><MapPin size={17}/><span><small>DELIVERING TO</small><strong>Home · Tiruchengode</strong></span></div>
        <div className="header-actions">
          <span className={`api-status ${apiOnline ? 'online' : ''}`}><i />{apiOnline ? 'API connected' : 'Demo preview'}</span>
          <button className="cart-button" onClick={() => setCartOpen(true)}><ShoppingCart size={18}/><span>Cart</span><b>{cartCount}</b></button>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow"><span className="eyebrow-dot"/> YOUR NEIGHBOURHOOD GROCERY STORE</span>
            <h1>Good food.<br/><em>Good mood.</em></h1>
            <p>Your daily essentials, carefully picked and delivered fresh. More time for what matters.</p>
            <a className="hero-cta" href="#products">Shop groceries <ArrowRight size={17}/></a>
            <div className="hero-proof"><span className="proof-avatars">A&nbsp; R&nbsp; S</span><span><strong>Freshness first</strong><small>Every order, every day</small></span></div>
          </div>
          <div className="hero-art">
            <div className="art-orbit orbit-one"/><div className="art-orbit orbit-two"/>
            <div className="hero-produce produce-one">🥑</div><div className="hero-produce produce-two">🍊</div>
            <div className="produce-basket"><span>🥬</span><span>🥖</span><span>🥕</span><span>🍎</span><span>🥦</span></div>
            <div className="floating-card"><span className="floating-icon"><Clock3 size={19}/></span><span><strong>Quick delivery</strong><small>Freshness at your door</small></span></div>
            <div className="hero-sticker">FRESH<br/><span>DAILY</span> ✳</div>
          </div>
          <div className="hero-bottom-note"><span>01 / EVERYDAY ESSENTIALS</span><span>FRESH PICKS · FAIR PRICES · QUICK DELIVERY</span></div>
        </section>

        <section className="benefit-strip">
          <div><span className="benefit-icon green"><Leaf size={20}/></span><span><strong>Fresh, always</strong><small>Picked with care</small></span></div>
          <div><span className="benefit-icon peach"><Truck size={20}/></span><span><strong>Quick delivery</strong><small>From your local store</small></span></div>
          <div><span className="benefit-icon yellow"><PackageCheck size={20}/></span><span><strong>Easy ordering</strong><small>Simple, secure checkout</small></span></div>
        </section>

        <section id="products" className="products-section">
          <div className="section-heading"><div><span className="eyebrow">THE GOOD STUFF</span><h2>Shop your <em>favourites.</em></h2><p>Everyday essentials for a happier home.</p></div><div className="product-count">{filtered.length} products <ArrowRight size={15}/></div></div>
          <div className="search-row"><label className="search-box"><Search size={19}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search milk, fruits, snacks..." aria-label="Search products"/>{query && <button className="clear-search" onClick={() => setQuery('')} aria-label="Clear search"><X size={15}/></button>}</label><button className="mobile-filter" onClick={() => setCategory(category === 'All' ? 'Fruits' : 'All')}><Menu size={17}/> {category === 'All' ? 'Filter' : category}</button></div>
          <div className="category-row">{categories.map((c, i) => <button key={c} className={`category-chip ${category === c ? 'active' : ''}`} onClick={() => setCategory(c)}>{i === 0 ? '✳' : ['','🍎','🥬','🥛','🍞','🥨','🧃','🍚'][i]} <span>{c}</span></button>)}</div>
          <div className="product-grid">
            {filtered.map((product, index) => <article className="product-card" key={product.id}>
              <div className={`product-visual visual-${index % 6}`}><span className="product-emoji">{product.emoji}</span><span className="product-tag">{product.stock > 0 ? 'FRESH PICK' : 'SOLD OUT'}</span><button className="quick-add" onClick={() => addProduct(product)} disabled={product.stock < 1} aria-label={`Add ${product.name}`}><Plus size={19}/></button></div>
              <div className="product-info"><span className="product-category">{product.category}</span><h3>{product.name}</h3><p>{product.unit}</p><div className="product-card-bottom"><strong>{money(product.price)}</strong><button onClick={() => addProduct(product)} disabled={product.stock < 1}><Plus size={15}/> Add</button></div></div>
            </article>)}
          </div>
          {!filtered.length && <div className="empty-state"><span>🔎</span><h3>No products found</h3><p>Try another search or category.</p><button className="secondary-button" onClick={() => { setQuery(''); setCategory('All') }}>Clear filters</button></div>}
          <div className="inventory-note"><span className="inventory-pulse"/><span><strong>Local store inventory</strong> · Availability is checked again at checkout.</span><span className="store-label"><MapPin size={14}/> STORE001</span></div>
        </section>

        <section className="bottom-banner"><div><span className="eyebrow">A LITTLE MORE JOY IN EVERY BAG</span><h2>Good things are<br/>closer than you think.</h2><p>Fill your basket with the things you love.</p></div><div className="banner-emoji">🛍️<span>✳</span></div><a href="#products">Explore groceries <ArrowRight size={16}/></a></section>
      </main>

      <footer><a className="brand footer-brand" href="#"><span className="brand-mark"><ShoppingCart size={19}/></span><span>quick<span className="brand-green">cart</span><small>GROCERIES, MADE EASY</small></span></a><span>Fresh picks. Fair prices. Quick delivery.</span><span>© 2026 QuickCart · Academic project</span></footer>

      {notice && <div className="toast"><CheckCircle2 size={18}/>{notice}<button onClick={() => setNotice('')} aria-label="Dismiss"><X size={15}/></button></div>}

      {cartOpen && <div className="drawer-backdrop" onClick={() => setCartOpen(false)}>
        <aside className="cart-drawer" onClick={e => e.stopPropagation()}>
          <div className="drawer-header"><div><span className="eyebrow">YOUR BASKET</span><h2>Shopping cart <span>({cartCount})</span></h2></div><button className="icon-button" onClick={() => setCartOpen(false)} aria-label="Close cart"><X/></button></div>
          {cart.length === 0 ? <div className="cart-empty"><span>🧺</span><h3>Your basket is waiting</h3><p>Add a few fresh favourites to get started.</p><button className="primary-button" onClick={() => { setCartOpen(false); document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' }) }}>Explore groceries</button></div> :
            <><div className="cart-items">{cart.map(item => <div className="cart-item" key={item.id}><div className="cart-item-emoji">{item.emoji}</div><div className="cart-item-details"><strong>{item.name}</strong><small>{item.unit}</small><b>{money(item.price * item.quantity)}</b><div className="quantity-control"><button onClick={() => changeQuantity(item, item.quantity - 1)} aria-label="Decrease quantity"><Minus size={13}/></button><span>{item.quantity}</span><button onClick={() => changeQuantity(item, item.quantity + 1)} aria-label="Increase quantity"><Plus size={13}/></button><button className="remove-button" onClick={() => removeItem(item)} aria-label="Remove item"><Trash2 size={14}/></button></div></div></div>)}</div>
            <div className="cart-summary"><div><span>Subtotal</span><strong>{money(subtotal)}</strong></div><div><span>Delivery fee</span><strong>{deliveryFee ? money(deliveryFee) : 'FREE'}</strong></div>{subtotal > 0 && subtotal < 299 && <p>Add {money(299 - subtotal)} more for free delivery.</p>}<div className="summary-total"><span>Total</span><strong>{money(total)}</strong></div><button className="primary-button checkout-button" onClick={checkout}>Place order <ArrowRight size={17}/></button><small className="checkout-note">Demo checkout · No payment is processed</small></div></>}
        </aside>
      </div>}

      {order && <div className="order-modal-backdrop" onClick={() => setOrder(null)}><section className="order-modal" onClick={e => e.stopPropagation()}><button className="modal-close icon-button" onClick={() => setOrder(null)} aria-label="Close"><X/></button><span className="order-success"><CheckCircle2 size={35}/></span><span className="eyebrow">ORDER CONFIRMED</span><h2>Your groceries are on their way.</h2><p className="order-id">Order ID: <strong>{order.orderId}</strong></p><div className="delivery-timeline"><div className="timeline-step done"><span>✓</span><div><strong>Order confirmed</strong><small>Your order has been received</small></div></div><div className={`timeline-step ${delivery?.status !== 'PREPARING' ? 'done' : 'current'}`}><span>2</span><div><strong>Preparing your order</strong><small>Local store is packing your items</small></div></div><div className="timeline-step"><span>3</span><div><strong>Out for delivery</strong><small>Your delivery partner will collect it</small></div></div><div className="timeline-step"><span>4</span><div><strong>Delivered</strong><small>Freshness arrives at your door</small></div></div></div><div className="delivery-status-box"><span><Truck size={18}/><span><small>LIVE STATUS (DEMO)</small><strong>{(delivery?.status || order.deliveryStatus || 'PREPARING').replaceAll('_', ' ')}</strong></span></span><button className="secondary-button" onClick={trackOrder}>Refresh status</button></div><button className="primary-button full-button" onClick={() => setOrder(null)}>Continue shopping</button></section></div>}

      {loading && <div className="loading-indicator"><span className="spinner"/> Connecting to QuickCart API…</div>}
    </div>
  )
}
